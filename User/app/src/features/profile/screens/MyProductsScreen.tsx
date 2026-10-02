import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Package, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { api } from '@utils/api';

interface Used { name: string; when: string; service: string; }
interface Purchased { name: string; amount: number; when: string; }

export function MyProductsScreen() {
  const nav = useNavigation();
  const [used, setUsed] = useState<Used[]>([]);
  const [purchased, setPurchased] = useState<Purchased[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ used: Used[]; purchased: Purchased[] }>('/engagement/my-products')
      .then((r) => { setUsed(r.used ?? []); setPurchased(r.purchased ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><ChevronLeft size={26} color="#1B1B16" /></Pressable>
        <Text className="text-lg font-bold text-ink ml-2">My Products</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? <Text className="text-muted">Loading…</Text> : (
          <>
            <View className="flex-row items-center gap-2 mt-2 mb-2">
              <ShoppingBag size={16} color="#C9A227" />
              <Text className="text-sm font-bold text-ink">Purchased</Text>
            </View>
            {purchased.length ? purchased.map((p, i) => (
              <View key={i} className="flex-row items-center justify-between bg-surface-raised rounded-2xl px-4 py-3 mb-2">
                <View><Text className="text-sm font-semibold text-ink">{p.name}</Text><Text className="text-xs text-ink-muted">{fmt(p.when)}</Text></View>
                <Text className="text-sm font-bold text-ink">${Number(p.amount).toFixed(2)}</Text>
              </View>
            )) : <Text className="text-sm text-ink-muted mb-2">No purchases yet.</Text>}

            <View className="flex-row items-center gap-2 mt-5 mb-2">
              <Package size={16} color="#C9A227" />
              <Text className="text-sm font-bold text-ink">Used in your treatments</Text>
            </View>
            {used.length ? used.map((u, i) => (
              <View key={i} className="bg-surface-raised rounded-2xl px-4 py-3 mb-2">
                <Text className="text-sm font-semibold text-ink">{u.name}</Text>
                <Text className="text-xs text-ink-muted">{u.service} · {fmt(u.when)}</Text>
              </View>
            )) : <Text className="text-sm text-ink-muted">Nothing recorded yet.</Text>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
