import Svg, { Circle } from 'react-native-svg';

import { percent } from '@/utils/format';
import { colors } from '@/theme/theme';

/** Progress ring donat kecil untuk target tabungan. */
export function ProgressRing({
  size = 64,
  progress,
  color,
}: {
  size?: number;
  progress: number;
  color: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent(progress, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.background}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}
