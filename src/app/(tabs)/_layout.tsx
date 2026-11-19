import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassTabBar } from '@/components/ui/glass-tab-bar';
import { colors } from '@/theme/theme';

const TAB_ICONS = {
  index: 'home-outline',
  transactions: 'swap-horizontal-outline',
  savings: 'save-outline',
  reports: 'stats-chart-outline',
  settings: 'settings-outline',
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        // Transisi layar antar tab: cross-fade halus.
        animation: 'fade',
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

const styles = StyleSheet.create({
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
