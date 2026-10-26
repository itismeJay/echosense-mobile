import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canViewTechnicalDetails, showsSchoolOnAlerts } from '../../lib/access';
import {
  fetchAvailableAlert,
  formatConfidence,
  getHttpStatus,
  reviewAlert,
} from '../../lib/api';
import {
  EVIDENCE_REVIEW_NOTE,
  getExactTranscript,
  getLanguageLabel,
  getMatchedTermLabels,
  getReviewNotice,
  getSeverityEvidenceUnavailableMessage,
  getYamnetExplanation,
  HUMAN_REVIEW_WORDING,
  severityReasonLabel,
  supportingEvidenceLabel,
  termCategoryEvidenceLabel,
} from '../../lib/alertEvidence';
import {
  formatDateTime,
  getAlertExplanation,
  humanizeStatus,
} from '../../lib/presentation';
import {
  getReviewActions,
  reviewConfirmation,
  reviewStatusLabel,
  type ReviewStatus,
} from '../../lib/review';
import { FONTS, RADIUS, SPACE, TYPE } from '../../lib/theme';
import type { Alert } from '../../lib/types';
import { makeStyles, useTheme } from '../../lib/useTheme';
import LoadingScreen from '../../components/LoadingScreen';
import ScreenState from '../../components/ScreenState';
import SeverityBadge from '../../components/SeverityBadge';
import { Button, Card, Divider, InfoRow, Notice, SectionTitle } from '../../components/ui';
import { AuthContext } from '../_layout';

export default function AlertDetailScreen() {
  const { id, notificationEventId, notificationTest } =
    useLocalSearchParams<{
      id?: string | string[];
      notificationEventId?: string | string[];
      notificationTest?: string | string[];
    }>();
  const { user } = useContext(AuthContext);
  const palette = useTheme();
  const styles = useStyles();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<
    'network' | 'unauthorized' | 'invalid-response' | null
  >(null);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ReviewStatus | null>(null);
  const [reviewMessage, setReviewMessage] = useState<{
    tone: 'neutral' | 'danger';
    text: string;
  } | null>(null);

  const alertId = Number(Array.isArray(id) ? id[0] : id);
  const trustedEventId = Array.isArray(notificationEventId)
    ? notificationEventId[0]
    : notificationEventId;
  const trustedTestMarker = Array.isArray(notificationTest)
    ? notificationTest[0]
    : notificationTest;

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(alertId) || alertId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReviewMessage(null);
    try {
      const availableAlert = await fetchAvailableAlert(alertId);
      setAlert(availableAlert);
      setNotFound(!availableAlert);
      setError(null);
    } catch (caught: unknown) {
      const status = getHttpStatus(caught);
      setError(
        status === 401 || status === 403
          ? 'unauthorized'
          : caught instanceof Error && caught.name === 'AlertContractError'
            ? 'invalid-response'
            : 'network'
      );
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(status: ReviewStatus) {
    if (!alert || pendingStatus) return;
    setPendingStatus(status);
    setReviewMessage(null);
    try {
      const updated = await reviewAlert(alert.id, status);
      setAlert(updated);
      setReviewMessage({ tone: 'neutral', text: reviewConfirmation(status) });
    } catch (caught: unknown) {
      const httpStatus = getHttpStatus(caught);
      setReviewMessage({
        tone: 'danger',
        text:
          httpStatus === 404
            ? 'This alert is no longer available to your account.'
            : 'We couldn’t save that. Check your connection and try again.',
      });
    } finally {
      setPendingStatus(null);
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/alerts');
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading alert…" />;
  }

  const isTestAlert =
    alert !== null &&
    trustedTestMarker === 'true' &&
    typeof trustedEventId === 'string' &&
    alert.event_id?.toLowerCase() === trustedEventId.toLowerCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to alerts"
          style={styles.backButton}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={palette.text}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.backText}>Alerts</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.state}>
          <ScreenState
            icon={
              error === 'unauthorized'
                ? 'lock-closed-outline'
                : error === 'invalid-response'
                  ? 'document-outline'
                  : 'cloud-offline-outline'
            }
            title={
              error === 'unauthorized'
                ? 'You can’t open this alert.'
                : error === 'invalid-response'
                  ? 'This alert couldn’t be shown safely.'
                  : 'We couldn’t load this alert.'
            }
            message={
              error === 'unauthorized'
                ? 'It belongs to a school your account can’t see.'
                : error === 'invalid-response'
                  ? 'The server sent the alert in an unexpected format, so nothing was guessed.'
                  : 'Check your connection and try again. Alerts aren’t lost while the app is offline.'
            }
            actionLabel="Try again"
            onAction={load}
            tone="error"
          />
        </View>
      ) : notFound || !alert ? (
        <View style={styles.state}>
          <ScreenState
            icon="document-outline"
            title="This alert isn’t available."
            message="It may have been removed or belong to another school."
            actionLabel="Back to alerts"
            onAction={() => router.replace('/alerts')}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {isTestAlert ? (
            <View
              accessible
              accessibilityLabel="Test alert, not a real incident. Human review is still required."
              style={styles.testBanner}
            >
              <Text style={styles.testTitle}>Test alert, not a real incident</Text>
              <Text style={styles.testText}>
                Opened from a validated test notification. Human review is still
                required.
              </Text>
            </View>
          ) : null}

          <View style={styles.hero}>
            <View style={styles.tagRow}>
              <SeverityBadge severity={alert.severity} />
              <Text style={styles.reviewState}>{reviewStatusLabel(alert.status)}</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {alert.classroom_name?.trim() ||
                alert.location?.trim() ||
                'Classroom unavailable'}
            </Text>
            {showsSchoolOnAlerts(user) ? (
              <Text style={styles.school}>
                {alert.school_name?.trim() || 'School unavailable'}
              </Text>
            ) : null}
            <Text style={styles.time}>{formatDateTime(alert.created_at)}</Text>

            <View style={styles.actions}>
              {getReviewActions(alert.status).map((action) => (
                <Button
                  key={action.status}
                  label={action.label}
                  variant={action.primary ? 'primary' : 'secondary'}
                  icon={
                    action.status === 'active'
                      ? 'arrow-undo-outline'
                      : action.status === 'resolved'
                        ? 'checkmark-done-outline'
                        : 'checkmark-outline'
                  }
                  pending={pendingStatus === action.status}
                  disabled={pendingStatus !== null}
                  onPress={() => changeStatus(action.status)}
                />
              ))}
            </View>
            {reviewMessage ? (
              <Notice tone={reviewMessage.tone}>{reviewMessage.text}</Notice>
            ) : null}
            <Notice>{getReviewNotice(alert)}</Notice>
          </View>

          <View style={styles.section}>
            <SectionTitle>What was heard</SectionTitle>
            <Text style={styles.muted}>{getAlertExplanation(alert.severity)}</Text>
            <Card>
              <Text
                selectable
                style={getExactTranscript(alert) ? styles.transcript : styles.unavailable}
              >
                {getExactTranscript(alert)
                  ? `“${getExactTranscript(alert)}”`
                  : 'No transcript was stored for this alert.'}
              </Text>
              <Text style={styles.small}>
                {getLanguageLabel(alert.language)}
                {typeof alert.language_confidence === 'number'
                  ? ` · ${formatConfidence(alert.language_confidence)} sure of the language`
                  : ''}
              </Text>
            </Card>
            <Text style={styles.small}>{EVIDENCE_REVIEW_NOTE}</Text>
          </View>

          <SeverityEvidenceSection alert={alert} />

          <View style={styles.section}>
            <SectionTitle>Details</SectionTitle>
            <Card>
              <InfoRow
                label="Monitored words matched"
                value={
                  getMatchedTermLabels(alert).join(', ') ||
                  'No monitored words were matched.'
                }
              />
              <Divider />
              <InfoRow
                label="Sound classification"
                value={getYamnetExplanation(alert.yamnet_ran)}
              />
              <Divider />
              <InfoRow
                label="Categories"
                value={
                  alert.categories?.length
                    ? alert.categories.map(humanizeStatus).join(', ')
                    : 'No categories were stored.'
                }
              />
              {alert.tone?.trim() || alert.emotion?.trim() ? (
                <>
                  <Divider />
                  <InfoRow
                    label="Tone"
                    value={humanizeStatus(alert.tone?.trim() || alert.emotion?.trim() || '')}
                  />
                </>
              ) : null}
              <Divider />
              <InfoRow
                label="Event ID"
                value={alert.event_id || 'Not recorded for this older alert'}
                selectable
              />
            </Card>
          </View>

          <Text style={styles.small}>{HUMAN_REVIEW_WORDING}</Text>

          {canViewTechnicalDetails(user) ? (
            <TechnicalDetails
              alert={alert}
              expanded={technicalExpanded}
              onToggle={() => setTechnicalExpanded((value) => !value)}
            />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SeverityEvidenceSection({ alert }: { alert: Alert }) {
  const styles = useStyles();
  const evidence = alert.severity_evidence;
  const categories = Object.entries(evidence?.term_categories ?? {});
  const supportingEvidence = evidence?.supporting_evidence ?? [];

  return (
    <View style={styles.section}>
      <SectionTitle>Why it was flagged</SectionTitle>
      <Text style={styles.muted}>
        Severity helps you decide what to review first. It doesn’t confirm
        aggression or intent.
      </Text>
      <Card>
        {evidence && alert.severity_evidence_state === 'available' ? (
          <View style={styles.evidenceBody}>
            {evidence.reasons.length > 0 ? (
              <EvidenceList
                title="Main reasons"
                values={evidence.reasons.map(severityReasonLabel)}
              />
            ) : null}
            {categories.length > 0 ? (
              <View style={styles.evidenceGroup}>
                <Text style={styles.evidenceHeading}>Matched word groups</Text>
                {categories.map(([category, terms]) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.categoryTitle}>
                      {termCategoryEvidenceLabel(category)}
                    </Text>
                    <View style={styles.chips}>
                      {terms.map((term, index) => (
                        <Text
                          key={`${category}-${index}`}
                          selectable
                          style={styles.chip}
                        >
                          “{term}”
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            {supportingEvidence.length > 0 ? (
              <EvidenceList
                title="Supporting sound or context"
                values={supportingEvidence.map(supportingEvidenceLabel)}
              />
            ) : null}
          </View>
        ) : (
          <Text style={styles.muted}>
            {getSeverityEvidenceUnavailableMessage(alert)}
          </Text>
        )}
      </Card>
    </View>
  );
}

function EvidenceList({ title, values }: { title: string; values: string[] }) {
  const styles = useStyles();
  return (
    <View style={styles.evidenceGroup}>
      <Text style={styles.evidenceHeading}>{title}</Text>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.bulletRow}>
          <View style={styles.bullet} />
          <Text style={styles.evidenceValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function TechnicalDetails({
  alert,
  expanded,
  onToggle,
}: {
  alert: Alert;
  expanded: boolean;
  onToggle: () => void;
}) {
  const palette = useTheme();
  const styles = useStyles();
  const technicalRows = [
    ['Detection confidence', formatConfidence(alert.confidence)],
    ['YAMNet class', alert.yamnet_class?.trim() || 'Not available'],
    [
      'YAMNet score',
      typeof alert.yamnet_score === 'number'
        ? formatConfidence(alert.yamnet_score)
        : 'Not available',
    ],
    ['RMS', formatMetric(alert.rms)],
    ['Energy variance', formatMetric(alert.energy_variance)],
    ['Zero-crossing rate', formatMetric(alert.zero_crossing_rate)],
    ['Peak-to-average ratio', formatMetric(alert.peak_to_average)],
    [
      'Duration',
      typeof alert.duration === 'number' && alert.duration > 0
        ? `${alert.duration.toFixed(1)} seconds`
        : 'Not available',
    ],
  ];

  return (
    <Card style={styles.technicalCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Technical details"
        accessibilityHint={expanded ? 'Collapses technical details' : 'Expands technical details'}
        accessibilityState={{ expanded }}
        style={styles.technicalButton}
        onPress={onToggle}
      >
        <Text style={styles.technicalTitle}>Technical details</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.textMuted}
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      {expanded ? (
        <View style={styles.technicalBody}>
          {technicalRows.map(([label, value], index) => (
            <View key={label}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.technicalRow}>
                <Text style={styles.technicalLabel}>{label}</Text>
                <Text style={styles.technicalValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(4)
    : 'Not available';
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
  },
  backText: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
  state: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACE.lg,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACE.lg,
    paddingBottom: SPACE.xxl,
    gap: SPACE.xl,
  },
  testBanner: {
    gap: SPACE.xs,
    padding: SPACE.md,
    borderWidth: 2,
    borderColor: palette.text,
    borderRadius: RADIUS.panel,
  },
  testTitle: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
  testText: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  hero: {
    gap: SPACE.sm,
    paddingBottom: SPACE.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  reviewState: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.small,
  },
  title: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.display,
    marginTop: SPACE.xs,
  },
  school: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
  time: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.bodyLarge,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  section: {
    gap: SPACE.sm,
  },
  muted: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  small: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  transcript: {
    color: palette.text,
    fontFamily: FONTS.regular,
    ...TYPE.bodyLarge,
  },
  unavailable: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  evidenceBody: {
    gap: SPACE.lg,
  },
  evidenceGroup: {
    gap: SPACE.sm,
  },
  evidenceHeading: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.body,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    marginTop: 9,
    borderRadius: 3,
    backgroundColor: palette.textMuted,
  },
  evidenceValue: {
    flex: 1,
    color: palette.text,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  categoryRow: {
    gap: SPACE.xs,
  },
  categoryTitle: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.small,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
  },
  chip: {
    color: palette.text,
    fontFamily: FONTS.regular,
    ...TYPE.small,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.tag,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
    overflow: 'hidden',
  },
  technicalCard: {
    padding: 0,
    gap: 0,
  },
  technicalButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
  },
  technicalTitle: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.body,
  },
  technicalBody: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.md,
  },
  technicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACE.lg,
    paddingVertical: SPACE.sm,
  },
  technicalLabel: {
    flex: 1,
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  technicalValue: {
    flex: 1,
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.small,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
}));
