'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ListOrdered, BellRing, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

import { api } from '@/lib/api';

interface WaitlistEntry {
  id: string;
  position: number;
  requestedStartsAt: string;
  notifiedAt?: string | null;
  booking: {
    id: string;
    status: string;
    client: { firstName: string; lastName: string };
    service: { name: string };
  } | null;
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<WaitlistEntry[]>('/vendors/me/waitlist');
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group by requested time.
  const groups = new Map<string, WaitlistEntry[]>();
  for (const e of entries) {
    const key = e.requestedStartsAt;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(e);
  }
  const sortedKeys = Array.from(groups.keys()).sort();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B1B16]">Waitlist</h2>
        <p className="text-sm text-[#6B6B62] mt-0.5">{entries.length} waiting · notified when a slot opens</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-[#A8A89F]">
          <ListOrdered size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No one on the waitlist.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sortedKeys.map(key => {
            const group = groups.get(key)!.slice().sort((a, b) => a.position - b.position);
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#1B1B16]">
                  <Clock size={14} className="text-[#6B6B62]" />
                  {format(parseISO(key), 'EEEE, MMM d · h:mm a')}
                </div>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E8E8E4] bg-[#FAFAF8]">
                          {['#', 'Client', 'Service', 'Notified'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E4]">
                        {group.map(e => (
                          <tr key={e.id} className="hover:bg-[#FAFAF8] transition-colors">
                            <td className="px-4 py-3 font-semibold text-[#1B1B16]">{e.position}</td>
                            <td className="px-4 py-3 font-medium text-[#1B1B16]">
                              {e.booking ? `${e.booking.client.firstName} ${e.booking.client.lastName}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-[#6B6B62]">{e.booking?.service.name ?? '—'}</td>
                            <td className="px-4 py-3">
                              {e.notifiedAt ? (
                                <Badge color="text-green-700" bg="bg-green-50">
                                  <BellRing size={11} className="mr-1" /> {format(parseISO(e.notifiedAt), 'MMM d, h:mm a')}
                                </Badge>
                              ) : (
                                <Badge color="text-[#6B6B62]" bg="bg-[#F0EFE8]">Not notified</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
