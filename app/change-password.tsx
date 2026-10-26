import { Redirect, router } from 'expo-router';
import React, { useContext, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changePassword, fetchMe, getHttpStatus } from '../lib/api';
import { logout, storeUser } from '../lib/auth';
import { clearPushRegistration } from '../lib/notifications';
import { MIN_PASSWORD_LENGTH, completePasswordChange } from '../lib/password';
import { FONTS, SPACE, TYPE } from '../lib/theme';
import { makeStyles } from '../lib/useTheme';
import { Button, Notice, TextField } from '../components/ui';
import { AuthContext } from './_layout';

export default function ChangePasswordScreen() {
  const { isAuthenticated, user, onUserUpdated, onSignOut } =
    useContext(AuthContext);
  const styles = useStyles();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const newInput = useRef<TextInput>(null);
  const confirmInput = useRef<TextInput>(null);
  const forced = user?.must_change_password === true;

  async function handleSubmit() {
    setSaving(true);
    setError('');
    const result = await completePasswordChange(
      { currentPassword, newPassword, confirmPassword },
      { changePassword, fetchMe, getStatus: getHttpStatus }
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    await storeUser(result.user).catch(() => {});
    // Clearing the flag unblocks the tabs and starts push registration.
    onUserUpdated(result.user);
    router.replace('/alerts');
  }

  async function handleSignOut() {
    try {
      await clearPushRegistration();
    } catch {
      // Nothing was registered while the change was pending.
    }
    await logout();
    onSignOut();
    router.replace('/login');
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
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
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {forced ? 'Choose a new password' : 'Change password'}
              </Text>
              <Text style={styles.subtitle}>
                {forced
                  ? 'Your account has a temporary password. Choose your own before you continue.'
                  : `Use at least ${MIN_PASSWORD_LENGTH} characters, different from your current password.`}
              </Text>
              {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
            </View>

            <TextField
              label="Current password"
              secure
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => newInput.current?.focus()}
            />
            <TextField
              ref={newInput}
              label="New password"
              secure
              value={newPassword}
              onChangeText={setNewPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              onSubmitEditing={() => confirmInput.current?.focus()}
            />
            <TextField
              ref={confirmInput}
              label="Confirm new password"
              secure
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error ? <Notice tone="danger">{error}</Notice> : null}

            <Button
              label={saving ? 'Saving…' : 'Change password'}
              variant="primary"
              pending={saving}
              onPress={handleSubmit}
            />
            {forced ? (
              <Button label="Sign out" variant="quiet" onPress={handleSignOut} />
            ) : (
              <Button
                label="Cancel"
                variant="quiet"
                onPress={() =>
                  router.canGoBack() ? router.back() : router.replace('/profile')
                }
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  heading: {
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
  email: {
    color: palette.text,
    fontFamily: FONTS.medium,
    ...TYPE.small,
    marginTop: SPACE.xs,
  },
}));
