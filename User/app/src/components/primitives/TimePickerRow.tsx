import { View, Text, Pressable, Platform, Modal } from 'react-native';
import { Bell, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';

interface Props {
  value: Date;
  onChange: (d: Date) => void;
  label?: string;
  mode?: 'time' | 'date' | 'datetime';
}

function format(d: Date, mode: 'time' | 'date' | 'datetime') {
  if (mode === 'date') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (mode === 'datetime') {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function TimePickerRow({ value, onChange, label = 'Time Picker', mode = 'time' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="bg-surface-raised rounded-2xl p-4 flex-row items-center justify-between active:opacity-80"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-sage-700 items-center justify-center mr-3">
            <Bell size={18} color="#FFF" />
          </View>
          <Text className="text-base font-semibold text-ink">{label}</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-base text-ink-muted mr-2">{format(value, mode)}</Text>
          <Clock size={18} color="#1B1B16" />
        </View>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setOpen(false)}>
            <Pressable onPress={(e) => e.stopPropagation()} className="bg-surface rounded-t-3xl px-4 pt-4 pb-8">
              <View className="flex-row items-center justify-between mb-2">
                <Pressable onPress={() => setOpen(false)} hitSlop={6}>
                  <Text className="text-base text-ink-muted">Cancel</Text>
                </Pressable>
                <Pressable onPress={() => setOpen(false)} hitSlop={6}>
                  <Text className="text-base font-bold text-ink">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={value}
                mode={mode}
                display="spinner"
                onChange={(_, d) => d && onChange(d)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        open && (
          <DateTimePicker
            value={value}
            mode={mode}
            is24Hour={false}
            display="default"
            onChange={(_, d) => {
              setOpen(false);
              if (d) onChange(d);
            }}
          />
        )
      )}
    </>
  );
}
