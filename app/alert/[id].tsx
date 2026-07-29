import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchAvailableAlert,
  formatConfidence,
  getHttpStatus,
} from '../../lib/api';
import {
  COLORS,
  RADII,
  SPACING,
  TYPOGRAPHY,
} from '../../lib/constants';
import {
  canViewTechnicalDetails,
  formatDate,
  formatTime,
  getAlertTitle,
  getAlertExplanation,
  humanizeStatus,
} from '../../lib/presentation';
import type { Alert } from '../../lib/types';
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
import LoadingScreen from '../../components/LoadingScreen';
import ScreenState from '../../components/ScreenState';
import SeverityBadge from '../../components/SeverityBadge';
import { AuthContext } from '../_layout';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { user } = useContext(AuthContext);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<
    'network' | 'unauthorized' | 'invalid-response' | null
  >(null);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);

  const alertId = Number(Array.isArray(id) ? id[0] : id);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(alertId) || alertId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
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

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/alerts');
    }
  }

  if (loading) {
    return <LoadingScreen message="Loading alert details…" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={goBack}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.text}
            importantForAccessibility="no-hide-descendants"
          />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Alert details</Text>
        <View style={styles.topBarSpacer} />
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
                ? 'You can’t access this alert.'
                : error === 'invalid-response'
                  ? 'This alert could not be displayed safely.'
                  : 'We couldn’t load this alert.'
            }
            message={
              error === 'unauthorized'
                ? 'Sign in with an authorized staff account and try again.'
                : error === 'invalid-response'
                  ? 'The server returned alert information in an unexpected format. No evidence was inferred.'
                  : 'Check your connection and try again. Being offline in the app does not mean the alert was lost; available alerts can synchronize when connectivity returns.'
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
            title="Alert information is unavailable."
            message="This alert may no longer be included in the available alert history."
            actionLabel="Back to alerts"
            onAction={() => router.replace('/alerts')}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text accessibilityRole="header" style={styles.title}>
              {getAlertTitle(alert.severity)}
            </Text>
            <Text style={styles.requiredNotice}>{getReviewNotice(alert)}</Text>
            <Text style={styles.explanation}>
              {getAlertExplanation(alert.severity)}
            </Text>
            <SeverityBadge severity={alert.severity} />
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Available information
            </Text>
            <DetailRow
              icon="location-outline"
              label="Classroom or location"
              value={alert.location?.trim() || 'Location unavailable'}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="calendar-outline"
              label="Detected date"
              value={formatDate(alert.created_at)}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="time-outline"
              label="Detected time"
              value={formatTime(alert.created_at)}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="information-circle-outline"
              label="Alert status"
              value={humanizeStatus(alert.status)}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="language-outline"
              label="Transcript language"
              value={getLanguageLabel(alert.language)}
            />
            {typeof alert.language_confidence === 'number' ? (
              <>
                <View style={styles.divider} />
                <DetailRow
                  icon="analytics-outline"
                  label="Language confidence"
                  value={formatConfidence(alert.language_confidence)}
                />
              </>
            ) : null}
            <View style={styles.divider} />
            <DetailRow
              icon="speedometer-outline"
              label="Detection confidence"
              value={formatConfidence(alert.confidence)}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="hourglass-outline"
              label="Event duration"
              value={`${alert.duration.toFixed(1)} seconds`}
            />
            <View style={styles.divider} />
            <DetailRow
              icon="finger-print-outline"
              label="Evidence event ID"
              value={alert.event_id || 'Not available for this legacy alert'}
            />
            {alert.emotion?.trim() ? (
              <>
                <View style={styles.divider} />
                <DetailRow
                  icon="help-circle-outline"
                  label="Possible concern category"
                  value={humanizeStatus(alert.emotion)}
                />
              </>
            ) : null}
          </View>

          <SeverityEvidenceSection alert={alert} />

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Stored transcript
            </Text>
            <Text
              selectable
              style={getExactTranscript(alert) ? styles.phrase : styles.unavailable}
            >
              {getExactTranscript(alert) ||
                'No stored transcript is available for this alert.'}
            </Text>
            <View
              style={styles.transcriptionNotice}
              accessible
              accessibilityLabel="Automatic transcription notice"
            >
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={COLORS.information}
                importantForAccessibility="no-hide-descendants"
              />
              <Text style={styles.noticeText}>
                {EVIDENCE_REVIEW_NOTE}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Evidence indicators
            </Text>
            <DetailRow
              icon="list-outline"
              label="Matched monitored terms"
              value={
                getMatchedTermLabels(alert).join(', ') ||
                'No matched monitored terms were stored.'
              }
            />
            <View style={styles.divider} />
            <DetailRow
              icon="pulse-outline"
              label="Acoustic classification"
              value={getYamnetExplanation(alert.yamnet_ran)}
            />
            {alert.yamnet_class?.trim() ? (
              <>
                <View style={styles.divider} />
                <DetailRow
                  icon="options-outline"
                  label="Stored YAMNet class"
                  value={alert.yamnet_class}
                />
              </>
            ) : null}
            {typeof alert.yamnet_score === 'number' ? (
              <>
                <View style={styles.divider} />
                <DetailRow
                  icon="stats-chart-outline"
                  label="Stored YAMNet score"
                  value={formatConfidence(alert.yamnet_score)}
                />
              </>
            ) : null}
            <View style={styles.divider} />
            <DetailRow
              icon="pricetags-outline"
              label="Stored categories"
              value={
                alert.categories?.length
                  ? alert.categories.map(humanizeStatus).join(', ')
                  : 'No categories were stored.'
              }
            />
            {alert.tone?.trim() || alert.emotion?.trim() ? (
              <>
                <View style={styles.divider} />
                <DetailRow
                  icon="pulse-outline"
                  label="Stored tone or acoustic indicator"
                  value={alert.tone?.trim() || alert.emotion?.trim() || ''}
                />
              </>
            ) : null}
          </View>

          <View style={styles.automaticNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.textSecondary}
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.automaticNoticeText}>
              {HUMAN_REVIEW_WORDING} {EVIDENCE_REVIEW_NOTE}
            </Text>
          </View>

          {canViewTechnicalDetails(user?.role) ? (
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
  const evidence = alert.severity_evidence;
  const categories = Object.entries(evidence?.term_categories ?? {});
  const supportingEvidence = evidence?.supporting_evidence ?? [];

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Why this alert was prioritized
      </Text>
      <Text style={styles.evidenceContext}>
        Severity helps staff prioritize review. It does not verify aggression
        or determine intent.
      </Text>
      {evidence ? (
        <Text style={styles.recordedEvidenceLevel}>
          Recorded evidence level: {evidence.level}
        </Text>
      ) : null}
      {evidence && alert.severity_evidence_state === 'available' ? (
        <View style={styles.evidenceBody}>
          {evidence.reasons.length > 0 ? (
            <EvidenceList
              title="Primary reasons"
              values={evidence.reasons.map(severityReasonLabel)}
            />
          ) : null}
          {categories.length > 0 ? (
            <View style={styles.evidenceGroup}>
              <Text style={styles.evidenceHeading}>
                Matched evidence categories
              </Text>
              {categories.map(([category, terms]) => (
                <View key={category} style={styles.categoryCard}>
                  <Text style={styles.categoryTitle}>
                    {termCategoryEvidenceLabel(category)}
                  </Text>
                  {terms.map((term, index) => (
                    <Text
                      key={`${category}-${index}`}
                      selectable
                      style={styles.evidenceValue}
                    >
                      Matched phrase: “{term}”
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          {supportingEvidence.length > 0 ? (
            <EvidenceList
              title="Supporting acoustic or context evidence"
              values={supportingEvidence.map(supportingEvidenceLabel)}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.evidenceUnavailable}>
          <Text style={styles.evidenceUnavailableText}>
            {getSeverityEvidenceUnavailableMessage(alert)}
          </Text>
        </View>
      )}
    </View>
  );
}

function EvidenceList({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        name={icon}
        size={20}
        color={COLORS.textSecondary}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
  const technicalRows = [
    ['Detection confidence', formatConfidence(alert.confidence)],
    [
      'YAMNet class',
      alert.yamnet_class?.trim() || 'Not available',
    ],
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
        ? `${alert.duration} seconds`
        : 'Not available',
    ],
  ];

  return (
    <View style={styles.technicalCard}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Technical details"
        accessibilityHint={expanded ? 'Collapses technical details' : 'Expands technical details'}
        accessibilityState={{ expanded }}
        style={styles.technicalButton}
        onPress={onToggle}
      >
        <View style={styles.technicalHeading}>
          <Ionicons
            name="construct-outline"
            size={21}
            color={COLORS.textSecondary}
            importantForAccessibility="no-hide-descendants"
          />
          <Text style={styles.technicalTitle}>Technical details</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={21}
          color={COLORS.textSecondary}
          importantForAccessibility="no-hide-descendants"
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.technicalBody}>
          {technicalRows.map(([label, value], index) => (
            <View key={label}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.technicalRow}>
                <Text style={styles.technicalLabel}>{label}</Text>
                <Text style={styles.technicalValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function formatMetric(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(4)
    : 'Not available';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
  topBarSpacer: {
    width: 44,
  },
  state: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACING.lg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  hero: {
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.screenTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  explanation: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 24,
  },
  requiredNotice: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    lineHeight: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    lineHeight: 23,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  phrase: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 24,
  },
  unavailable: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  transcriptionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.informationBackground,
  },
  noticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
  automaticNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
  automaticNoticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  evidenceContext: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  recordedEvidenceLevel: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
    lineHeight: 21,
  },
  evidenceBody: {
    gap: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
  evidenceGroup: {
    gap: SPACING.sm,
  },
  evidenceHeading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '800',
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  evidenceValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  categoryCard: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.sm,
    backgroundColor: COLORS.surface,
  },
  categoryTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
    lineHeight: 20,
  },
  evidenceUnavailable: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.warningBackground,
  },
  evidenceUnavailableText: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
  },
  technicalCard: {
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  technicalButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  technicalHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  technicalTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
  technicalBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  technicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  technicalLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 20,
  },
  technicalValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'right',
  },
});
