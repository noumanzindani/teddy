'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Gift, X, Ban } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface GiftCard {
  id: string;
  code: string;
  initialAmount: number;
  balance: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(50);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCards(await api.get<GiftCard[]>('/gift-cards')); } catch { /* */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    try { await api.post('/gift-cards', { initialAmount: Number(amount), code: code || undefined }); setShowForm(false); setCode(''); setAmount(50); await load(); }
    catch { /* */ } finally { setSaving(false); }
  }
  async function deactivate(id: string) {
    try { await api.post(`/gift-cards/${id}/deactivate`, {}); await load(); } catch { /* */ }
  }

  const totalOutstanding = cards.filter((c) => c.isActive).reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Gift Cards</h1>
          <p className="text-sm text-[#6B6B62]">Issue and track gift cards. Outstanding balance: <span className="font-semibold">${totalOutstanding.toFixed(2)}</span></p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Issue Gift Card</Button>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <Card key={c.id} className={cn('p-4', !c.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E4C654] to-[#C9AD3A] flex items-center justify-center"><Gift size={18} className="text-[#1B1B16]" /></div>
                {c.isActive
                  ? <button onClick={() => deactivate(c.id)} title="Deactivate" className="text-[#A8A89F] hover:text-red-600"><Ban size={15} /></button>
                  : <span className="text-[10px] font-semibold text-[#A8A89F] uppercase">Inactive</span>}
              </div>
              <p className="font-mono font-bold text-[#1B1B16] mt-3 tracking-wide">{c.code}</p>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <p className="text-2xl font-black text-[#1B1B16]">${Number(c.balance).toFixed(2)}</p>
                  <p className="text-xs text-[#6B6B62]">of ${Number(c.initialAmount).toFixed(2)} issued</p>
                </div>
              </div>
            </Card>
          ))}
          {!cards.length && <Card className="p-8 text-center text-[#6B6B62] sm:col-span-2">No gift cards issued yet.</Card>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">Issue Gift Card</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B62]">Amount ($)</label>
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
                <div className="flex gap-2 mt-2">{[25, 50, 100, 150].map((a) => <button key={a} onClick={() => setAmount(a)} className="flex-1 py-1 text-xs rounded border border-[#E8E8E4] hover:bg-[#FAFAF8]">${a}</button>)}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B6B62]">Custom code (optional)</label>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Auto-generated if blank" className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
              </div>
              <Button className="w-full" disabled={saving || amount <= 0} onClick={create}>{saving ? 'Issuing…' : 'Issue Card'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
