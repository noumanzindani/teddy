'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, ToggleLeft, ToggleRight, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  pointsBalance?: number;
  tier?: string | null;
  createdAt?: string;
  canBookOnline?: boolean;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Client[]>('/vendors/me/clients');
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleBooking(c: Client) {
    // `canBookOnline` defaults to true when the API omits it.
    const next = !(c.canBookOnline ?? true);
    setSavingId(c.id);
    setClients(prev => prev.map(x => x.id === c.id ? { ...x, canBookOnline: next } : x)); // optimistic
    try {
      await api.patch(`/addons/clients/${c.id}/booking-access`, { canBookOnline: next });
    } catch (err) {
      console.error(err);
      setClients(prev => prev.map(x => x.id === c.id ? { ...x, canBookOnline: !next } : x)); // revert
    } finally {
      setSavingId(null);
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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B1B16]">Clients</h2>
        <p className="text-sm text-[#6B6B62] mt-0.5">{clients.length} clients · manage who can book online</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E8E4] bg-[#FAFAF8]">
                {['Client', 'Email', 'Tier', 'Points', 'Can book online'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E4]">
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#A8A89F] text-sm">
                    <Users size={28} className="mx-auto mb-2 opacity-40" />
                    No clients yet.
                  </td>
                </tr>
              )}
              {clients.map(c => {
                const canBook = c.canBookOnline ?? true;
                return (
                  <tr key={c.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E4C654]/30 flex items-center justify-center text-[#1B1B16] font-bold text-xs shrink-0">
                          {`${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1B1B16]">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B62]">{c.email}</td>
                    <td className="px-4 py-3">
                      {c.tier ? <Badge color="text-[#6B6B62]" bg="bg-[#F0EFE8]">{c.tier}</Badge> : <span className="text-[#A8A89F]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6B6B62]">
                      <span className="inline-flex items-center gap-1"><Star size={12} className="text-[#E4C654]" />{c.pointsBalance ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleBooking(c)}
                        disabled={savingId === c.id}
                        title={canBook ? 'Online booking enabled' : 'Online booking disabled'}
                        className={cn('flex items-center gap-2 text-sm font-medium transition-colors', savingId === c.id && 'opacity-50')}
                      >
                        {canBook
                          ? <ToggleRight size={22} className="text-[#E4C654]" />
                          : <ToggleLeft size={22} className="text-[#A8A89F]" />}
                        <span className={canBook ? 'text-[#1B1B16]' : 'text-[#A8A89F]'}>{canBook ? 'Allowed' : 'Blocked'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
