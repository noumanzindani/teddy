'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, MessageSquare, RefreshCcw, DollarSign, PauseCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DISPUTE_PRIORITY_META, type Dispute, type DisputeResolution } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiDispute {
  id: string;
  status: string;
  amount: number;
  resolution?: string | null;
  refundAmount?: number | null;
  booking: {
    id: string;
    service: { name: string };
    totalAmount: number;
    client: { firstName: string; lastName: string };
    vendor: { businessName: string };
  };
  createdAt: string;
  updatedAt: string;
}

function mapDispute(d: ApiDispute): Dispute {
  return {
    id: d.id,
    clientName: `${d.booking.client.firstName} ${d.booking.client.lastName}`,
    vendorName: d.booking.vendor.businessName,
    service: d.booking.service.name,
    amount: d.booking.totalAmount,
    status: d.status.toLowerCase() as 'open' | 'resolved' | 'closed',
    resolution: d.resolution?.toLowerCase() as DisputeResolution | undefined,
    refundAmount: d.refundAmount ?? undefined,
    openedAt: format(new Date(d.createdAt), 'yyyy-MM-dd'),
    bookingDate: format(new Date(d.createdAt), 'yyyy-MM-dd'),
    messages: [],
    priority: d.amount > 100 ? 'high' : d.amount > 50 ? 'medium' : 'low',
    issue: '',
    evidence: [],
  };
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [modal, setModal] = useState<'partial' | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<ApiDispute[]>('/admin/disputes');
        setDisputes(data.map(mapDispute));
      } catch (err: any) {
        showToast('Failed to load disputes: ' + (err?.message ?? 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  function resolve(id: string, resolution: DisputeResolution, extra?: Partial<Dispute>) {
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: 'resolved', resolution, ...extra } : d));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: 'resolved', resolution, ...extra } : null);
  }

  async function handleFullRefund(d: Dispute) {
    try {
      await api.post('/admin/disputes/' + d.id + '/resolve', { resolution: 'full_refund', refundAmount: d.amount });
      resolve(d.id, 'full_refund', { refundAmount: d.amount });
      showToast(`Full refund of $${d.amount} issued to ${d.clientName} via Stripe`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  async function handlePartialRefund() {
    if (!selected || !partialAmount) return;
    const amt = parseFloat(partialAmount);
    try {
      await api.post('/admin/disputes/' + selected.id + '/resolve', { resolution: 'partial_refund', refundAmount: amt });
      resolve(selected.id, 'partial_refund', { refundAmount: amt });
      setModal(null); setPartialAmount('');
      showToast(`Partial refund of $${amt} issued to ${selected.clientName}`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  async function handleNoRefund(d: Dispute) {
    try {
      await api.post('/admin/disputes/' + d.id + '/resolve', { resolution: 'no_refund' });
      resolve(d.id, 'no_refund');
      showToast(`Dispute closed — no refund issued`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  async function handleSuspendVendor(d: Dispute) {
    try {
      await api.post('/admin/disputes/' + d.id + '/resolve', { resolution: 'vendor_suspended' });
      resolve(d.id, 'vendor_suspended');
      showToast(`${d.vendorName} suspended — all future bookings blocked`);
    } catch (err: any) {
      showToast('Error: ' + (err?.message ?? 'Unknown error'));
    }
  }

  const filtered = disputes.filter(d => tab === 'all' || d.status === tab);

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key ? 'bg-[#1A1A14] text-white' : 'bg-white border border-[#E4E4E0] text-[#6B6B62] hover:bg-[#F5F4F0]')}>
              {t.label}
              <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/60' : 'text-[#A8A89F]')}>
                {disputes.filter(d => t.key === 'all' ? true : d.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8]">
                  {['Client', 'Vendor', 'Service', 'Amount', 'Opened', 'Priority', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E4E0]">
                {loading && (
                  <tr><td colSpan={8} className="text-center py-12 text-[#A8A89F] text-sm">Loading disputes…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-[#A8A89F] text-sm">No disputes found</td></tr>
                )}
                {!loading && filtered.map(d => {
                  const pm = DISPUTE_PRIORITY_META[d.priority];
                  return (
                    <tr key={d.id} onClick={() => setSelected(d)}
                      className={cn('cursor-pointer hover:bg-[#FAFAF8] transition-colors', selected?.id === d.id && 'bg-[#FBF6E3]')}>
                      <td className="px-4 py-3 font-medium text-[#1A1A14]">{d.clientName}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">{d.vendorName}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">{d.service}</td>
                      <td className="px-4 py-3 font-semibold text-[#1A1A14]">${d.amount}</td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">{format(new Date(d.openedAt), 'MMM d')}</td>
                      <td className="px-4 py-3"><Badge color={pm.color} bg={pm.bg}>{pm.label}</Badge></td>
                      <td className="px-4 py-3">
                        {d.status === 'open'
                          ? <Badge color="text-amber-700" bg="bg-amber-50">Open</Badge>
                          : d.status === 'resolved'
                          ? <Badge color="text-green-700" bg="bg-green-50">Resolved</Badge>
                          : <Badge color="text-gray-600" bg="bg-gray-100">Closed</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 text-[#A8A89F] text-xs">
                        {d.messages.length} msgs
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
        <div className="w-96 shrink-0 overflow-y-auto max-h-screen">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A14]">Dispute Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Client',   value: selected.clientName },
                  { label: 'Vendor',   value: selected.vendorName },
                  { label: 'Service',  value: selected.service },
                  { label: 'Amount',   value: `$${selected.amount}` },
                  { label: 'Booked',   value: format(new Date(selected.bookingDate), 'MMM d') },
                  { label: 'Opened',   value: format(new Date(selected.openedAt), 'MMM d') },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-[#A8A89F] uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-[#1A1A14]">{value}</p>
                  </div>
                ))}
              </div>

              {/* Issue */}
              {selected.issue && (
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1 uppercase tracking-wide">Issue</p>
                  <p className="text-sm text-red-700">{selected.issue}</p>
                </div>
              )}

              {/* Evidence */}
              {selected.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5">Evidence Files</p>
                  <div className="flex flex-col gap-1">
                    {selected.evidence.map(e => (
                      <div key={e} className="flex items-center gap-2 text-sm text-[#1A1A14] bg-[#F5F4F0] rounded-lg px-3 py-2">
                        <CheckCircle size={12} className="text-[#A8A89F]" />
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat log */}
              {selected.messages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Chat Log
                  </p>
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {selected.messages.map((m, i) => (
                      <div key={i} className={cn('rounded-xl px-3 py-2 text-sm', {
                        'bg-[#F5F4F0] text-[#1A1A14]': m.sender === 'client',
                        'bg-blue-50 text-blue-900': m.sender === 'vendor',
                        'bg-[#E4C654]/20 text-[#1A1A14]': m.sender === 'admin',
                      })}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mb-0.5">{m.sender}</p>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution */}
              {selected.status === 'open' ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E4E4E0]">
                  <p className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide">Resolution</p>
                  <Button className="w-full" onClick={() => handleFullRefund(selected)}>
                    <DollarSign size={14} /> Full Refund (${selected.amount})
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setModal('partial')}>
                    <RefreshCcw size={14} /> Partial Refund…
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => handleNoRefund(selected)}>
                    No Refund — Close Dispute
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => handleSuspendVendor(selected)}>
                    <PauseCircle size={14} /> Suspend Vendor
                  </Button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-800 mb-1">Resolved</p>
                  <p className="text-sm text-green-700 capitalize">{selected.resolution?.replace('_', ' ')}
                    {selected.refundAmount ? ` — $${selected.refundAmount} refunded` : ''}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Partial refund modal */}
      {modal === 'partial' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[#1A1A14] mb-1">Partial Refund</h3>
            <p className="text-sm text-[#6B6B62] mb-4">Max refundable: ${selected.amount}</p>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F] text-sm">$</span>
              <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)}
                placeholder="0.00" min="1" max={selected.amount} step="0.01"
                className="w-full pl-7 pr-4 py-3 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button className="flex-1" disabled={!partialAmount} onClick={handlePartialRefund}>Issue Refund</Button>
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
