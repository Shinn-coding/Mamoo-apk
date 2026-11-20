import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppLock } from '@/components/ui/app-lock';
import { BubbleSplash } from '@/components/ui/bubble-splash';
import { useAppStore } from '@/store/use-app-store';
import { ThemeProvider, useTheme, useThemedStyles } from '@/theme/theme-provider';
import { spacing, type ThemeColors } from '@/theme/theme';

SplashScreen.preventAutoHideAsync();

const LOCK_AFTER_BACKGROUND_MS = 30_000;

function RootContent() {
  const { ready, initError, init } = useAppStore();
  const appLockEnabled = useAppStore((state) => state.settings.appLockEnabled);
  const { isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [unlocked, setUnlocked] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const backgroundAt = useRef<number | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (ready || initError) {
      void SplashScreen.hideAsync();
    }
  }, [ready, initError]);

  // Kunci lagi setelah app cukup lama di background. Grace period 30 detik
  // mencegah lock mengganggu saat membuka kamera / share sheet sebentar.
  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      if (previous === 'active' && next === 'background') {
        backgroundAt.current = Date.now();
      }
      if (
        next === 'active' &&
        previous !== 'active' &&
        appLockEnabled &&
        backgroundAt.current !== null &&
        Date.now() - backgroundAt.current >= LOCK_AFTER_BACKGROUND_MS
      ) {
        setUnlocked(false);
      }
      if (next === 'active') {
        backgroundAt.current = null;
      }
      previous = next;
    });
    return () => subscription.remove();
  }, [appLockEnabled]);

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Aplikasi tidak bisa dibuka</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Text style={styles.errorMessage}>
          Coba tutup dan buka lagi aplikasinya. Data lokal tidak akan hilang.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={!splashDone || isDark ? 'light' : 'dark'} />
      {ready ? (
        appLockEnabled && !unlocked ? (
          <AppLock active={splashDone} onUnlock={() => setUnlocked(true)} />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="transaction/new"
              options={{ presentation: 'modal', title: 'Tambah Transaksi' }}
            />
            <Stack.Screen
              name="pin-setup"
              options={{ presentation: 'modal', title: 'Kunci Aplikasi' }}
            />
          </Stack>
        )
      ) : null}

      {/* Intro adalah overlay, bukan layar pengganti. Layar utama sudah
          ter-mount di belakangnya supaya fade tidak memperlihatkan root
          window yang hitam. */}
      {!splashDone ? <BubbleSplash onDone={() => setSplashDone(true)} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const themeMode = useAppStore((state) => state.settings.themeMode);
  return (
    <GestureHandlerRootView style={baseStyles.flex}>
      <ThemeProvider mode={themeMode}>
        <RootContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const baseStyles = StyleSheet.create({
  flex: { flex: 1 },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    errorContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    errorTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    errorMessage: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  });
