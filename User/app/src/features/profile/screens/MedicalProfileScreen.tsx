import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, ShieldAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { GradientButton } from '@components/primitives';
import { api } from '@utils/api';

interface Named { name: string; brand?: string }
interface Profile {
  medicalHistory?: string | null;
  employerName?: string | null;
  occupation?: string | null;
  allergies?: Named[];
  currentProducts?: Named[];
  notes?: string | null;
}

function Field({ label, value, onChangeText, placeholder, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-ink mb-1.5">{label}</Text>
      <View className="bg-surface-input rounded-2xl px-5 py-3.5">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B6B62"
          multiline={multiline}
          className="text-base text-ink"
          style={multiline ? { minHeight: 64, textAlignVertical: 'top' } : undefined}
        />
      </View>
    </View>
  );
}

// A chip list with an add-input — used for allergies and current products.
function ChipInput({ label, items, setItems, placeholder, danger }: {
  label: string; items: Named[]; setItems: (v: Named[]) => void; placeholder: string; danger?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const name = draft.trim();
    if (name && !items.some((i) => i.name.toLowerCase() === name.toLowerCase())) setItems([...items, { name }]);
    setDraft('');
  };
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-ink mb-1.5">{label}</Text>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {items.map((it) => (
          <View key={it.name} className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${danger ? 'bg-red-50' : 'bg-surface-input'}`}>
            <Text className={`text-sm ${danger ? 'text-red-700' : 'text-ink'}`}>{it.name}</Text>
            <Pressable hitSlop={8} onPress={() => setItems(items.filter((x) => x.name !== it.name))}>
              <X size={14} color={danger ? '#b91c1c' : '#6B6B62'} />
            </Pressable>
          </View>
        ))}
        {items.length === 0 && <Text className="text-sm text-muted">None added</Text>}
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1 bg-surface-input rounded-2xl px-5 py-3">
          <TextInput value={draft} onChangeText={setDraft} placeholder={placeholder} placeholderTextColor="#6B6B62"
            onSubmitEditing={add} returnKeyType="done" className="text-base text-ink" />
        </View>
        <Pressable onPress={add} className="w-12 h-12 rounded-2xl bg-ink items-center justify-center">
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

export function MedicalProfileScreen() {
  const nav = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [medicalHistory, setMedicalHistory] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [allergies, setAllergies] = useState<Named[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Named[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.get<{ profile: Profile }>('/clinical/clients/me/profile')
      .then(({ profile }) => {
        if (!profile) return;
        setMedicalHistory(profile.medicalHistory ?? '');
        setEmployerName(profile.employerName ?? '');
        setOccupation(profile.occupation ?? '');
        setAllergies(profile.allergies ?? []);
        setCurrentProducts(profile.currentProducts ?? []);
        setNotes(profile.notes ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError(''); setSaving(true); setSaved(false);
    try {
      await api.patch('/clinical/clients/me/profile', {
        medicalHistory, employerName, occupation, allergies, currentProducts, notes,
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message || 'Could not save');
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><ChevronLeft size={26} color="#1B1B16" /></Pressable>
        <Text className="text-lg font-bold text-ink ml-2">Medical & Allergy Info</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start gap-2 bg-amber-50 rounded-2xl p-4 mb-5">
          <ShieldAlert size={18} color="#b45309" />
          <Text className="flex-1 text-xs text-amber-800">
            Your therapist reviews this before every service. Listing allergies lets us automatically flag any product that could react with your skin.
          </Text>
        </View>

        {loading ? <Text className="text-muted">Loading…</Text> : (
          <>
            <ChipInput label="Allergies & Sensitivities" items={allergies} setItems={setAllergies}
              placeholder="e.g. Fragrance, Glycolic Acid" danger />
            <Field label="Medical History" value={medicalHistory} onChangeText={setMedicalHistory}
              placeholder="Conditions, sensitivities, anything relevant…" multiline />
            <ChipInput label="Products You Currently Use" items={currentProducts} setItems={setCurrentProducts}
              placeholder="e.g. CeraVe Cleanser" />
            <Field label="Employer" value={employerName} onChangeText={setEmployerName} placeholder="Where you work (optional)" />
            <Field label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Your job (optional)" />
            <Field label="Other Notes" value={notes} onChangeText={setNotes} placeholder="Anything else your therapist should know" multiline />

            {error ? <Text className="text-red-600 text-sm mb-3">{error}</Text> : null}
            {saved ? <Text className="text-green-600 text-sm mb-3">Saved ✓</Text> : null}
            <GradientButton label="Save" onPress={handleSave} loading={saving} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
