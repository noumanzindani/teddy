import {
  View, Text, ScrollView, Pressable, TextInput, Modal,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ClipboardList, FileText, CheckCircle2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { GradientButton } from '@components/primitives';
import { api } from '@utils/api';

// Field shape mirrors the vendor form builder (Vendor/app .../forms/page.tsx).
type FieldType = 'text' | 'textarea' | 'checkbox' | 'select' | 'yesno' | 'radio' | 'multiselect';
interface FormField { id: string; label: string; type: FieldType; required?: boolean; options?: string[]; }

// Answers keyed by field id. Most types store a string; multiselect stores a string[].
type AnswerValue = string | string[];

interface MyForm {
  formId: string;
  name: string;
  description?: string | null;
  fields: FormField[];
  requiresSignature: boolean;
  bookingId: string;
  serviceName?: string | null;
  date?: string | null;
  submitted: boolean;
}

function fmtDate(d?: string | null) {
  if (!d) return '';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MyFormsScreen() {
  const nav = useNavigation();
  const [forms, setForms] = useState<MyForm[]>([]);
  const [loading, setLoading] = useState(true);

  // Fill-modal state
  const [active, setActive] = useState<MyForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [signedName, setSignedName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () =>
    api.get<MyForm[]>('/forms/my-forms')
      .then((r) => setForms(r ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toComplete = forms.filter((f) => !f.submitted);
  const completed = forms.filter((f) => f.submitted);

  function openForm(f: MyForm) {
    setActive(f);
    setAnswers({});
    setSignedName('');
    setFormError(null);
  }

  function closeForm() {
    setActive(null);
    setFormError(null);
  }

  async function submitForm() {
    if (!active) return;
    setFormError(null);

    // Basic required-field validation
    for (const f of active.fields) {
      if (!f.required) continue;
      const val = answers[f.id];
      const filled = Array.isArray(val)
        ? val.length > 0
        : f.type === 'checkbox'
          ? val === 'Yes'                 // a required consent checkbox must be checked
          : (val ?? '').toString().trim().length > 0;
      if (!filled) {
        setFormError(`Please complete: ${f.label}`);
        return;
      }
    }
    if (active.requiresSignature && !signedName.trim()) {
      setFormError('Please type your name to sign.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/forms/${active.formId}/submit`, {
        bookingId: active.bookingId,
        answers,
        signedName: active.requiresSignature ? signedName.trim() : undefined,
      });
      closeForm();
      await load();
    } catch (e: any) {
      const msg = e?.message ?? 'Could not submit the form. Please try again.';
      setFormError(msg);
      Alert.alert('Submission failed', msg);
    } finally {
      setSubmitting(false);
    }
  }

  const setAnswer = (id: string, value: AnswerValue) => setAnswers((s) => ({ ...s, [id]: value }));

  // Toggle a single option inside a multiselect field's string[] answer.
  const toggleMulti = (id: string, opt: string) => setAnswers((s) => {
    const cur = Array.isArray(s[id]) ? (s[id] as string[]) : [];
    const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
    return { ...s, [id]: next };
  });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => nav.goBack()} hitSlop={10}><ChevronLeft size={26} color="#1B1B16" /></Pressable>
        <Text className="text-lg font-bold text-ink ml-2">My Forms</Text>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? <Text className="text-muted">Loading…</Text> : (
          <>
            <View className="flex-row items-center gap-2 mt-2 mb-2">
              <ClipboardList size={16} color="#C9A227" />
              <Text className="text-sm font-bold text-ink">To complete</Text>
            </View>
            {toComplete.length ? toComplete.map((f) => (
              <Pressable
                key={f.formId + f.bookingId}
                onPress={() => openForm(f)}
                className="bg-surface-raised rounded-2xl px-4 py-3 mb-2 active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-ink">{f.name}</Text>
                    <Text className="text-xs text-ink-muted mt-0.5">
                      {[f.serviceName, fmtDate(f.date)].filter(Boolean).join(' · ') || 'Tap to fill in'}
                    </Text>
                  </View>
                  <View className="bg-gold-100 rounded-full px-2.5 py-1">
                    <Text className="text-xs font-bold text-gold-800">Fill in</Text>
                  </View>
                </View>
              </Pressable>
            )) : <Text className="text-sm text-ink-muted mb-2">Nothing to complete right now.</Text>}

            <View className="flex-row items-center gap-2 mt-5 mb-2">
              <FileText size={16} color="#C9A227" />
              <Text className="text-sm font-bold text-ink">Completed</Text>
            </View>
            {completed.length ? completed.map((f) => (
              <View key={f.formId + f.bookingId} className="bg-surface-raised rounded-2xl px-4 py-3 mb-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-ink">{f.name}</Text>
                    <Text className="text-xs text-ink-muted mt-0.5">
                      {[f.serviceName, fmtDate(f.date)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1 bg-success/15 rounded-full px-2.5 py-1">
                    <CheckCircle2 size={13} color="#3D8B5E" />
                    <Text className="text-xs font-bold text-success">Submitted ✓</Text>
                  </View>
                </View>
              </View>
            )) : <Text className="text-sm text-ink-muted">No submitted forms yet.</Text>}
          </>
        )}
      </ScrollView>

      {/* Fill-in modal */}
      <Modal visible={!!active} animationType="slide" transparent onRequestClose={closeForm}>
        <View className="flex-1 bg-black/40 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="bg-surface rounded-t-3xl max-h-[88%]">
              <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                <Text className="text-lg font-bold text-ink flex-1 pr-3" numberOfLines={1}>{active?.name}</Text>
                <Pressable onPress={closeForm} hitSlop={10}><X size={22} color="#1B1B16" /></Pressable>
              </View>

              <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                {active?.description ? (
                  <Text className="text-sm text-ink-muted mb-3">{active.description}</Text>
                ) : null}

                {active?.fields.map((f) => (
                  <View key={f.id} className="mb-4">
                    <Text className="text-sm font-semibold text-ink mb-2">
                      {f.label}{f.required ? ' *' : ''}
                    </Text>

                    {f.type === 'checkbox' ? (
                      <Pressable
                        onPress={() => setAnswer(f.id, (answers[f.id] === 'Yes') ? 'No' : 'Yes')}
                        className="flex-row items-center gap-3 active:opacity-80"
                      >
                        <View className={`w-6 h-6 rounded-md items-center justify-center border ${answers[f.id] === 'Yes' ? 'bg-sage-700 border-sage-700' : 'border-sage-400'}`}>
                          {answers[f.id] === 'Yes' && <Text className="text-white text-xs font-bold">✓</Text>}
                        </View>
                        <Text className="text-sm text-ink">Yes</Text>
                      </Pressable>
                    ) : f.type === 'yesno' ? (
                      <View className="flex-row gap-2">
                        {['Yes', 'No'].map((opt) => {
                          const on = answers[f.id] === opt;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => setAnswer(f.id, opt)}
                              className={`rounded-full px-6 py-2 ${on ? 'bg-sage-700' : 'bg-surface-raised'}`}
                            >
                              <Text className={`text-sm ${on ? 'text-white font-semibold' : 'text-ink'}`}>{opt}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (f.type === 'select' || f.type === 'radio') && f.options?.length ? (
                      <View className="flex-row flex-wrap gap-2">
                        {f.options.map((opt) => {
                          const on = answers[f.id] === opt;
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => setAnswer(f.id, opt)}
                              className={`rounded-full px-4 py-2 ${on ? 'bg-sage-700' : 'bg-surface-raised'}`}
                            >
                              <Text className={`text-sm ${on ? 'text-white font-semibold' : 'text-ink'}`}>{opt}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : f.type === 'multiselect' && f.options?.length ? (
                      <View className="flex-row flex-wrap gap-2">
                        {f.options.map((opt) => {
                          const on = Array.isArray(answers[f.id]) && (answers[f.id] as string[]).includes(opt);
                          return (
                            <Pressable
                              key={opt}
                              onPress={() => toggleMulti(f.id, opt)}
                              className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${on ? 'bg-sage-700' : 'bg-surface-raised'}`}
                            >
                              {on && <Text className="text-white text-xs font-bold">✓</Text>}
                              <Text className={`text-sm ${on ? 'text-white font-semibold' : 'text-ink'}`}>{opt}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View className="bg-surface-raised rounded-2xl px-4 py-3">
                        <TextInput
                          value={typeof answers[f.id] === 'string' ? (answers[f.id] as string) : ''}
                          onChangeText={(v) => setAnswer(f.id, v)}
                          placeholder="Your answer"
                          placeholderTextColor="#6B6B62"
                          multiline={f.type === 'textarea'}
                          className="text-base text-ink"
                          style={f.type === 'textarea' ? { minHeight: 88, textAlignVertical: 'top' } : undefined}
                        />
                      </View>
                    )}
                  </View>
                ))}

                {active?.requiresSignature ? (
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-ink mb-2">Signature (type your name) *</Text>
                    <View className="bg-surface-raised rounded-2xl px-4 py-3">
                      <TextInput
                        value={signedName}
                        onChangeText={setSignedName}
                        placeholder="Full name"
                        placeholderTextColor="#6B6B62"
                        className="text-base text-ink"
                      />
                    </View>
                  </View>
                ) : null}

                {formError ? <Text className="text-sm text-danger mb-3">{formError}</Text> : null}

                <GradientButton
                  label={submitting ? 'Submitting…' : 'Submit Form'}
                  onPress={submitForm}
                  disabled={submitting}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
