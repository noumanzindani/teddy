import { View, Text, ScrollView, Pressable, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Copy, Share2, MessageCircle, Mail, Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { api } from '@utils/api';

const REFERRAL_CODE = 'TEDDY-JOHN-7QX';
const REFERRAL_LINK = 'teddy.app/r/john7qx';

interface Referred { id: string; name: string; status: string; points: number; }

function ShareOption({ icon, label, color, onPress }: { icon: React.ReactNode; label: string; color: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center active:opacity-80" style={{ width: 70 }}>
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center"
        style={{ backgroundColor: color }}
      >
        {icon}
      </View>
      <Text className="text-xs text-ink mt-2">{label}</Text>
    </Pressable>
  );
}

export function ReferFriendScreen() {
  const nav = useNavigation();
  const [REFERRED, setReferred] = useState<Referred[]>([]);
  useEffect(() => {
    api.get<{ referred: { id: string; firstName: string; lastName: string; bookings: number }[] }>('/engagement/referrals')
      .then((r) => setReferred((r.referred ?? []).map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        status: u.bookings > 0 ? 'booked' : 'signed up',
        points: u.bookings > 0 ? 100 : 0,
      }))))
      .catch(() => {});
  }, []);
  const totalEarned = REFERRED.reduce((s, r) => s + r.points, 0);

  const shareInvite = () => {
    Share.share({
      message: `Join me on TEDDY! Use my code ${REFERRAL_CODE} — ${REFERRAL_LINK}`,
    }).catch(() => {});
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => nav.goBack()} hitSlop={10} className="mr-3">
            <ChevronLeft size={26} color="#1B1B16" />
          </Pressable>
          <Text className="text-2xl font-bold text-ink">Refer a Friend</Text>
        </View>
        <Pressable hitSlop={10}>
          <Bell size={22} color="#1B1B16" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View className="mx-5 bg-sage-700 rounded-3xl p-6 items-center">
          <Text style={{ fontSize: 56 }}>🎁</Text>
          <Text className="text-2xl font-bold text-white mt-3 text-center">
            Share The Glow
          </Text>
          <Text className="text-sm text-white/90 mt-2 text-center leading-5">
            Earn 100 points for every friend who signs up and completes their first booking.
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mx-5 mt-4">
          <View className="flex-1 bg-surface-raised rounded-2xl p-4 items-center">
            <Text className="text-3xl font-bold text-ink">{REFERRED.length}</Text>
            <Text className="text-xs text-ink-muted mt-1">Friends invited</Text>
          </View>
          <View className="flex-1 bg-surface-raised rounded-2xl p-4 items-center">
            <Text className="text-3xl font-bold text-ink">{totalEarned}</Text>
            <Text className="text-xs text-ink-muted mt-1">Points earned</Text>
          </View>
        </View>

        {/* Referral code + link */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-bold text-ink mb-2">Your Referral Code</Text>
          <Pressable onPress={shareInvite} className="bg-surface-raised rounded-2xl px-4 py-4 flex-row items-center justify-between active:opacity-80">
            <Text className="text-base font-bold text-ink tracking-widest">{REFERRAL_CODE}</Text>
            <View className="flex-row items-center">
              <Copy size={16} color="#1B1B16" />
              <Text className="ml-1.5 text-sm font-semibold text-ink">Copy</Text>
            </View>
          </Pressable>

          <Text className="text-sm font-bold text-ink mt-4 mb-2">Or share your link</Text>
          <Pressable onPress={shareInvite} className="bg-surface-raised rounded-2xl px-4 py-4 flex-row items-center justify-between active:opacity-80">
            <Text className="text-sm text-ink-soft flex-1" numberOfLines={1}>{REFERRAL_LINK}</Text>
            <Share2 size={18} color="#1B1B16" />
          </Pressable>
        </View>

        {/* Share options */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-bold text-ink mb-3">Share via</Text>
          <View className="flex-row justify-between bg-surface-raised rounded-2xl p-4">
            <ShareOption icon={<MessageCircle size={26} color="#FFF" />} label="WhatsApp" color="#25D366" onPress={shareInvite} />
            <ShareOption icon={<Send size={26} color="#FFF" />} label="SMS" color="#3FAA3F" onPress={shareInvite} />
            <ShareOption icon={<Mail size={26} color="#FFF" />} label="Email" color="#3A6FB1" onPress={shareInvite} />
            <ShareOption icon={<Share2 size={26} color="#1B1B16" />} label="More" color="#DEDBCA" onPress={shareInvite} />
          </View>
        </View>

        {/* History */}
        <View className="px-5 mt-6">
          <Text className="text-sm font-bold text-ink mb-3">Referral History</Text>
          <View className="bg-surface-raised rounded-2xl">
            {REFERRED.map((r, i) => {
              const initials = r.name.split(' ').map((p) => p[0]).join('').slice(0, 2);
              const isLast = i === REFERRED.length - 1;
              return (
                <View
                  key={r.id}
                  className={`flex-row items-center px-4 py-3 ${isLast ? '' : 'border-b border-sage-200'}`}
                >
                  <View className="w-10 h-10 rounded-full bg-sage-300 items-center justify-center mr-3">
                    <Text className="text-sm font-bold text-ink">{initials}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink">{r.name}</Text>
                    <Text className="text-xs text-ink-muted capitalize">{r.status}</Text>
                  </View>
                  {r.points > 0 ? (
                    <View className="bg-success/15 rounded-full px-2.5 py-1">
                      <Text className="text-xs font-bold text-success">+{r.points} PTS</Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-ink-muted">Pending</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <Text className="text-center text-xs text-ink-muted mt-6 px-8">
          Points are credited after your friend completes their first booking.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
