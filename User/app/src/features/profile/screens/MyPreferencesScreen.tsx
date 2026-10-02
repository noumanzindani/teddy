import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Sliders, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { api } from '@utils/api';

type QType = 'text' | 'yesno' | 'select' | 'multiselect' | 'checkbox';

interface Preference {
  id: string;
  label: string;
  description?: string | null;
  type: QType;
  options?: string[] | null;
  required?: boolean;
  answer?: string | string[] | null;
}

type AnswerValue = string | string[];

export function MyPreferencesScreen() {
  const nav = useNavigation();
  const [items, setItems] = useState<Preference[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Preference[]>('/preferences/my')
      .then((rows) => {
        const list = rows ?? [];
        setItems(list);
        const init: Record<string, AnswerValue> = {};
        list.forEach((q) => {
          if (q.answer != null) init[q.id] = q.answer;
          else if (q.type === 'multiselect') init[q.id] = [];
          else init[q.id] = '';
        });
        setAnswers(init);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    api.post('/preferences/answers', { questionId, value })
      .then(() => {
        setSavedIds((prev) => ({ ...prev, [questionId]: true }));
        setTimeout(() => setSavedIds((prev) => ({ ...prev, [questionId]: false })), 1800);
      })
      .catch(() => {});
  };

  const asString = (v: AnswerValue | undefined): string => (Array.isArray(v) ? '' : v ?? '');
  const asArray = (v: AnswerValue | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : []);

  const Pill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
        active ? 'bg-sage-700 border-sage-700' : 'bg-surface-raised border-sage-200'
      }`}
    >
      <Text className={`text-sm ${active ? 'text-white font-semibold' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );

  const YesNo = ({ value, onPick }: { value: string; onPick: (v: string) => void }) => (
    <View className="flex-row">
      {['Yes', 'No'].map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onPick(opt)}
          className={`px-5 py-2 rounded-full mr-2 border ${
            value === opt ? 'bg-sage-700 border-sage-700' : 'bg-surface-raised border-sage-200'
          }`}
        >
          <Text className={`text-sm ${value === opt ? 'text-white font-semibold' : 'text-ink'}`}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><ChevronLeft size={26} color="#1B1B16" /></Pressable>
        <Text className="text-lg font-bold text-ink ml-2">My Preferences</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <Text className="text-muted">Loading…</Text>
        ) : items.length === 0 ? (
          <View className="items-center mt-16 px-6">
            <Sliders size={40} color="#C9A227" />
            <Text className="text-sm text-ink-muted text-center mt-3">
              Your provider hasn't added preferences yet.
            </Text>
          </View>
        ) : (
          items.map((q) => (
            <View key={q.id} className="bg-surface-raised rounded-2xl px-4 py-4 mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-bold text-ink">
                    {q.label}
                    {q.required ? <Text className="text-danger"> *</Text> : null}
                  </Text>
                  {q.description ? (
                    <Text className="text-xs text-ink-muted mt-0.5">{q.description}</Text>
                  ) : null}
                </View>
                {savedIds[q.id] ? (
                  <View className="flex-row items-center">
                    <Check size={14} color="#4B7B4B" />
                    <Text className="text-xs text-sage-700 ml-1">Saved</Text>
                  </View>
                ) : null}
              </View>

              <View className="mt-3">
                {q.type === 'text' && (
                  <TextInput
                    value={asString(answers[q.id])}
                    onChangeText={(t) => setAnswers((prev) => ({ ...prev, [q.id]: t }))}
                    onBlur={() => save(q.id, asString(answers[q.id]))}
                    placeholder="Type your answer"
                    placeholderTextColor="#9A9A8C"
                    multiline
                    className="border border-sage-200 rounded-xl px-3 py-2 text-sm text-ink"
                  />
                )}

                {q.type === 'yesno' && (
                  <YesNo value={asString(answers[q.id])} onPick={(v) => save(q.id, v)} />
                )}

                {q.type === 'checkbox' && (
                  <View className="flex-row flex-wrap">
                    <Pill
                      label={asString(answers[q.id]) === 'Yes' ? '☑  Yes' : '☐  Tap to confirm'}
                      active={asString(answers[q.id]) === 'Yes'}
                      onPress={() => save(q.id, asString(answers[q.id]) === 'Yes' ? 'No' : 'Yes')}
                    />
                  </View>
                )}

                {q.type === 'select' && (
                  <View className="flex-row flex-wrap">
                    {(q.options ?? []).map((opt) => (
                      <Pill
                        key={opt}
                        label={opt}
                        active={asString(answers[q.id]) === opt}
                        onPress={() => save(q.id, opt)}
                      />
                    ))}
                  </View>
                )}

                {q.type === 'multiselect' && (
                  <View className="flex-row flex-wrap">
                    {(q.options ?? []).map((opt) => {
                      const current = asArray(answers[q.id]);
                      const active = current.includes(opt);
                      return (
                        <Pill
                          key={opt}
                          label={opt}
                          active={active}
                          onPress={() =>
                            save(q.id, active ? current.filter((o) => o !== opt) : [...current, opt])
                          }
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
