'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, ShieldAlert, ShieldOff, AlertTriangle, RotateCcw, BookOpen, DollarSign, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { USER_STATUS_META, type AdminUser, type UserStatus } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  isBanned: boolean;
  _count?: { bookings?: number };
}

function mapApiUser(u: ApiUser): AdminUser {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    phone: u.phone ?? '',
    role: u.role === 'vendor_owner' || u.role === 'vendor_staff' ? 'vendor' : u.role === 'client' ? 'client' : 'staff',
    city: '',
    joinedAt: u.createdAt,
    status: u.isBanned ? 'banned' : 'active',
    totalSpend: 0,
    bookingCount: u._count?.bookings ?? 0,
    openDisputes: 0,
    warningCount: 0,
  };
}

const ROLES = ['all', 'client', 'staff', 'vendor'];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [modal, setModal] = useState<'warn' | 'ban' | null>(null);
  const [warnMsg, setWarnMsg] = useState('');
  const [banReason, setBanReason] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await api.get<ApiUser[]>('/admin/users');
        setUsers(data.map(mapApiUser));
      } catch (err) {
        showToast('Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  function updateUser(id: string, patch: Partial<AdminUser>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...patch } : null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // TODO: no backend endpoint for warnings — local state only
  function handleWarn() {
    if (!selected || !warnMsg.trim()) return;
    updateUser(selected.id, { status: 'warned', warningCount: selected.warningCount + 1 });
    setModal(null); setWarnMsg('');
    showToast(`Warning sent to ${selected.name}`);
  }

  async function handleBan() {
    if (!selected || !banReason.trim()) return;
    try {
      await api.post('/admin/users/' + selected.id + '/ban', { reason: banReason });
      updateUser(selected.id, { status: 'banned' });
      setModal(null); setBanReason('');
      showToast(`${selected.name} banned — all tokens revoked`);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to ban user');
    }
  }

  async function handleRestore(u: AdminUser) {
    try {
      await api.post('/admin/users/' + u.id + '/unban', {});
      updateUser(u.id, { status: 'active' });
      showToast(`${u.name} account restored`);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to restore user');
    }
  }

  const filtered = users.filter(u => {
    const matchRole = role === 'all' || u.role === role;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    return matchRole && matchSearch;
  });

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#E4E4E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]" />
          </div>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-[#E4E4E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] text-[#1A1A14]">
            {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#A8A89F] text-sm">
              <svg className="animate-spin mr-2 h-4 w-4 text-[#A8A89F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading users…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8]">
                    {['User', 'Role', 'City', 'Bookings', 'Total Spend', 'Disputes', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E4E0]">
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-12 text-[#A8A89F] text-sm">No users found</td></tr>
                  )}
                  {filtered.map(u => {
                    const meta = USER_STATUS_META[u.status];
                    return (
                      <tr key={u.id} onClick={() => setSelected(u)}
                        className={cn('cursor-pointer hover:bg-[#FAFAF8] transition-colors', selected?.id === u.id && 'bg-[#FBF6E3]')}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1A1A14]">{u.name}</p>
                          <p className="text-xs text-[#A8A89F]">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-[#6B6B62]">{u.role}</td>
                        <td className="px-4 py-3 text-[#6B6B62]">{u.city}</td>
                        <td className="px-4 py-3 text-[#6B6B62]">{u.bookingCount}</td>
                        <td className="px-4 py-3 font-semibold text-[#1A1A14]">${u.totalSpend.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {u.openDisputes > 0
                            ? <span className="text-red-600 font-semibold">{u.openDisputes}</span>
                            : <span className="text-[#A8A89F]">0</span>}
                        </td>
                        <td className="px-4 py-3"><Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {u.status === 'banned'
                            ? <Button size="sm" variant="outline" onClick={() => handleRestore(u)}><RotateCcw size={12} /> Restore</Button>
                            : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="warning" onClick={() => { setSelected(u); setModal('warn'); }}><AlertTriangle size={12} /></Button>
                                <Button size="sm" variant="danger" onClick={() => { setSelected(u); setModal('ban'); }}><ShieldOff size={12} /></Button>
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A14]">User Profile</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E4C654]/20 flex items-center justify-center font-bold text-sm text-[#1A1A14]">
                  {selected.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A14]">{selected.name}</p>
                  <Badge color={USER_STATUS_META[selected.status].color} bg={USER_STATUS_META[selected.status].bg}>
                    {USER_STATUS_META[selected.status].label}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-sm">
                {[
                  { label: 'Email',    value: selected.email },
                  { label: 'Phone',    value: selected.phone },
                  { label: 'Role',     value: selected.role, capitalize: true },
                  { label: 'City',     value: selected.city },
                  { label: 'Joined',   value: format(new Date(selected.joinedAt), 'MMM d, yyyy') },
                  { label: 'Warnings', value: `${selected.warningCount}` },
                ].map(({ label, value, capitalize }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#6B6B62]">{label}</span>
                    <span className={cn('font-medium text-[#1A1A14]', capitalize && 'capitalize')}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <BookOpen size={14} />, value: selected.bookingCount, label: 'Bookings' },
                  { icon: <DollarSign size={14} />, value: `$${selected.totalSpend}`, label: 'Spent' },
                  { icon: <AlertTriangle size={14} />, value: selected.openDisputes, label: 'Disputes' },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="bg-[#F5F4F0] rounded-xl p-2.5 text-center">
                    <div className="flex justify-center text-[#6B6B62] mb-1">{icon}</div>
                    <p className="text-sm font-bold text-[#1A1A14]">{value}</p>
                    <p className="text-[10px] text-[#A8A89F]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-[#E4E4E0]">
                {selected.status === 'banned' ? (
                  <Button variant="outline" className="w-full" onClick={() => handleRestore(selected)}>
                    <RotateCcw size={14} /> Restore Account
                  </Button>
                ) : (
                  <>
                    <Button variant="warning" className="w-full" onClick={() => setModal('warn')}>
                      <AlertTriangle size={14} /> Send Warning
                    </Button>
                    <Button variant="danger" className="w-full" onClick={() => setModal('ban')}>
                      <ShieldOff size={14} /> Ban User
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Warn modal */}
      {modal === 'warn' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-[#1A1A14] mb-1">Send Warning</h3>
            <p className="text-sm text-[#6B6B62] mb-4">A notification will be sent to {selected.name}.</p>
            <textarea value={warnMsg} onChange={e => setWarnMsg(e.target.value)} placeholder="Warning message…" rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="warning" className="flex-1" disabled={!warnMsg.trim()} onClick={handleWarn}>Send Warning</Button>
            </div>
          </div>
        </div>
      )}

      {/* Ban modal */}
      {modal === 'ban' && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={18} className="text-red-600" />
              <h3 className="text-lg font-bold text-[#1A1A14]">Ban User Account</h3>
            </div>
            <p className="text-sm text-[#6B6B62] mb-1">{selected.name} · {selected.email}</p>
            <p className="text-xs text-red-600 mb-4">All active tokens will be revoked immediately. The user will be unable to log in.</p>
            <textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban (required)…" rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none mb-4" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" disabled={!banReason.trim()} onClick={handleBan}>Confirm Ban</Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A14] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
