import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearPushToken, getErrorDetail, getHttpStatus } from '../lib/api';
import {
  clearLocalPushRegistration,
  getToken,
  login,
  logout,
  wakeup,
} from '../lib/auth';
import { SERVER_SWITCHING_ENABLED } from '../lib/constants';
import {
  SERVER_RULES,
  checkServerHealth,
  getServerUrl,
  saveServer,
} from '../lib/server';
import {
  LIVE_SERVER_URL,
  describeServer,
  isLiveServer,
  switchServer,
} from '../lib/serverConfig';
import { SCHOOL_INACTIVE_MESSAGE, classifyAuthFailure } from '../lib/session';
import { FONTS, RADIUS, SPACE, TYPE } from '../lib/theme';
import { makeStyles } from '../lib/useTheme';
import { Button, Notice, TextField } from '../components/ui';
import { AuthContext } from './_layout';

export default function LoginScreen() {
  const { isAuthenticated, onSignIn, signOutReason } = useContext(AuthContext);
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [error, setError] = useState('');
  const [serverUrl, setServerUrl] = useState(getServerUrl());
  const passwordInput = useRef<TextInput>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    wakeup();
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, [serverUrl]);

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
      setPassword('');
      onSignIn(signedInUser);
    } catch (caught: unknown) {
      const status = getHttpStatus(caught);
      const failure = classifyAuthFailure(status, getErrorDetail(caught));
      setError(
        failure === 'school-inactive'
          ? SCHOOL_INACTIVE_MESSAGE
          : status === 401
            ? 'The email or password wasn’t recognized.'
            : `We couldn’t connect to ${describeServer(serverUrl)}. Check your connection and try again.`
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
    // The root layout routes a signed-in user: the forced password change,
    // a pending notification, or Alerts. A second redirect here would race it.
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark} />
              <Text style={styles.brand}>EchoSense</Text>
            </View>

            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                Sign in
              </Text>
              <Text style={styles.subtitle}>
                Use the account your school administrator gave you.
              </Text>
            </View>

            {signOutReason === 'school_inactive' && !error ? (
              <Notice tone="danger">{SCHOOL_INACTIVE_MESSAGE}</Notice>
            ) : null}

            <TextField
              label="Email address"
              placeholder="name@school.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordInput.current?.focus()}
            />
            <TextField
              ref={passwordInput}
              label="Password"
              secure
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            {error ? <Notice tone="danger">{error}</Notice> : null}
            {slowHint && !error ? (
              <Text accessibilityLiveRegion="polite" style={styles.hint}>
                {isLiveServer(serverUrl)
                  ? 'The live server can take up to a minute to wake up. Please keep this screen open.'
                  : 'EchoSense is taking a little longer to respond. Please keep this screen open.'}
              </Text>
            ) : null}

            <Button
              label={loading ? 'Signing in…' : 'Sign in'}
              variant="primary"
              pending={loading}
              onPress={handleLogin}
            />

            {SERVER_SWITCHING_ENABLED ? (
              <ServerOption
                serverUrl={serverUrl}
                disabled={loading}
                onChanged={(url) => {
                  setServerUrl(url);
                  setError('');
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ServerOption({
  serverUrl,
  disabled,
  onChanged,
}: {
  serverUrl: string;
  disabled: boolean;
  onChanged: (url: string) => void;
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'live' | 'local'>(
    isLiveServer(serverUrl) ? 'live' : 'local'
  );
  const [address, setAddress] = useState(
    isLiveServer(serverUrl) ? '' : serverUrl
  );
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ tone: 'neutral' | 'danger'; text: string } | null>(null);

  async function save() {
    setChecking(true);
    setMessage(null);
    const result = await switchServer(mode === 'live' ? LIVE_SERVER_URL : address, {
      currentUrl: getServerUrl(),
      rules: SERVER_RULES,
      checkHealth: checkServerHealth,
      hasSession: async () => Boolean(await getToken()),
      detachPushToken: clearPushToken,
      clearLocalPushRegistration,
      signOut: () => logout('signed_out'),
      saveServer,
    });
    setChecking(false);

    switch (result.status) {
      case 'invalid':
        setMessage({ tone: 'danger', text: result.error });
        break;
      case 'unreachable':
        setMessage({
          tone: 'danger',
          text: 'That server didn’t answer. Check the address, that the server is running, and that this phone is on the same Wi-Fi.',
        });
        break;
      case 'unchanged':
        setOpen(false);
        break;
      case 'switched':
        onChanged(result.url);
        setMessage({ tone: 'neutral', text: `Connected to ${describeServer(result.url)}.` });
        setOpen(false);
        break;
    }
  }

  return (
    <View style={styles.server}>
      <View style={styles.serverRow}>
        <Text style={styles.serverText} accessibilityLabel={`Server: ${describeServer(serverUrl)}`}>
          Server: {describeServer(serverUrl)}
        </Text>
        <Button
          label={open ? 'Cancel' : 'Change'}
          variant="quiet"
          disabled={disabled || checking}
          accessibilityLabel={open ? 'Cancel server change' : 'Change server'}
          onPress={() => {
            setOpen((value) => !value);
            setMessage(null);
          }}
        />
      </View>

      {open ? (
        <View style={styles.serverPanel}>
          {(['live', 'local'] as const).map((option) => {
            const selected = mode === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => setMode(option)}
                style={styles.radioRow}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.radioLabel}>
                  {option === 'live' ? 'Live (Render)' : 'Local address'}
                </Text>
              </Pressable>
            );
          })}
          {mode === 'local' ? (
            <TextField
              label="Local server address"
              placeholder="http://192.168.1.20:8000"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint={
                SERVER_RULES.allowLoopback
                  ? 'The computer running the EchoSense backend. On this simulator, http://localhost:8000 also works.'
                  : 'The computer running the EchoSense backend, on the same Wi-Fi.'
              }
            />
          ) : null}
          <Button
            label={checking ? 'Checking…' : 'Check and save'}
            variant="secondary"
            pending={checking}
            onPress={save}
          />
        </View>
      ) : null}

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </View>
  );
}

const useStyles = makeStyles((palette) => ({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xxl,
  },
  column: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: SPACE.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  brandMark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.brand,
  },
  brand: {
    color: palette.text,
    fontFamily: FONTS.semibold,
    ...TYPE.bodyLarge,
  },
  heading: {
    gap: SPACE.xs,
    marginTop: SPACE.lg,
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
  hint: {
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  server: {
    gap: SPACE.sm,
    marginTop: SPACE.lg,
    paddingTop: SPACE.md,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
  },
  serverText: {
    flex: 1,
    color: palette.textMuted,
    fontFamily: FONTS.regular,
    ...TYPE.small,
  },
  serverPanel: {
    gap: SPACE.md,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: RADIUS.panel,
    backgroundColor: palette.surfaceMuted,
  },
  radioRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: palette.text,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.text,
  },
  radioLabel: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.body,
  },
}));
