import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { GradientButton, PillInput, TextArea, SegmentedControl, TimePickerRow } from '@components/primitives';
import { useGoals } from '@store/index';

export function NewGoalScreen() {
  const nav = useNavigation();
  const addGoal = useGoals((s) => s.addGoal);
  const [title, setTitle] = useState('E.g Morning Meditation');
  const [desc, setDesc] = useState('Tell us something about your goal...');
  const [category, setCategory] = useState<'personal' | 'weekly' | 'professional'>('personal');
  const [quantity, setQuantity] = useState('8');
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  });

  const handleCreate = () => {
    addGoal({ title, category });
    nav.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">New Goal</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View className="gap-4">
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Goal Title</Text>
              <PillInput value={title} onChangeText={setTitle} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Description</Text>
              <TextArea value={desc} onChangeText={setDesc} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Category</Text>
              <SegmentedControl
                variant="pill"
                value={category}
                onChange={setCategory}
                options={[
                  { value: 'personal', label: 'Personal' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'professional', label: 'Professional' },
                ]}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-ink mb-2">Target Frequency</Text>
              <View className="bg-surface-raised rounded-2xl p-4 flex-row gap-3">
                <View className="w-20">
                  <Text className="text-xs text-ink-muted mb-1">Quantity</Text>
                  <View className="bg-surface-input rounded-xl px-3 py-2.5">
                    <Text className="text-base font-semibold text-ink">{quantity}</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-ink-muted mb-1">Frequency</Text>
                  <View className="bg-surface-input rounded-xl px-3 py-2.5 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-ink">Times Per Day</Text>
                    <ChevronDown size={16} color="#1B1B16" />
                  </View>
                </View>
              </View>
            </View>
            <TimePickerRow value={time} onChange={setTime} />
          </View>
        </ScrollView>

        <View className="px-5 pb-4">
          <GradientButton label="Create Goal" onPress={handleCreate} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
