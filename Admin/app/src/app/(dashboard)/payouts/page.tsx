'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Flag, CheckCircle, AlertTriangle, XCircle, Banknote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PAYOUT_STATUS_META, type Payout, type PayoutStatus } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiPayout {
  id: string;
  status: string;
  amount: number;
  platformFee: number;
  net: number;
  vendor: { id: string; businessName: string };
  booking: { id: string; startsAt: string };
  createdAt: string;
  paidAt?: string | null;
  flagNote?: string | null;
}

function mapPayout(p: ApiPayout): Payout {
  const scheduledDate = format(new Date(p.booking.startsAt), 'yyyy-MM-dd');
  return {
    id: p.id,
    vendorName: p.vendor.businessName,
    vendorId: p.vendor.id,
    amount: p.amount,
    commission: p.platformFee,
    net: p.net,
    bookingCount: 1,
    period: format(new Date(p.booking.startsAt), 'MMM d'),
    scheduledAt: scheduledDate,
    paidAt: p.paidAt ? format(new Date(p.paidAt), 'yyyy-MM-dd') : undefined,
    status: p.status.toLowerCase() as PayoutStatus,
    flagNote: p.flagNote ?? undefined,
  };
}

const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid',    label: 'Paid' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'failed',  label: 'Failed' },
];

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<Payout | null>(null);
  const [modal, setModal] = useState<'flag' | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<ApiPayout[]>('/admin/payouts');
        setPayouts(data.map(mapPayout));
      } catch (err: any) {
        showToast('Failed to load payouts: ' + (err?.message ?? 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function updatePayout(id: string, patch: Partial<Payout>) {
    setPayouts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...patch } : null);
  }

  async function handleFlag() {
    if (!selected || !flagNote.trim()) return;
    try {
      await api.post('/admin/payouts/' + selected.id + '/flag', { note: flagNote });
      updatePayout(selected.id, { status: 'flagged', flagNote });
      setModal(null); setFlagNote('');
      showToast(`${selected.vendorName} payout flagged for manual review`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  async function handleMarkPaid(p: Payout) {
    try {
      await api.post('/admin/payouts/' + p.id + '/release', {});
      updatePayout(p.id, { status: 'paid', paidAt: format(new Date(), 'yyyy-MM-dd') });
      showToast(`${p.vendorName} payout marked as paid`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  const filtered = payouts.filter(p => tab === 'all' || p.status === tab);

  const totalPending = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.net, 0);
  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.net, 0);
  const totalFlagged = payouts.filter(p => p.status === 'flagged' || p.status === 'failed').length;

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending payouts', value: `$${totalPending.toLocaleString()}`, sub: `${payouts.filter(p => p.status === 'pending').length} transfers`, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'Paid this cycle', value: `$${totalPaid.toLocaleString()}`, sub: `${payouts.filter(p => p.status === 'paid').length} completed`, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Need attention', value: totalFlagged, sub: 'Flagged or failed', color: 'text-red-700', bg: 'bg-red-50' },
          ].map(k => (
            <Card key={k.label} className={`p-4 border ${k.bg}`}>
              <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
              <p className="text-sm font-medium text-[#1A1A14] mt-0.5">{k.label}</p>
              <p className="text-xs text-[#A8A89F] mt-0.5">{k.sub}</p>
            </Card>
          ))}
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key ? 'bg-[#1A1A14] text-white' : 'bg-white border border-[#E4E4E0] text-[#6B6B62] hover:bg-[#F5F4F0]')}>
              {t.label}
              <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/60' : 'text-[#A8A89F]')}>
                {payouts.filter(p => t.key === 'all' ? true : p.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8]">
                  {['Vendor', 'Period', 'Gross', 'Commission', 'Net Payout', 'Bookings', 'Scheduled', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E0]">
                {loading && (
                  <tr><td colSpan={9} className="text-center py-12 text-[#A8A89F] text-sm">Loading payouts…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-[#A8A89F] text-sm">No payouts found</td></tr>
                )}
                {!loading && filtered.map(p => {
                  const meta = PAYOUT_STATUS_META[p.status];
                  return (
                    <tr key={p.id} onClick={() => setSelected(p)}
                      className={cn('cursor-pointer hover:bg-[#FAFAF8] transition-colors', selected?.id === p.id && 'bg-[#FBF6E3]')}>
                      <td className="px-4 py-3 font-medium text-[#1A1A14]">{p.vendorName}</td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">{p.period}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">${p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">-${p.commission}</td>
                      <td className="px-4 py-3 font-semibold text-[#1A1A14]">${p.net.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">{p.bookingCount}</td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">{format(new Date(p.scheduledAt), 'MMM d')}</td>
                      <td className="px-4 py-3"><Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {p.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => handleMarkPaid(p)}><CheckCircle size={12} /></Button>
                              <Button size="sm" variant="warning" onClick={() => { setSelected(p); setModal('flag'); }}><Flag size={12} /></Button>
                            </>
                          )}
                          {p.status === 'failed' && (
                            <Button size="sm" variant="warning" onClick={() => { setSelected(p); setModal('flag'); }}><Flag size={12} /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A14]">Payout Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E4C654]/20 flex items-center justify-center">
                  <Banknote size={18} className="text-[#C9AD3A]" />
                </div>
                <div>
                  <p className="font-bold text-[#1A1A14]">{selected.vendorName}</p>
                  <Badge color={PAYOUT_STATUS_META[selected.status].color} bg={PAYOUT_STATUS_META[selected.status].bg}>
                    {PAYOUT_STATUS_META[selected.status].label}
                  </Badge>
                </div>
              </div>

              {[
                { label: 'Period',       value: selected.period },
                { label: 'Bookings',     value: `${selected.bookingCount} completed` },
                { label: 'Gross',        value: `$${selected.amount.toLocaleString()}` },
                { label: 'Commission',   value: `-$${selected.commission} (10%)` },
                { label: 'Net Payout',   value: `$${selected.net.toLocaleString()}` },
                { label: 'Scheduled',    value: format(new Date(selected.scheduledAt), 'MMM d, yyyy') },
                ...(selected.paidAt ? [{ label: 'Paid', value: format(new Date(selected.paidAt), 'MMM d, yyyy') }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[#6B6B62]">{label}</span>
                  <span className="font-medium text-[#1A1A14] text-right">{value}</span>
                </div>
              ))}

              {selected.flagNote && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-sm">
                  <p className="font-medium text-orange-800 mb-0.5 text-xs uppercase tracking-wide">Flag Note</p>
                  <p className="text-orange-700">{selected.flagNote}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-[#E4E4E0]">
                {selected.status === 'pending' && (
                  <>
                    <Button className="w-full" onClick={() => handleMarkPaid(selected)}>
                      <CheckCircle size={14} /> Mark as Paid
                    </Button>
                    <Button variant="warning" className="w-full" onClick={() => setModal('flag')}>
                      <Flag size={14} /> Flag for Review
                    </Button>
                  </>
                )}
                {(selected.status === 'flagged' || selected.status === 'failed') && (
                  <Button className="w-full" onClick={() => handleMarkPaid(selected)}>
                    <CheckCircle size={14} /> Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Flag modal */}
      {modal === 'flag' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1A1A14] mb-1">Flag Payout for Review</h3>
            <p className="text-sm text-[#6B6B62] mb-4">{selected.vendorName} — ${selected.net} net</p>
            <textarea value={flagNote} onChange={e => setFlagNote(e.target.value)} placeholder="Reason for flagging…" rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="warning" className="flex-1" disabled={!flagNote.trim()} onClick={handleFlag}>Flag Payout</Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A14] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">{toast}</div>
      )}
    </div>
  );
}
