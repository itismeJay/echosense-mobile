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
import { fetchAvailableAlert, formatConfidence } from '../../lib/api';
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
  getAlertExplanation,
  humanizeStatus,
} from '../../lib/presentation';
import type { Alert } from '../../lib/types';
import {
  EVIDENCE_REVIEW_NOTE,
  getExactTranscript,
  getLanguageLabel,
  getMatchedTermLabels,
  getYamnetExplanation,
  HUMAN_REVIEW_WORDING,
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
  const [error, setError] = useState(false);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);

  const alertId = Number(Array.isArray(id) ? id[0] : id);

  const load = useCallback(async () => {
    if (!Number.isInteger(alertId) || alertId < 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const availableAlert = await fetchAvailableAlert(alertId);
      setAlert(availableAlert);
      setNotFound(!availableAlert);
      setError(false);
    } catch {
      setError(true);
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
            icon="cloud-offline-outline"
            title="We couldn’t load this alert."
            message="Check your connection and try again."
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
              Possible aggression alert
            </Text>
            <Text style={styles.requiredNotice}>{HUMAN_REVIEW_WORDING}</Text>
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
