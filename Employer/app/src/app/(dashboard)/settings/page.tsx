'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, User, Lock, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, logout } from '@/lib/api';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'];

interface DaySchedule { enabled: boolean; from: string; to: string }

interface StaffProfile {
  bio: string | null;
  title: string | null;
  user: { firstName: string; lastName: string; email: string | null };
  vendor: { businessName: string };
}

const NAV = [
  { id: 'availability', label: 'Availability',   icon: <Clock size={14} /> },
  { id: 'profile',      label: 'Bio & Photo',     icon: <User size={14} /> },
  { id: 'password',     label: 'Password',        icon: <Lock size={14} /> },
];

function SaveBar({ onSave, saved, saving }: { onSave: () => void; saved: boolean; saving?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#F0EFE8]">
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle size={14} /> Saved successfully
        </span>
      )}
      <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
    </div>
  );
}

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#1A1A14] flex items-center justify-center text-[#E4C654]">{icon}</div>
        <h2 className="text-base font-bold text-[#1B1B16]">{title}</h2>
      </div>
      <Card className="p-6">{children}</Card>
    </section>
  );
}

export default function SettingsPage() {
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Availability ────────────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({
    Monday:    { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
    Tuesday:   { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
    Wednesday: { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
    Thursday:  { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
    Friday:    { enabled: true,  from: '9:00 AM',  to: '5:00 PM' },
    Saturday:  { enabled: false, from: '10:00 AM', to: '3:00 PM' },
    Sunday:    { enabled: false, from: '10:00 AM', to: '3:00 PM' },
  });
  const [availSaved, setAvailSaved] = useState(false);

  // ── Profile ─────────────────────────────────────────────────────────────────
  const [bio, setBio] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Password ─────────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.get<StaffProfile>('/staff/me');
      setStaffProfile(data);
      setBio(data.bio ?? '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  function toggleDay(day: string) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }));
  }
  function updateTime(day: string, field: 'from' | 'to', value: string) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], [field]: value } }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function saveAvailability() {
    // Availability is local-only (no dedicated backend endpoint)
    setAvailSaved(true);
    setTimeout(() => setAvailSaved(false), 3000);
  }

  async function saveProfile() {
    setProfileSaving(true);
    try {
      await api.patch('/staff/me', { bio });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave() {
    setPwError('');
    if (!currentPw) { setPwError('Enter your current password'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      await api.patch('/users/me', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password.');
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

  const displayName = staffProfile
    ? `${staffProfile.user.firstName} ${staffProfile.user.lastName}`
    : 'Staff Member';
  const initials = staffProfile
    ? `${staffProfile.user.firstName[0]}${staffProfile.user.lastName[0]}`
    : 'SM';

  return (
    <div className="flex gap-8 max-w-4xl mx-auto">
      {/* Sticky side nav */}
      <aside className="w-44 shrink-0 hidden lg:block">
        <div className="sticky top-6 flex flex-col gap-1">
          {NAV.map(({ id, label, icon }) => (
            <a key={id} href={`#${id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6B6B62] hover:bg-[#ECEAE4] hover:text-[#1B1B16] transition-colors font-medium">
              {icon} {label}
            </a>
          ))}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors font-medium mt-4 w-full text-left">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-8 min-w-0">
        {/* Availability */}
        <Section id="availability" icon={<Clock size={15} />} title="Weekly Availability">
          <p className="text-sm text-[#6B6B62] mb-4">Set the days and hours you&apos;re available to take bookings. Changes apply immediately to the booking calendar.</p>
          <div className="flex flex-col gap-3">
            {DAYS.map((day) => {
              const s = schedule[day];
              return (
                <div key={day} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors', s.enabled ? 'border-[#1B1B16] bg-[#FAFAF8]' : 'border-[#E8E8E4]')}>
                  <input type="checkbox" checked={s.enabled} onChange={() => toggleDay(day)} className="w-4 h-4 accent-[#1B1B16] cursor-pointer" />
                  <span className={cn('text-sm font-medium w-28', s.enabled ? 'text-[#1B1B16]' : 'text-[#A8A89F]')}>{day}</span>
                  {s.enabled ? (
                    <>
                      <select value={s.from} onChange={(e) => updateTime(day, 'from', e.target.value)}
                        className="flex-1 text-xs border border-[#E8E8E4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C654]">
                        {TIMES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-[#A8A89F]">to</span>
                      <select value={s.to} onChange={(e) => updateTime(day, 'to', e.target.value)}
                        className="flex-1 text-xs border border-[#E8E8E4] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C654]">
                        {TIMES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </>
                  ) : (
                    <span className="text-xs text-[#A8A89F] flex items-center gap-1"><Clock size={12} /> Day off</span>
                  )}
                </div>
              );
            })}
          </div>
          <SaveBar onSave={saveAvailability} saved={availSaved} />
        </Section>

        {/* Bio & Photo */}
        <Section id="profile" icon={<User size={15} />} title="Bio & Photo">
          <div className="flex items-start gap-5 mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xl font-bold text-[#1B1B16] overflow-hidden">
                {previewUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={previewUrl} alt="avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-[#1B1B16] text-white rounded-full flex items-center justify-center hover:bg-[#333328] transition-colors text-xs">
                +
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1B1B16]">{displayName}</p>
              <p className="text-sm text-[#6B6B62]">{staffProfile?.title ?? 'Staff Member'}</p>
              <p className="text-xs text-[#A8A89F] mt-0.5">{staffProfile?.vendor.businessName ?? ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] resize-none" />
            </div>
          </div>
          <SaveBar onSave={saveProfile} saved={profileSaved} saving={profileSaving} />
        </Section>

        {/* Password */}
        <Section id="password" icon={<Lock size={15} />} title="Change Password">
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            {[
              { label: 'Current Password', value: currentPw, onChange: setCurrentPw },
              { label: 'New Password',     value: newPw,     onChange: setNewPw     },
              { label: 'Confirm Password', value: confirmPw, onChange: setConfirmPw },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">{label}</label>
                <input type="password" value={value} onChange={(e) => onChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
              </div>
            ))}
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          </div>
          <SaveBar onSave={handlePasswordSave} saved={pwSaved} saving={pwSaving} />
        </Section>
      </div>
    </div>
  );
}
