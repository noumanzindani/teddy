import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle } from 'lucide-react-native';

interface Props {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Style of the primary (rightmost) button:
   * - "gold" (default): gold gradient — for non-destructive primary actions
   * - "danger": flat danger red — for destructive primary actions
   */
  variant?: 'gold' | 'danger';
}

export function ConfirmPopup({
  visible, title, body, confirmLabel, cancelLabel = 'Cancel',
  onConfirm, onCancel, variant = 'gold',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={onCancel}>
        <Pressable
          className="bg-white rounded-3xl px-6 py-7 w-full max-w-sm items-center"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-14 h-14 rounded-full border-2 border-danger items-center justify-center mb-4">
            <AlertCircle size={28} color="#C44545" />
          </View>
          <Text className="text-xl font-bold text-ink text-center">{title}</Text>
          {body && <Text className="text-sm text-ink-soft text-center mt-2">{body}</Text>}
          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={onCancel}
              className="bg-sage-200 rounded-full px-5 py-3 active:opacity-80"
            >
              <Text className="text-base font-semibold text-ink">{cancelLabel}</Text>
            </Pressable>
            {variant === 'gold' ? (
              <Pressable onPress={onConfirm} className="active:opacity-90">
                <LinearGradient
                  colors={['#B89766', '#E0C58A']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 }}
                >
                  <Text className="text-base font-semibold text-ink">{confirmLabel}</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                onPress={onConfirm}
                className="bg-danger rounded-full px-6 py-3 active:opacity-90"
              >
                <Text className="text-base font-semibold text-white">{confirmLabel}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
