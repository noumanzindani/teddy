'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Clock, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface AddOn { id: string; name: string; description?: string | null; price: number; durationMin: number; isActive: boolean; }

export function AddOnsModal({ serviceId, serviceName, onClose }: { serviceId: string; serviceName: string; onClose: () => void }) {
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [durationMin, setDurationMin] = useState(15);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAddOns(await api.get<AddOn[]>(`/addons?serviceId=${serviceId}`)); } catch { /* */ }
    finally { setLoading(false); }
  }, [serviceId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/addons', { serviceId, name: name.trim(), price: Number(price), durationMin: Number(durationMin) });
      setName(''); setPrice(0); setDurationMin(15); await load();
    } catch { /* */ } finally { setSaving(false); }
  }
  async function remove(id: string) {
    try { await api.delete(`/addons/${id}`); await load(); } catch { /* */ }
  }

  const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg text-[#1B1B16]">Add-ons</h2>
          <button onClick={onClose}><X size={20} className="text-[#A8A89F]" /></button>
        </div>
        <p className="text-sm text-[#6B6B62] mb-4">{serviceName} — extras clients can add, each with its own price &amp; time.</p>

        {loading ? <p className="text-[#6B6B62] text-sm">Loading…</p> : (
          <div className="space-y-2 mb-4">
            {addOns.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E8E8E4]">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1B1B16]">{a.name}</p>
                  <p className="text-xs text-[#6B6B62] flex items-center gap-3">
                    <span className="flex items-center gap-1"><DollarSign size={11} />{Number(a.price).toFixed(2)}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{a.durationMin} min</span>
                  </p>
                </div>
                <button onClick={() => remove(a.id)} className="text-[#A8A89F] hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            ))}
            {!addOns.length && <p className="text-sm text-[#A8A89F]">No add-ons yet.</p>}
          </div>
        )}

        <div className="border-t border-[#E8E8E4] pt-4">
          <p className="text-xs font-semibold text-[#6B6B62] mb-2">Add a new one</p>
          <div className="space-y-2">
            <input className={inp} placeholder="Name (e.g. LED boost)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[11px] text-[#6B6B62]">Price ($)</label><input type="number" min={0} className={inp} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
              <div><label className="text-[11px] text-[#6B6B62]">Minutes</label><input type="number" min={0} className={inp} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} /></div>
            </div>
            <Button className="w-full" disabled={saving || !name.trim()} onClick={add}><Plus size={15} /> Add</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
