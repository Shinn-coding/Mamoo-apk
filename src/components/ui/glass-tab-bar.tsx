/**
 * Tab bar liquid glass ala iPhone iOS 26.
 * - iOS     : liquid glass asli via expo-glass-effect
 * - Android : panel translucent + hairline (TANPA mesin blur native —
 *   snapshot dimezis menggambar ulang isi layar di atas tab bar).
 *
 * Highlight tab aktif berupa SATU lingkaran yang meluncur halus dari tab
 * lama ke tab baru (Animated spring), bukan latar per-tab yang melompat.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GlassView } from 'expo-glass-effect';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';

import { colors, radius, spacing } from '@/theme/theme';

/** Panel glass konsisten di semua perangkat. */
function GlassPanel({ style, children }: { style?: object; children: ReactNode }) {
  if (Platform.OS === 'ios') {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.androidGlass, style]}>
      {/* Tepi gradient putih–abu: stroke 3px, setengah luarnya terpotong
          overflow hidden sehingga yang terlihat pas 1.5px di tepi saja */}
      <Svg style={styles.edge} pointerEvents="none">
        <Defs>
          <LinearGradient id="edgeGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="0.5" stopColor="#CBD5E1" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" rx={35} fill="none" stroke="url(#edgeGlow)" strokeWidth={3} />
      </Svg>
      {children}
    </View>
  );
}

const BAR_HEIGHT = 72;
const INDICATOR_SIZE = 46;

export function GlassTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth / state.routes.length;
  const slideX = useRef(new Animated.Value(0)).current;
  const lastIndex = useRef(state.index);

  // Geser lingkaran aktif ke tab baru dengan animasi spring.
  useEffect(() => {
    if (tabWidth <= 0) return;
    const target = state.index * tabWidth;
    if (lastIndex.current === state.index) {
      slideX.setValue(target);
      return;
    }
    lastIndex.current = state.index;
    Animated.spring(slideX, {
      toValue: target,
      useNativeDriver: true,
      damping: 17,
      stiffness: 170,
      mass: 0.9,
    }).start();
  }, [state.index, tabWidth, slideX]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 12 }]}
    >
      <GlassPanel style={styles.panel}>
        <View style={styles.row} onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
          {/* Lingkaran aktif yang meluncur antar tab */}
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.indicator,
                { left: (tabWidth - INDICATOR_SIZE) / 2, transform: [{ translateX: slideX }] },
              ]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;
            const color = focused ? colors.primary : colors.textMuted;

            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigateToTab(route.key);
              }
            };
            const onLongPress = () => {
              emitter.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                style={styles.tab}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
              >
                <View style={styles.iconBubble}>{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  panel: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: '#0A2A1C',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  androidGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    backgroundColor: colors.primaryLight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
