'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, X, ClipboardList, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type FieldType = 'text' | 'textarea' | 'checkbox' | 'select';
interface Field { id: string; label: string; type: FieldType; required?: boolean; options?: string[]; }
interface Form {
  id: string; name: string; description?: string | null; fields: Field[];
  assignedServiceIds: string[]; sendAfterBooking: boolean; requiresSignature: boolean;
  isActive: boolean; _count?: { responses: number };
}
interface Client { id?: string; firstName?: string; lastName?: string; }
interface Response {
  id: string; formId?: string; formName?: string;
  client?: Client | null; clientName?: string | null;
  answers: Record<string, unknown>; signedName?: string | null; createdAt?: string;
}

const clientLabel = (r: Response) => {
  if (r.client && (r.client.firstName || r.client.lastName)) return `${r.client.firstName ?? ''} ${r.client.lastName ?? ''}`.trim();
  return r.clientName || 'Client';
};

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [responsesFor, setResponsesFor] = useState<Form | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setForms(await api.get<Form[]>('/forms')); } catch { /* */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = forms.filter((f) => f.isActive);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Forms</h1>
        <p className="text-sm text-[#6B6B62]">View the salon&apos;s intake &amp; consent forms and read clients&apos; completed, signed responses.</p>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid gap-3">
          {active.map((f) => (
            <Card key={f.id} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#E4C654]/15 flex items-center justify-center"><FileText size={18} className="text-[#C9AD3A]" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1B1B16]">{f.name}</p>
                <p className="text-xs text-[#6B6B62]">
                  {f.fields.length} field{f.fields.length !== 1 && 's'}
                  {f.requiresSignature && ' · signature required'}
                  {f.description ? ` · ${f.description}` : ''}
                </p>
              </div>
              <button onClick={() => setResponsesFor(f)} className="text-xs font-semibold text-[#6B6B62] hover:text-[#1B1B16] flex items-center gap-1.5 shrink-0">
                <ClipboardList size={14} /> {f._count?.responses ?? 0} response{(f._count?.responses ?? 0) !== 1 && 's'}
              </button>
            </Card>
          ))}
          {!active.length && <Card className="p-8 text-center text-[#6B6B62]">No forms have been set up for this salon yet.</Card>}
        </div>
      )}

      {responsesFor && <ResponsesModal form={responsesFor} onClose={() => setResponsesFor(null)} />}
    </div>
  );
}

function ResponsesModal({ form, onClose }: { form: Form; onClose: () => void }) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Response[]>(`/forms/responses?formId=${form.id}`)
      .then((rows) => setResponses(rows.filter((r) => !r.formId || r.formId === form.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [form.id]);

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
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-[#1B1B16]">{clientLabel(r)}</p>
                  {r.createdAt && <p className="text-[11px] text-[#A8A89F]">{new Date(r.createdAt).toLocaleDateString()}</p>}
                </div>
                {form.fields.map((f) => (
                  <p key={f.id} className="text-[#6B6B62]">{f.label}: <span className="text-[#1B1B16]">{formatAnswer(r.answers[f.id])}</span></p>
                ))}
                {r.signedName && (
                  <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1"><CheckCircle size={12} /> Signed by {r.signedName}</p>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A89F]">No responses yet.</p>}
      </Card>
    </div>
  );
}

function formatAnswer(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}
