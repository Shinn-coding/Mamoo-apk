import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { useAppStore } from '@/store/use-app-store';
import { useThemedStyles } from '@/theme/theme-provider';
import { spacing, type ThemeColors } from '@/theme/theme';

export function PlaceholderScreen({ title, phase, icon }: { title: string; phase: number; icon: 'swap-horizontal-outline' | 'save-outline' | 'stats-chart-outline' | 'settings-outline' }) {
  const ready = useAppStore((state) => state.ready);
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      {ready ? (
        <EmptyState
          icon={icon}
          title={`${title} — Fase ${phase}`}
          message="Fitur ini dibangun pada fase berikutnya. Kerangka layar dan database lokal sudah siap."
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
});
