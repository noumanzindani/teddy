import { View, Text, Pressable } from 'react-native';
import { Bell, Menu, ChevronLeft } from 'lucide-react-native';
import { Badge } from '@components/primitives';

interface Props {
  title?: string;
  showMenu?: boolean;
  showBack?: boolean;
  showBell?: boolean;
  pointsBadge?: number;
  greeting?: { line1: string; line2: string };
  onMenuPress?: () => void;
  onBackPress?: () => void;
  onBellPress?: () => void;
}

export function Header({
  title, showMenu, showBack, showBell, pointsBadge, greeting,
  onMenuPress, onBackPress, onBellPress,
}: Props) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3">
      <View className="flex-row items-center flex-1">
        {showBack && (
          <Pressable onPress={onBackPress} className="mr-3 active:opacity-60">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
        )}
        {showMenu && (
          <Pressable onPress={onMenuPress} className="mr-3 active:opacity-60">
            <Menu size={24} color="#1B1B16" />
          </Pressable>
        )}
        {greeting ? (
          <View>
            <Text className="text-xs text-ink-muted">{greeting.line1}</Text>
            <Text className="text-lg font-semibold text-ink">{greeting.line2}</Text>
          </View>
        ) : title ? (
          <Text className="text-xl font-bold text-ink">{title}</Text>
        ) : null}
        {pointsBadge != null && (
          <View className="ml-3">
            <Badge label={`${pointsBadge.toLocaleString()} PTS`} tone="gold" />
          </View>
        )}
      </View>
      {showBell && (
        <Pressable onPress={onBellPress} className="active:opacity-60">
          <Bell size={22} color="#1B1B16" />
        </Pressable>
      )}
    </View>
  );
}
