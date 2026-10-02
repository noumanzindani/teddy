'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, StickyNote, Smile, Plus, Trash2, Repeat, Lock,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

interface WorkspaceTask {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  recurring: boolean;
  completed: boolean;
  isPersonal: boolean;
  staffMemberId: string | null;
}

interface WorkspaceNote {
  id: string;
  content: string;
  updatedAt: string;
}

type Mood = 'great' | 'good' | 'ok' | 'tough';

interface CheckIn {
  id: string;
  mood: Mood;
  note: string | null;
  createdAt: string;
}

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good',  emoji: '🙂', label: 'Good'  },
  { value: 'ok',    emoji: '😐', label: 'OK'    },
  { value: 'tough', emoji: '😞', label: 'Tough' },
];

function moodMeta(mood: Mood) {
  return MOODS.find((m) => m.value === mood) ?? MOODS[2];
}

function formatDate(value: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric' });
}

export default function WorkspacePage() {
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskRecurring, setTaskRecurring] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  // Add-note form
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Check-in form
  const [mood, setMood] = useState<Mood | null>(null);
  const [checkinNote, setCheckinNote] = useState('');
  const [savingCheckin, setSavingCheckin] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, n, c] = await Promise.all([
        api.get<WorkspaceTask[]>('/workspace/me/tasks').catch(() => [] as WorkspaceTask[]),
        api.get<WorkspaceNote[]>('/workspace/me/notes').catch(() => [] as WorkspaceNote[]),
        api.get<CheckIn[]>('/workspace/me/checkins').catch(() => [] as CheckIn[]),
      ]);
      setTasks(t);
      setNotes(n);
      setCheckins(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ---- Tasks ----
  async function toggleTask(task: WorkspaceTask) {
    const next = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));
    try {
      await api.patch(`/workspace/me/tasks/${task.id}`, { completed: next });
    } catch {
      // revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !next } : t)));
    }
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      const created = await api.post<WorkspaceTask>('/workspace/me/tasks', {
        title: taskTitle.trim(),
        notes: taskNotes.trim() || undefined,
        dueAt: taskDue || undefined,
        recurring: taskRecurring,
      });
      setTasks((prev) => [created, ...prev]);
      setTaskTitle('');
      setTaskNotes('');
      setTaskDue('');
      setTaskRecurring(false);
      setShowTaskForm(false);
    } catch {
      // keep form open on failure
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(id: string) {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await api.delete(`/workspace/me/tasks/${id}`);
    } catch {
      setTasks(prev);
    }
  }

  // ---- Notes ----
  async function addNote() {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const created = await api.post<WorkspaceNote>('/workspace/me/notes', { content: noteContent.trim() });
      setNotes((prev) => [created, ...prev]);
      setNoteContent('');
    } catch {
      // keep content on failure
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(id: string) {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    try {
      await api.delete(`/workspace/me/notes/${id}`);
    } catch {
      setNotes(prev);
    }
  }

  // ---- Check-ins ----
  async function submitCheckin() {
    if (!mood) return;
    setSavingCheckin(true);
    try {
      const created = await api.post<CheckIn>('/workspace/me/checkins', {
        mood,
        note: checkinNote.trim() || undefined,
      });
      setCheckins((prev) => [created, ...prev]);
      setMood(null);
      setCheckinNote('');
    } catch {
      // keep selection on failure
    } finally {
      setSavingCheckin(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#E4C654]/20 flex items-center justify-center text-[#1B1B16] shrink-0">
          <ClipboardList size={20} />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#1B1B16]">My Workspace</h1>
          <p className="text-sm text-[#A8A89F]">Your tasks, notes and daily check-in — all in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks & checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1B1B16]">My Tasks &amp; Checklist</h2>
              <Button size="sm" variant="outline" onClick={() => setShowTaskForm((v) => !v)}>
                <Plus size={14} /> Add personal reminder
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {showTaskForm && (
              <div className="flex flex-col gap-3 mb-4 p-4 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Reminder title"
                  className={inputClass}
                />
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide">Due</label>
                    <input
                      type="datetime-local"
                      value={taskDue}
                      onChange={(e) => setTaskDue(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#1B1B16] cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={taskRecurring}
                      onChange={(e) => setTaskRecurring(e.target.checked)}
                      className="w-4 h-4 accent-[#1B1B16] cursor-pointer"
                    />
                    Recurring
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={addTask} disabled={savingTask || !taskTitle.trim()}>
                    {savingTask ? 'Adding…' : 'Add reminder'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 bg-[#F0EFE8] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-[#A8A89F] text-center py-6">No tasks yet — add a personal reminder to get started.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[#F0EFE8]">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                      className="w-4 h-4 mt-0.5 accent-[#1B1B16] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${task.completed ? 'line-through text-[#A8A89F]' : 'text-[#1B1B16]'}`}>
                          {task.title}
                        </span>
                        {task.isPersonal ? (
                          <Badge color="text-[#6B6B62]" bg="bg-[#F0EFE8]">Personal</Badge>
                        ) : (
                          <Badge color="text-amber-700" bg="bg-amber-50">Assigned</Badge>
                        )}
                        {task.recurring && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#A8A89F]">
                            <Repeat size={11} /> Recurring
                          </span>
                        )}
                      </div>
                      {task.notes && <p className="text-sm text-[#6B6B62] mt-0.5">{task.notes}</p>}
                      {task.dueAt && (
                        <p className="text-xs text-[#A8A89F] mt-0.5">
                          Due {formatDate(task.dueAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {task.isPersonal && (
                      <button
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete reminder"
                        className="text-[#A8A89F] hover:text-red-600 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Daily check-in (private) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smile size={16} className="text-[#1B1B16]" />
                <h2 className="font-bold text-[#1B1B16]">Daily Check-in</h2>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B6B62] bg-[#F0EFE8] px-2 py-0.5 rounded-full">
                <Lock size={10} /> Private
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-[#A8A89F] mb-3">Only you can see your check-ins. How are you feeling today?</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    mood === m.value
                      ? 'border-[#E4C654] bg-[#E4C654]/10 text-[#1B1B16]'
                      : 'border-[#E8E8E4] text-[#6B6B62] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <span className="text-xl leading-none">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <textarea
              value={checkinNote}
              onChange={(e) => setCheckinNote(e.target.value)}
              placeholder="Add a private note (optional)"
              rows={2}
              className={`${inputClass} resize-none mb-3`}
            />
            <Button size="sm" onClick={submitCheckin} disabled={savingCheckin || !mood} className="w-full">
              {savingCheckin ? 'Saving…' : 'Save check-in'}
            </Button>

            {checkins.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#6B6B62] uppercase tracking-wide mb-2">Recent</p>
                <div className="flex flex-col divide-y divide-[#F0EFE8]">
                  {checkins.slice(0, 6).map((c) => {
                    const meta = moodMeta(c.mood);
                    return (
                      <div key={c.id} className="flex items-start gap-2 py-2">
                        <span className="text-lg leading-none">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1B1B16]">{meta.label}</span>
                            <span className="text-xs text-[#A8A89F]">
                              {formatDate(c.createdAt, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {c.note && <p className="text-sm text-[#6B6B62] mt-0.5">{c.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-[#1B1B16]" />
            <h2 className="font-bold text-[#1B1B16]">My Notes</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Jot down a quick note…"
              rows={2}
              className={`${inputClass} resize-none flex-1`}
            />
            <Button size="sm" onClick={addNote} disabled={savingNote || !noteContent.trim()} className="sm:self-start">
              <Plus size={14} /> {savingNote ? 'Adding…' : 'Add'}
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 bg-[#F0EFE8] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-[#A8A89F] text-center py-6">No notes yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start gap-2 p-3 rounded-lg bg-[#FAFAF8] border border-[#E8E8E4]">
                  <p className="flex-1 min-w-0 text-sm text-[#1B1B16] whitespace-pre-wrap break-words">{n.content}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={() => deleteNote(n.id)}
                      aria-label="Delete note"
                      className="text-[#A8A89F] hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="text-[10px] text-[#A8A89F]">{formatDate(n.updatedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
