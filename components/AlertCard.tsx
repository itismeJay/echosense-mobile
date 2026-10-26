import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { getLanguageLabel } from '../lib/alertEvidence';
import {
  formatDateTime,
  getAlertTitle,
  getPriorityLabel,
  normalizeSeverity,
} from '../lib/presentation';
import { normalizeReviewStatus, reviewStatusLabel } from '../lib/review';
import { FONTS, RADIUS, SPACE, TYPE, severityColors } from '../lib/theme';
import type { Alert } from '../lib/types';
import { makeStyles, useTheme } from '../lib/useTheme';
import SeverityBadge from './SeverityBadge';

interface Props {
  alert: Alert;
  onPress: () => void;
  /** Super admins see alerts from every school. */
  showSchool?: boolean;
}

export default function AlertCard({ alert, onPress, showSchool = false }: Props) {
  const palette = useTheme();
  const styles = useStyles();
  const severity = normalizeSeverity(alert.severity);
  const stripe = severityColors(palette, severity).color;
  const classroom =
    alert.classroom_name?.trim() || alert.location?.trim() || 'Classroom unavailable';
  const school = alert.school_name?.trim() || 'School unavailable';
  const status = normalizeReviewStatus(alert.status);
  const accessibilityLabel = [
    `${getPriorityLabel(alert.severity)} severity`,
    classroom,
    showSchool ? school : null,
    formatDateTime(alert.created_at),
    reviewStatusLabel(alert.status),
    'View details',
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens the alert so you can review it"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.stripe, { backgroundColor: stripe }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <SeverityBadge severity={alert.severity} size="sm" />
          <Text
            style={[
              styles.status,
              status === 'active' ? styles.statusActive : null,
            ]}
          >
            {reviewStatusLabel(alert.status)}
          </Text>
        </View>
        <Text style={styles.classroom}>{classroom}</Text>
        {showSchool ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="business-outline"
              size={14}
              color={palette.textMuted}
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.meta}>{school}</Text>
          </View>
        ) : null}
        <Text style={styles.summary}>{getAlertTitle(alert.severity)}</Text>
        <View style={styles.footer}>
          <Text style={styles.meta}>
            {formatDateTime(alert.created_at)} · {getLanguageLabel(alert.language)}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.textMuted}
            importantForAccessibility="no-hide-descendants"
          />
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((palette) => ({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderRadius: RADIUS.panel,
    borderWidth: 1,
    borderColor: palette.line,
    marginBottom: SPACE.sm,
  },
  pressed: {
    backgroundColor: palette.surfaceMuted,
  },
  stripe: {
    width: 4,
  },
  body: {
    flex: 1,
    padding: SPACE.md,
    paddingLeft: SPACE.md,
    gap: SPACE.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    marginBottom: 2,
  },
  status: {
    color: palette.textMuted,
    fontFamily: FONTS.medium,
    ...TYPE.small,
  },
  statusActive: {
    color: palette.text,
    fontFamily: FONTS.semibold,
  },
  classroom: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
  summary: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    marginTop: 2,
  },
  meta: {
    flex: 1,
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
    fontVariant: ['tabular-nums'],
  },
}));
