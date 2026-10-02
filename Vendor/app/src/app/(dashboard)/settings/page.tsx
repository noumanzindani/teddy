'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, CreditCard, Bell, Lock, Store, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  if (h > 22) return null;
  return `${String(h).padStart(2, '0')}:${m}`;
}).filter(Boolean) as string[];

interface DaySchedule { open: boolean; from: string; to: string; }
type Schedule = Record<string, DaySchedule>;

interface VendorProfile {
  id: string;
  businessName: string;
  bio: string | null;
  address: string | null;
  openHours: Record<string, DaySchedule> | null;
  stripeAccountId: string | null;
}

const DEFAULT_SCHEDULE: Schedule = {
  Monday:    { open: true,  from: '09:00', to: '18:00' },
  Tuesday:   { open: true,  from: '09:00', to: '18:00' },
  Wednesday: { open: true,  from: '09:00', to: '18:00' },
  Thursday:  { open: true,  from: '09:00', to: '20:00' },
  Friday:    { open: true,  from: '09:00', to: '20:00' },
  Saturday:  { open: true,  from: '10:00', to: '17:00' },
  Sunday:    { open: false, from: '10:00', to: '15:00' },
};

const NAV_SECTIONS = [
  { id: 'profile',   label: 'Salon Profile',    icon: Store },
  { id: 'hours',     label: 'Business Hours',   icon: Clock },
  { id: 'payout',    label: 'Payout Account',   icon: CreditCard },
  { id: 'notifs',    label: 'Notifications',    icon: Bell },
  { id: 'security',  label: 'Security',         icon: Lock },
];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-bold text-[#1B1B16] mb-3">{title}</h2>
      <Card className="p-6">{children}</Card>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-4 border-b border-[#F0EFE8] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1B1B16]">{label}</p>
        {hint && <p className="text-xs text-[#A8A89F] mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, className, textarea, rows,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; textarea?: boolean; rows?: number;
}) {
  const base = 'w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm text-[#1B1B16] focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]';
  if (textarea) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 3}
        className={cn(base, 'resize-none', className)}
      />
    );
  }
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(base, className)}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative rounded-full transition-colors shrink-0',
        checked ? 'bg-[#1B1B16]' : 'bg-[#D0CFC8]'
      )}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function SaveBar({ onSave, saved, saving }: { onSave: () => void; saved: boolean; saving?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#F0EFE8]">
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle size={14} /> Saved
        </span>
      )}
      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  // Salon profile
  const [salonName, setSalonName] = useState('');
  const [address, setAddress] = useState('');
  const [bio, setBio] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Business hours
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  // Notifications (local state only — no vendor notification preferences endpoint)
  const [notifs, setNotifs] = useState({
    newBooking: true,
    cancellation: true,
    reminder1h: true,
    dailySummary: true,
    payouts: true,
    marketing: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Security
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  // ── Load vendor profile ────────────────────────────────────────────────────

  const fetchVendor = useCallback(async () => {
    try {
      const vendor = await api.get<VendorProfile>('/vendors/me');
      setSalonName(vendor.businessName ?? '');
      setAddress(vendor.address ?? '');
      setBio(vendor.bio ?? '');

      if (vendor.openHours && Object.keys(vendor.openHours).length > 0) {
        // Merge saved hours over DEFAULT_SCHEDULE (keeps any missing days filled in)
        setSchedule(prev => ({ ...prev, ...vendor.openHours }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendor(); }, [fetchVendor]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function setDay(day: string, patch: Partial<DaySchedule>) {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
    e.target.value = '';
  }

  async function saveProfile() {
    setProfileSaving(true);
    try {
      await api.patch('/vendors/me', { businessName: salonName, bio, address });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveHours() {
    setHoursSaving(true);
    try {
      await api.patch('/vendors/me', { openHours: schedule });
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setHoursSaving(false);
    }
  }

  function saveNotifs() {
    // Local toggle only — no vendor notification preferences endpoint
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  }

  async function savePassword() {
    setPwError('');
    if (!currentPw) return setPwError('Enter your current password.');
    if (newPw.length < 8) return setPwError('New password must be at least 8 characters.');
    if (newPw !== confirmPw) return setPwError('Passwords do not match.');
    setPwSaving(true);
    try {
      await api.patch('/users/me', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 max-w-5xl mx-auto">
      {/* Sticky side nav */}
      <aside className="w-48 shrink-0 hidden lg:block">
        <div className="sticky top-6 flex flex-col gap-1">
          {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6B6B62] hover:bg-[#F0EFE8] hover:text-[#1B1B16] transition-colors font-medium"
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </div>
      </aside>

      {/* Sections */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">

        {/* ── Salon Profile ── */}
        <Section id="profile" title="Salon Profile">
          <Field label="Logo" hint="Shown to clients in search results">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#E4C654]/20 border border-[#E8E8E4] flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-xl font-black text-[#1B1B16]">
                      {salonName.slice(0, 2).toUpperCase() || 'SC'}
                    </span>
                }
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>
                  <Camera size={13} /> Upload photo
                </Button>
                {logoUrl && (
                  <Button variant="outline" size="sm" onClick={() => setLogoUrl(null)}>Remove</Button>
                )}
                <p className="text-xs text-[#A8A89F]">JPG or PNG, max 2 MB</p>
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </Field>

          <Field label="Salon name">
            <TextInput value={salonName} onChange={setSalonName} placeholder="Your salon name" />
          </Field>

          <Field label="Address">
            <TextInput value={address} onChange={setAddress} placeholder="Street, City, State ZIP" />
          </Field>

          <Field label="Bio" hint="Shown on your salon profile page">
            <TextInput value={bio} onChange={setBio} textarea rows={4} placeholder="Tell clients about your salon…" />
          </Field>

          <SaveBar onSave={saveProfile} saved={profileSaved} saving={profileSaving} />
        </Section>

        {/* ── Business Hours ── */}
        <Section id="hours" title="Business Hours">
          <div className="flex flex-col gap-1">
            {DAYS.map(day => {
              const s = schedule[day];
              return (
                <div key={day} className="flex items-center gap-4 py-2.5 border-b border-[#F0EFE8] last:border-0">
                  <div className="w-28 flex items-center gap-2.5 shrink-0">
                    <Toggle checked={s.open} onChange={v => setDay(day, { open: v })} />
                    <span className={cn('text-sm font-medium', s.open ? 'text-[#1B1B16]' : 'text-[#A8A89F]')}>
                      {day.slice(0, 3)}
                    </span>
                  </div>
                  {s.open ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={s.from}
                        onChange={e => setDay(day, { from: e.target.value })}
                        className="flex-1 text-sm border border-[#E8E8E4] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E4C654] text-[#1B1B16]"
                      >
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-[#A8A89F] text-sm">–</span>
                      <select
                        value={s.to}
                        onChange={e => setDay(day, { to: e.target.value })}
                        className="flex-1 text-sm border border-[#E8E8E4] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E4C654] text-[#1B1B16]"
                      >
                        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-[#A8A89F] flex-1">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
          <SaveBar onSave={saveHours} saved={hoursSaved} saving={hoursSaving} />
        </Section>

        {/* ── Payout Account ── */}
        <Section id="payout" title="Payout Account">
          <div className="bg-[#FAFAF8] rounded-xl p-4 flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-[#635BFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1B1B16]">Chase Bank ···· 4821</p>
              <p className="text-xs text-[#6B6B62] mt-0.5">Connected via Stripe Connect · Payouts every T+2</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-xs text-green-700 font-medium">Active &amp; verified</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Next payout', value: 'Tomorrow' },
              { label: 'Pending balance', value: '$734.00' },
              { label: 'Last payout', value: '$1,240.00' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#F5F4EC] rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B62]">{label}</p>
                <p className="text-base font-bold text-[#1B1B16] mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#A8A89F] mt-4 text-center">
            Payout schedule and bank details are managed through Stripe. Funds are transferred T+2 after each completed booking.
          </p>
        </Section>

        {/* ── Notifications ── */}
        <Section id="notifs" title="Notifications">
          {([
            { key: 'newBooking',    label: 'New booking',          hint: 'Email + push when a client books' },
            { key: 'cancellation',  label: 'Cancellation',         hint: 'Alert when a booking is cancelled' },
            { key: 'reminder1h',   label: '1-hour reminder',       hint: 'Reminder before each appointment' },
            { key: 'dailySummary', label: 'Daily summary',         hint: "Morning digest of the day's bookings" },
            { key: 'payouts',      label: 'Payout notifications',  hint: 'When a payout is initiated or arrives' },
            { key: 'marketing',    label: 'Marketing updates',     hint: 'Tips, feature announcements from TEDDY' },
          ] as { key: keyof typeof notifs; label: string; hint: string }[]).map(({ key, label, hint }) => (
            <div key={key} className="flex items-start justify-between py-3.5 border-b border-[#F0EFE8] last:border-0">
              <div>
                <p className="text-sm font-medium text-[#1B1B16]">{label}</p>
                <p className="text-xs text-[#A8A89F] mt-0.5">{hint}</p>
              </div>
              <Toggle
                checked={notifs[key]}
                onChange={v => setNotifs(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
          <SaveBar onSave={saveNotifs} saved={notifSaved} />
        </Section>

        {/* ── Security ── */}
        <Section id="security" title="Security">
          <Field label="Current password">
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
            />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
            />
          </Field>

          {pwError && (
            <p className="text-sm text-red-600 mt-2">{pwError}</p>
          )}

          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#F0EFE8]">
            {pwSaved && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle size={14} /> Password updated
              </span>
            )}
            <Button onClick={savePassword} disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </Section>

      </div>
    </div>
  );
}
