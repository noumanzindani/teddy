import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

export function RescheduleSuccessScreen() {
  const nav = useNavigation();
  return (
    <View className="flex-1 bg-sage-200/50 items-center justify-center px-6">
      <View className="bg-white rounded-3xl p-6 items-center w-full max-w-sm">
        <Text style={{ fontSize: 56 }} className="mb-2">👍</Text>
        <Text className="text-xl font-bold text-ink mt-2">Appointment Rescheduled</Text>
        <Text className="text-sm text-ink-muted text-center mt-2">
          Your new appointment is set for{'\n'}March 27 • 5:30 PM
        </Text>
        <Pressable onPress={() => nav.goBack()} className="mt-5">
          <LinearGradient
            colors={['#B89766', '#E0C58A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ borderRadius: 999, paddingHorizontal: 28, paddingVertical: 10 }}
          >
            <Text className="text-base font-semibold text-ink">Got It!</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
