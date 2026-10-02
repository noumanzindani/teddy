import { View, Text, Pressable, Image } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Camera } from 'lucide-react-native';
import { GradientButton } from '@components/primitives';
import { useUser } from '@store/index';
import { useImagePicker } from '@hooks/useImagePicker';
import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function ProfilePhotoScreen() {
  const nav = useNavigation();
  const avatarUri = useUser((s) => s.avatarUri);
  const setAvatar = useUser((s) => s.setAvatar);
  const { pickFromCamera, pickFromGallery } = useImagePicker();
  const [uploading, setUploading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const finish = () => {
    nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainDrawer' as never }] }));
  };

  function simulateUpload(uri: string) {
    setAvatar(uri);
    setUploading(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400,
      useNativeDriver: false,
    }).start(() => {
      setUploading(false);
      finish();
    });
  }

  const onCamera = async () => {
    const uri = await pickFromCamera();
    if (uri) simulateUpload(uri);
  };

  const onUpload = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      simulateUpload(uri);
    } else {
      finish();
    }
  };

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-6 pt-4">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <ChevronLeft size={28} color="#1B1B16" />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Profile Photo</Text>
        <Pressable onPress={finish} hitSlop={10}>
          <Text className="text-base font-medium text-ink">Skip</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-56 h-56 rounded-full bg-sage-200 items-center justify-center overflow-hidden">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 224, height: 224 }} />
          ) : (
            <>
              <View className="w-24 h-24 rounded-full bg-white items-center justify-center mb-2">
                <User size={48} color="#7E8A6E" strokeWidth={1.5} />
              </View>
              <View
                className="absolute bottom-0 w-full h-1/3 bg-white/95"
                style={{ borderTopLeftRadius: 999, borderTopRightRadius: 999 }}
              />
            </>
          )}
        </View>

        {uploading && (
          <View className="mt-6 w-56">
            <Text className="text-xs text-ink-muted text-center mb-2">Uploading photo…</Text>
            <View className="h-1.5 bg-sage-200 rounded-full overflow-hidden">
              <Animated.View className="h-full bg-sage-700 rounded-full" style={{ width: barWidth }} />
            </View>
          </View>
        )}

        {!uploading && (
          <View className="flex-row gap-3 mt-10">
            <Pressable
              onPress={onCamera}
              className="bg-white px-6 py-3 rounded-full active:opacity-80 flex-row items-center"
            >
              <Camera size={18} color="#1B1B16" />
              <Text className="ml-2 text-base font-semibold text-ink">Camera</Text>
            </Pressable>
            <View className="overflow-hidden rounded-full">
              <GradientButton label="Upload" onPress={onUpload} size="md" />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
