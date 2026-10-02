import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Copy, Mail, MessageSquare, FileText, Bell, Wifi } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';

const PEOPLE = [
  { id: 'p1', name: 'Sandy Wilder Cheng', avatar: 'https://i.pravatar.cc/100?img=47' },
  { id: 'p2', name: 'Kevin Leong', avatar: 'https://i.pravatar.cc/100?img=53' },
  { id: 'p3', name: 'Sandy and Kevin', avatar: 'https://i.pravatar.cc/100?img=15' },
  { id: 'p4', name: 'Juliana Mejia', avatar: 'https://i.pravatar.cc/100?img=44' },
  { id: 'p5', name: 'Greg Apo', avatar: 'https://i.pravatar.cc/100?img=12' },
];

interface AppItem { id: string; label: string; icon: ReactNode; bg: string }
const APPS: AppItem[] = [
  { id: 'a1', label: 'AirDrop',   icon: <Wifi size={26} color="#3A6FB1" />,        bg: '#FFFFFF' },
  { id: 'a2', label: 'Messages',  icon: <MessageSquare size={26} color="#FFF" />,  bg: '#3FAA3F' },
  { id: 'a3', label: 'Mail',      icon: <Mail size={26} color="#FFF" />,           bg: '#3A6FB1' },
  { id: 'a4', label: 'Notes',     icon: <FileText size={26} color="#1B1B16" />,    bg: '#F2E68C' },
  { id: 'a5', label: 'Reminder',  icon: <Bell size={26} color="#FFF" />,           bg: '#FFFFFF' },
];

export function ShareScreen() {
  const nav = useNavigation();
  return (
    <View className="flex-1 bg-black/40 justify-end">
      <Pressable className="flex-1" onPress={() => nav.goBack()} />
      <SafeAreaView edges={['bottom']} className="bg-surface rounded-t-3xl">
        <View className="items-center pt-3">
          <View className="w-10 h-1 rounded-full bg-sage-700" />
        </View>
        <View className="flex-row items-center justify-between px-5 pt-3">
          <Text className="text-2xl font-bold text-ink">Share</Text>
          <Pressable
            onPress={() => nav.goBack()}
            hitSlop={10}
            className="w-9 h-9 rounded-full bg-sage-300 items-center justify-center"
          >
            <X size={18} color="#1B1B16" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          {PEOPLE.map((p) => (
            <Pressable key={p.id} className="items-center mr-5" style={{ width: 70 }}>
              <View className="relative">
                <Image source={{ uri: p.avatar }} style={{ width: 60, height: 60, borderRadius: 30 }} />
                <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success items-center justify-center border-2 border-surface">
                  <MessageSquare size={9} color="#FFF" fill="#FFF" />
                </View>
              </View>
              <Text className="text-xs text-ink mt-2 text-center" numberOfLines={2}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="border-t border-sage-200" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}>
          {APPS.map((a) => (
            <Pressable key={a.id} className="items-center mr-5" style={{ width: 70 }}>
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: a.bg, borderWidth: a.bg === '#FFFFFF' ? 1 : 0, borderColor: '#DEDBCA' }}
              >
                {a.icon}
              </View>
              <Text className="text-xs text-ink mt-2 text-center">{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="px-5 pb-4">
          <Pressable className="bg-surface-input rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-base text-ink">Copy Link</Text>
            <Copy size={18} color="#1B1B16" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
