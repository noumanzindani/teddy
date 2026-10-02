'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, User, Camera, AlertTriangle, X, Plus, CalendarClock, CalendarOff, CalendarPlus, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, normaliseStatus } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ServiceFlow } from '@/components/ServiceFlow';
import { Stethoscope, Star } from 'lucide-react';

export type AppointmentStatus = 'upcoming' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  upcoming:    { label: 'Upcoming',    color: 'text-blue-700',   bg: 'bg-blue-50'   },
  in_progress: { label: 'In Progress', color: 'text-amber-700',  bg: 'bg-amber-50'  },
  completed:   { label: 'Completed',   color: 'text-green-700',  bg: 'bg-green-50'  },
  no_show:     { label: 'No-Show',     color: 'text-red-700',    bg: 'bg-red-50'    },
  cancelled:   { label: 'Cancelled',   color: 'text-gray-500',   bg: 'bg-gray-100'  },
};

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  service: string;
  date: string;
  time: string;
  durationMin: number;
  status: AppointmentStatus;
  notes?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  amount: number;
  timerStartedAt?: string;
  timerDurationMin?: number;
  timerExtraMin: number;
  timerExtraCost: number;
}

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  totalAmount: number;
  timerStartedAt?: string | null;
  timerDurationMin?: number | null;
  timerExtraMin?: number;
  timerExtraCost?: number;
  clientId: string;
  service: { name: string; durationMin: number; category: string };
  client: { firstName: string; lastName: string; avatarUrl: string | null };
}

interface TimeOff {
  id: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM – 6 PM

function timeToFraction(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h - 8) + m / 60;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  upcoming:    'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-amber-100 border-amber-300 text-amber-800',
  completed:   'bg-green-100 border-green-300 text-green-800',
  no_show:     'bg-red-100 border-red-300 text-red-800',
  cancelled:   'bg-gray-100 border-gray-300 text-gray-600',
};

function mapBooking(b: ApiBooking): Appointment {
  const dt = parseISO(b.startsAt);
  const firstName = b.client.firstName;
  const lastName = b.client.lastName;
  const clientName = `${firstName} ${lastName}`;
  const clientAvatar = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return {
    id: b.id,
    clientId: b.clientId,
    clientName,
    clientAvatar,
    service: b.service.name,
    date: format(dt, 'yyyy-MM-dd'),
    time: format(dt, 'HH:mm'),
    durationMin: b.service.durationMin,
    status: normaliseStatus(b.status) as AppointmentStatus,
    amount: b.totalAmount,
    timerStartedAt: b.timerStartedAt ?? undefined,
    timerDurationMin: b.timerDurationMin ?? undefined,
    timerExtraMin: b.timerExtraMin ?? 0,
    timerExtraCost: b.timerExtraCost ?? 0,
  };
}

/** Remaining seconds for a running timer, from timerStartedAt + (duration + extra) mins. */
function remainingSeconds(a: Appointment, nowMs: number): number | null {
  if (!a.timerStartedAt || !a.timerDurationMin) return null;
  const totalMs = (a.timerDurationMin + (a.timerExtraMin ?? 0)) * 60 * 1000;
  const endMs = new Date(a.timerStartedAt).getTime() + totalMs;
  return Math.round((endMs - nowMs) / 1000);
}

function fmtCountdown(totalSec: number): string {
  const sign = totalSec < 0 ? '-' : '';
  const s = Math.abs(totalSec);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${sign}${m}:${sec.toString().padStart(2, '0')}`;
}

export default function SchedulePage() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [photoType, setPhotoType] = useState<'before' | 'after' | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Quick-add appointment (staff schedules a client for themselves)
  const [showAppt, setShowAppt] = useState(false);
  const [apptSaving, setApptSaving] = useState(false);
  const [apptError, setApptError] = useState('');
  const [svcList, setSvcList] = useState<{ id: string; name: string; durationMin: number; price: number }[]>([]);
  const [canSchedule, setCanSchedule] = useState(true);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [apptForm, setApptForm] = useState({
    clientName: '', clientEmail: '', clientPhone: '', serviceId: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '10:00',
  });

  // Permission gates — a missing key is treated as allowed (only `=== false` disables).
  const canReschedule = perms.rescheduleClients !== false || perms.moveAppointments !== false;
  const canRequestTimeOff = perms.requestTimeOff !== false;

  // Reschedule appointment
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), time: '10:00' });

  // Request time off
  const [showTimeOff, setShowTimeOff] = useState(false);
  const [timeOffSaving, setTimeOffSaving] = useState(false);
  const [timeOffError, setTimeOffError] = useState('');
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [timeOffForm, setTimeOffForm] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'), startTime: '09:00',
    endDate: format(new Date(), 'yyyy-MM-dd'), endTime: '17:00', reason: '',
  });

  // Calendar sync
  const [showCalSync, setShowCalSync] = useState(false);
  const [calUrl, setCalUrl] = useState('');
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState('');
  const [calCopied, setCalCopied] = useState(false);

  const openApptModal = (prefillDate?: Date) => {
    setApptError('');
    setApptForm((f) => ({
      ...f,
      date: format(prefillDate ?? new Date(), 'yyyy-MM-dd'),
      serviceId: f.serviceId || svcList[0]?.id || '',
    }));
    setShowAppt(true);
  };

  async function saveAppt() {
    if (apptSaving) return;
    setApptError('');
    if (!apptForm.clientName.trim() || !apptForm.clientEmail.trim() || !apptForm.serviceId) {
      setApptError('Client name, email and service are required.');
      return;
    }
    setApptSaving(true);
    try {
      const startsAt = new Date(`${apptForm.date}T${apptForm.time}:00`).toISOString();
      await api.post('/staff/me/bookings', {
        serviceId: apptForm.serviceId,
        startsAt,
        clientName: apptForm.clientName.trim(),
        clientEmail: apptForm.clientEmail.trim(),
        clientPhone: apptForm.clientPhone.trim() || undefined,
      });
      setShowAppt(false);
      setApptForm((f) => ({ ...f, clientName: '', clientEmail: '', clientPhone: '' }));
      await fetchSchedule();
    } catch (err: unknown) {
      setApptError(err instanceof Error ? err.message : 'Could not create the appointment.');
    } finally {
      setApptSaving(false);
    }
  }

  const openReschedule = (a: Appointment) => {
    setRescheduleError('');
    setRescheduleForm({ date: a.date, time: a.time });
    setShowReschedule(true);
  };

  async function saveReschedule() {
    if (rescheduleSaving || !selected) return;
    setRescheduleError('');
    setRescheduleSaving(true);
    try {
      const startsAt = new Date(`${rescheduleForm.date}T${rescheduleForm.time}:00`).toISOString();
      await api.post(`/bookings/${selected.id}/reschedule`, { startsAt });
      setShowReschedule(false);
      setSelected(null);
      await fetchSchedule();
    } catch (err: unknown) {
      setRescheduleError(err instanceof Error ? err.message : 'Could not reschedule the appointment.');
    } finally {
      setRescheduleSaving(false);
    }
  }

  const fetchTimeOff = useCallback(async () => {
    try {
      const data = await api.get<TimeOff[]>('/staff/me/time-off');
      setTimeOff(Array.isArray(data) ? data : []);
    } catch { /* non-blocking */ }
  }, []);

  async function saveTimeOff() {
    if (timeOffSaving) return;
    setTimeOffError('');
    if (!timeOffForm.startDate || !timeOffForm.endDate) {
      setTimeOffError('Start and end dates are required.');
      return;
    }
    setTimeOffSaving(true);
    try {
      const startsAt = new Date(`${timeOffForm.startDate}T${timeOffForm.startTime}:00`).toISOString();
      const endsAt = new Date(`${timeOffForm.endDate}T${timeOffForm.endTime}:00`).toISOString();
      await api.post('/staff/me/time-off', { startsAt, endsAt, reason: timeOffForm.reason.trim() || undefined });
      setShowTimeOff(false);
      setTimeOffForm((f) => ({ ...f, reason: '' }));
      await fetchTimeOff();
    } catch (err: unknown) {
      setTimeOffError(err instanceof Error ? err.message : 'Could not submit the time-off request.');
    } finally {
      setTimeOffSaving(false);
    }
  }

  async function cancelTimeOff(id: string) {
    try {
      await api.delete(`/staff/me/time-off/${id}`);
      await fetchTimeOff();
    } catch {
      showToast('Could not cancel this time-off entry — please try again');
    }
  }

  async function openCalSync() {
    setCalError('');
    setCalCopied(false);
    setShowCalSync(true);
    if (calUrl) return;
    setCalLoading(true);
    try {
      const res = await api.get<{ url: string }>('/staff/me/calendar-url');
      setCalUrl(res?.url ?? '');
    } catch (err: unknown) {
      setCalError(err instanceof Error ? err.message : 'Could not load your calendar URL.');
    } finally {
      setCalLoading(false);
    }
  }

  async function copyCalUrl() {
    try {
      await navigator.clipboard.writeText(calUrl);
      setCalCopied(true);
      setTimeout(() => setCalCopied(false), 2000);
    } catch {
      showToast('Could not copy — please copy manually');
    }
  }

  // Tick every second so any running countdown updates live.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ApiBooking[]>('/staff/me/schedule');
      setAppointments(data.map(mapBooking));
    } catch {
      // silently fail — keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    fetchTimeOff();
  }, [fetchTimeOff]);

  // Load this staff member's salon services for the quick-add appointment form.
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<{ vendorId?: string; permissions?: Record<string, boolean> }>('/staff/me');
        setPerms(me?.permissions ?? {});
        if (me?.permissions && me.permissions.scheduleClients === false) setCanSchedule(false);
        if (!me?.vendorId) return;
        const svcs = await api.get<{ id: string; name: string; durationMin: number; price: number }[]>(`/services/${me.vendorId}`);
        setSvcList(Array.isArray(svcs) ? svcs : []);
      } catch { /* non-blocking */ }
    })();
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function updateAppt(id: string, patch: Partial<Appointment>) {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, ...patch } : null);
  }

  async function handleExtend(a: Appointment, extraMin: number) {
    if (extending) return;
    setExtending(true);
    try {
      const updated = await api.post<{ timerExtraMin: number; timerExtraCost: number }>(
        `/bookings/${a.id}/timer/extend`,
        { extraMin }
      );
      updateAppt(a.id, {
        timerExtraMin: updated.timerExtraMin ?? (a.timerExtraMin ?? 0) + extraMin,
        timerExtraCost: updated.timerExtraCost ?? a.timerExtraCost,
      });
      showToast(`+${extraMin} min added — client charged for extra time`);
    } catch {
      showToast('Could not extend — next booking may be too close');
    } finally {
      setExtending(false);
    }
  }

  async function handleReviewRequest(a: Appointment) {
    try {
      await api.post(`/engagement/bookings/${a.id}/review-request`, {});
      showToast('Review request sent to the client');
    } catch {
      showToast('Could not send review request — please try again');
    }
  }

  async function handleNoShow(a: Appointment) {
    try {
      await api.post(`/bookings/${a.id}/no-show`, {});
      updateAppt(a.id, { status: 'no_show' });
      showToast(`No-show reported for ${a.clientName} — vendor has been notified`);
    } catch {
      showToast('Failed to report no-show — please try again');
    }
  }

  async function fetchPhotos(appt: Appointment) {
    try {
      const photos = await api.get<{ beforeUrl?: string; afterUrl?: string }[]>(`/media/before-after/${appt.id}`);
      if (photos.length > 0) {
        updateAppt(appt.id, {
          beforePhoto: photos[0].beforeUrl ?? undefined,
          afterPhoto:  photos[0].afterUrl  ?? undefined,
        });
      }
    } catch { /* photos not found — that's fine */ }
  }

  function handlePhotoUpload(type: 'before' | 'after') {
    setPhotoType(type);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected || !photoType) return;
    const previewUrl = URL.createObjectURL(file);
    updateAppt(selected.id, photoType === 'before' ? { beforePhoto: previewUrl } : { afterPhoto: previewUrl });

    // Persist to backend as base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const body = photoType === 'before'
          ? { bookingId: selected.id, beforeUrl: dataUrl }
          : { bookingId: selected.id, afterUrl: dataUrl };
        await api.post('/media/upload/before-after', body);
        showToast(`${photoType === 'before' ? 'Before' : 'After'} photo saved`);
      } catch {
        showToast('Photo saved locally — sync failed');
      }
    };
    reader.readAsDataURL(file);

    setPhotoType(null);
    e.target.value = '';
  }

  const apptsByDay = weekDays.map((day) =>
    appointments.filter((a) => isSameDay(new Date(a.date + 'T12:00:00'), day))
  );

  const todayAppts = appointments.filter((a) => isSameDay(new Date(a.date + 'T12:00:00'), today));
  const todayCount = todayAppts.length;

  return (
    <div className="flex gap-6 h-full">
      {/* Main calendar */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Today summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Today\'s Appointments', value: todayCount, color: 'text-blue-700',  bg: 'bg-blue-50'  },
            { label: 'Completed Today',        value: todayAppts.filter(a => a.status === 'completed').length, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Upcoming This Week',     value: appointments.filter(a => a.status === 'upcoming').length, color: 'text-amber-700', bg: 'bg-amber-50' },
          ].map((k) => (
            <Card key={k.label} className={`p-4 border ${k.bg}`}>
              {loading ? (
                <div className="h-8 w-12 bg-current opacity-10 rounded animate-pulse mb-1" />
              ) : (
                <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
              )}
              <p className="text-sm font-medium text-[#1B1B16] mt-0.5">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* Week nav */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E4]">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-lg hover:bg-[#F0EFE8]">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-[#1B1B16] min-w-40 text-center">
                {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
              </span>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-lg hover:bg-[#F0EFE8]">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openCalSync}>
                <CalendarPlus size={14} /> Sync to my calendar
              </Button>
              {canRequestTimeOff && (
                <Button size="sm" variant="outline" onClick={() => { setTimeOffError(''); setShowTimeOff(true); }}>
                  <CalendarOff size={14} /> Request Time Off
                </Button>
              )}
              {canSchedule && (
                <Button size="sm" onClick={() => openApptModal()}>
                  <Plus size={14} /> New Appointment
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-[#E8E8E4]" style={{ minWidth: 700 }}>
                <div className="px-3 py-2 text-xs text-[#A8A89F]" />
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={day.toISOString()} className={cn('px-2 py-2 text-center', isToday && 'bg-[#E4C654]/10')}>
                      <p className="text-xs text-[#6B6B62] font-medium">{format(day, 'EEE')}</p>
                      <p className={cn('text-sm font-bold mt-0.5', isToday ? 'text-[#1B1B16]' : 'text-[#6B6B62]')}>{format(day, 'd')}</p>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="grid grid-cols-8 relative" style={{ minWidth: 700 }}>
                {/* Hour labels */}
                <div className="flex flex-col">
                  {HOURS.map((h) => (
                    <div key={h} className="h-14 border-b border-[#F0EFE8] px-2 pt-1">
                      <span className="text-xs text-[#A8A89F]">{h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, di) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={day.toISOString()} className={cn('relative border-l border-[#F0EFE8]', isToday && 'bg-[#E4C654]/5')}>
                      {HOURS.map((h) => (
                        <div key={h} className="h-14 border-b border-[#F0EFE8]" />
                      ))}
                      {apptsByDay[di].map((a) => {
                        const top = timeToFraction(a.time) * 56;
                        const height = Math.max((a.durationMin / 60) * 56, 28);
                        return (
                          <button
                            key={a.id}
                            onClick={() => { setSelected(a); fetchPhotos(a); }}
                            className={cn(
                              'absolute left-1 right-1 rounded-md border text-left px-1.5 py-1 text-xs font-semibold truncate hover:opacity-90 transition-opacity',
                              STATUS_COLORS[a.status],
                              selected?.id === a.id && 'ring-2 ring-[#E4C654]'
                            )}
                            style={{ top, height }}
                          >
                            {a.time} · {a.clientName}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Time off */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E4]">
            <h3 className="text-sm font-semibold text-[#1B1B16] flex items-center gap-2">
              <CalendarOff size={14} className="text-[#6B6B62]" /> Time Off
            </h3>
            {canRequestTimeOff && (
              <Button size="sm" variant="outline" onClick={() => { setTimeOffError(''); setShowTimeOff(true); }}>
                <Plus size={14} /> Request
              </Button>
            )}
          </div>
          {timeOff.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[#A8A89F]">No time off scheduled.</p>
          ) : (
            <ul className="divide-y divide-[#F0EFE8]">
              {timeOff.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1B1B16]">
                      {format(parseISO(t.startsAt), 'EEE, MMM d · h:mm a')} – {format(parseISO(t.endsAt), 'EEE, MMM d · h:mm a')}
                    </p>
                    {t.reason && <p className="text-xs text-[#6B6B62] truncate mt-0.5">{t.reason}</p>}
                  </div>
                  <button
                    onClick={() => cancelTimeOff(t.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 shrink-0"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="w-80 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between">
              <h3 className="font-semibold text-[#1B1B16]">Appointment Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Status */}
              <Badge color={STATUS_META[selected.status].color} bg={STATUS_META[selected.status].bg} className="self-start">
                {STATUS_META[selected.status].label}
              </Badge>

              {/* Client & service */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-sm font-bold text-[#1B1B16] shrink-0">
                  {selected.clientAvatar}
                </div>
                <div>
                  <p className="font-bold text-[#1B1B16]">{selected.clientName}</p>
                  <p className="text-sm text-[#6B6B62]">{selected.service}</p>
                </div>
              </div>

              {/* Details */}
              {[
                { icon: <Clock size={13} />, label: `${selected.time} · ${selected.durationMin} min` },
                { icon: <User size={13} />,  label: format(new Date(selected.date + 'T12:00:00'), 'EEEE, MMM d') },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-[#6B6B62]">
                  {icon} {label}
                </div>
              ))}

              {selected.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="font-semibold text-xs uppercase tracking-wide mb-1 text-amber-700">Client Notes</p>
                  {selected.notes}
                </div>
              )}

              {/* Live service timer */}
              {selected.status === 'in_progress' && selected.timerStartedAt && (() => {
                const rem = remainingSeconds(selected, nowMs);
                if (rem === null) return null;
                const overtime = rem < 0;
                return (
                  <div className={cn(
                    'rounded-xl p-4 border text-center',
                    overtime ? 'bg-red-50 border-red-200' : rem <= 300 ? 'bg-amber-50 border-amber-200' : 'bg-[#F0FBF4] border-green-200'
                  )}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1 flex items-center justify-center gap-1.5"
                       style={{ color: overtime ? '#b91c1c' : rem <= 300 ? '#b45309' : '#15803d' }}>
                      <Clock size={12} /> {overtime ? 'Overtime' : 'Time Remaining'}
                    </p>
                    <p className="text-4xl font-black tabular-nums"
                       style={{ color: overtime ? '#b91c1c' : rem <= 300 ? '#b45309' : '#15803d' }}>
                      {fmtCountdown(rem)}
                    </p>
                    <p className="text-xs text-[#6B6B62] mt-1">
                      {selected.timerDurationMin} min
                      {selected.timerExtraMin > 0 && ` + ${selected.timerExtraMin} extra`}
                      {selected.timerExtraCost > 0 && ` · +$${selected.timerExtraCost.toFixed(2)}`}
                    </p>
                    <div className="flex gap-2 mt-3">
                      {[15, 30].map((min) => (
                        <button
                          key={min}
                          disabled={extending}
                          onClick={() => handleExtend(selected, min)}
                          className="flex-1 py-1.5 rounded-lg border border-[#E8E8E4] bg-white text-xs font-semibold text-[#1B1B16] hover:bg-[#FAFAF8] disabled:opacity-40 transition-colors"
                        >
                          + {min} min
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Photo section */}
              {(selected.status === 'in_progress' || selected.status === 'completed') && (
                <div>
                  <p className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-2">Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['before', 'after'] as const).map((pt) => {
                      const photo = pt === 'before' ? selected.beforePhoto : selected.afterPhoto;
                      return (
                        <div key={pt} className="relative">
                          {photo ? (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photo} alt={pt} className="w-full h-24 object-cover rounded-xl" />
                              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded capitalize">{pt}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePhotoUpload(pt)}
                              className="w-full h-24 rounded-xl border-2 border-dashed border-[#E8E8E4] flex flex-col items-center justify-center gap-1 hover:border-[#E4C654] hover:bg-[#FAFAF8] transition-colors"
                            >
                              <Camera size={16} className="text-[#A8A89F]" />
                              <span className="text-xs text-[#A8A89F] capitalize">{pt}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E8E4]">
                {(selected.status === 'upcoming' || selected.status === 'in_progress' || selected.status === 'completed') && (
                  <Button className="w-full" onClick={() => setFlowId(selected.id)}>
                    <Stethoscope size={14} /> {selected.status === 'completed' ? 'Service Record & Checkout' : 'Open Service Flow'}
                  </Button>
                )}
                {canReschedule && (selected.status === 'upcoming' || selected.status === 'in_progress') && (
                  <Button variant="outline" className="w-full" onClick={() => openReschedule(selected)}>
                    <CalendarClock size={14} /> Reschedule
                  </Button>
                )}
                {selected.status === 'completed' && (
                  <Button variant="outline" className="w-full" onClick={() => handleReviewRequest(selected)}>
                    <Star size={14} /> Request Review
                  </Button>
                )}
                {selected.status === 'upcoming' && (
                  <Button variant="danger" className="w-full" onClick={() => handleNoShow(selected)}>
                    <AlertTriangle size={14} /> Report No-Show
                  </Button>
                )}
                {selected.status === 'no_show' && (
                  <p className="text-xs text-[#A8A89F] text-center">No-show reported — vendor has been notified</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="w-80 shrink-0">
          <Card className="p-6 text-center text-[#A8A89F]">
            <CalendarIcon />
            <p className="font-medium mt-2">Select an appointment</p>
            <p className="text-xs mt-1">Click any block to view details and manage the service</p>
          </Card>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {flowId && (
        <ServiceFlow
          bookingId={flowId}
          initialStatus={appointments.find((a) => a.id === flowId)?.status ?? 'upcoming'}
          onClose={() => setFlowId(null)}
          onChanged={fetchSchedule}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1B1B16] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}

      {showAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">New Appointment</h3>
              <button onClick={() => setShowAppt(false)} className="text-[#A8A89F] hover:text-[#6B6B62]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {([
                { k: 'clientName', label: 'Client name', type: 'text', ph: 'Jane Doe' },
                { k: 'clientEmail', label: 'Client email', type: 'email', ph: 'jane@example.com' },
                { k: 'clientPhone', label: 'Client phone (optional)', type: 'text', ph: '+1 555 123 4567' },
              ] as const).map((f) => (
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    value={apptForm[f.k]}
                    onChange={(e) => setApptForm((s) => ({ ...s, [f.k]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Service</label>
                <select
                  value={apptForm.serviceId}
                  onChange={(e) => setApptForm((s) => ({ ...s, serviceId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm bg-white focus:outline-none focus:border-[#E4C654]"
                >
                  <option value="">Select a service…</option>
                  {svcList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.durationMin}min · ${Number(s.price).toFixed(0)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Date</label>
                  <input type="date" value={apptForm.date}
                    onChange={(e) => setApptForm((s) => ({ ...s, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Time</label>
                  <input type="time" value={apptForm.time}
                    onChange={(e) => setApptForm((s) => ({ ...s, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
              </div>
              {apptError && <p className="text-sm text-red-600">{apptError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowAppt(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveAppt} disabled={apptSaving}>
                  {apptSaving ? 'Booking…' : 'Book Appointment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {showReschedule && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">Reschedule Appointment</h3>
              <button onClick={() => setShowReschedule(false)} className="text-[#A8A89F] hover:text-[#6B6B62]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[#6B6B62]">
                {selected.clientName} · {selected.service}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">New date</label>
                  <input type="date" value={rescheduleForm.date}
                    onChange={(e) => setRescheduleForm((s) => ({ ...s, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">New time</label>
                  <input type="time" value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm((s) => ({ ...s, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
              </div>
              {rescheduleError && <p className="text-sm text-red-600">{rescheduleError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowReschedule(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveReschedule} disabled={rescheduleSaving}>
                  {rescheduleSaving ? 'Saving…' : 'Reschedule'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request time off modal */}
      {showTimeOff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">Request Time Off</h3>
              <button onClick={() => setShowTimeOff(false)} className="text-[#A8A89F] hover:text-[#6B6B62]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Start date</label>
                  <input type="date" value={timeOffForm.startDate}
                    onChange={(e) => setTimeOffForm((s) => ({ ...s, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Start time</label>
                  <input type="time" value={timeOffForm.startTime}
                    onChange={(e) => setTimeOffForm((s) => ({ ...s, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">End date</label>
                  <input type="date" value={timeOffForm.endDate}
                    onChange={(e) => setTimeOffForm((s) => ({ ...s, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">End time</label>
                  <input type="time" value={timeOffForm.endTime}
                    onChange={(e) => setTimeOffForm((s) => ({ ...s, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:border-[#E4C654]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Reason (optional)</label>
                <textarea
                  value={timeOffForm.reason}
                  onChange={(e) => setTimeOffForm((s) => ({ ...s, reason: e.target.value }))}
                  placeholder="e.g. Vacation, appointment…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm resize-none focus:outline-none focus:border-[#E4C654]"
                />
              </div>
              {timeOffError && <p className="text-sm text-red-600">{timeOffError}</p>}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowTimeOff(false)}>Cancel</Button>
                <Button className="flex-1" onClick={saveTimeOff} disabled={timeOffSaving}>
                  {timeOffSaving ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar sync modal */}
      {showCalSync && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1B1B16]">Sync to My Calendar</h3>
              <button onClick={() => setShowCalSync(false)} className="text-[#A8A89F] hover:text-[#6B6B62]"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              {calLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="w-6 h-6 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : calError ? (
                <p className="text-sm text-red-600">{calError}</p>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-[#6B6B62] mb-1">Subscribe URL</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={calUrl}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm bg-[#FAFAF8] text-[#6B6B62] focus:outline-none focus:border-[#E4C654]"
                    />
                    <Button variant="outline" onClick={copyCalUrl}>
                      {calCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </Button>
                  </div>
                  <p className="text-xs text-[#6B6B62]">
                    Add this URL in Google/Apple Calendar → Add calendar → From URL to see your TEDDY appointments.
                  </p>
                </>
              )}
              <div className="flex pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowCalSync(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-30">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
