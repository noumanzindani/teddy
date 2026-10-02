import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Calendar, Heart, Gift, LogOut } from 'lucide-react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { TeddyLogo } from '@components/primitives';

type DrawerItem = { key: string; icon: any; route?: string; params?: any; danger?: boolean };

const ITEMS: DrawerItem[] = [
  { key: 'Home', icon: Home, route: 'MainDrawer', params: { screen: 'Tabs', params: { screen: 'HomeTab' } } },
  { key: 'My Bookings', icon: Calendar, route: 'MyBookings' },
  { key: 'Favorites', icon: Heart, route: 'Favorites' },
  { key: 'Gift Cards', icon: Gift, route: 'GiftCards' },
  { key: 'Logout', icon: LogOut, danger: true, route: 'Auth', params: { screen: 'Login' } },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const onPress = (item: DrawerItem) => {
    props.navigation.closeDrawer();
    if (item.route) {
      const parent = props.navigation.getParent() as any;
      parent?.navigate(item.route, item.params);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="px-5 pt-6 pb-6 border-b border-sage-200 items-start">
        <TeddyLogo variant="dark" size="sm" />
      </View>
      <View className="flex-1 pt-4">
        {ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onPress(item)}
            className="flex-row items-center px-5 py-3.5 active:bg-sage-100"
          >
            <item.icon size={20} color={item.danger ? '#1B1B16' : '#1B1B16'} strokeWidth={1.6} />
            <Text className={`ml-4 text-base ${item.danger ? 'text-ink' : 'text-ink'}`}>{item.key}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
