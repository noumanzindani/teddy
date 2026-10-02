'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Gift, X, Ban, Send, History, Search } from 'lucide-react';
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

interface SendResult {
  ok: boolean;
  sentTo: string;
  linkedToClient: boolean;
}

interface HistoryTxn {
  type: 'issued' | 'redeemed';
  amount: number;
  at: string;
  note?: string | null;
}

interface CardHistory {
  card: { id: string; code: string; initialAmount: number; balance: number; isActive: boolean };
  transactions: HistoryTxn[];
}

interface RedeemResult { applied: number; cardId: string; remaining: number; }

function formatDate(at: string): string {
  const d = new Date(at);
  if (isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(50);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  // Send-to-recipient modal
  const [sendCard, setSendCard] = useState<GiftCard | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentTo, setSentTo] = useState('');

  // History modal
  const [historyCard, setHistoryCard] = useState<GiftCard | null>(null);
  const [historyData, setHistoryData] = useState<CardHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Redeem / check-balance modal
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemAmount, setRedeemAmount] = useState(10);
  const [lookupCard, setLookupCard] = useState<GiftCard | null>(null);
  const [checking, setChecking] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemResult, setRedeemResult] = useState<RedeemResult | null>(null);

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

  function openSend(c: GiftCard) {
    setSendCard(c);
    setRecipientEmail('');
    setMessage('');
    setSendError('');
    setSentTo('');
  }
  async function sendCardToRecipient() {
    if (!sendCard) return;
    setSending(true);
    setSendError('');
    try {
      const res = await api.post<SendResult>(`/gift-cards/${sendCard.id}/send`, {
        recipientEmail,
        message: message || undefined,
      });
      setSentTo(res.sentTo || recipientEmail);
      setTimeout(() => setSendCard(null), 1500);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send gift card.');
    } finally {
      setSending(false);
    }
  }

  function openRedeem() {
    setShowRedeem(true);
    setRedeemCode('');
    setRedeemAmount(10);
    setLookupCard(null);
    setRedeemError('');
    setRedeemResult(null);
  }
  async function checkBalance() {
    if (!redeemCode.trim()) return;
    setChecking(true);
    setRedeemError('');
    setRedeemResult(null);
    setLookupCard(null);
    try {
      setLookupCard(await api.get<GiftCard>(`/gift-cards/lookup/${encodeURIComponent(redeemCode.trim())}`));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setRedeemError(/not found/i.test(msg) ? 'Not found' : (msg || 'Not found'));
    } finally {
      setChecking(false);
    }
  }
  async function redeem() {
    if (!redeemCode.trim() || redeemAmount <= 0) return;
    setRedeeming(true);
    setRedeemError('');
    setRedeemResult(null);
    try {
      const res = await api.post<RedeemResult>('/gift-cards/redeem', { code: redeemCode.trim(), amount: Number(redeemAmount) });
      setRedeemResult(res);
      setLookupCard((c) => (c ? { ...c, balance: res.remaining } : c));
      await load();
    } catch (e) {
      setRedeemError(e instanceof Error ? e.message : 'Failed to redeem.');
    } finally {
      setRedeeming(false);
    }
  }

  async function openHistory(c: GiftCard) {
    setHistoryCard(c);
    setHistoryData(null);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      setHistoryData(await api.get<CardHistory>(`/gift-cards/${c.id}/history`));
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : 'Failed to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }

  const totalOutstanding = cards.filter((c) => c.isActive).reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Gift Cards</h1>
          <p className="text-sm text-[#6B6B62]">Issue and track gift cards. Outstanding balance: <span className="font-semibold">${totalOutstanding.toFixed(2)}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openRedeem}><Search size={16} /> Redeem / Check balance</Button>
          <Button onClick={() => setShowForm(true)}><Plus size={16} /> Issue Gift Card</Button>
        </div>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <Card key={c.id} className={cn('p-4 flex flex-col', !c.isActive && 'opacity-60')}>
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
              <div className="flex gap-2 mt-4 pt-3 border-t border-[#F0EFE8]">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openSend(c)} disabled={!c.isActive}><Send size={14} /> Send</Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => openHistory(c)}><History size={14} /> History</Button>
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

      {showRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRedeem(false)}>
          <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">Redeem / Check Balance</h2>
              <button onClick={() => setShowRedeem(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#6B6B62]">Gift-card code</label>
                <div className="flex gap-2 mt-1">
                  <input value={redeemCode} onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setLookupCard(null); setRedeemResult(null); setRedeemError(''); }} placeholder="TEDDY-XXXX-XXXX" className="flex-1 rounded-lg border border-[#E8E8E4] p-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
                  <Button variant="outline" size="sm" disabled={checking || !redeemCode.trim()} onClick={checkBalance}>{checking ? '…' : 'Check'}</Button>
                </div>
              </div>

              {lookupCard && (
                <div className="rounded-lg bg-[#FAFAF8] border border-[#F0EFE8] p-3">
                  <p className="text-xs text-[#6B6B62]">Current balance{!lookupCard.isActive && ' · inactive'}</p>
                  <p className="text-2xl font-black text-[#1B1B16]">${Number(lookupCard.balance).toFixed(2)}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#6B6B62]">Amount to redeem ($)</label>
                <input type="number" min={1} value={redeemAmount} onChange={(e) => setRedeemAmount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
              </div>

              {redeemResult && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">Applied ${Number(redeemResult.applied).toFixed(2)}, remaining ${Number(redeemResult.remaining).toFixed(2)}</p>
              )}
              {redeemError && <p className="text-sm text-red-600">{redeemError}</p>}

              <Button className="w-full" disabled={redeeming || !redeemCode.trim() || redeemAmount <= 0} onClick={redeem}>{redeeming ? 'Redeeming…' : 'Redeem'}</Button>
            </div>
          </Card>
        </div>
      )}

      {sendCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSendCard(null)}>
          <Card className="w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">Send Gift Card</h2>
              <button onClick={() => setSendCard(null)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            {sentTo ? (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">Sent to {sentTo} ✓</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#6B6B62]">Emails the code for <span className="font-mono font-semibold text-[#1B1B16]">{sendCard.code}</span> to the recipient.</p>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B62]">Recipient email</label>
                  <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="name@example.com" className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B62]">Message (optional)</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Add a personal note…" className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] resize-none" />
                </div>
                {sendError && <p className="text-sm text-red-600">{sendError}</p>}
                <Button className="w-full" disabled={sending || !recipientEmail.trim()} onClick={sendCardToRecipient}>{sending ? 'Sending…' : 'Send'}</Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {historyCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryCard(null)}>
          <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg text-[#1B1B16]">Card History</h2>
                <p className="font-mono text-xs text-[#6B6B62] tracking-wide">{historyCard.code}</p>
              </div>
              <button onClick={() => setHistoryCard(null)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            {historyLoading ? (
              <p className="text-[#6B6B62] text-sm">Loading…</p>
            ) : historyError ? (
              <p className="text-sm text-red-600">{historyError}</p>
            ) : historyData ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#FAFAF8] border border-[#F0EFE8] p-3">
                  <p className="text-xs text-[#6B6B62]">Current balance</p>
                  <p className="text-2xl font-black text-[#1B1B16]">${Number(historyData.card.balance).toFixed(2)}</p>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {historyData.transactions.map((t, i) => {
                    const redeemed = t.type === 'redeemed';
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-[#F0EFE8] last:border-0">
                        <div>
                          <p className={cn('text-sm font-medium', redeemed ? 'text-[#6B6B62]' : 'text-[#1B1B16]')}>{t.note || (redeemed ? 'Redeemed' : 'Issued')}</p>
                          <p className="text-xs text-[#A8A89F]">{formatDate(t.at)}</p>
                        </div>
                        <p className={cn('text-sm font-bold tabular-nums', redeemed ? 'text-red-500' : 'text-[#1B1B16]')}>
                          {redeemed ? '-' : '+'}${Math.abs(Number(t.amount)).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                  {!historyData.transactions.length && <p className="text-sm text-[#6B6B62] py-2">No transactions yet.</p>}
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
