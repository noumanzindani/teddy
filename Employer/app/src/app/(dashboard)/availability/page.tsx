'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Star, Users, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = typeof DAYS[number];
interface Hours { open: string; close: string; closed: boolean; }
type OpenHours = Record<string, Hours>;

const DEFAULT: OpenHours = Object.fromEntries(DAYS.map((d) => [d, { open: '09:00', close: '18:00', closed: d === 'sunday' }]));

interface Vendor { openHours?: OpenHours; }
interface Staff { id: string; title?: string | null; user: { firstName: string; lastName: string }; weeklyAvailability?: Record<string, unknown>; availability?: { dayOfWeek: number; startTime: string; endTime: string }[]; }
interface Plan { name: string; priorityBooking: boolean; isActive: boolean; }

export default function AvailabilityPage() {
  const [hours, setHours] = useState<OpenHours>(DEFAULT);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, s, p] = await Promise.all([
        api.get<Vendor>('/vendors/me').catch(() => ({} as Vendor)),
        api.get<Staff[]>('/vendors/me/staff').catch(() => []),
        api.get<Plan[]>('/memberships/plans').catch(() => []),
      ]);
      const oh = v.openHours && Object.keys(v.openHours).length ? { ...DEFAULT, ...v.openHours } : DEFAULT;
      setHours(oh); setStaff(Array.isArray(s) ? s : []); setPlans(Array.isArray(p) ? p : []);
    } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function setDay(d: Day, patch: Partial<Hours>) { setHours((h) => ({ ...h, [d]: { ...h[d], ...patch } })); setSaved(false); }

  async function save() {
    setSaving(true);
    try { await api.patch('/vendors/me', { openHours: hours }); setSaved(true); } catch { /* */ } finally { setSaving(false); }
  }

  const priorityPlans = plans.filter((p) => p.isActive && p.priorityBooking);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Availability</h1>
        <p className="text-sm text-[#6B6B62]">Set your opening hours and days. Members with priority plans get preferred slots.</p>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="space-y-6">
          {/* Priority callout */}
          {priorityPlans.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><Star size={14} /> Priority booking is active</p>
              <p className="text-xs text-amber-700 mt-1">Members of {priorityPlans.map((p) => p.name).join(', ')} are offered available slots ahead of non-members.</p>
            </Card>
          )}

          {/* Opening hours editor */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1B1B16] flex items-center gap-2"><Clock size={16} /> Opening Hours</h2>
              <Button size="sm" disabled={saving} onClick={save}><Save size={14} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}</Button>
            </div>
            <div className="space-y-2">
              {DAYS.map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-[#1B1B16] capitalize">{d}</span>
                  <label className="flex items-center gap-1.5 text-xs text-[#6B6B62] w-20">
                    <input type="checkbox" checked={!hours[d].closed} onChange={(e) => setDay(d, { closed: !e.target.checked })} /> Open
                  </label>
                  {hours[d].closed ? (
                    <span className="text-sm text-[#A8A89F]">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="time" value={hours[d].open} onChange={(e) => setDay(d, { open: e.target.value })} className={timeInp} />
                      <span className="text-[#A8A89F]">–</span>
                      <input type="time" value={hours[d].close} onChange={(e) => setDay(d, { close: e.target.value })} className={timeInp} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Staff availability */}
          <Card className="p-5">
            <h2 className="font-bold text-[#1B1B16] flex items-center gap-2 mb-3"><Users size={16} /> Staff Working Days</h2>
            <div className="space-y-2">
              {staff.map((s) => {
                const days = (s.availability ?? []).map((a) => ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][a.dayOfWeek]);
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xs font-bold text-[#1B1B16]">{s.user.firstName[0]}{s.user.lastName[0]}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1B1B16]">{s.user.firstName} {s.user.lastName}</p>
                      <p className="text-xs text-[#6B6B62]">{s.title}</p>
                    </div>
                    <div className="flex gap-1">
                      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                        <span key={d} className={cn('w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center', days.includes(d) ? 'bg-green-100 text-green-700' : 'bg-[#F0EFE8] text-[#C4C4BC]')}>{d}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!staff.length && <p className="text-sm text-[#A8A89F]">No staff members.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
const timeInp = 'rounded-lg border border-[#E8E8E4] p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';
