'use client';

import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Staff {
  id: string;
  user: { firstName: string; lastName: string };
}

type Metric =
  | 'revenue' | 'clients' | 'rebooking' | 'retail'
  | 'memberships' | 'giftcards' | 'retention' | 'custom';

type Period = 'weekly' | 'monthly';

interface Goal {
  id: string;
  staffMemberId: string;
  metric: Metric;
  label?: string | null;
  target: number;
  period: Period;
}

const METRICS: { value: Metric; label: string }[] = [
  { value: 'revenue',     label: 'Revenue' },
  { value: 'clients',     label: 'Clients' },
  { value: 'rebooking',   label: 'Rebooking' },
  { value: 'retail',      label: 'Retail' },
  { value: 'memberships', label: 'Memberships' },
  { value: 'giftcards',   label: 'Gift cards' },
  { value: 'retention',   label: 'Retention' },
  { value: 'custom',      label: 'Custom' },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function metricLabel(m: Metric): string {
  return METRICS.find((x) => x.value === m)?.label ?? m;
}

interface FormState {
  staffMemberId: string;
  metric: Metric;
  label: string;
  target: string;
  period: Period;
}

const EMPTY_FORM: FormState = {
  staffMemberId: '',
  metric: 'revenue',
  label: '',
  target: '',
  period: 'monthly',
};

export default function GoalsPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, goalRes] = await Promise.all([
        api.get<Staff[] | { data: Staff[] }>('/vendors/me/staff'),
        api.get<Goal[] | { data: Goal[] }>('/goals'),
      ]);
      const staffList = Array.isArray(staffRes) ? staffRes : (staffRes?.data ?? []);
      const goalList = Array.isArray(goalRes) ? goalRes : (goalRes?.data ?? []);
      setStaff(staffList);
      setGoals(goalList);
      setForm((f) => (f.staffMemberId ? f : { ...f, staffMemberId: staffList[0]?.id ?? '' }));
    } catch {
      setStaff([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, staffMemberId: staff[0]?.id ?? '' });
  }

  function startEdit(g: Goal) {
    setEditingId(g.id);
    setForm({
      staffMemberId: g.staffMemberId,
      metric: g.metric,
      label: g.label ?? '',
      target: String(g.target),
      period: g.period,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const target = Number(form.target);
    if (!form.staffMemberId) { setError('Please select an employee.'); return; }
    if (!form.target || Number.isNaN(target)) { setError('Please enter a valid target number.'); return; }

    const body = {
      staffMemberId: form.staffMemberId,
      metric: form.metric,
      label: form.label.trim() || undefined,
      target,
      period: form.period,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/goals/${editingId}`, body);
      } else {
        await api.post('/goals', body);
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save goal.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    // Optimistic removal.
    const prev = goals;
    setGoals((gs) => gs.filter((g) => g.id !== id));
    if (editingId === id) resetForm();
    try {
      await api.delete(`/goals/${id}`);
    } catch (err) {
      setGoals(prev);
      setError(err instanceof Error ? err.message : 'Could not delete goal.');
    }
  }

  const staffName = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown employee';
  };

  // Group goals by employee.
  const grouped = staff
    .map((s) => ({ staff: s, goals: goals.filter((g) => g.staffMemberId === s.id) }))
    .filter((g) => g.goals.length > 0);
  const orphaned = goals.filter((g) => !staff.some((s) => s.id === g.staffMemberId));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Goals</h1>
        <p className="text-sm text-[#6B6B62]">Set performance targets for each team member.</p>
      </div>

      {/* Add / edit form */}
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#1B1B16]">{editingId ? 'Edit goal' : 'Add a goal'}</h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6B62] hover:text-[#1B1B16]"
            >
              <X size={14} /> Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Employee"
            value={form.staffMemberId}
            onChange={(e) => setForm({ ...form, staffMemberId: e.target.value })}
            options={
              staff.length
                ? staff.map((s) => ({ value: s.id, label: `${s.user.firstName} ${s.user.lastName}` }))
                : [{ value: '', label: 'No employees' }]
            }
          />
          <Select
            label="Metric"
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value as Metric })}
            options={METRICS}
          />
          <Input
            label="Label (optional)"
            placeholder="e.g. Q3 stretch goal"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <Input
            label="Target"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 5000"
            value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })}
          />
          <Select
            label="Period"
            value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value as Period })}
            options={PERIODS}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {editingId ? <Pencil size={16} /> : <Plus size={16} />}
              {saving ? 'Saving…' : editingId ? 'Update goal' : 'Add goal'}
            </Button>
          </div>
        </form>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </Card>

      {/* Existing goals */}
      {loading ? (
        <p className="text-[#6B6B62]">Loading…</p>
      ) : !goals.length ? (
        <Card className="p-8 text-center">
          <Target size={28} className="mx-auto text-[#C4C4BC]" />
          <p className="mt-3 text-sm text-[#6B6B62]">No goals yet — add one above to get started.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ staff: s, goals: gs }) => (
            <Card key={s.id} className="p-5">
              <h3 className="text-sm font-bold text-[#1B1B16] mb-3">
                {s.user.firstName} {s.user.lastName}
              </h3>
              <div className="space-y-2">
                {gs.map((g) => (
                  <GoalRow key={g.id} goal={g} onEdit={() => startEdit(g)} onDelete={() => remove(g.id)} />
                ))}
              </div>
            </Card>
          ))}

          {orphaned.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-[#1B1B16] mb-3">Other</h3>
              <div className="space-y-2">
                {orphaned.map((g) => (
                  <GoalRow
                    key={g.id}
                    goal={g}
                    subtitle={staffName(g.staffMemberId)}
                    onEdit={() => startEdit(g)}
                    onDelete={() => remove(g.id)}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal, subtitle, onEdit, onDelete,
}: {
  goal: Goal;
  subtitle?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F0EFE8] bg-[#FAFAF8] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1B1B16] truncate">
          {goal.label || metricLabel(goal.metric)}
        </p>
        <p className="text-xs text-[#6B6B62]">
          <span className="font-medium text-[#1B1B16]">{metricLabel(goal.metric)}</span>
          {' · target '}
          <span className="font-medium text-[#1B1B16]">{goal.target.toLocaleString()}</span>
          {' · '}
          {goal.period}
          {subtitle ? ` · ${subtitle}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit goal"
          className="p-2 rounded-lg text-[#6B6B62] hover:bg-[#F0EFE8] hover:text-[#1B1B16] transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete goal"
          className="p-2 rounded-lg text-[#6B6B62] hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
