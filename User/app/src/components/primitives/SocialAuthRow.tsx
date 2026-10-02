import { View, Pressable, Text } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface Props {
  onGoogle?: () => void;
  onFacebook?: () => void;
  onApple?: () => void;
}

function GoogleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24 12 12 0 0 1 8.5 3.5l5.6-5.6A20 20 0 0 0 24 4a20 20 0 1 0 0 40c11 0 20-8.9 20-20 0-1.4-.1-2.7-.4-3.5z"/>
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.2 0 6 1.2 8.5 3.2l5.6-5.6A20 20 0 0 0 6.3 14.7z"/>
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.2 5.3C42.2 35.3 44 30.1 44 24c0-1.4-.1-2.7-.4-3.5z"/>
    </Svg>
  );
}

function FacebookIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9V15.5H7v-3.5h3.1V9.4c0-3.1 1.8-4.8 4.6-4.8 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/>
    </Svg>
  );
}

function AppleIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path fill="#000" d="M17.5 12.5c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.6 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.2 3.2-2.5 1-1.4 1.4-2.7 1.4-2.8-.1 0-2.7-1-2.8-4z M15 4.7c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.5-.7.7-1.3 1.9-1.1 3.1 1.1.1 2.2-.6 3-1.4z"/>
    </Svg>
  );
}

function SocialButton({ icon, onPress }: { icon: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-full w-16 h-12 items-center justify-center active:opacity-80"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {icon}
    </Pressable>
  );
}

export function SocialAuthRow({ onGoogle, onFacebook, onApple }: Props) {
  return (
    <View className="w-full">
      <View className="flex-row items-center my-2">
        <View className="flex-1 h-px bg-sage-300" />
        <Text className="mx-3 text-ink-muted text-sm font-medium">OR</Text>
        <View className="flex-1 h-px bg-sage-300" />
      </View>
      <View className="flex-row justify-center gap-4 mt-4">
        <SocialButton icon={<GoogleIcon />} onPress={onGoogle} />
        <SocialButton icon={<FacebookIcon />} onPress={onFacebook} />
        <SocialButton icon={<AppleIcon />} onPress={onApple} />
      </View>
    </View>
  );
}
