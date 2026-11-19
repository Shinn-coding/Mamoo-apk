import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { parseLocalDate, toLocalDate, todayLocal, type LocalDate } from '@/utils/date';
import { colors, radius, spacing } from '@/theme/theme';

function label(value: LocalDate): string {
  if (value === todayLocal()) return 'Hari ini';
  return parseLocalDate(value).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DateField({
  value,
  onChange,
}: {
  value: LocalDate;
  onChange: (date: LocalDate) => void;
}) {
  const [showIos, setShowIos] = useState(false);

  const openAndroid = () => {
    DateTimePickerAndroid.open({
      mode: 'date',
      value: parseLocalDate(value),
      is24Hour: true,
      onChange: (_event, date) => {
        if (date) onChange(toLocalDate(date));
      },
    });
  };

  return (
    <View>
      <Pressable
        style={styles.button}
        onPress={() => (Platform.OS === 'android' ? openAndroid() : setShowIos(true))}
      >
        <Text style={styles.label}>Tanggal</Text>
        <Text style={styles.value}>{label(value)}</Text>
      </Pressable>
      {Platform.OS !== 'android' && showIos ? (
        <DateTimePicker
          mode="date"
          display="spinner"
          value={parseLocalDate(value)}
          onChange={(_event, date) => {
            if (date) onChange(toLocalDate(date));
            if (Platform.OS === 'android') return;
            setShowIos(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: { fontSize: 14, color: colors.textMuted },
  value: { fontSize: 14, fontWeight: '700', color: colors.text },
});
