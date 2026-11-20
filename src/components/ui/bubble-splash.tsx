/**
 * Intro Mamoo versi 1.1.2.
 * Minimalis mengikuti wordmark pada brand board: background hijau solid,
 * wordmark putih besar, fade/scale ringan. Tanpa partikel, aurora, audio,
 * atau animasi SVG di JS thread — aman untuk HP menengah ke bawah.
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';

import WORDMARK from '@/assets/images/mamoo-wordmark.png';
const WORDMARK_RATIO = 1200 / 257;
const INTRO_BG = '#179C51';
const HOLD_MS = 850;

export function BubbleSplash({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const wordmarkWidth = Math.min(width * 0.66, 320);
  const wordmarkHeight = wordmarkWidth / WORDMARK_RATIO;
  const fade = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const lift = useRef(new Animated.Value(10)).current;
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.02,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  };

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    enter.start();
    const timer = setTimeout(finish, 520 + HOLD_MS);
    return () => {
      clearTimeout(timer);
      enter.stop();
    };
    // finish hanya memakai ref/Animated.Value yang stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: fade }]} accessibilityViewIsModal>
      <Pressable
        style={styles.fill}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Lewati intro"
      >
        <Animated.View
          style={[
            styles.wordmarkWrap,
            { opacity, transform: [{ translateY: lift }, { scale }] },
          ]}
        >
          <Image
            source={WORDMARK}
            style={{ width: wordmarkWidth, height: wordmarkHeight }}
            contentFit="contain"
            cachePolicy="memory"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: INTRO_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  wordmarkWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
