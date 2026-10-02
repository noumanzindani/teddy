'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, SlidersHorizontal, X, Trash2, Pencil, CheckSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, getVendorId } from '@/lib/api';
import { cn } from '@/lib/utils';

type PrefType = 'text' | 'yesno' | 'select' | 'multiselect' | 'checkbox';
const NEEDS_OPTIONS: PrefType[] = ['select', 'multiselect'];
const TYPE_LABEL: Record<PrefType, string> = {
  text: 'Short answer',
  yesno: 'Yes / No',
  select: 'Dropdown',
  multiselect: 'Checkboxes',
  checkbox: 'Single checkbox',
};

interface Question {
  id: string;
  label: string;
  description?: string | null;
  type: PrefType;
  options?: string[];
  required?: boolean;
  appliesToServiceIds?: string[];
  sortOrder?: number;
}
interface Service { id: string; name: string; }

const emptyQuestion = {
  label: '',
  description: '',
  type: 'text' as PrefType,
  options: [] as string[],
  required: false,
  appliesToServiceIds: [] as string[],
  sortOrder: 0,
};

export default function PreferencesPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyQuestion);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = await api.get<Question[]>('/preferences/questions');
      setQuestions([...q].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      const vid = getVendorId();
      if (vid) setServices(await api.get<Service[]>(`/services/${vid}`).catch(() => []));
    } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyQuestion, sortOrder: questions.length });
    setShowForm(true);
  }
  function openEdit(q: Question) {
    setEditing(q);
    setForm({
      label: q.label,
      description: q.description ?? '',
      type: q.type,
      options: q.options ?? [],
      required: q.required ?? false,
      appliesToServiceIds: q.appliesToServiceIds ?? [],
      sortOrder: q.sortOrder ?? 0,
    });
    setShowForm(true);
  }

  const changeType = (type: PrefType) =>
    setForm((s) => (NEEDS_OPTIONS.includes(type) && !s.options.length ? { ...s, type, options: [''] } : { ...s, type }));
  const setOption = (oi: number, value: string) => setForm((s) => ({ ...s, options: s.options.map((o, k) => k === oi ? value : o) }));
  const addOption = () => setForm((s) => ({ ...s, options: [...s.options, ''] }));
  const rmOption = (oi: number) => setForm((s) => ({ ...s, options: s.options.filter((_, k) => k !== oi) }));
  const toggleService = (id: string) => setForm((s) => ({ ...s, appliesToServiceIds: s.appliesToServiceIds.includes(id) ? s.appliesToServiceIds.filter((x) => x !== id) : [...s.appliesToServiceIds, id] }));

  async function save() {
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      options: NEEDS_OPTIONS.includes(form.type) ? form.options.map((o) => o.trim()).filter(Boolean) : undefined,
      required: form.required,
      appliesToServiceIds: form.appliesToServiceIds,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) await api.patch(`/preferences/questions/${editing.id}`, payload);
      else await api.post('/preferences/questions', payload);
      setShowForm(false); await load();
    } catch { /* */ } finally { setSaving(false); }
  }
  async function del(id: string) { try { await api.delete(`/preferences/questions/${id}`); await load(); } catch { /* */ } }

  async function move(q: Question, dir: -1 | 1) {
    const ordered = [...questions];
    const i = ordered.findIndex((x) => x.id === q.id);
    const j = i + dir;
    if (j < 0 || j >= ordered.length) return;
    const a = ordered[i], b = ordered[j];
    setQuestions((prev) => {
      const next = [...prev];
      next[i] = b; next[j] = a;
      return next;
    });
    try {
      await Promise.all([
        api.patch(`/preferences/questions/${a.id}`, { sortOrder: j }),
        api.patch(`/preferences/questions/${b.id}`, { sortOrder: i }),
      ]);
    } catch { /* */ }
    await load();
  }

  const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Client Preferences</h1>
          <p className="text-sm text-[#6B6B62]">Author the preference questions clients answer — heated beds, towel scent, massage pressure, music, lighting, and more.</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Add preference</Button>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid gap-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="p-4 flex items-center gap-4">
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => move(q, -1)} className="text-[#A8A89F] hover:text-[#1B1B16] disabled:opacity-30 leading-none">▲</button>
                <button disabled={i === questions.length - 1} onClick={() => move(q, 1)} className="text-[#A8A89F] hover:text-[#1B1B16] disabled:opacity-30 leading-none">▼</button>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#E4C654]/15 flex items-center justify-center"><SlidersHorizontal size={18} className="text-[#C9AD3A]" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B1B16]">{q.label}{q.required && <span className="text-red-500"> *</span>}</p>
                <p className="text-xs text-[#6B6B62]">
                  {TYPE_LABEL[q.type]}
                  {NEEDS_OPTIONS.includes(q.type) && q.options?.length ? ` · ${q.options.length} option${q.options.length !== 1 ? 's' : ''}` : ''}
                  {' · '}
                  {q.appliesToServiceIds?.length ? `${q.appliesToServiceIds.length} service${q.appliesToServiceIds.length !== 1 ? 's' : ''}` : 'all services'}
                </p>
              </div>
              <button onClick={() => openEdit(q)} className="text-[#6B6B62] hover:text-[#1B1B16]"><Pencil size={15} /></button>
              <button onClick={() => del(q.id)} className="text-[#A8A89F] hover:text-red-600"><Trash2 size={15} /></button>
            </Card>
          ))}
          {!questions.length && <Card className="p-8 text-center text-[#6B6B62]">No preference questions yet. Add your first one.</Card>}
        </div>
      )}

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">{editing ? 'Edit' : 'New'} Preference</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-4">
              <input className={inp} placeholder="Preference name (e.g. Massage pressure)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <textarea className={cn(inp, 'resize-y')} rows={2} placeholder="Description / helper text (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div className="flex items-center gap-2">
                <select className={cn(inp, 'flex-1')} value={form.type} onChange={(e) => changeType(e.target.value as PrefType)}>
                  <option value="text">Short answer</option>
                  <option value="yesno">Yes / No</option>
                  <option value="select">Dropdown</option>
                  <option value="multiselect">Checkboxes</option>
                  <option value="checkbox">Single checkbox</option>
                </select>
                <button title="Required" onClick={() => setForm({ ...form, required: !form.required })} className={cn('p-1.5 rounded-md border flex items-center gap-1 text-xs', form.required ? 'border-[#E4C654] bg-[#FFFBEB] text-[#B45309]' : 'border-[#E8E8E4] text-[#A8A89F]')}><CheckSquare size={14} /> Required</button>
              </div>

              {NEEDS_OPTIONS.includes(form.type) && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62]">Options</p>
                  {form.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs text-[#A8A89F] w-4 text-center">{oi + 1}.</span>
                      <input className={cn(inp, 'flex-1')} placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => setOption(oi, e.target.value)} />
                      <button title="Remove option" onClick={() => rmOption(oi)} className="text-[#A8A89F] hover:text-red-600"><X size={14} /></button>
                    </div>
                  ))}
                  <button onClick={addOption} className="text-xs text-[#C9AD3A] font-semibold flex items-center gap-1"><Plus size={12} /> Add option</button>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] mb-2">Applies to services (none = all)</p>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s) => (
                    <button key={s.id} onClick={() => toggleService(s.id)} className={cn('text-xs px-2.5 py-1 rounded-full border', form.appliesToServiceIds.includes(s.id) ? 'bg-[#1B1B16] text-white border-[#1B1B16]' : 'border-[#E8E8E4] text-[#6B6B62]')}>{s.name}</button>
                  ))}
                  {!services.length && <p className="text-xs text-[#A8A89F]">No services found.</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-[#6B6B62]">Sort order</label>
                <input type="number" className={cn(inp, 'w-24')} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>

              <Button className="w-full" disabled={saving || !form.label.trim()} onClick={save}>{saving ? 'Saving…' : editing ? 'Save Preference' : 'Create Preference'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
