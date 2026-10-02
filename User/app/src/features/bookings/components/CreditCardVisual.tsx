import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, Trash2 } from 'lucide-react-native';

interface Props {
  number: string;       // "4000 1234 5678 9012"
  validThru: string;    // "01/30"
  cvv: string;          // "123"
  holder: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CreditCardVisual({ number, validThru, cvv, holder, onEdit, onDelete }: Props) {
  return (
    <LinearGradient
      colors={['#7E8A6E', '#5F6B52']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 20, padding: 18, height: 200, justifyContent: 'space-between' }}
    >
      <View className="flex-row items-start justify-between">
        <View className="w-10 h-7 rounded bg-gold-300/90" />
        <View className="flex-row gap-2">
          <Pressable
            onPress={onEdit}
            className="w-8 h-8 rounded-full bg-white items-center justify-center active:opacity-80"
          >
            <Edit3 size={14} color="#1B1B16" />
          </Pressable>
          <Pressable
            onPress={onDelete}
            className="w-8 h-8 rounded-full bg-white items-center justify-center active:opacity-80"
          >
            <Trash2 size={14} color="#1B1B16" />
          </Pressable>
        </View>
      </View>

      <View>
        <Text className="text-white text-lg font-mono tracking-widest">{number}</Text>
        <View className="flex-row mt-2 gap-6">
          <View>
            <Text className="text-white/70 text-[9px]">Valid{'\n'}Thru</Text>
          </View>
          <View>
            <Text className="text-white text-base font-mono">{validThru}</Text>
          </View>
          <View className="ml-4">
            <Text className="text-white/70 text-[9px]">CVV{'\n'}Code</Text>
          </View>
          <View>
            <Text className="text-white text-base font-mono">{cvv}</Text>
          </View>
        </View>
        <Text className="text-white text-base font-bold mt-3 tracking-wider">{holder.toUpperCase()}</Text>
      </View>
    </LinearGradient>
  );
}
