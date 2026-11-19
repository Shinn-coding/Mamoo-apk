import Svg, { Circle } from 'react-native-svg';

export type DonutSegment = { value: number; color: string };

/**
 * Donut pengeluaran per kategori.
 * Satu kategori (100%) digambar sebagai Circle penuh — lengkungan 360°
 * tidak tergambar di react-native-svg.
 */
export function DonutChart({ segments, size = 190 }: { segments: DonutSegment[]; size?: number }) {
  const stroke = Math.round(size * 0.13);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return null;

  if (segments.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={segments[0].color}
          strokeWidth={stroke}
          fill="none"
        />
      </Svg>
    );
  }

  const gap = 2;
  let start = 0;
  return (
    <Svg width={size} height={size}>
      {segments.map((segment, index) => {
        const length = (segment.value / total) * circumference;
        const drawn = Math.max(0, length - gap);
        const offset = -start;
        start += length;
        return (
          <Circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segment.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${drawn} ${circumference - drawn}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}
