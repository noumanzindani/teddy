'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Permission model ──────────────────────────────────────────────────────────
const PERMISSIONS = [
  { key: 'scheduleClients',    label: 'Schedule clients' },
  { key: 'rescheduleClients',  label: 'Reschedule clients' },
  { key: 'moveAppointments',   label: 'Move appointments on calendar' },
  { key: 'manageGiftCards',    label: 'Create/manage gift cards' },
  { key: 'manageWorkingHours', label: 'Manage working hours' },
  { key: 'requestTimeOff',     label: 'Request time off' },
  { key: 'createForms',        label: 'Create forms' },
  { key: 'sendForms',          label: 'Send forms to clients' },
  { key: 'manageMemberships',  label: 'Create/manage memberships' },
  { key: 'manageProducts',     label: 'Create/manage products' },
  { key: 'manageWaitlist',     label: 'Access/manage waitlist' },
] as const;

type PermissionKey = typeof PERMISSIONS[number]['key'];
type Permissions = Record<PermissionKey, boolean>;

interface Staff {
  id: string;
  title?: string | null;
  user: { firstName: string; lastName: string; email?: string | null; avatarUrl?: string | null };
  permissions: Permissions;
}

const EMPTY_PERMS: Permissions = PERMISSIONS.reduce(
  (acc, p) => ({ ...acc, [p.key]: false }),
  {} as Permissions,
);

export default function TeamPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Staff[] | { data: Staff[] }>('/vendors/me/staff');
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      setStaff(
        list.map((s) => ({ ...s, permissions: { ...EMPTY_PERMS, ...(s.permissions ?? {}) } })),
      );
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggle(staffId: string, key: PermissionKey, next: boolean) {
    // Optimistic update.
    setErrorId(null);
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, permissions: { ...s.permissions, [key]: next } } : s)),
    );
    try {
      await api.patch(`/vendors/me/staff/${staffId}/permissions`, { permissions: { [key]: next } });
      setSavedId(staffId);
      setTimeout(() => setSavedId((id) => (id === staffId ? null : id)), 1500);
    } catch {
      // Revert.
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, permissions: { ...s.permissions, [key]: !next } } : s)),
      );
      setErrorId(staffId);
      setTimeout(() => setErrorId((id) => (id === staffId ? null : id)), 3000);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Team</h1>
        <p className="text-sm text-[#6B6B62]">Employee permissions — control what each team member can do.</p>
      </div>

      {loading ? (
        <p className="text-[#6B6B62]">Loading…</p>
      ) : !staff.length ? (
        <Card className="p-8 text-center">
          <ShieldCheck size={28} className="mx-auto text-[#C4C4BC]" />
          <p className="mt-3 text-sm text-[#6B6B62]">
            No employees yet — invite team members to manage their permissions.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {staff.map((s) => {
            const initials = `${s.user.firstName?.[0] ?? ''}${s.user.lastName?.[0] ?? ''}`.toUpperCase();
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {s.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.user.avatarUrl}
                        alt={`${s.user.firstName} ${s.user.lastName}`}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-sm font-bold text-[#1B1B16] shrink-0">
                        {initials || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1B1B16] truncate">
                        {s.user.firstName} {s.user.lastName}
                      </p>
                      <p className="text-xs text-[#6B6B62] truncate">{s.user.email || s.title || '—'}</p>
                    </div>
                  </div>
                  {savedId === s.id && <span className="text-xs font-semibold text-green-600 shrink-0">Saved ✓</span>}
                  {errorId === s.id && <span className="text-xs font-semibold text-red-600 shrink-0">Couldn&apos;t save — try again</span>}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 border-t border-[#F0EFE8] pt-4">
                  {PERMISSIONS.map((p) => {
                    const on = s.permissions[p.key];
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => toggle(s.id, p.key, !on)}
                        className="flex items-center justify-between gap-2 text-left group"
                      >
                        <span className="text-sm text-[#1B1B16]">{p.label}</span>
                        <span
                          className={cn(
                            'relative w-9 h-5 rounded-full transition-colors shrink-0',
                            on ? 'bg-[#E4C654]' : 'bg-[#E0E0DA] group-hover:bg-[#D2D2CA]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                              on && 'translate-x-4',
                            )}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
