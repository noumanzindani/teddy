'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  Search, Filter, CheckCircle, Play, XCircle, UserX, ChevronDown,
  Upload, Clock, Banknote, ImageIcon, X, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STATUS_META, type BookingStatus } from '@/lib/mock-data';
import { api, normaliseStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  clientName: string;
  clientAvatar?: string;
  service: string;
  category: string;
  date: string;       // yyyy-MM-dd
  time: string;       // HH:mm
  duration: number;
  price: number;
  status: BookingStatus;
  staffName: string;
  notes?: string;
  payoutAt?: string;
  timerStartedAt?: string;
  timerDurationMin?: number;
  timerExtraMin: number;
}

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  totalAmount: number;
  notes?: string;
  timerStartedAt?: string | null;
  timerDurationMin?: number | null;
  timerExtraMin?: number;
  service: { name: string; durationMin: number; category: string };
  client: { firstName: string; lastName: string; avatarUrl?: string };
  staffMember: { user: { firstName: string; lastName: string } } | null;
  payout?: { createdAt: string };
}

/** Remaining seconds for a running service timer, computed locally. */
function timerRemaining(b: Booking, nowMs: number): number | null {
  if (!b.timerStartedAt || !b.timerDurationMin) return null;
  const totalMs = (b.timerDurationMin + b.timerExtraMin) * 60 * 1000;
  return Math.round((new Date(b.timerStartedAt).getTime() + totalMs - nowMs) / 1000);
}

function fmtCountdown(totalSec: number): string {
  const s = Math.abs(totalSec);
  return `${totalSec < 0 ? '-' : ''}${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function adaptBooking(b: ApiBooking): Booking {
  const starts = new Date(b.startsAt);
  return {
    id: b.id,
    clientName: `${b.client.firstName} ${b.client.lastName}`,
    clientAvatar: b.client.avatarUrl,
    service: b.service.name,
    category: b.service.category,
    date: format(starts, 'yyyy-MM-dd'),
    time: format(starts, 'HH:mm'),
    duration: b.service.durationMin,
    price: Number(b.totalAmount),
    status: normaliseStatus(b.status),
    staffName: b.staffMember
      ? `${b.staffMember.user.firstName} ${b.staffMember.user.lastName[0]}.`
      : '—',
    notes: b.notes,
    payoutAt: b.payout?.createdAt
      ? format(new Date(new Date(b.payout.createdAt).getTime() + 2 * 86400000), 'yyyy-MM-dd')
      : undefined,
    timerStartedAt: b.timerStartedAt ?? undefined,
    timerDurationMin: b.timerDurationMin ?? undefined,
    timerExtraMin: b.timerExtraMin ?? 0,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No Show' },
];

const CANCEL_REASONS = [
  'Client requested cancellation',
  'Staff unavailable',
  'Emergency closure',
  'Client no response',
  'Other',
];

type Photos = Record<string, { before?: string; after?: string }>;

// ── Status → API endpoint ─────────────────────────────────────────────────────
const STATUS_ENDPOINT: Partial<Record<BookingStatus, string>> = {
  in_progress: 'start',
  completed:   'complete',
  no_show:     'no-show',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [photos, setPhotos] = useState<Photos>({});
  const [nowMs, setNowMs] = useState(() => Date.now());

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.get<{ bookings: ApiBooking[] }>('/vendors/me/bookings?limit=100');
      setBookings((data.bookings ?? []).map(adaptBooking));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Live view of running service timers: tick each second, re-poll every 20s so
  // the vendor sees each employee's countdown start / extend / finish.
  const anyRunning = bookings.some((b) => b.status === 'in_progress' && b.timerStartedAt);
  useEffect(() => {
    if (!anyRunning) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const poll = setInterval(() => { fetchBookings(); }, 20000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [anyRunning, fetchBookings]);

  const filtered = bookings.filter(b => {
    const matchTab = tab === 'all' || b.status === tab;
    const matchSearch =
      !search ||
      b.clientName.toLowerCase().includes(search.toLowerCase()) ||
      b.service.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  async function updateStatus(id: string, status: BookingStatus) {
    try {
      const endpoint = STATUS_ENDPOINT[status];
      if (!endpoint) return;
      await api.post(`/bookings/${id}/${endpoint}`, {});
      setBookings(prev => prev.map(b => {
        if (b.id !== id) return b;
        if (status === 'completed') {
          const d = new Date(b.date);
          d.setDate(d.getDate() + 2);
          return { ...b, status, payoutAt: format(d, 'yyyy-MM-dd') };
        }
        return { ...b, status };
      }));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  async function confirmCancel() {
    if (!selected) return;
    try {
      await api.post(`/bookings/${selected.id}/cancel`, { reason: cancelReason, note: cancelNote });
      setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, status: 'cancelled' } : b));
      setSelected(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setShowCancel(false);
      setCancelReason('');
      setCancelNote('');
    }
  }

  function setPhoto(bookingId: string, slot: 'before' | 'after', url: string | undefined) {
    setPhotos(prev => ({ ...prev, [bookingId]: { ...prev[bookingId], [slot]: url } }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left — bookings list */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client or service..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E8E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter size={14} /> Filter <ChevronDown size={12} />
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key
                  ? 'bg-[#1B1B16] text-white'
                  : 'bg-white border border-[#E8E8E4] text-[#6B6B62] hover:bg-[#FAFAF8]'
              )}
            >
              {t.label}
              {t.key !== 'all' && (
                <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/60' : 'text-[#A8A89F]')}>
                  {bookings.filter(b => b.status === t.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E8E4] bg-[#FAFAF8]">
                  {['Client', 'Service', 'Date & Time', 'Staff', 'Price', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E4]">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#A8A89F] text-sm">
                      No bookings found
                    </td>
                  </tr>
                )}
                {filtered.map(b => {
                  const meta = STATUS_META[b.status];
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className={cn(
                        'cursor-pointer hover:bg-[#FAFAF8] transition-colors',
                        selected?.id === b.id && 'bg-[#FBF6E3]'
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[#1B1B16]">{b.clientName}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">{b.service}</td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">
                        {format(new Date(b.date), 'MMM d')} · {b.time}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B62]">{b.staffName}</td>
                      <td className="px-4 py-3 font-semibold text-[#1B1B16]">${b.price}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                          {b.status === 'in_progress' && (() => {
                            const rem = timerRemaining(b, nowMs);
                            if (rem === null) return null;
                            const over = rem < 0;
                            return (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full',
                                  over ? 'bg-red-50 text-red-700' : rem <= 300 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                                )}
                              >
                                <Clock size={11} /> {fmtCountdown(rem)}
                                {b.timerExtraMin > 0 && <span className="opacity-70">(+{b.timerExtraMin})</span>}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionMenu
                          booking={b}
                          onUpdate={updateStatus}
                          onCancel={() => { setSelected(b); setShowCancel(true); }}
                        />
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
        <div className="w-80 shrink-0 overflow-y-auto max-h-screen">
          <BookingDetail
            booking={selected}
            photos={photos[selected.id]}
            onUpdate={updateStatus}
            onCancel={() => setShowCancel(true)}
            onClose={() => setSelected(null)}
            onSetPhoto={(slot, url) => setPhoto(selected.id, slot, url)}
          />
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1B1B16] mb-1">Cancel Booking</h3>
            <p className="text-sm text-[#6B6B62] mb-4">
              {selected.clientName} — {selected.service} on {format(new Date(selected.date), 'MMM d')} at {selected.time}
            </p>
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-sm font-medium text-[#1B1B16]">Reason for cancellation</p>
              {CANCEL_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="radio" name="cancel-reason" value={r} checked={cancelReason === r}
                    onChange={() => setCancelReason(r)} className="accent-[#E4C654]" />
                  <span className="text-sm text-[#1B1B16]">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancel(false)}>Keep Booking</Button>
              <Button variant="danger" className="flex-1" disabled={!cancelReason} onClick={confirmCancel}>
                Confirm Cancel
              </Button>
            </div>
            <p className="text-xs text-[#A8A89F] text-center mt-3">
              A full refund will be issued to the client automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action menu ───────────────────────────────────────────────────────────────

function ActionMenu({ booking, onUpdate, onCancel }: {
  booking: Booking;
  onUpdate: (id: string, status: BookingStatus) => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { status, id } = booking;
  const actions: { label: string; icon: React.ReactNode; action: () => void; className?: string }[] = [];

  if (status === 'confirmed' || status === 'pending') {
    actions.push({ label: 'Mark Started', icon: <Play size={13} />, action: () => onUpdate(id, 'in_progress') });
    actions.push({ label: 'Cancel', icon: <XCircle size={13} />, action: onCancel, className: 'text-red-600' });
  }
  if (status === 'in_progress') {
    actions.push({ label: 'Mark Completed', icon: <CheckCircle size={13} />, action: () => onUpdate(id, 'completed') });
    actions.push({ label: 'Mark No-Show', icon: <UserX size={13} />, action: () => onUpdate(id, 'no_show'), className: 'text-red-600' });
  }
  if (actions.length === 0) return null;

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(v => !v)}
        className="px-2 py-1 rounded text-[#6B6B62] hover:bg-[#F0EFE8] transition-colors text-xs font-medium">
        Actions ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 bg-white border border-[#E8E8E4] rounded-xl shadow-lg z-20 min-w-44 py-1 overflow-hidden">
            {actions.map(a => (
              <button key={a.label} onClick={() => { a.action(); setOpen(false); }}
                className={cn('flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-[#FAFAF8] transition-colors', a.className ?? 'text-[#1B1B16]')}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Review request ────────────────────────────────────────────────────────────

function ReviewRequestButton({ bookingId }: { bookingId: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function request() {
    if (sending || sent) return;
    setSending(true);
    try {
      await api.post(`/engagement/bookings/${bookingId}/review-request`, {});
      setSent(true);
    } catch (err) {
      console.error('Review request failed:', err);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex items-center justify-center gap-1.5 p-2.5 bg-green-50 rounded-lg text-sm font-medium text-green-700">
        <CheckCircle size={14} /> Requested ✓
      </div>
    );
  }

  return (
    <Button variant="outline" className="w-full" onClick={request} disabled={sending}>
      <Star size={14} /> {sending ? 'Sending…' : 'Request review'}
    </Button>
  );
}

// ── Payout timeline ───────────────────────────────────────────────────────────

function formatPayoutDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

function PayoutTimeline({ booking }: { booking: Booking }) {
  const { payoutAt, date, price } = booking;
  if (!payoutAt) return null;
  const payoutDate = new Date(payoutAt);
  const isPaid = payoutDate <= new Date();
  const steps = [
    { label: 'Booking completed', sub: format(new Date(date), 'MMM d'), done: true },
    { label: 'Payout initiated', sub: 'T+1 · Stripe processing', done: true },
    { label: isPaid ? 'Payout arrived' : 'Payout arrives', sub: `${formatPayoutDate(payoutAt)} · $${price} net`, done: isPaid, current: !isPaid },
  ];
  return (
    <div className="border border-[#E8E8E4] rounded-xl p-4 bg-[#FAFAF8]">
      <div className="flex items-center gap-2 mb-3">
        <Banknote size={14} className="text-[#6B6B62]" />
        <p className="text-xs font-semibold text-[#1B1B16] uppercase tracking-wide">Stripe Payout</p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className={cn('mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
              s.done ? 'border-green-500 bg-green-500' : s.current ? 'border-[#E4C654] bg-white' : 'border-[#D0CFC8] bg-white')}>
              {s.done && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
              {s.current && <div className="w-1.5 h-1.5 rounded-full bg-[#E4C654]" />}
            </div>
            <div>
              <p className={cn('text-xs font-medium', s.done ? 'text-[#1B1B16]' : 'text-[#6B6B62]')}>{s.label}</p>
              <p className="text-[11px] text-[#A8A89F]">{s.sub}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Photo slot ────────────────────────────────────────────────────────────────

function PhotoSlot({ label, url, onUpload, onRemove }: {
  label: string; url?: string; onUpload: (url: string) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(URL.createObjectURL(file));
    e.target.value = '';
  }
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5">{label}</p>
      {url ? (
        <div className="relative rounded-lg overflow-hidden aspect-square border border-[#E8E8E4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="w-full h-full object-cover" />
          <button onClick={onRemove} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80 transition-colors">
            <X size={10} className="text-white" />
          </button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full aspect-square rounded-lg border-2 border-dashed border-[#D0CFC8] hover:border-[#E4C654] hover:bg-[#FDFBF2] transition-colors flex flex-col items-center justify-center gap-1.5 text-[#A8A89F] hover:text-[#6B6B62]">
          <Upload size={16} />
          <span className="text-[11px] font-medium">Upload</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Booking detail panel ──────────────────────────────────────────────────────

function BookingDetail({ booking, photos, onUpdate, onCancel, onClose, onSetPhoto }: {
  booking: Booking;
  photos?: { before?: string; after?: string };
  onUpdate: (id: string, status: BookingStatus) => void;
  onCancel: () => void;
  onClose: () => void;
  onSetPhoto: (slot: 'before' | 'after', url: string | undefined) => void;
}) {
  const meta = STATUS_META[booking.status];
  const [intake, setIntake] = useState<{ skinType?: string; allergens?: string[]; products?: string[]; goals?: string; notes?: string } | null>(null);
  useEffect(() => {
    api.get<{ intakeForm: typeof intake }>(`/clinical/bookings/${booking.id}/intake`)
      .then((r) => setIntake(r.intakeForm)).catch(() => setIntake(null));
  }, [booking.id]);
  return (
    <Card className="sticky top-6">
      <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between">
        <h3 className="font-semibold text-[#1B1B16]">Booking Detail</h3>
        <button onClick={onClose} className="text-[#A8A89F] hover:text-[#6B6B62] text-lg leading-none">×</button>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#E4C654]/30 flex items-center justify-center text-[#1B1B16] font-bold text-sm">
            {booking.clientName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-[#1B1B16]">{booking.clientName}</p>
            <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
          </div>
        </div>
        {[
          { label: 'Service',  value: booking.service },
          { label: 'Category', value: booking.category },
          { label: 'Date',     value: format(new Date(booking.date), 'EEEE, MMM d, yyyy') },
          { label: 'Time',     value: `${booking.time} (${booking.duration} min)` },
          { label: 'Staff',    value: booking.staffName },
          { label: 'Price',    value: `$${booking.price}` },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-[#6B6B62]">{label}</span>
            <span className="font-medium text-[#1B1B16] text-right max-w-40">{value}</span>
          </div>
        ))}
        {booking.notes && (
          <div className="bg-[#FAFAF8] rounded-lg p-3 text-sm text-[#6B6B62]">
            <p className="font-medium text-[#1B1B16] mb-1">Notes</p>
            <p>{booking.notes}</p>
          </div>
        )}
        {intake && (intake.skinType || intake.allergens?.length || intake.goals || intake.notes) && (
          <div className="bg-[#FFFBEB] border border-[#E4C654]/40 rounded-lg p-3 text-sm">
            <p className="font-semibold text-[#B45309] mb-1.5 text-xs uppercase tracking-wide">Pre-Visit Questionnaire</p>
            {intake.skinType && <p className="text-[#6B6B62]">Skin type: <span className="text-[#1B1B16]">{intake.skinType}</span></p>}
            {!!intake.allergens?.length && <p className="text-[#6B6B62]">Allergies: <span className="text-red-700 font-medium">{intake.allergens.join(', ')}</span></p>}
            {!!intake.products?.length && <p className="text-[#6B6B62]">Products: <span className="text-[#1B1B16]">{intake.products.join(', ')}</span></p>}
            {intake.goals && <p className="text-[#6B6B62]">Goals: <span className="text-[#1B1B16]">{intake.goals}</span></p>}
            {intake.notes && <p className="text-[#6B6B62]">Notes: <span className="text-[#1B1B16]">{intake.notes}</span></p>}
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E8E4]">
          {(booking.status === 'confirmed' || booking.status === 'pending') && (
            <>
              <Button className="w-full" onClick={() => onUpdate(booking.id, 'in_progress')}>
                <Play size={14} /> Mark as Started
              </Button>
              <Button variant="danger" className="w-full" onClick={onCancel}>
                <XCircle size={14} /> Cancel Booking
              </Button>
            </>
          )}
          {booking.status === 'in_progress' && (
            <>
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg">
                <Clock size={13} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 font-medium">Session in progress</p>
              </div>
              <Button className="w-full" onClick={() => onUpdate(booking.id, 'completed')}>
                <CheckCircle size={14} /> Mark Completed
              </Button>
              <Button variant="danger" className="w-full" onClick={() => onUpdate(booking.id, 'no_show')}>
                <UserX size={14} /> Mark No-Show
              </Button>
            </>
          )}
          {booking.status === 'completed' && (
            <>
              <PayoutTimeline booking={booking} />
              <div className="border border-[#E8E8E4] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={14} className="text-[#6B6B62]" />
                  <p className="text-xs font-semibold text-[#1B1B16] uppercase tracking-wide">Before / After Photos</p>
                </div>
                <div className="flex gap-3">
                  <PhotoSlot label="Before" url={photos?.before}
                    onUpload={url => onSetPhoto('before', url)} onRemove={() => onSetPhoto('before', undefined)} />
                  <PhotoSlot label="After" url={photos?.after}
                    onUpload={url => onSetPhoto('after', url)} onRemove={() => onSetPhoto('after', undefined)} />
                </div>
                {(photos?.before || photos?.after) && (
                  <p className="text-[11px] text-[#A8A89F] mt-2 text-center">Photos visible to client in their booking history</p>
                )}
              </div>
              <ReviewRequestButton bookingId={booking.id} />
            </>
          )}
          {booking.status === 'no_show' && (
            <p className="text-xs text-center text-[#A8A89F]">No refund issued. Client marked as no-show.</p>
          )}
          {booking.status === 'cancelled' && (
            <p className="text-xs text-center text-[#A8A89F]">Full refund issued to client automatically.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
