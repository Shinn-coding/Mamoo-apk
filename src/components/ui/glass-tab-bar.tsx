/**
 * Tab bar liquid glass ala iPhone.
 * - iOS     : liquid glass asli via expo-glass-effect.
 * - Android : panel translucent + hairline (tanpa blur native yang berat).
 *
 * Tab aktif berupa satu pill yang meluncur halus. Pill juga bisa di-drag
 * (pan) ke kiri/kanan lalu snap ke tab terdekat — tetap memakai tap biasa.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { GlassView } from 'expo-glass-effect';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';

import { useTheme, useThemedStyles } from '@/theme/theme-provider';
import { radius, spacing, type ThemeColors } from '@/theme/theme';

function GlassPanel({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  if (Platform.OS === 'ios') {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive>
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[
        styles.androidGlass,
        isDark && styles.androidGlassDark,
        style,
      ]}
    >
      <Svg style={styles.edge} pointerEvents="none">
        <Defs>
          <LinearGradient id="edgeGlow" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isDark ? '#94A3B0' : '#FFFFFF'} stopOpacity={0.8} />
            <Stop offset="0.5" stopColor={colors.border} stopOpacity={0.9} />
            <Stop offset="1" stopColor={isDark ? '#94A3B0' : '#FFFFFF'} stopOpacity={0.8} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          rx={35}
          fill="none"
          stroke="url(#edgeGlow)"
          strokeWidth={3}
        />
      </Svg>
      {children}
    </View>
  );
}

const BAR_HEIGHT = 72;
const INDICATOR_WIDTH = 58;
const INDICATOR_HEIGHT = 46;
const SPRING = { damping: 18, stiffness: 190, mass: 0.8 };

export function GlassTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth / state.routes.length;
  const maxX = Math.max(0, tabWidth * (state.routes.length - 1));
  const indicatorX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStretch = useSharedValue(1);

  useEffect(() => {
    if (tabWidth <= 0) return;
    indicatorX.value = withSpring(state.index * tabWidth, SPRING);
  }, [indicatorX, state.index, tabWidth]);

  const navigateToIndex = useCallback(
    (index: number) => {
      const route = state.routes[index];
      if (!route || index === state.index) return;
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigateToTab(route.key);
      }
    },
    [emitter, navigateToTab, state.index, state.routes],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(tabWidth > 0)
        .minDistance(8)
        .onBegin(() => {
          dragStartX.value = indicatorX.value;
        })
        .onUpdate((event) => {
          const next = Math.max(0, Math.min(maxX, dragStartX.value + event.translationX));
          indicatorX.value = next;
          const stretch = Math.min(1.12, 1 + Math.abs(event.translationX) / Math.max(tabWidth, 1) * 0.08);
          dragStretch.value = stretch;
        })
        .onEnd(() => {
          const nearest = Math.max(
            0,
            Math.min(
              state.routes.length - 1,
              Math.round(indicatorX.value / Math.max(tabWidth, 1)),
            ),
          );
          indicatorX.value = withSpring(nearest * tabWidth, SPRING);
          dragStretch.value = withSpring(1, SPRING);
          runOnJS(navigateToIndex)(nearest);
        })
        .onFinalize(() => {
          dragStretch.value = withSpring(1, SPRING);
        }),
    [
      dragStartX,
      dragStretch,
      indicatorX,
      maxX,
      navigateToIndex,
      state.routes.length,
      tabWidth,
    ],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: indicatorX.value },
      { scaleX: dragStretch.value },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 12 }]}
    >
      <GlassPanel style={styles.panel}>
        <GestureDetector gesture={pan}>
          <View style={styles.row} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
            {tabWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicator,
                  { left: (tabWidth - INDICATOR_WIDTH) / 2 },
                  indicatorStyle,
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
                  <View style={styles.iconBubble}>
                    {options.tabBarIcon?.({ focused, color, size: 24 })}
                  </View>
                  <Text style={[styles.label, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GestureDetector>
      </GlassPanel>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      backgroundColor: 'rgba(255, 255, 255, 0.74)',
    },
    androidGlassDark: {
      backgroundColor: 'rgba(18, 26, 22, 0.82)',
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
      width: INDICATOR_WIDTH,
      height: INDICATOR_HEIGHT,
      borderRadius: INDICATOR_HEIGHT / 2,
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
