import { createDrawerNavigator } from '@react-navigation/drawer';
import { TabNavigator } from './TabNavigator';
import { DrawerContent } from './DrawerContent';

const Drawer = createDrawerNavigator();

export function MainDrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerStyle: { width: 280 } }}
      drawerContent={(p) => <DrawerContent {...p} />}
    >
      <Drawer.Screen name="Tabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}
