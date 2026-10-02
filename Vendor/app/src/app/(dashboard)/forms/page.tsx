'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, X, Trash2, Pencil, ClipboardList, CheckSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type FieldType = 'text' | 'textarea' | 'checkbox' | 'select' | 'yesno' | 'radio' | 'multiselect';
const NEEDS_OPTIONS: FieldType[] = ['select', 'radio', 'multiselect'];
interface Field { id: string; label: string; type: FieldType; required?: boolean; options?: string[]; }
interface Form { id: string; name: string; description?: string | null; fields: Field[]; assignedServiceIds: string[]; sendAfterBooking: boolean; requiresSignature: boolean; isActive: boolean; _count?: { responses: number }; }
interface Service { id: string; name: string; }

const emptyForm = { name: '', description: '', fields: [] as Field[], assignedServiceIds: [] as string[], sendAfterBooking: true, requiresSignature: false };
const rid = () => 'f' + Math.abs(Date.now() % 100000).toString(36) + Math.floor(performance.now() % 1000);

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Form | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [responsesFor, setResponsesFor] = useState<Form | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, vid] = await Promise.all([api.get<Form[]>('/forms'), api.get<{ id: string }>('/vendors/me').then((v) => v.id).catch(() => null)]);
      setForms(f);
      if (vid) setServices(await api.get<Service[]>(`/services/${vid}`).catch(() => []));
    } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(f: Form) {
    setEditing(f);
    setForm({ name: f.name, description: f.description ?? '', fields: f.fields ?? [], assignedServiceIds: f.assignedServiceIds ?? [], sendAfterBooking: f.sendAfterBooking, requiresSignature: f.requiresSignature });
    setShowForm(true);
  }
  const addField = () => setForm((s) => ({ ...s, fields: [...s.fields, { id: rid(), label: '', type: 'text', required: false }] }));
  const setField = (i: number, patch: Partial<Field>) => setForm((s) => ({ ...s, fields: s.fields.map((f, j) => j === i ? { ...f, ...patch } : f) }));
  const rmField = (i: number) => setForm((s) => ({ ...s, fields: s.fields.filter((_, j) => j !== i) }));
  const changeType = (i: number, type: FieldType) => setField(i, NEEDS_OPTIONS.includes(type) && !(form.fields[i].options?.length) ? { type, options: [''] } : { type });
  const setOption = (i: number, oi: number, value: string) => setField(i, { options: (form.fields[i].options ?? []).map((o, k) => k === oi ? value : o) });
  const addOption = (i: number) => setField(i, { options: [...(form.fields[i].options ?? []), ''] });
  const rmOption = (i: number, oi: number) => setField(i, { options: (form.fields[i].options ?? []).filter((_, k) => k !== oi) });
  const toggleService = (id: string) => setForm((s) => ({ ...s, assignedServiceIds: s.assignedServiceIds.includes(id) ? s.assignedServiceIds.filter((x) => x !== id) : [...s.assignedServiceIds, id] }));

  async function save() {
    setSaving(true);
    const payload = { ...form, fields: form.fields.filter((f) => f.label.trim()) };
    try {
      if (editing) await api.patch(`/forms/${editing.id}`, payload);
      else await api.post('/forms', payload);
      setShowForm(false); await load();
    } catch { /* */ } finally { setSaving(false); }
  }
  async function del(id: string) { try { await api.delete(`/forms/${id}`); await load(); } catch { /* */ } }

  const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Forms</h1>
          <p className="text-sm text-[#6B6B62]">Build intake &amp; consent forms, assign them to services, and auto-send after booking.</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> New Form</Button>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid gap-3">
          {forms.filter((f) => f.isActive).map((f) => (
            <Card key={f.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#E4C654]/15 flex items-center justify-center"><FileText size={18} className="text-[#C9AD3A]" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B1B16]">{f.name}</p>
                <p className="text-xs text-[#6B6B62]">
                  {f.fields.length} field{f.fields.length !== 1 && 's'} ·{' '}
                  {f.assignedServiceIds.length ? `${f.assignedServiceIds.length} service${f.assignedServiceIds.length !== 1 ? 's' : ''}` : 'all services'}
                  {f.sendAfterBooking && ' · auto-send'}{f.requiresSignature && ' · signature'}
                </p>
              </div>
              <button onClick={() => setResponsesFor(f)} className="text-xs text-[#6B6B62] hover:text-[#1B1B16] flex items-center gap-1"><ClipboardList size={13} /> {f._count?.responses ?? 0}</button>
              <button onClick={() => openEdit(f)} className="text-[#6B6B62] hover:text-[#1B1B16]"><Pencil size={15} /></button>
              <button onClick={() => del(f.id)} className="text-[#A8A89F] hover:text-red-600"><Trash2 size={15} /></button>
            </Card>
          ))}
          {!forms.filter((f) => f.isActive).length && <Card className="p-8 text-center text-[#6B6B62]">No forms yet. Create your first intake or consent form.</Card>}
        </div>
      )}

      {/* Builder modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">{editing ? 'Edit' : 'New'} Form</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-4">
              <input className={inp} placeholder="Form name (e.g. Consent Form)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className={cn(inp, 'resize-y')} rows={3} placeholder="Description / instructions (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62]">Fields</p>
                  <button onClick={addField} className="text-xs text-[#C9AD3A] font-semibold flex items-center gap-1"><Plus size={12} /> Add field</button>
                </div>
                <div className="space-y-2">
                  {form.fields.map((f, i) => (
                    <div key={f.id} className="rounded-lg border border-[#E8E8E4] p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input className={cn(inp, 'flex-1')} placeholder="Question / label" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                        <select className={cn(inp, 'w-40')} value={f.type} onChange={(e) => changeType(i, e.target.value as FieldType)}>
                          <option value="text">Short answer</option>
                          <option value="textarea">Long answer / paragraph</option>
                          <option value="checkbox">Single checkbox</option>
                          <option value="yesno">Yes / No</option>
                          <option value="select">Dropdown</option>
                          <option value="radio">Multiple choice (pick one)</option>
                          <option value="multiselect">Checkboxes (pick many)</option>
                        </select>
                        <button title="Required" onClick={() => setField(i, { required: !f.required })} className={cn('p-1.5 rounded-md border', f.required ? 'border-[#E4C654] bg-[#FFFBEB] text-[#B45309]' : 'border-[#E8E8E4] text-[#A8A89F]')}><CheckSquare size={14} /></button>
                        <button onClick={() => rmField(i)} className="text-[#A8A89F] hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                      {NEEDS_OPTIONS.includes(f.type) && (
                        <div className="pl-2 space-y-1.5">
                          {(f.options ?? []).map((o, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-xs text-[#A8A89F] w-4 text-center">{oi + 1}.</span>
                              <input className={cn(inp, 'flex-1')} placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => setOption(i, oi, e.target.value)} />
                              <button title="Remove option" onClick={() => rmOption(i, oi)} className="text-[#A8A89F] hover:text-red-600"><X size={14} /></button>
                            </div>
                          ))}
                          <button onClick={() => addOption(i)} className="text-xs text-[#C9AD3A] font-semibold flex items-center gap-1"><Plus size={12} /> Add option</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {!form.fields.length && <p className="text-xs text-[#A8A89F]">No fields yet — add one.</p>}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] mb-2">Assign to services (none = all)</p>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s) => (
                    <button key={s.id} onClick={() => toggleService(s.id)} className={cn('text-xs px-2.5 py-1 rounded-full border', form.assignedServiceIds.includes(s.id) ? 'bg-[#1B1B16] text-white border-[#1B1B16]' : 'border-[#E8E8E4] text-[#6B6B62]')}>{s.name}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-[#1B1B16]"><input type="checkbox" checked={form.sendAfterBooking} onChange={(e) => setForm({ ...form, sendAfterBooking: e.target.checked })} /> Automatically send after booking</label>
                <label className="flex items-center gap-2 text-sm text-[#1B1B16]"><input type="checkbox" checked={form.requiresSignature} onChange={(e) => setForm({ ...form, requiresSignature: e.target.checked })} /> Require signature</label>
              </div>

              <Button className="w-full" disabled={saving || !form.name.trim()} onClick={save}>{saving ? 'Saving…' : editing ? 'Save Form' : 'Create Form'}</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Responses modal */}
      {responsesFor && <ResponsesModal form={responsesFor} onClose={() => setResponsesFor(null)} />}
    </div>
  );
}

function ResponsesModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [responses, setResponses] = useState<{ id: string; answers: Record<string, unknown>; signedName?: string | null; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get<typeof responses>(`/forms/responses?formId=${form.id}`).then(setResponses).catch(() => {}).finally(() => setLoading(false)); }, [form.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-[#1B1B16]">{form.name} — responses</h2>
          <button onClick={onClose}><X size={20} className="text-[#A8A89F]" /></button>
        </div>
        {loading ? <p className="text-sm text-[#6B6B62]">Loading…</p> : responses.length ? (
          <div className="space-y-3">
            {responses.map((r) => (
              <div key={r.id} className="border border-[#E8E8E4] rounded-lg p-3 text-sm">
                {form.fields.map((f) => (
                  <p key={f.id} className="text-[#6B6B62]">{f.label}: <span className="text-[#1B1B16]">{String(r.answers[f.id] ?? '—')}</span></p>
                ))}
                {r.signedName && <p className="text-xs text-green-700 mt-1">✓ Signed by {r.signedName}</p>}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A89F]">No responses yet.</p>}
      </Card>
    </div>
  );
}
