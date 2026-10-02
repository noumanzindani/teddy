import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, PillInput, SegmentedControl, TimePickerRow } from '@components/primitives';
import { MiniCalendar } from '@features/home/components/MiniCalendar';
import { useReminders } from '@store/index';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

interface Props {
  title: string;
  defaultValues?: {
    title?: string;
    repeat?: 'once' | 'daily' | 'weekly' | 'custom';
    leadTime?: '15min' | '1hour' | '1day';
    entryType?: 'appointment' | 'task';
  };
}

export function ReminderForm({ title: screenTitle, defaultValues = {} }: Props) {
  const nav = useNavigation();
  const addReminder = useReminders((s) => s.add);
  const [title, setTitle] = useState(defaultValues.title ?? 'E.g Morning Meditation');
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly' | 'custom'>(defaultValues.repeat ?? 'once');
  const [leadTime, setLeadTime] = useState<'15min' | '1hour' | '1day'>(defaultValues.leadTime ?? '15min');
  const [entryType, setEntryType] = useState<'appointment' | 'task'>(defaultValues.entryType ?? 'appointment');
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">{screenTitle}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View className="gap-4">
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Reminder Title</Text>
              <PillInput value={title} onChangeText={setTitle} />
            </View>
            <MiniCalendar />
            <TimePickerRow value={time} onChange={setTime} />
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Repeat</Text>
              <SegmentedControl
                variant="pill"
                value={repeat}
                onChange={setRepeat}
                options={[
                  { value: 'once', label: 'Once' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Lead Time Selector</Text>
              <SegmentedControl
                variant="pill"
                value={leadTime}
                onChange={setLeadTime}
                options={[
                  { value: '15min', label: '15 min before' },
                  { value: '1hour', label: '1 hour before' },
                  { value: '1day', label: '1 day before' },
                ]}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Entry Type</Text>
              <SegmentedControl
                variant="pill"
                value={entryType}
                onChange={setEntryType}
                options={[
                  { value: 'appointment', label: 'Appointment Reminder' },
                  { value: 'task', label: 'Personal Task' },
                ]}
              />
            </View>
          </View>
        </ScrollView>

        <View className="px-5 pb-4">
          <GradientButton
            label="Save"
            onPress={() => {
              const timeLabel = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              addReminder({ title, time: timeLabel, type: entryType === 'appointment' ? 'appointment' : 'task' });
              nav.goBack();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
