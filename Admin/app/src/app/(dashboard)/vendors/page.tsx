'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, MapPin, Users, DollarSign, CheckCircle, XCircle, Info, PauseCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { VENDOR_STATUS_META, type VendorApplication, type VendorStatus } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiVendor {
  id: string;
  businessName: string;
  owner: { id: string; firstName: string; lastName: string; email: string; phone: string };
  address: string | null;
  bio: string | null;
  status: string;
  createdAt: string;
  application?: { monthlyRevenue?: string; staffCount?: number } | null;
}

function normalise(s: string): VendorStatus {
  const lower = s.toLowerCase();
  if (lower === 'pending' || lower === 'approved' || lower === 'rejected' || lower === 'suspended') {
    return lower as VendorStatus;
  }
  return 'pending';
}

function mapApiVendor(v: ApiVendor): VendorApplication {
  return {
    id: v.id,
    salonName: v.businessName,
    ownerName: `${v.owner.firstName} ${v.owner.lastName}`,
    email: v.owner.email,
    phone: v.owner.phone,
    city: v.address?.split(',')[1]?.trim() ?? '',
    address: v.address ?? '',
    category: '',
    appliedAt: v.createdAt,
    status: normalise(v.status),
    bio: v.bio ?? '',
    monthlyRevenue: v.application?.monthlyRevenue ?? undefined,
    staffCount: v.application?.staffCount ?? undefined,
  };
}

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'info_requested', label: 'Info Requested' },
];

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VendorApplication | null>(null);
  const [modal, setModal] = useState<'reject' | 'info' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [infoRequest, setInfoRequest] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function fetchVendors() {
      try {
        const data = await api.get<ApiVendor[]>('/admin/vendors/pending');
        setVendors(data.map(mapApiVendor));
      } catch (err) {
        showToast('Failed to load vendors');
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  function updateStatus(id: string, status: VendorStatus, extra?: Partial<VendorApplication>) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status, ...extra } : v));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, ...extra } : null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleApprove(v: VendorApplication) {
    try {
      await api.post('/admin/vendors/' + v.id + '/approve', {});
      updateStatus(v.id, 'approved');
      showToast(`✓ ${v.salonName} approved — Stripe Connect invite sent`);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to approve vendor');
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) return;
    try {
      await api.post('/admin/vendors/' + selected.id + '/reject', { reason: rejectReason });
      updateStatus(selected.id, 'rejected', { rejectionReason: rejectReason });
      setModal(null);
      setRejectReason('');
      showToast(`${selected.salonName} rejected — rejection email sent`);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to reject vendor');
    }
  }

  function handleInfoRequest() {
    if (!selected || !infoRequest.trim()) return;
    updateStatus(selected.id, 'info_requested');
    setModal(null);
    setInfoRequest('');
    showToast(`Info request sent to ${selected.salonName}`);
  }

  function handleSuspend(v: VendorApplication) {
    updateStatus(v.id, 'suspended');
    showToast(`${v.salonName} suspended — all bookings blocked`);
  }

  const filtered = vendors.filter(v => {
    const matchTab = tab === 'all' || v.status === tab;
    const matchSearch = !search || v.salonName.toLowerCase().includes(search.toLowerCase()) || v.ownerName.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search salon or owner…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E4E4E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key ? 'bg-[#1A1A14] text-white' : 'bg-white border border-[#E4E4E0] text-[#6B6B62] hover:bg-[#F5F4F0]'
              )}>
              {t.label}
              <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/60' : 'text-[#A8A89F]')}>
                {vendors.filter(v => t.key === 'all' ? true : v.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#A8A89F] text-sm">
              <svg className="animate-spin mr-2 h-4 w-4 text-[#A8A89F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading vendors…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8]">
                    {['Salon', 'Owner', 'City', 'Category', 'Applied', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0]">
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-[#A8A89F] text-sm">No vendors found</td></tr>
                  )}
                  {filtered.map(v => {
                    const meta = VENDOR_STATUS_META[v.status];
                    return (
                      <tr key={v.id} onClick={() => setSelected(v)}
                        className={cn('cursor-pointer hover:bg-[#FAFAF8] transition-colors', selected?.id === v.id && 'bg-[#FBF6E3]')}>
                        <td className="px-4 py-3 font-medium text-[#1A1A14]">{v.salonName}</td>
                        <td className="px-4 py-3 text-[#6B6B62]">{v.ownerName}</td>
                        <td className="px-4 py-3 text-[#6B6B62]">{v.city}</td>
                        <td className="px-4 py-3 text-[#6B6B62]">{v.category}</td>
                        <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">{format(new Date(v.appliedAt), 'MMM d')}</td>
                        <td className="px-4 py-3"><Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge></td>
                        <td className="px-4 py-3">
                          {v.status === 'pending' && (
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <Button size="sm" onClick={() => handleApprove(v)}><CheckCircle size={12} /> Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => { setSelected(v); setModal('reject'); }}><XCircle size={12} /> Reject</Button>
                            </div>
                          )}
                          {v.status === 'approved' && (
                            <Button size="sm" variant="warning" onClick={e => { e.stopPropagation(); handleSuspend(v); }}>
                              <PauseCircle size={12} /> Suspend
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A14]">Application Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#1A1A14] text-base">{selected.salonName}</p>
                    <p className="text-sm text-[#6B6B62]">{selected.ownerName}</p>
                  </div>
                  <Badge color={VENDOR_STATUS_META[selected.status].color} bg={VENDOR_STATUS_META[selected.status].bg}>
                    {VENDOR_STATUS_META[selected.status].label}
                  </Badge>
                </div>
              </div>

              {[
                { icon: <MapPin size={13} className="text-[#A8A89F]" />, value: selected.address },
                { icon: <Users size={13} className="text-[#A8A89F]" />, value: `${selected.staffCount ?? '—'} staff members` },
                { icon: <DollarSign size={13} className="text-[#A8A89F]" />, value: selected.monthlyRevenue ?? 'Not provided' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 shrink-0">{r.icon}</span>
                  <span className="text-[#6B6B62]">{r.value}</span>
                </div>
              ))}

              {selected.bio && (
                <div className="bg-[#F5F4F0] rounded-lg p-3 text-sm text-[#6B6B62]">
                  <p className="font-medium text-[#1A1A14] mb-1 text-xs uppercase tracking-wide">About</p>
                  <p>{selected.bio}</p>
                </div>
              )}

              {selected.rejectionReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-red-800 mb-0.5">Rejection reason</p>
                  <p className="text-red-700">{selected.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'pending' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E4E4E0]">
                  <Button className="w-full" onClick={() => handleApprove(selected)}>
                    <CheckCircle size={14} /> Approve Vendor
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setModal('info')}>
                    <Info size={14} /> Request More Info
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => setModal('reject')}>
                    <XCircle size={14} /> Reject Application
                  </Button>
                </div>
              )}
              {selected.status === 'approved' && (
                <div className="pt-2 border-t border-[#E4E4E0]">
                  <Button variant="warning" className="w-full" onClick={() => handleSuspend(selected)}>
                    <PauseCircle size={14} /> Suspend Vendor
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Reject modal */}
      {modal === 'reject' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1A1A14] mb-1">Reject Application</h3>
            <p className="text-sm text-[#6B6B62] mb-4">{selected.salonName} — rejection reason is required and will be emailed to the vendor.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason…" rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={!rejectReason.trim()} onClick={handleReject}>Confirm Reject</Button>
            </div>
          </div>
        </div>
      )}

      {/* Info request modal */}
      {modal === 'info' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1A1A14] mb-1">Request More Information</h3>
            <p className="text-sm text-[#6B6B62] mb-4">Your message will be emailed to {selected.email}.</p>
            <textarea value={infoRequest} onChange={e => setInfoRequest(e.target.value)} placeholder="Describe what information is needed…" rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button className="flex-1" disabled={!infoRequest.trim()} onClick={handleInfoRequest}>Send Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A14] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50 flex items-center gap-2">
          {toast}
        </div>
      )}
    </div>
  );
}
