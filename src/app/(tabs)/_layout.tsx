import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { GlassTabBar } from '@/components/ui/glass-tab-bar';
import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import type { ThemeColors } from '@/theme/theme';

const TAB_ICONS = {
  index: 'home-outline',
  transactions: 'swap-horizontal-outline',
  savings: 'save-outline',
  reports: 'stats-chart-outline',
  settings: 'settings-outline',
} as const;

export default function TabsLayout() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      detachInactiveScreens
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        // Standar native: instan tanpa cross-fade delay dan tanpa kebocoran warna kontainer di mode gelap
        animation: 'none',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarLabel: 'Beranda', tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS.index} size={24} color={String(color)} /> }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transaksi', tabBarLabel: 'Transaksi', tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS.transactions} size={24} color={String(color)} /> }} />
      <Tabs.Screen name="savings" options={{ title: 'Tabungan', tabBarLabel: 'Tabungan', tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS.savings} size={24} color={String(color)} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Laporan', tabBarLabel: 'Laporan', tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS.reports} size={24} color={String(color)} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Pengaturan', tabBarLabel: 'Pengaturan', tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS.settings} size={24} color={String(color)} /> }} />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.background,
      shadowOpacity: 0,
      elevation: 0,
    },
    headerTitle: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 17,
    },
  });
