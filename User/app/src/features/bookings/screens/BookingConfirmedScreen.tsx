import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';

export function BookingConfirmedScreen() {
  const nav = useNavigation();

  const goHome = () => {
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainDrawer' as never }] }));
  };

  return (
    <View className="flex-1 bg-surface items-center justify-center px-6">
      <View className="bg-white rounded-3xl p-6 items-center w-full max-w-sm">
        <Text style={{ fontSize: 56 }} className="mb-2">✅</Text>
        <Text className="text-xl font-bold text-ink mt-2">Booking Confirmed</Text>
        <Text className="text-sm text-ink-muted text-center mt-1">Your appointment is confirmed</Text>
        <View className="flex-row gap-3 mt-5">
          <Pressable onPress={goHome} className="bg-sage-200 rounded-full px-5 py-3 active:opacity-80">
            <Text className="text-base font-semibold text-ink">Go Home</Text>
          </Pressable>
          <Pressable onPress={goHome}>
            <LinearGradient
              colors={['#B89766', '#E0C58A']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 }}
            >
              <Text className="text-base font-semibold text-ink">View Appointment</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
