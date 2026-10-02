'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isSameDay, addMonths, subMonths,
  startOfWeek, endOfWeek, addWeeks, subWeeks,
  setHours, setMinutes, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { STATUS_META } from '@/lib/mock-data';
import { api, normaliseStatus, getVendorId, type FrontendStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

interface VendorService { id: string; name: string; durationMin: number; price: number; }
interface VendorStaff { id: string; user: { firstName: string; lastName: string }; }

type ViewMode = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8am–6pm
const TIME_OPTIONS = HOURS.flatMap(h => [
  { value: `${String(h).padStart(2, '0')}:00`, label: format(setMinutes(setHours(new Date(), h), 0), 'h:mm a') },
  { value: `${String(h).padStart(2, '0')}:30`, label: format(setMinutes(setHours(new Date(), h), 30), 'h:mm a') },
]);

// ── API types ──────────────────────────────────────────────────────────────────

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  totalAmount: number;
  service: { name: string; durationMin: number };
  client: { firstName: string; lastName: string };
  staffMember: { user: { firstName: string; lastName: string } } | null;
}

interface ApiBlockedSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

// ── Frontend shapes ────────────────────────────────────────────────────────────

interface CalBooking {
  id: string;
  date: string;       // 'yyyy-MM-dd'
  time: string;       // 'HH:mm'
  clientName: string;
  service: string;
  duration: number;
  staffName: string;
  price: number;
  status: FrontendStatus;
}

interface BlockedSlot {
  id: string;
  date: string;       // 'yyyy-MM-dd'
  startTime: string;  // 'HH:mm'
  endTime: string;    // 'HH:mm'
  reason: string | null;
}

function adaptBooking(b: ApiBooking): CalBooking {
  const d = parseISO(b.startsAt);
  return {
    id: b.id,
    date: format(d, 'yyyy-MM-dd'),
    time: format(d, 'HH:mm'),
    clientName: `${b.client.firstName} ${b.client.lastName}`,
    service: b.service.name,
    duration: b.service.durationMin,
    staffName: b.staffMember
      ? `${b.staffMember.user.firstName} ${b.staffMember.user.lastName[0]}.`
      : '—',
    price: Number(b.totalAmount),
    status: normaliseStatus(b.status),
  };
}

function adaptBlockedSlot(s: ApiBlockedSlot): BlockedSlot {
  const start = parseISO(s.startsAt);
  const end   = parseISO(s.endsAt);
  return {
    id: s.id,
    date: format(start, 'yyyy-MM-dd'),
    startTime: format(start, 'HH:mm'),
    endTime: format(end, 'HH:mm'),
    reason: s.reason,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week');
  const [current, setCurrent] = useState(new Date());
  const [bookings, setBookings] = useState<CalBooking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    reason: '',
  });

  // Quick-add appointment
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptSaving, setApptSaving] = useState(false);
  const [apptError, setApptError] = useState('');
  const [services, setServices] = useState<VendorService[]>([]);
  const [staff, setStaff] = useState<VendorStaff[]>([]);
  const [apptForm, setApptForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '',
    serviceId: '', staffMemberId: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '10:00',
  });

  const openApptModal = (prefillDate?: Date) => {
    setApptError('');
    setApptForm(f => ({
      ...f,
      date: format(prefillDate ?? new Date(), 'yyyy-MM-dd'),
      serviceId: f.serviceId || services[0]?.id || '',
    }));
    setShowApptModal(true);
  };

  // Click an empty time cell → prefill that day + hour and open the modal.
  const openApptForSlot = (date: Date, hour: number) => {
    setApptError('');
    setApptForm(f => ({
      ...f,
      date: format(date, 'yyyy-MM-dd'),
      time: `${String(hour).padStart(2, '0')}:00`,
      serviceId: f.serviceId || services[0]?.id || '',
    }));
    setShowApptModal(true);
  };

  async function saveAppointment() {
    if (apptSaving) return;
    setApptError('');
    if (!apptForm.clientName.trim() || !apptForm.clientEmail.trim() || !apptForm.serviceId) {
      setApptError('Client name, email and service are required.');
      return;
    }
    setApptSaving(true);
    try {
      const startsAt = new Date(`${apptForm.date}T${apptForm.time}:00`).toISOString();
      await api.post('/vendors/me/bookings', {
        serviceId: apptForm.serviceId,
        staffMemberId: apptForm.staffMemberId || undefined,
        startsAt,
        clientName: apptForm.clientName.trim(),
        clientEmail: apptForm.clientEmail.trim(),
        clientPhone: apptForm.clientPhone.trim() || undefined,
      });
      setShowApptModal(false);
      setApptForm(f => ({ ...f, clientName: '', clientEmail: '', clientPhone: '' }));
      await fetchData();
    } catch (err: any) {
      setApptError(err?.message || 'Could not create the appointment.');
    } finally {
      setApptSaving(false);
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const vendorId = getVendorId();
      const [booksRaw, slotsRaw, servicesRaw, staffRaw] = await Promise.all([
        api.get<{ bookings: ApiBooking[] }>('/vendors/me/bookings?limit=300'),
        api.get<ApiBlockedSlot[]>('/vendors/me/blocked-slots').catch(() => [] as ApiBlockedSlot[]),
        vendorId ? api.get<VendorService[]>(`/services/${vendorId}`).catch(() => [] as VendorService[]) : Promise.resolve([] as VendorService[]),
        api.get<VendorStaff[]>('/vendors/me/staff').catch(() => [] as VendorStaff[]),
      ]);
      setBookings((booksRaw.bookings ?? []).map(adaptBooking));
      setBlockedSlots((Array.isArray(slotsRaw) ? slotsRaw : []).map(adaptBlockedSlot));
      setServices(Array.isArray(servicesRaw) ? servicesRaw : []);
      setStaff(Array.isArray(staffRaw) ? staffRaw : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function navigate(dir: 1 | -1) {
    if (view === 'month') setCurrent(dir === 1 ? addMonths(current, 1) : subMonths(current, 1));
    else if (view === 'week') setCurrent(dir === 1 ? addWeeks(current, 1) : subWeeks(current, 1));
    else setCurrent(prev => { const d = new Date(prev); d.setDate(d.getDate() + dir); return d; });
  }

  async function saveBlock() {
    if (blockSaving) return;
    setBlockSaving(true);
    try {
      // Combine date + time → ISO string for the API
      const startsAt = new Date(`${blockForm.date}T${blockForm.startTime}:00`).toISOString();
      const endsAt   = new Date(`${blockForm.date}T${blockForm.endTime}:00`).toISOString();
      const raw = await api.post<ApiBlockedSlot>('/vendors/me/blocked-slots', {
        startsAt,
        endsAt,
        reason: blockForm.reason || undefined,
      });
      setBlockedSlots(prev => [...prev, adaptBlockedSlot(raw)]);
      setShowBlockModal(false);
      setBlockForm({ date: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00', endTime: '10:00', reason: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setBlockSaving(false);
    }
  }

  async function removeBlock(id: string) {
    try {
      await api.delete(`/vendors/me/blocked-slots/${id}`);
      setBlockedSlots(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const periodLabel = view === 'month'
    ? format(current, 'MMMM yyyy')
    : view === 'week'
    ? `${format(startOfWeek(current, { weekStartsOn: 1 }), 'MMM d')} – ${format(endOfWeek(current, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
    : format(current, 'EEEE, MMMM d, yyyy');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-[#E8E8E4] hover:bg-[#F0EFE8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-[#1B1B16] min-w-52 text-center">{periodLabel}</span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-[#E8E8E4] hover:bg-[#F0EFE8] transition-colors">
            <ChevronRight size={16} />
          </button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#E8E8E4] overflow-hidden">
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  view === v ? 'bg-[#1B1B16] text-white' : 'bg-white text-[#6B6B62] hover:bg-[#FAFAF8]'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowBlockModal(true)}>
            <Plus size={14} /> Block Time
          </Button>
          <Button size="sm" onClick={() => openApptModal(view === 'day' ? current : undefined)}>
            <Plus size={14} /> New Appointment
          </Button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'month' && (
        <MonthView
          current={current}
          bookings={bookings}
          onDayClick={d => { setCurrent(d); setView('day'); }}
        />
      )}
      {view === 'week' && (
        <WeekView
          current={current}
          bookings={bookings}
          blockedSlots={blockedSlots}
          onDayClick={d => { setCurrent(d); setView('day'); }}
          onEmptyClick={openApptForSlot}
        />
      )}
      {view === 'day' && (
        <DayView
          date={current}
          bookings={bookings}
          blockedSlots={blockedSlots}
          onRemoveBlock={removeBlock}
          onEmptyClick={openApptForSlot}
        />
      )}

      {/* Block time modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">Block Time Slot</h3>
              <button onClick={() => setShowBlockModal(false)} className="text-[#A8A89F] hover:text-[#6B6B62]">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Date"
                type="date"
                value={blockForm.date}
                onChange={e => setBlockForm(f => ({ ...f, date: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Start Time"
                  options={TIME_OPTIONS}
                  value={blockForm.startTime}
                  onChange={e => setBlockForm(f => ({ ...f, startTime: e.target.value }))}
                />
                <Select
                  label="End Time"
                  options={TIME_OPTIONS}
                  value={blockForm.endTime}
                  onChange={e => setBlockForm(f => ({ ...f, endTime: e.target.value }))}
                />
              </div>
              <Input
                label="Reason (optional)"
                placeholder="e.g. Staff training, Lunch break"
                value={blockForm.reason}
                onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
              />
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowBlockModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveBlock} disabled={blockSaving}>
                  {blockSaving ? 'Saving…' : 'Save Block'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New appointment modal */}
      {showApptModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">New Appointment</h3>
              <button onClick={() => setShowApptModal(false)} className="text-[#A8A89F] hover:text-[#6B6B62]">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <Input
                label="Client name"
                placeholder="e.g. Jane Doe"
                value={apptForm.clientName}
                onChange={e => setApptForm(f => ({ ...f, clientName: e.target.value }))}
              />
              <Input
                label="Client email"
                type="email"
                placeholder="jane@example.com"
                value={apptForm.clientEmail}
                onChange={e => setApptForm(f => ({ ...f, clientEmail: e.target.value }))}
              />
              <Input
                label="Client phone (optional)"
                placeholder="+1 555 123 4567"
                value={apptForm.clientPhone}
                onChange={e => setApptForm(f => ({ ...f, clientPhone: e.target.value }))}
              />
              <Select
                label="Service"
                options={services.map(s => ({ value: s.id, label: `${s.name} · ${s.durationMin}min · $${Number(s.price).toFixed(0)}` }))}
                value={apptForm.serviceId}
                onChange={e => setApptForm(f => ({ ...f, serviceId: e.target.value }))}
              />
              {staff.length > 0 && (
                <Select
                  label="Staff member (optional)"
                  options={[{ value: '', label: 'Any available' }, ...staff.map(s => ({ value: s.id, label: `${s.user.firstName} ${s.user.lastName}` }))]}
                  value={apptForm.staffMemberId}
                  onChange={e => setApptForm(f => ({ ...f, staffMemberId: e.target.value }))}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  value={apptForm.date}
                  onChange={e => setApptForm(f => ({ ...f, date: e.target.value }))}
                />
                <Select
                  label="Time"
                  options={TIME_OPTIONS}
                  value={apptForm.time}
                  onChange={e => setApptForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
              {apptError && <p className="text-sm text-red-600">{apptError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowApptModal(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveAppointment} disabled={apptSaving}>
                  {apptSaving ? 'Booking…' : 'Book Appointment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function MonthView({
  current, bookings, onDayClick,
}: {
  current: Date; bookings: CalBooking[]; onDayClick: (d: Date) => void;
}) {
  const start = startOfMonth(current);
  const end = endOfMonth(current);
  const gridStart = startOfWeek(start, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#E8E8E4]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="px-2 py-2.5 text-xs font-semibold text-[#6B6B62] uppercase text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayBookings = bookings.filter(b => b.date === dateStr);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-24 p-1.5 border-b border-r border-[#E8E8E4] cursor-pointer hover:bg-[#FAFAF8] transition-colors',
                !isSameMonth(day, current) && 'opacity-30',
                isToday(day) && 'bg-[#FBF6E3]'
              )}
            >
              <span className={cn(
                'w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full mb-1',
                isToday(day) ? 'bg-[#E4C654] text-[#1B1B16]' : 'text-[#1B1B16]'
              )}>
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayBookings.slice(0, 2).map(b => (
                  <div key={b.id} className="text-xs truncate px-1.5 py-0.5 rounded bg-[#E4C654]/20 text-[#1B1B16]">
                    {b.time} {b.clientName.split(' ')[0]}
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-xs text-[#6B6B62] px-1">+{dayBookings.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({
  current, bookings, blockedSlots, onDayClick, onEmptyClick,
}: {
  current: Date; bookings: CalBooking[]; blockedSlots: BlockedSlot[]; onDayClick: (d: Date) => void;
  onEmptyClick: (date: Date, hour: number) => void;
}) {
  const weekStart = startOfWeek(current, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  return (
    <Card className="overflow-hidden overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid border-b border-[#E8E8E4]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="border-r border-[#E8E8E4]" />
          {days.map(d => (
            <div
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              className={cn(
                'py-2.5 text-center cursor-pointer hover:bg-[#FAFAF8] border-r border-[#E8E8E4] last:border-r-0',
                isToday(d) && 'bg-[#FBF6E3]'
              )}
            >
              <p className="text-xs text-[#6B6B62] uppercase">{format(d, 'EEE')}</p>
              <p className={cn('text-lg font-bold', isToday(d) ? 'text-[#C9AD3A]' : 'text-[#1B1B16]')}>
                {format(d, 'd')}
              </p>
            </div>
          ))}
        </div>
        {/* Time grid */}
        {HOURS.map(h => (
          <div key={h} className="grid border-b border-[#E8E8E4]" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div className="py-3 pr-2 text-right text-xs text-[#A8A89F] border-r border-[#E8E8E4]">
              {format(setHours(new Date(), h), 'ha')}
            </div>
            {days.map(d => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const timeStr = `${String(h).padStart(2, '0')}:00`;
              const booking = bookings.find(b => b.date === dateStr && b.time === timeStr);
              const blocked = blockedSlots.find(bl => bl.date === dateStr && bl.startTime === timeStr);
              const meta = booking ? STATUS_META[booking.status] : null;
              const isEmpty = !booking && !blocked;
              return (
                <div
                  key={d.toISOString()}
                  onClick={isEmpty ? () => onEmptyClick(d, h) : undefined}
                  className={cn(
                    'min-h-12 border-r border-[#E8E8E4] last:border-r-0 p-1',
                    isToday(d) && 'bg-[#FBF6E3]/30',
                    isEmpty && 'cursor-pointer hover:bg-[#FAFAF8] transition-colors'
                  )}
                >
                  {booking && meta && (
                    <div className={cn('text-xs rounded px-1.5 py-1 truncate font-medium', meta.bg, meta.color)}>
                      {booking.clientName.split(' ')[0]} — {booking.service.split(' ').slice(0, 2).join(' ')}
                    </div>
                  )}
                  {blocked && (
                    <div className="text-xs rounded px-1.5 py-1 truncate bg-gray-100 text-gray-500 font-medium">
                      🔒 {blocked.reason ?? 'Blocked'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function DayView({
  date, bookings, blockedSlots, onRemoveBlock, onEmptyClick,
}: {
  date: Date; bookings: CalBooking[]; blockedSlots: BlockedSlot[]; onRemoveBlock: (id: string) => void;
  onEmptyClick: (date: Date, hour: number) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayBookings = bookings.filter(b => b.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const dayBlocked = blockedSlots.filter(bl => bl.date === dateStr);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Timetable */}
      <Card className="lg:col-span-2 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E8E8E4] flex items-center justify-between">
          <h3 className="font-semibold text-[#1B1B16]">Timetable — {format(date, 'EEEE, MMM d')}</h3>
          <span className="text-xs text-[#6B6B62]">{dayBookings.length} appointments</span>
        </div>
        <div className="divide-y divide-[#E8E8E4]">
          {HOURS.map(h => {
            const timeStr = `${String(h).padStart(2, '0')}:00`;
            const booking = dayBookings.find(b => b.time === timeStr);
            const blocked = dayBlocked.find(bl => bl.startTime <= timeStr && bl.endTime > timeStr);
            const meta = booking ? STATUS_META[booking.status] : null;
            return (
              <div key={h} className="flex gap-4 px-5 py-3 min-h-14">
                <span className="text-xs text-[#A8A89F] w-12 pt-0.5 shrink-0">{format(setHours(new Date(), h), 'h a')}</span>
                {booking && meta ? (
                  <div className={cn('flex-1 rounded-lg px-3 py-2 text-sm', meta.bg)}>
                    <p className={cn('font-semibold', meta.color)}>{booking.clientName}</p>
                    <p className="text-xs text-[#6B6B62]">{booking.service} · {booking.duration}m · {booking.staffName}</p>
                  </div>
                ) : blocked ? (
                  <div className="flex-1 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-500">
                    🔒 {blocked.reason ?? 'Blocked'}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEmptyClick(date, h)}
                    className="flex-1 border border-dashed border-[#E8E8E4] rounded-lg hover:bg-[#FAFAF8] hover:border-[#E4C654] transition-colors"
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Blocked slots list */}
      <div className="flex flex-col gap-4">
        <Card>
          <div className="px-5 py-3.5 border-b border-[#E8E8E4]">
            <h3 className="font-semibold text-[#1B1B16]">Blocked Slots</h3>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            {dayBlocked.length === 0 && (
              <p className="text-sm text-[#A8A89F]">No blocked slots today.</p>
            )}
            {dayBlocked.map(bl => (
              <div key={bl.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[#1B1B16]">{bl.startTime} – {bl.endTime}</p>
                  {bl.reason && <p className="text-xs text-[#6B6B62]">{bl.reason}</p>}
                </div>
                <button onClick={() => onRemoveBlock(bl.id)} className="text-[#A8A89F] hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="px-5 py-3.5 border-b border-[#E8E8E4]">
            <h3 className="font-semibold text-[#1B1B16]">Day Summary</h3>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2 text-sm">
            {[
              { label: 'Total appointments', value: dayBookings.length },
              { label: 'Confirmed', value: dayBookings.filter(b => b.status === 'confirmed').length },
              { label: 'In progress', value: dayBookings.filter(b => b.status === 'in_progress').length },
              { label: 'Completed', value: dayBookings.filter(b => b.status === 'completed').length },
              {
                label: 'Est. revenue',
                value: `$${dayBookings
                  .filter(b => b.status !== 'cancelled' && b.status !== 'no_show')
                  .reduce((s, b) => s + b.price, 0)}`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-[#6B6B62]">{label}</span>
                <span className="font-semibold text-[#1B1B16]">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
