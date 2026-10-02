import { View, Text, Pressable } from 'react-native';
import { Notebook, Smile, Bell, Users } from 'lucide-react-native';
import type { ReactNode } from 'react';

interface Action { label: string; icon: ReactNode; onPress?: () => void }

function ActionButton({ label, icon, onPress }: Action) {
  return (
    <Pressable onPress={onPress} className="items-center flex-1 active:opacity-70">
      <View className="w-14 h-14 rounded-full bg-sage-200 items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-xs text-ink-soft">{label}</Text>
    </Pressable>
  );
}

export function QuickActionRow({
  onJournal, onMood, onReminder, onReferral,
}: {
  onJournal?: () => void;
  onMood?: () => void;
  onReminder?: () => void;
  onReferral?: () => void;
}) {
  return (
    <View className="flex-row">
      <ActionButton label="Journal" icon={<Notebook size={22} color="#1B1B16" />} onPress={onJournal} />
      <ActionButton label="Mood" icon={<Smile size={22} color="#1B1B16" />} onPress={onMood} />
      <ActionButton label="Reminder" icon={<Bell size={22} color="#1B1B16" />} onPress={onReminder} />
      <ActionButton label="Referral" icon={<Users size={22} color="#1B1B16" />} onPress={onReferral} />
    </View>
  );
}
