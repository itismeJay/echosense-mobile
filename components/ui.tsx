import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles, useTheme } from '../lib/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  pending = false,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  pending?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useTheme();
  const styles = useStyles();
  const inactive = disabled || pending;
  const textColor =
    variant === 'primary'
      ? palette.onBrand
      : variant === 'danger'
        ? palette.danger
        : variant === 'quiet'
          ? palette.link
          : palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'primary' && pressed && styles.primaryPressed,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.dangerButton,
        variant === 'quiet' && styles.quiet,
        pressed && variant !== 'primary' && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={textColor}
          importantForAccessibility="no-hide-descendants"
        />
      ) : null}
      <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export const TextField = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    secure?: boolean;
    hint?: string;
  }
>(function TextField({ label, secure = false, hint, style, ...props }, ref) {
  const palette = useTheme();
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={secure && !visible}
          autoCapitalize={secure ? 'none' : props.autoCapitalize}
          autoCorrect={secure ? false : props.autoCorrect}
          {...props}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[
            styles.input,
            secure && styles.inputWithToggle,
            focused && styles.inputFocused,
            style,
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onPress={() => setVisible((value) => !value)}
            style={styles.toggle}
            hitSlop={4}
          >
            <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const styles = useStyles();
  return (
    <Text accessibilityRole="header" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

export function InfoRow({
  label,
  value,
  selectable = false,
}: {
  label: string;
  value: string;
  selectable?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable={selectable}>
        {value}
      </Text>
    </View>
  );
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

export function Notice({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'danger';
}) {
  const styles = useStyles();
  return (
    <View
      style={[styles.notice, tone === 'danger' && styles.noticeDanger]}
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'danger' ? 'assertive' : 'polite'}
    >
      <Text style={[styles.noticeText, tone === 'danger' && styles.noticeTextDanger]}>
        {children}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: {
    backgroundColor: palette.brand,
    borderColor: palette.brand,
  },
  primaryPressed: {
    backgroundColor: palette.brandPressed,
    borderColor: palette.brandPressed,
  },
  secondary: {
    backgroundColor: palette.surface,
    borderColor: palette.lineStrong,
  },
  dangerButton: {
    backgroundColor: palette.surface,
    borderColor: palette.danger,
  },
  quiet: {
    minHeight: 44,
    paddingHorizontal: SPACE.sm,
  },
  pressed: {
    backgroundColor: palette.surfaceMuted,
  },
  inactive: {
    opacity: 0.55,
  },
  buttonLabel: {
    fontFamily: FONTS.semibold,
    ...TYPE.body,
  },
  field: {
    gap: SPACE.xs + 2,
  },
  label: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    color: palette.text,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: RADIUS.control,
    fontFamily: FONTS.regular,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 64,
  },
  inputFocused: {
    borderColor: palette.focus,
    borderWidth: 2,
    paddingHorizontal: SPACE.md - 1,
  },
  toggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.md,
  },
  toggleText: {
    color: palette.link,
    fontFamily: FONTS.semibold,
    ...TYPE.small,
  },
  hint: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: RADIUS.panel,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  header: {
    gap: SPACE.xs,
  },
  title: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.display,
  },
  subtitle: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.body,
  },
  sectionTitle: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
  infoRow: {
    paddingVertical: SPACE.sm,
    gap: 2,
  },
  infoLabel: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  infoValue: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
  },
  notice: {
    padding: SPACE.md,
    borderRadius: RADIUS.control,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.line,
  },
  noticeDanger: {
    backgroundColor: palette.dangerBackground,
    borderColor: palette.danger,
  },
  noticeText: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  noticeTextDanger: {
    color: palette.danger,
    fontFamily: FONTS.medium,
  },
}));
