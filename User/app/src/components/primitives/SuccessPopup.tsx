import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  emoji?: string;
  title: string;
  body?: string;
  ctaLabel: string;
  onPress: () => void;
}

export function SuccessPopup({
  visible, emoji = '👍', title, body, ctaLabel, onPress,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onPress}>
      <View className="flex-1 bg-black/40 items-center justify-center px-6">
        <View className="bg-white rounded-3xl px-6 py-7 w-full max-w-sm items-center">
          <Text style={{ fontSize: 56 }} className="mb-1">{emoji}</Text>
          <Text className="text-xl font-bold text-ink text-center mt-2">{title}</Text>
          {body && (
            <Text className="text-sm text-ink-soft text-center mt-2">{body}</Text>
          )}
          <Pressable onPress={onPress} className="mt-5 active:opacity-90">
            <LinearGradient
              colors={['#B89766', '#E0C58A']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 }}
            >
              <Text className="text-base font-semibold text-ink">{ctaLabel}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
