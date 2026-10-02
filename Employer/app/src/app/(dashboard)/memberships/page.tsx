'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Crown, X, Check, Star, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface Plan {
  id: string; name: string; description?: string | null; price: number;
  interval: 'monthly' | 'yearly'; benefits: string[]; priorityBooking: boolean; isActive: boolean;
  _count?: { subscriptions: number };
}
interface Sub {
  id: string; status: string; currentPeriodEnd?: string | null;
  client: { firstName: string; lastName: string };
  plan: { name: string; priorityBooking: boolean };
}

const emptyPlan = { name: '', description: '', price: 49, interval: 'monthly' as 'monthly' | 'yearly', benefitsText: '', priorityBooking: true };

export default function MembershipsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<typeof emptyPlan>(emptyPlan);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.get<Plan[]>('/memberships/plans'), api.get<Sub[]>('/memberships/subscriptions')]);
      setPlans(p); setSubs(s);
    } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(emptyPlan); setShowForm(true); }
  function openEdit(p: Plan) {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', price: Number(p.price), interval: p.interval, benefitsText: p.benefits.join('\n'), priorityBooking: p.priorityBooking });
    setShowForm(true);
  }
  async function save() {
    setSaving(true);
    const payload = { name: form.name, description: form.description, price: Number(form.price), interval: form.interval, priorityBooking: form.priorityBooking, benefits: form.benefitsText.split('\n').map((s) => s.trim()).filter(Boolean) };
    try { if (editing) await api.patch(`/memberships/plans/${editing.id}`, payload); else await api.post('/memberships/plans', payload); setShowForm(false); await load(); }
    catch { /* */ } finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Memberships</h1>
          <p className="text-sm text-[#6B6B62]">Subscription plans and members. Priority plans get preferred booking.</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> New Plan</Button>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {plans.map((p) => (
              <Card key={p.id} className={cn('p-5', !p.isActive && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#E4C654]/15 flex items-center justify-center"><Crown size={18} className="text-[#C9AD3A]" /></div>
                  {p.priorityBooking && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 flex items-center gap-1"><Star size={10} /> Priority</span>}
                </div>
                <p className="font-bold text-lg text-[#1B1B16] mt-3">{p.name}</p>
                <p className="text-2xl font-black text-[#1B1B16]">${Number(p.price).toFixed(0)}<span className="text-sm font-medium text-[#6B6B62]">/{p.interval === 'yearly' ? 'yr' : 'mo'}</span></p>
                <ul className="mt-3 space-y-1">
                  {p.benefits.map((b) => <li key={b} className="text-xs text-[#6B6B62] flex items-start gap-1.5"><Check size={12} className="text-green-600 mt-0.5 shrink-0" />{b}</li>)}
                </ul>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#F0EFE8]">
                  <span className="text-xs text-[#6B6B62] flex items-center gap-1"><Users size={12} /> {p._count?.subscriptions ?? 0} members</span>
                  <button onClick={() => openEdit(p)} className="text-xs font-semibold text-[#C9AD3A]">Edit</button>
                </div>
              </Card>
            ))}
            {!plans.length && <Card className="p-8 text-center text-[#6B6B62] col-span-full">No membership plans yet.</Card>}
          </div>

          <h2 className="font-bold text-[#1B1B16] mb-3">Active Members</h2>
          <div className="grid gap-2">
            {subs.map((s) => (
              <Card key={s.id} className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xs font-bold text-[#1B1B16]">{s.client.firstName[0]}{s.client.lastName[0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1B1B16]">{s.client.firstName} {s.client.lastName}</p>
                  <p className="text-xs text-[#6B6B62]">{s.plan.name}{s.plan.priorityBooking && ' · Priority booking'}</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', s.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>{s.status}</span>
              </Card>
            ))}
            {!subs.length && <p className="text-sm text-[#A8A89F]">No members yet.</p>}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">{editing ? 'Edit' : 'New'} Plan</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-3">
              <L label="Plan name"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></L>
              <div className="grid grid-cols-2 gap-3">
                <L label="Price ($)"><input type="number" className={inp} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></L>
                <L label="Interval"><select className={inp} value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as 'monthly' | 'yearly' })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></L>
              </div>
              <L label="Benefits (one per line)"><textarea className={inp} rows={4} value={form.benefitsText} onChange={(e) => setForm({ ...form, benefitsText: e.target.value })} placeholder={'10% off all services\nPriority booking'} /></L>
              <label className="flex items-center gap-2 text-sm text-[#1B1B16]">
                <input type="checkbox" checked={form.priorityBooking} onChange={(e) => setForm({ ...form, priorityBooking: e.target.checked })} /> Priority booking for members
              </label>
              <Button className="w-full" disabled={saving || !form.name} onClick={save}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Plan'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-[#6B6B62]">{label}</label><div className="mt-1">{children}</div></div>;
}
