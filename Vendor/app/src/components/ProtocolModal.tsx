'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product { id: string; name: string; brand?: string | null; type: string; stock: number; }
type Role = 'use' | 'alternative' | 'avoid';
interface ProtocolItem {
  productId?: string;
  product?: { id: string } | null;
  id?: string;
  role?: Role | null;
  notes?: string | null;
  step?: number | null;
}
interface Detail { role: Role; notes: string; }

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'use', label: 'Use' },
  { value: 'alternative', label: 'Alternative' },
  { value: 'avoid', label: 'Avoid' },
];

export function ProtocolModal({ serviceId, serviceName, onClose }: { serviceId: string; serviceName: string; onClose: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRaw, protoRaw] = await Promise.all([
        api.get<Product[] | { data: Product[] }>(`/products?type=professional`),
        api.get<ProtocolItem[] | { data: ProtocolItem[] }>(`/products/service/${serviceId}/protocol`).catch(() => [] as ProtocolItem[]),
      ]);
      const prods = Array.isArray(prodRaw) ? prodRaw : (prodRaw?.data ?? []);
      const proto = Array.isArray(protoRaw) ? protoRaw : (protoRaw?.data ?? []);
      setProducts(prods);
      const ids: string[] = [];
      const det: Record<string, Detail> = {};
      proto.forEach((p) => {
        const id = p.productId ?? p.product?.id ?? p.id;
        if (!id) return;
        ids.push(id);
        det[id] = { role: (p.role as Role) ?? 'use', notes: p.notes ?? '' };
      });
      setSelected(new Set(ids));
      setDetails(det);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [serviceId]);
  useEffect(() => { load(); }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDetails((prev) => (prev[id] ? prev : { ...prev, [id]: { role: 'use', notes: '' } }));
  }

  function setRole(id: string, role: Role) {
    setDetails((prev) => ({ ...prev, [id]: { role, notes: prev[id]?.notes ?? '' } }));
  }
  function setNotes(id: string, notes: string) {
    setDetails((prev) => ({ ...prev, [id]: { role: prev[id]?.role ?? 'use', notes } }));
  }

  async function save() {
    setSaving(true);
    try {
      const ids = Array.from(selected);
      const items = ids.map((productId, step) => ({
        productId,
        role: details[productId]?.role ?? 'use',
        notes: details[productId]?.notes?.trim() || null,
        step,
      }));
      await api.patch(`/products/service/${serviceId}/protocol`, { items });
      onClose();
    } catch { /* */ } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg text-[#1B1B16]">Protocol / Back-bar</h2>
          <button onClick={onClose}><X size={20} className="text-[#A8A89F]" /></button>
        </div>
        <p className="text-sm text-[#6B6B62] mb-4">{serviceName} — professional products used to perform this service.</p>

        {loading ? <p className="text-[#6B6B62] text-sm">Loading…</p> : (
          <div className="space-y-2 mb-4">
            {products.map((p) => {
              const on = selected.has(p.id);
              const d = details[p.id] ?? { role: 'use' as Role, notes: '' };
              return (
                <div key={p.id} className={cn('rounded-lg border', on ? 'border-[#E4C654] bg-[#FFFDF5]' : 'border-[#E8E8E4]')}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.id)}
                      className="accent-[#E4C654] w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B1B16] truncate">{p.name}</p>
                      <p className="text-xs text-[#6B6B62]">
                        {p.brand ? `${p.brand} · ` : ''}Stock: {p.stock}
                      </p>
                    </div>
                  </label>
                  {on && (
                    <div className="px-3 pb-3 pt-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#6B6B62] w-12 shrink-0">Role</span>
                        <select
                          value={d.role}
                          onChange={(e) => setRole(p.id, e.target.value as Role)}
                          className="flex-1 rounded-lg border border-[#E8E8E4] p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]"
                        >
                          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                      <input
                        value={d.notes}
                        onChange={(e) => setNotes(p.id, e.target.value)}
                        placeholder="Notes (optional) — e.g. apply after cleanse"
                        className="w-full rounded-lg border border-[#E8E8E4] p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {!products.length && (
              <p className="text-sm text-[#A8A89F] flex items-center gap-2">
                <Package size={14} /> No professional / back-bar products yet.
              </p>
            )}
          </div>
        )}

        <div className="border-t border-[#E8E8E4] pt-4">
          <Button className="w-full" disabled={saving || loading} onClick={save}>
            {saving ? 'Saving…' : 'Save Protocol'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
