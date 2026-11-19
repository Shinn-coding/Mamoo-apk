/**
 * Splash premium Mamoo (versi digital):
 *  1. Latar gradient + aurora + partikel garis (data stream).
 *  2. Glass app-tile (squircle) muncul.
 *  3. Monogram m digambar sebagai satu garis, lalu panah naik dan mengunci
 *     dengan sparkle emas tipis.
 *  4. Wordmark stagger per huruf + shimmer + hairline + tagline.
 *  5. Exit: lockup membesar halus + fade. Bisa diketuk untuk skip.
 * Semua offline — tanpa dependency animasi tambahan.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';

import clingSound from '@/assets/sounds/cling.wav';
import popSound from '@/assets/sounds/pop.wav';
import { colors } from '@/theme/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type ParticleSpec = { left: number; height: number; delay: number; duration: number };

const PARTICLES: ParticleSpec[] = [
  { left: 0.08, height: 14, delay: 0, duration: 2600 },
  { left: 0.22, height: 9, delay: 650, duration: 2900 },
  { left: 0.46, height: 18, delay: 300, duration: 2500 },
  { left: 0.63, height: 11, delay: 1000, duration: 2800 },
  { left: 0.81, height: 16, delay: 450, duration: 2600 },
  { left: 0.93, height: 8, delay: 1200, duration: 3000 },
];

const WORD = 'Mamoo'.split('');
const LETTER_STAGGER = 80;
const WORD_START = 1870;
const TOTAL_MS = 3100;

const EMBLEM = 252; // px
const MARK_SCALE = 0.85;
const MARK_CX = 102;
const MARK_CY = 92.5;
const MARK_STROKE = 14;

// Path mark dalam viewBox 200x200. Harus sama dengan scripts/make-logo.mjs.
const MARK_BODY = 'M 48 150 L 48 100 C 48 82 60 72 78 72 C 92 72 97 82 97 98 L 97 150';
const MARK_ARCH = 'M 97 98 C 97 82 106 72 122 72 C 136 72 146 82 146 98';
const MARK_SHAFT = 'M 146 150 L 146 56';
const MARK_HEAD = 'M 146 28 L 129 60 L 146 52 L 163 60 Z';
const MARK_SPARK =
  'M 146 17 C 147 24 150 27 157 28 C 150 29 147 32 146 39 C 145 32 142 29 135 28 C 142 27 145 24 146 17 Z';
// Bbox mark sudah center secara geometris. Nudge kecil ini hanya untuk
// keseimbangan optis di dalam tile: massa huruf m terasa sedikit ke kiri/bawah.
const MARK_NUDGE_X = 1.5;
const MARK_NUDGE_Y = -1.5;
const MARK_TRANSFORM = `translate(${100 + MARK_NUDGE_X} ${100 + MARK_NUDGE_Y}) scale(${MARK_SCALE}) translate(${-MARK_CX} ${-MARK_CY})`;

// Sedikit lebih panjang dari panjang path asli, supaya garis benar-benar
// tersembunyi saat dashoffset masih penuh.
const BODY_DASH = 170;
const ARCH_DASH = 70;
const SHAFT_DASH = 110;
// Gap jauh lebih panjang dari mark. Dengan gap sepanjang ini tidak ada
// potongan dash kedua di ujung path, jadi tidak muncul titik lebih awal.
const DASH_GAP = 1000;

/** Dot-grid hiasan di dua sudut luar tile. */
const GRID_DOTS = [
  ...Array.from({ length: 9 }, (_, i) => ({
    x: 154 + (i % 3) * 5.5,
    y: 20 + Math.floor(i / 3) * 5.5,
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    x: 25 + (i % 3) * 5.5,
    y: 154 + Math.floor(i / 3) * 5.5,
  })),
];

export function BubbleSplash({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  const lockupScale = useRef(new Animated.Value(1)).current;
  const frameReveal = useRef(new Animated.Value(0)).current;
  const dividerScale = useRef(new Animated.Value(0)).current;
  const bodyDraw = useRef(new Animated.Value(0)).current;
  const archDraw = useRef(new Animated.Value(0)).current;
  const shaftDraw = useRef(new Animated.Value(0)).current;
  const headOpacity = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const letterScales = useRef(WORD.map(() => new Animated.Value(0))).current;
  const letterOpacities = useRef(WORD.map(() => new Animated.Value(0))).current;
  const shimmerX = useRef(new Animated.Value(-80)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;
  const auroraDrift = useRef(new Animated.Value(0)).current;
  const particles = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  const wordWidth = useRef(0);
  const [wordWidthReady, setWordWidthReady] = useState(false);
  const [done, setDone] = useState(false);

  // Suara di-preload sejak awal supaya cling tidak telat karena loading player.
  const clingPlayer = useAudioPlayer(clingSound);
  const popPlayer = useAudioPlayer(popSound);

  const finish = () => {
    if (done) return;
    setDone(true);
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(lockupScale, { toValue: 1.035, duration: 320, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  useEffect(() => {
    // --- aurora blob bergerak sangat lambat bolak-balik ---
    const auroraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auroraDrift, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(auroraDrift, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    auroraLoop.start();

    // --- partikel garis naik sekali selama intro ---
    PARTICLES.forEach((spec, i) => {
      Animated.sequence([
        Animated.delay(spec.delay),
        Animated.timing(particles[i], {
          toValue: 1,
          duration: spec.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });

    // --- tile kaca muncul ---
    Animated.timing(frameReveal, {
      toValue: 1,
      delay: 80,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // --- m digambar, lalu batang kanan naik jadi panah ---
    const drawTimer = setTimeout(() => {
      popPlayer.volume = 0.45;
      popPlayer.play();

      Animated.timing(bodyDraw, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Arch kedua sudah mulai sebelum garis pertama selesai, jadi m
      // terasa digambar sebagai satu tarikan napas.
      Animated.timing(archDraw, {
        toValue: 1,
        delay: 400,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Garis ketiga mulai saat arch kedua masih bergerak ke kanan.
      Animated.timing(shaftDraw, {
        toValue: 1,
        delay: 560,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Arrowhead baru muncul setelah shaft sampai ke ujungnya.
      Animated.timing(headOpacity, {
        toValue: 1,
        delay: 920,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    }, 650);

    // --- panah terkunci: getar + cling + sparkle di ujung ---
    const lockTimer = setTimeout(() => {
      Vibration.vibrate(30);
      clingPlayer.volume = 0.7;
      clingPlayer.play();
      Animated.sequence([
        Animated.timing(sparkle, { toValue: 1, duration: 140, useNativeDriver: false }),
        Animated.timing(sparkle, { toValue: 0, duration: 260, useNativeDriver: false }),
      ]).start();
    }, 1750);

    // --- wordmark stagger ---
    WORD.forEach((_, i) => {
      Animated.sequence([
        Animated.delay(WORD_START + i * LETTER_STAGGER),
        Animated.parallel([
          Animated.timing(letterOpacities[i], {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(letterScales[i], {
            toValue: 1,
            friction: 4.5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    Animated.timing(taglineOpacity, {
      toValue: 1,
      delay: WORD_START + WORD.length * LETTER_STAGGER + 200,
      duration: 450,
      useNativeDriver: true,
    }).start();
    Animated.timing(dividerScale, {
      toValue: 1,
      delay: WORD_START + WORD.length * LETTER_STAGGER + 200,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(hintOpacity, {
      toValue: 1,
      delay: 1400,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // --- shimmer sweep sekali setelah kata mendarat ---
    const shimmerTimer = setTimeout(() => {
      if (wordWidth.current > 0) {
        Animated.sequence([
          Animated.timing(shimmerOpacity, { toValue: 0.5, duration: 80, useNativeDriver: true }),
          Animated.parallel([
            Animated.timing(shimmerX, {
              toValue: wordWidth.current + 40,
              duration: 500,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(shimmerOpacity, {
              toValue: 0,
              delay: 240,
              duration: 260,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    }, WORD_START + WORD.length * LETTER_STAGGER + 200);

    const timer = setTimeout(finish, TOTAL_MS);
    return () => {
      auroraLoop.stop();
      clearTimeout(timer);
      clearTimeout(drawTimer);
      clearTimeout(lockTimer);
      clearTimeout(shimmerTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { opacity: fade }]}
      accessibilityLabel="Splash Mamoo"
    >
      <Pressable style={styles.press} onPress={finish} accessibilityLabel="Lewati splash">
        {/* latar gradient */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="splashBg" x1="0" y1="0" x2="0.6" y2="1">
              <Stop offset="0" stopColor="#00C583" />
              <Stop offset="0.55" stopColor="#00AB6B" />
              <Stop offset="1" stopColor="#00955D" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#splashBg)" />
        </Svg>

        {/* blob aurora bergerak lambat */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.aurora,
            {
              left: '-18%',
              top: '6%',
              transform: [{ translateX: Animated.multiply(auroraDrift, 46) }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.aurora,
            {
              width: 420,
              height: 420,
              right: '-22%',
              bottom: '4%',
              transform: [{ translateX: Animated.multiply(auroraDrift, -56) }],
            },
          ]}
        />

        {/* partikel garis naik — kesan data stream, bukan gelembung bulat */}
        {PARTICLES.map((spec, i) => {
          const translateY = particles[i].interpolate({
            inputRange: [0, 1],
            outputRange: [720, -520],
          });
          const opacity = particles[i].interpolate({
            inputRange: [0, 0.15, 0.8, 1],
            outputRange: [0, 0.32, 0.32, 0],
          });
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: `${spec.left * 100}%`,
                bottom: 0,
                width: 2,
                height: spec.height,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.55)',
                transform: [{ translateY }],
                opacity,
              }}
            />
          );
        })}

        {/* lockup tengah */}
        <Animated.View style={[styles.lockup, { transform: [{ scale: lockupScale }] }]}>
          <View style={{ width: EMBLEM, height: EMBLEM }}>
            {/* frame digital + glass tile */}
            <Animated.View
              style={[
                styles.emblemLayer,
                {
                  opacity: frameReveal,
                  transform: [
                    {
                      scale: frameReveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1.04, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg viewBox="0 0 200 200" style={styles.emblemFull}>
                <Defs>
                  <LinearGradient id="tileStroke" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.65} />
                    <Stop offset="0.52" stopColor="#FFFFFF" stopOpacity={0.14} />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.42} />
                  </LinearGradient>
                  <RadialGradient id="tileSheen" cx="0.3" cy="0.16" r="0.9">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.24} />
                    <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.05} />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                  </RadialGradient>
                </Defs>

                {/* outline squircle belakang, sedikit diputar */}
                <Rect
                  x={14}
                  y={14}
                  width={172}
                  height={172}
                  rx={50}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={1.4}
                  transform="rotate(-7 100 100)"
                />

                {/* tile kaca */}
                <Rect
                  x={32}
                  y={32}
                  width={136}
                  height={136}
                  rx={37}
                  fill="rgba(255,255,255,0.08)"
                  stroke="url(#tileStroke)"
                  strokeWidth={2.2}
                />
                <Rect
                  x={32}
                  y={32}
                  width={136}
                  height={136}
                  rx={37}
                  fill="url(#tileSheen)"
                />

                {/* kilau tipis di tepi atas tile */}
                <Path
                  d="M 54 48.5 H 104"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                />

                {/* bracket sudut ala HUD */}
                <Path d="M 8 30 L 8 8 L 30 8" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M 170 8 L 192 8 L 192 30" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M 192 170 L 192 192 L 170 192" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M 30 192 L 8 192 L 8 170" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />

                {/* dot-grid digital */}
                {GRID_DOTS.map((dot, i) => (
                  <Circle
                    key={i}
                    cx={dot.x}
                    cy={dot.y}
                    r={1.15}
                    fill="rgba(255,255,255,0.32)"
                  />
                ))}
              </Svg>
            </Animated.View>

            {/* monogram m-arrow: garis m digambar, lalu panah naik */}
            <Svg
              viewBox="0 0 200 200"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <G transform={MARK_TRANSFORM}>
                <AnimatedPath
                  d={MARK_BODY}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={MARK_STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[BODY_DASH, DASH_GAP]}
                  strokeDashoffset={bodyDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [BODY_DASH, 0],
                  })}
                />
                <AnimatedPath
                  d={MARK_ARCH}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={MARK_STROKE}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[ARCH_DASH, DASH_GAP]}
                  strokeDashoffset={archDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [ARCH_DASH, 0],
                  })}
                />
                <AnimatedPath
                  d={MARK_SHAFT}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={MARK_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={[SHAFT_DASH, DASH_GAP]}
                  strokeDashoffset={shaftDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHAFT_DASH, 0],
                  })}
                />

                <AnimatedPath d={MARK_HEAD} fill="#FFFFFF" opacity={headOpacity} />
                <AnimatedPath d={MARK_SPARK} fill="#FFD166" opacity={sparkle} />
              </G>
            </Svg>
          </View>

          {/* wordmark + shimmer */}
          <View
            style={styles.wordRowWrap}
            onLayout={(e) => {
              if (wordWidth.current === 0) {
                wordWidth.current = e.nativeEvent.layout.width;
                setWordWidthReady(true);
              }
            }}
          >
            <View style={styles.wordRow}>
              {WORD.map((letter, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.letter,
                    {
                      opacity: letterOpacities[i],
                      transform: [{ scale: letterScales[i] }],
                    },
                  ]}
                >
                  {letter}
                </Animated.Text>
              ))}
            </View>
            {wordWidthReady ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -6,
                  bottom: -6,
                  width: 26,
                  transform: [{ translateX: shimmerX }, { skewX: '12deg' }],
                  opacity: shimmerOpacity,
                }}
              >
                <Svg width={26} style={styles.emblemFull}>
                  <Defs>
                    <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                      <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.5" />
                      <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect width={26} height="100%" fill="url(#shimmer)" />
                </Svg>
              </Animated.View>
            ) : null}
          </View>

          {/* hairline digital di bawah wordmark */}
          <Animated.View
            style={[
              styles.divider,
              {
                opacity: taglineOpacity,
                transform: [{ scaleX: dividerScale }],
              },
            ]}
          />

          <Animated.Text
            style={[styles.tagline, { opacity: taglineOpacity }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Catat, atur, capai target tabunganmu.
          </Animated.Text>
        </Animated.View>

        <Animated.Text
          style={[styles.hint, { opacity: hintOpacity }]}
          pointerEvents="none"
        >
          Ketuk untuk lewati
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.primary,
  },
  press: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aurora: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  lockup: { alignItems: 'center' },
  emblemLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: EMBLEM,
    height: EMBLEM,
  },
  emblemFull: { flex: 1 },
  wordRowWrap: {
    position: 'relative',
    marginTop: 16,
    overflow: 'hidden',
    borderRadius: 12,
  },
  wordRow: { flexDirection: 'row' },
  letter: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  divider: {
    width: 36,
    height: 1,
    borderRadius: 1,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 0.3,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 19,
  },
  hint: {
    position: 'absolute',
    bottom: 46,
    alignSelf: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
});
