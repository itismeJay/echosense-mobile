import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';
import {
  formatDateTime,
  getAlertTitle,
  getAlertExplanation,
  getPriorityLabel,
  humanizeStatus,
} from '../lib/presentation';
import type { Alert } from '../lib/types';
import SeverityBadge from './SeverityBadge';
import { getLanguageLabel } from '../lib/alertEvidence';

interface Props {
  alert: Alert;
  onPress: () => void;
  compact?: boolean;
  showStatus?: boolean;
}

export default function AlertCard({
  alert,
  onPress,
  compact = false,
  showStatus = false,
}: Props) {
  const location = alert.location?.trim() || 'Location unavailable';
  const accessibilityLabel = [
    getPriorityLabel(alert.severity),
    location,
    formatDateTime(alert.created_at),
    getAlertExplanation(alert.severity),
    'Automatically generated and not independently verified.',
    'View details',
  ].join('. ');

  return (
    <TouchableOpacity
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the available alert information"
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={styles.topRow}>
        <SeverityBadge severity={alert.severity} size={compact ? 'sm' : 'md'} />
        {showStatus ? (
          <Text style={styles.status}>{humanizeStatus(alert.status)}</Text>
        ) : null}
      </View>

      <View style={styles.locationRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.alertTitle}>{getAlertTitle(alert.severity)}</Text>
          <Text style={styles.reviewIndicator}>Review required</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name="location-outline"
          size={19}
          color={COLORS.textSecondary}
          importantForAccessibility="no-hide-descendants"
        />
        <Text style={styles.location}>{location}</Text>
      </View>

      <View style={styles.timeRow}>
        <Ionicons
          name="time-outline"
          size={17}
          color={COLORS.textMuted}
          importantForAccessibility="no-hide-descendants"
        />
        <Text style={styles.time}>{formatDateTime(alert.created_at)}</Text>
      </View>

      <View style={styles.timeRow}>
        <Ionicons
          name="language-outline"
          size={17}
          color={COLORS.textMuted}
          importantForAccessibility="no-hide-descendants"
        />
        <Text style={styles.time}>
          {getLanguageLabel(alert.language)}
        </Text>
      </View>

      {!compact ? (
        <>
          <Text style={styles.explanation}>{getAlertExplanation(alert.severity)}</Text>
          <View style={styles.notice}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.textSecondary}
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.noticeText}>
              Automatically generated alert. This information has not yet been
              independently verified.
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.compactNotice}>
          Automatically generated alert; not independently verified.
        </Text>
      )}

      <View style={styles.actionRow}>
        <Text style={styles.actionText}>View details</Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={COLORS.primary}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  status: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  titleCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  alertTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '800',
    lineHeight: 23,
  },
  reviewIndicator: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  location: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.cardTitle,
    fontWeight: '700',
    flex: 1,
    lineHeight: 23,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  time: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.secondary,
    flex: 1,
    lineHeight: 20,
  },
  explanation: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    lineHeight: 23,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADII.md,
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
    flex: 1,
  },
  compactNotice: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 19,
  },
  actionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  actionText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '700',
  },
});
