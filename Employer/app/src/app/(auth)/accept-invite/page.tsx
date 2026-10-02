'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Eye, EyeOff, Loader2, Clock } from 'lucide-react';
import { api, setToken } from '@/lib/api';

type Step = 'loading' | 'expired' | 'validate' | 'create' | 'availability' | 'profile' | 'done';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];

interface DaySchedule { enabled: boolean; from: string; to: string }

const defaultSchedule: Record<string, DaySchedule> = {
  Monday:    { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
  Tuesday:   { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
  Wednesday: { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
  Thursday:  { enabled: true,  from: '9:00 AM',  to: '6:00 PM' },
  Friday:    { enabled: true,  from: '9:00 AM',  to: '5:00 PM' },
  Saturday:  { enabled: false, from: '10:00 AM', to: '3:00 PM' },
  Sunday:    { enabled: false, from: '10:00 AM', to: '3:00 PM' },
};

function AcceptInviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [inviteEmail, setInviteEmail] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(false);

  // Create account
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [formError, setFormError] = useState('');

  // Availability
  const [schedule, setSchedule] = useState(defaultSchedule);

  // Profile
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!token) { setStep('expired'); return; }
    api.get<{ email: string; vendorId: string; expiresAt: string }>(`/staff/invite/${token}`)
      .then(async (invite) => {
        setInviteEmail(invite.email);
        // Fetch vendor name
        try {
          const vendor = await api.get<{ businessName: string }>(`/vendors/${invite.vendorId}`);
          setVendorName(vendor.businessName);
        } catch { setVendorName('Your Salon'); }
        setStep('create');
      })
      .catch(() => setStep('expired'));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (password.length < 8) { setFormError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      // 1. Register
      await api.post('/auth/register', {
        firstName, lastName, email: inviteEmail, phone, password, role: 'client',
      });
      // 2. Login
      const loginData = await api.post<{ user: object; accessToken: string; refreshToken: string }>('/auth/login', {
        email: inviteEmail, password,
      });
      setToken(loginData.accessToken, loginData.refreshToken);
      // 3. Accept invite
      await api.post(`/staff/invite/${token}`, {});
      setStep('availability');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvailability() {
    // Availability step is local-only for now (no backend endpoint)
    setStep('profile');
  }

  async function handleFinish() {
    setLoading(true);
    try {
      if (bio.trim()) {
        await api.patch('/staff/me', { bio });
      }
      setStep('done');
    } catch {
      setStep('done'); // proceed anyway
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }));
  }

  function updateTime(day: string, field: 'from' | 'to', value: string) {
    setSchedule((s) => ({ ...s, [day]: { ...s[day], [field]: value } }));
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#E4C654]" />
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (step === 'expired') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 text-center max-w-sm w-full shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1B1B16] mb-2">Invite Expired</h2>
          <p className="text-sm text-[#6B6B62]">This invite link is no longer valid. Please ask your salon manager to resend it.</p>
        </div>
      </div>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E8E8E4] rounded-2xl p-8 text-center max-w-sm w-full shadow-sm">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1B1B16] mb-2">You&apos;re all set!</h2>
          <p className="text-sm text-[#6B6B62] mb-6">Your account has been created. Head to your schedule to get started.</p>
          <button
            onClick={() => router.push('/schedule')}
            className="w-full py-3 bg-[#1B1B16] text-white text-sm font-bold rounded-xl hover:bg-[#333328] transition-colors"
          >
            Go to My Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-4xl font-black tracking-tight text-[#1B1B16]">TEDDY</span>
          <p className="text-sm text-[#6B6B62] mt-1">Staff Portal · Accept Invite</p>
        </div>

        {/* Invite banner */}
        {(step === 'create') && (
          <div className="bg-[#E4C654]/15 border border-[#E4C654]/40 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E4C654]/30 flex items-center justify-center shrink-0 text-sm font-bold text-[#1B1B16]">
              {vendorName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B1B16]">{vendorName} has invited you</p>
              <p className="text-xs text-[#6B6B62] mt-0.5">Email: {inviteEmail} · staff.teddy.app</p>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {(['create', 'availability', 'profile'] as Step[]).map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
              ['create', 'availability', 'profile'].indexOf(step) >= i ? 'bg-[#1B1B16]' : 'bg-[#E8E8E4]'
            }`} />
          ))}
        </div>

        <div className="bg-white border border-[#E8E8E4] rounded-2xl shadow-sm p-8">

          {/* ── Step: Create Account ── */}
          {step === 'create' && (
            <>
              <h2 className="text-xl font-bold text-[#1B1B16] mb-1">Create your account</h2>
              <p className="text-sm text-[#6B6B62] mb-6">Set up your staff profile to get started</p>
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
                  <AlertCircle size={14} className="shrink-0" />{formError}
                </div>
              )}
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">First Name</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Maya"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">Last Name</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Johnson"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (305) 555-0000" required
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                      placeholder="At least 8 characters"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A89F]">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#1B1B16] text-white text-sm font-bold rounded-xl hover:bg-[#333328] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Creating account…' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {/* ── Step: Availability ── */}
          {step === 'availability' && (
            <>
              <h2 className="text-xl font-bold text-[#1B1B16] mb-1">Set your availability</h2>
              <p className="text-sm text-[#6B6B62] mb-6">Choose the days and times you&apos;re available to take bookings</p>
              <div className="flex flex-col gap-3 mb-6">
                {DAYS.map((day) => {
                  const s = schedule[day];
                  return (
                    <div key={day} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${s.enabled ? 'border-[#1B1B16] bg-[#FAFAF8]' : 'border-[#E8E8E4]'}`}>
                      <input type="checkbox" checked={s.enabled} onChange={() => toggleDay(day)}
                        className="w-4 h-4 accent-[#1B1B16] cursor-pointer" />
                      <span className={`text-sm font-medium w-24 ${s.enabled ? 'text-[#1B1B16]' : 'text-[#A8A89F]'}`}>{day.slice(0, 3)}</span>
                      {s.enabled ? (
                        <>
                          <select value={s.from} onChange={(e) => updateTime(day, 'from', e.target.value)}
                            className="flex-1 text-xs border border-[#E8E8E4] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C654]">
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-xs text-[#A8A89F]">to</span>
                          <select value={s.to} onChange={(e) => updateTime(day, 'to', e.target.value)}
                            className="flex-1 text-xs border border-[#E8E8E4] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E4C654]">
                            {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </>
                      ) : (
                        <span className="text-xs text-[#A8A89F] flex items-center gap-1"><Clock size={12} /> Day off</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={handleAvailability} disabled={loading}
                className="w-full py-3 bg-[#1B1B16] text-white text-sm font-bold rounded-xl hover:bg-[#333328] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </>
          )}

          {/* ── Step: Bio & Photo ── */}
          {step === 'profile' && (
            <>
              <h2 className="text-xl font-bold text-[#1B1B16] mb-1">Add your bio & photo</h2>
              <p className="text-sm text-[#6B6B62] mb-6">Optional — clients will see this on your profile</p>

              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-2xl font-bold text-[#1B1B16] mb-3">
                  {(firstName[0] || 'M')}{(lastName[0] || 'J')}
                </div>
                <label className="text-sm font-semibold text-[#1B1B16] cursor-pointer hover:underline">
                  Upload photo (optional)
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>

              <div className="mb-6">
                <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-1.5 block">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                  placeholder="Tell clients a bit about yourself, your specialties, and your approach…"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('done')} className="flex-1 py-3 border border-[#E8E8E4] text-sm font-semibold rounded-xl hover:bg-[#FAFAF8] transition-colors">
                  Skip
                </button>
                <button onClick={handleFinish} disabled={loading}
                  className="flex-1 py-3 bg-[#1B1B16] text-white text-sm font-bold rounded-xl hover:bg-[#333328] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Saving…' : 'Finish Setup'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-[#E4C654]" /></div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}
