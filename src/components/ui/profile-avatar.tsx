import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useAppStore } from '@/store/use-app-store';
import { profileAvatarUri } from '@/utils/profile';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import type { ThemeColors } from '@/theme/theme';

type Props = {
  size?: number;
  /** tampilkan nama lain (mis. preview); default dari settings */
  name?: string;
};

/** Avatar profil lokal: foto tersimpan di HP, fallback huruf awal nama. */
export function ProfileAvatar({ size = 52, name }: Props) {
  const storedName = useAppStore((state) => state.settings.profileName);
  const avatarVersion = useAppStore((state) => state.settings.profileAvatarVersion);
  const [failed, setFailed] = useState(false);
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const displayName = (name ?? storedName).trim();
  const uri = profileAvatarUri(avatarVersion);
  const initial = Array.from(displayName)[0]?.toUpperCase() ?? '';

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {uri && !failed ? (
        <Image
          key={uri}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          onError={() => setFailed(true)}
          accessibilityLabel={displayName ? `Foto profil ${displayName}` : 'Foto profil'}
        />
      ) : initial ? (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.48} color={colors.primary} />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
});
