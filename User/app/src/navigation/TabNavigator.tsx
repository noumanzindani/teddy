import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, LayoutGrid, MessageSquare, User } from 'lucide-react-native';
import type { TabParamList } from './types';
import { HomeScreen } from '@features/home/screens/HomeScreen';
import { ServicesBrowseScreen } from '@features/services/screens';
import { ChatsListScreen } from '@features/chats/screens';
import { ProfileScreen } from '@features/profile/screens';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#1B1B16',
        tabBarInactiveTintColor: '#6B6B62',
        tabBarStyle: {
          backgroundColor: '#E4C654',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const iconSize = size ?? 22;
          if (route.name === 'HomeTab') return <Home size={iconSize} color={color} />;
          if (route.name === 'ServicesTab') return <LayoutGrid size={iconSize} color={color} />;
          if (route.name === 'ChatsTab') return <MessageSquare size={iconSize} color={color} />;
          return <User size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ServicesTab" component={ServicesBrowseScreen} options={{ title: 'Services' }} />
      <Tab.Screen name="ChatsTab" component={ChatsListScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
