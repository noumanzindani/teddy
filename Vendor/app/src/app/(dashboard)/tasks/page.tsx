'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListTodo, Plus, Trash2, Check, RefreshCw, Calendar, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Staff {
  id: string;
  user: { firstName: string; lastName: string };
}
interface Task {
  id: string;
  staffMemberId: string | null;
  title: string;
  notes?: string | null;
  dueAt?: string | null;
  recurring?: 'daily' | 'weekly' | null;
  completed: boolean;
}

type Recurring = 'daily' | 'weekly' | '';
const emptyForm = { staffMemberId: '', title: '', notes: '', dueAt: '', recurring: '' as Recurring };

export default function TasksPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRaw, tasksRaw] = await Promise.all([
        api.get<Staff[] | { data: Staff[] }>('/vendors/me/staff'),
        api.get<Task[] | { data: Task[] }>('/workspace/tasks').catch(() => [] as Task[]),
      ]);
      setStaff(Array.isArray(staffRaw) ? staffRaw : (staffRaw?.data ?? []));
      setTasks(Array.isArray(tasksRaw) ? tasksRaw : (tasksRaw?.data ?? []));
    } catch {
      setStaff([]); setTasks([]);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      staffMemberId: form.staffMemberId || null,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      recurring: form.recurring || null,
    };
    try {
      await api.post('/workspace/tasks', payload);
      setForm(emptyForm);
      await load();
    } catch { /* */ } finally { setSaving(false); }
  }

  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try { await api.delete(`/workspace/tasks/${id}`); } catch { await load(); }
  }

  // Group tasks: null (all) first, then per-employee.
  const groups: { key: string; label: string; tasks: Task[] }[] = [];
  const pushGroup = (key: string, label: string, t: Task) => {
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, label, tasks: [] }; groups.push(g); }
    g.tasks.push(t);
  };
  tasks.filter((t) => !t.staffMemberId).forEach((t) => pushGroup('__all__', 'All employees', t));
  staff.forEach((s) => {
    tasks.filter((t) => t.staffMemberId === s.id).forEach((t) =>
      pushGroup(s.id, `${s.user.firstName} ${s.user.lastName}`, t));
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Tasks &amp; Checklists</h1>
        <p className="text-sm text-[#6B6B62]">Assign tasks or checklist items to employees. Recurring items repeat daily or weekly.</p>
      </div>

      {/* Assign form */}
      <Card className="p-5 mb-8">
        <h2 className="font-bold text-[#1B1B16] mb-3 flex items-center gap-2"><Plus size={16} /> Assign a task</h2>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <L label="Assign to">
              <select className={inp} value={form.staffMemberId} onChange={(e) => setForm({ ...form, staffMemberId: e.target.value })}>
                <option value="">All employees</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.user.firstName} {s.user.lastName}</option>)}
              </select>
            </L>
            <L label="Title"><input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sanitize treatment room" /></L>
          </div>
          <L label="Notes (optional)"><textarea className={inp} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Extra instructions…" /></L>
          <div className="grid sm:grid-cols-2 gap-3">
            <L label="Due date (optional)"><input type="datetime-local" className={inp} value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></L>
            <L label="Recurring">
              <select className={inp} value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value as Recurring })}>
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </L>
          </div>
          <Button disabled={saving || !form.title.trim()} onClick={create}>{saving ? 'Assigning…' : 'Assign Task'}</Button>
        </div>
      </Card>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : !tasks.length ? (
        <Card className="p-8 text-center">
          <ListTodo size={28} className="mx-auto text-[#C4C4BC]" />
          <p className="mt-3 text-sm text-[#6B6B62]">No tasks assigned yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="text-sm font-bold text-[#1B1B16] mb-2 flex items-center gap-1.5">
                <Users size={14} className="text-[#A8A89F]" /> {g.label}
                <span className="text-xs font-normal text-[#A8A89F]">({g.tasks.length})</span>
              </h3>
              <div className="grid gap-2">
                {g.tasks.map((t) => (
                  <Card key={t.id} className="p-3 flex items-start gap-3">
                    <span className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      t.completed ? 'bg-green-100 text-green-700' : 'border border-[#D2D2CA] text-transparent')}>
                      <Check size={12} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold text-[#1B1B16]', t.completed && 'line-through text-[#A8A89F]')}>{t.title}</p>
                      {t.notes && <p className="text-xs text-[#6B6B62] mt-0.5">{t.notes}</p>}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#A8A89F]">
                        {t.dueAt && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(t.dueAt).toLocaleString()}</span>}
                        {t.recurring && <span className="flex items-center gap-1 capitalize"><RefreshCw size={11} /> {t.recurring}</span>}
                      </div>
                    </div>
                    <button onClick={() => remove(t.id)} className="text-[#C4C4BC] hover:text-red-500 shrink-0" aria-label="Delete task"><Trash2 size={16} /></button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-[#6B6B62]">{label}</label><div className="mt-1">{children}</div></div>;
}
