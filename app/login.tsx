import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '../lib/constants';
import { login, wakeup } from '../lib/auth';
import { AuthContext } from './_layout';

export default function LoginScreen() {
  const { isAuthenticated, onSignIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [error, setError] = useState('');
  const passwordInput = useRef<TextInput>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    wakeup();
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setLoading(true);
    setSlowHint(false);
    setError('');
    slowTimer.current = setTimeout(() => setSlowHint(true), 5000);

    try {
      const signedInUser = await login(email.trim(), password);
      onSignIn(signedInUser);
    } catch (caught: unknown) {
      const status =
        typeof caught === 'object' &&
        caught !== null &&
        'response' in caught &&
        typeof caught.response === 'object' &&
        caught.response !== null &&
        'status' in caught.response
          ? caught.response.status
          : null;

      setError(
        status === 401
          ? 'The email or password wasn’t recognized.'
          : 'We couldn’t connect to EchoSense. Check your connection and try again.'
      );
    } finally {
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
      setLoading(false);
      setSlowHint(false);
    }
  }

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Ionicons
                name="school-outline"
                size={30}
                color={COLORS.primary}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <Text accessibilityRole="header" style={styles.logo}>
              EchoSense
            </Text>
            <Text style={styles.subtitle}>
              Classroom alerts, presented clearly for school staff.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text accessibilityRole="header" style={styles.formTitle}>
              Sign in
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                accessibilityLabel="Email address"
                placeholder="name@school.edu"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInput.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordInput}
                  style={[styles.input, styles.passwordInput]}
                  accessibilityLabel="Password"
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((value) => !value)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={COLORS.textSecondary}
                    importantForAccessibility="no-hide-descendants"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}
            {slowHint && !error ? (
              <Text accessibilityLiveRegion="polite" style={styles.hint}>
                EchoSense is taking a little longer to respond. Please keep this
                screen open.
              </Text>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
              accessibilityState={{ disabled: loading, busy: loading }}
              style={[styles.button, loading && styles.buttonLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.75}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.informationBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logo: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    maxWidth: 320,
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.secondary,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: SPACING.lg,
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.lg,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.sectionTitle,
    fontWeight: '700',
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.secondary,
    fontWeight: '600',
  },
  input: {
    minHeight: 52,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 56,
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: TYPOGRAPHY.secondary,
    color: COLORS.danger,
    lineHeight: 21,
  },
  hint: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  button: {
    minHeight: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
  },
});
