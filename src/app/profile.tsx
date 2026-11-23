import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AlertButton,
} from 'react-native';
import { Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { PROFILE_NAME_MAX, PROFILE_PHOTO_MAX_MB } from '@/constants/profile';
import { useAppStore } from '@/store/use-app-store';
import {
  pickProfilePhoto,
  removeProfilePhoto,
  sanitizeProfileName,
  type ProfilePhotoSource,
} from '@/utils/profile';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, shadow, spacing, surfaceCard, type ThemeColors } from '@/theme/theme';

type Busy = 'photo' | 'name' | null;

export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const profileName = useAppStore((state) => state.settings.profileName);
  const hasPhoto = useAppStore((state) => state.settings.profileAvatarVersion.length > 0);
  const changeProfileName = useAppStore((state) => state.changeProfileName);
  const refreshSettings = useAppStore((state) => state.refreshSettings);

  const [name, setName] = useState(profileName);
  const [busy, setBusy] = useState<Busy>(null);

  useEffect(() => {
    setName(profileName);
  }, [profileName]);

  const choosePhoto = (source: ProfilePhotoSource) => {
    if (busy) return;
    setBusy('photo');
    void (async () => {
      try {
        const version = await pickProfilePhoto(source);
        if (version) await refreshSettings();
      } catch (error) {
        Alert.alert(
          'Foto gagal dipasang',
          error instanceof Error ? error.message : 'Coba pilih foto lain ya.',
        );
      } finally {
        setBusy(null);
      }
    })();
  };

  const deletePhoto = () => {
    if (busy) return;
    setBusy('photo');
    void (async () => {
      try {
        await removeProfilePhoto();
        await refreshSettings();
      } catch (error) {
        Alert.alert(
          'Foto gagal dihapus',
          error instanceof Error ? error.message : 'Coba lagi ya.',
        );
      } finally {
        setBusy(null);
      }
    })();
  };

  const openPhotoMenu = () => {
    if (busy) return;
    const buttons: AlertButton[] = [
      { text: 'Pilih dari Galeri', onPress: () => choosePhoto('library') },
      { text: 'Ambil dari Kamera', onPress: () => choosePhoto('camera') },
      { text: 'Batal', style: 'cancel' },
    ];
    Alert.alert(
      'Foto Profil',
      `Pilih sumber foto. Maksimal ${PROFILE_PHOTO_MAX_MB} MB dan otomatis diperkecil.`,
      buttons,
    );
  };

  const confirmDeletePhoto = () => {
    Alert.alert('Hapus foto profil?', 'Foto akan dihapus dari HP ini.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: deletePhoto },
    ]);
  };

  const saveName = () => {
    if (busy) return;
    setBusy('name');
    void (async () => {
      try {
        const clean = sanitizeProfileName(name);
        await changeProfileName(clean);
        setName(clean);
        Alert.alert(
          'Tersimpan',
          clean
            ? `Halo, ${clean}! Nama profilmu sudah diperbarui.`
            : 'Nama profil dikosongkan.',
        );
      } catch (error) {
        Alert.alert(
          'Gagal menyimpan',
          error instanceof Error ? error.message : 'Coba lagi ya.',
        );
      } finally {
        setBusy(null);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profil',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable
            onPress={openPhotoMenu}
            disabled={busy !== null}
            accessibilityRole="button"
            accessibilityLabel="Ganti foto profil"
            style={({ pressed }) => [styles.avatarButton, pressed && styles.avatarPressed]}
          >
            <ProfileAvatar size={116} />
            <View style={styles.cameraBadge}>
              {busy === 'photo' ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="camera" size={18} color={colors.onPrimary} />
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarTitle}>{profileName ? `Halo, ${profileName}` : 'Kenalan dulu, yuk'}</Text>
          <Text style={styles.avatarHint}>
            Ketuk foto untuk memilih dari galeri atau kamera.
          </Text>
          {hasPhoto ? (
            <Pressable
              onPress={confirmDeletePhoto}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Hapus foto profil"
              hitSlop={8}
            >
              <Text style={styles.removePhoto}>Hapus foto profil</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nama panggilan</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Rina"
            placeholderTextColor={colors.textMuted}
            maxLength={PROFILE_NAME_MAX}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={saveName}
            editable={busy === null}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.counter}>
              {name.length}/{PROFILE_NAME_MAX}
            </Text>
            <Pressable
              onPress={saveName}
              disabled={busy !== null}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.saveButton,
                busy !== null && styles.saveButtonDisabled,
                pressed && styles.saveButtonPressed,
              ]}
            >
              {busy === 'name' ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveText}>Simpan Nama</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Nama ini dipakai untuk sapaan di Beranda. Tidak dikirim ke mana pun.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Profil hanya tersimpan di HP ini. Tanpa akun, tanpa login, tanpa internet.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Foto maksimal {PROFILE_PHOTO_MAX_MB} MB, otomatis diperkecil jadi ±150 KB supaya
              aplikasi tetap ringan.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Foto tidak ikut file backup JSON agar backup tetap kecil. Nama bisa diatur ulang
              kapan saja.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  avatarSection: { alignItems: 'center', gap: spacing.xs },
  avatarButton: {
    width: 116,
    height: 116,
    borderRadius: 58,
    marginBottom: spacing.sm,
  },
  avatarPressed: { opacity: 0.85 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.background,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  avatarHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
  removePhoto: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.expense,
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
    ...surfaceCard(colors),
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  counter: { fontSize: 12, color: colors.textMuted },
  saveButton: {
    minWidth: 128,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonPressed: { backgroundColor: colors.primaryDark },
  saveText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});
