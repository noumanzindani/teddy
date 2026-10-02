'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, X, Star, Calendar, Hash, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api, normaliseStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  joinedDate: string;
  totalVisits: number;
  loyaltyPoints: number;
  lastVisit: string;
  nextVisit?: string;
  skinType: string;
  notes: string;
}

interface BookingHistory {
  id: string;
  service: string;
  date: string;
  time: string;
  status: string;
  clientName: string;
}

interface ApiClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  pointsBalance: number;
  tier: string;
}

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  service: { name: string; durationMin: number };
  client: { firstName: string; lastName: string };
}

const TODAY = format(new Date(), 'yyyy-MM-dd');

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [photoTab, setPhotoTab] = useState<'history' | 'photos'>('history');
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoMap, setPhotoMap] = useState<Record<string, { beforeUrl?: string; afterUrl?: string }>>({});
  const [photosLoading, setPhotosLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apiClients, apiBookings] = await Promise.all([
        api.get<ApiClient[]>('/staff/me/clients'),
        api.get<ApiBooking[]>('/staff/me/schedule'),
      ]);

      const mappedBookings: BookingHistory[] = apiBookings.map((b) => {
        const dt = parseISO(b.startsAt);
        return {
          id: b.id,
          service: b.service.name,
          date: format(dt, 'yyyy-MM-dd'),
          time: format(dt, 'HH:mm'),
          status: normaliseStatus(b.status),
          clientName: `${b.client.firstName} ${b.client.lastName}`,
        };
      });

      const mappedClients: Client[] = apiClients.map((c) => {
        const fullName = `${c.firstName} ${c.lastName}`;
        const clientBookings = mappedBookings.filter((b) => b.clientName === fullName);

        const completedBookings = clientBookings.filter((b) => b.status === 'completed');
        const upcomingBookings = clientBookings.filter(
          (b) => b.status === 'upcoming' || b.status === 'in_progress'
        );

        const sortedCompleted = completedBookings
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date));

        const sortedUpcoming = upcomingBookings
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date));

        const lastVisit = sortedCompleted[0]?.date ?? TODAY;
        const nextVisit = sortedUpcoming[0]?.date;

        return {
          id: c.id,
          name: fullName,
          avatar: `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase(),
          email: c.email ?? '',
          phone: '',
          joinedDate: TODAY,
          totalVisits: completedBookings.length,
          loyaltyPoints: c.pointsBalance,
          lastVisit,
          nextVisit,
          skinType: '',
          notes: '',
        };
      });

      setBookings(mappedBookings);
      setClients(mappedClients);
    } catch {
      // silently fail — keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function fetchClientPhotos(client: Client) {
    const clientBookings = bookings.filter((b) => b.clientName === client.name);
    if (clientBookings.length === 0) return;
    setPhotosLoading(true);
    const results: Record<string, { beforeUrl?: string; afterUrl?: string }> = {};
    await Promise.allSettled(
      clientBookings.map(async (b) => {
        const photos = await api.get<{ beforeUrl?: string; afterUrl?: string }[]>(`/media/before-after/${b.id}`);
        if (photos.length > 0) results[b.id] = photos[0];
      })
    );
    setPhotoMap(results);
    setPhotosLoading(false);
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const clientAppts = selected
    ? bookings
        .filter((b) => b.clientName === selected.name)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className="flex gap-6 h-full">
      {/* Client list */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A89F]" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name or email…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[#E8E8E4] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F]"
          />
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E8E4] bg-[#FAFAF8]">
                    {['Client', 'Skin Type', 'Total Visits', 'Loyalty Pts', 'Last Visit', 'Next Visit', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E4]">
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-[#A8A89F]">No clients found</td></tr>
                  )}
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => { setSelected(c); setPhotoTab('history'); setPhotoMap({}); }}
                      className={cn('cursor-pointer hover:bg-[#FAFAF8] transition-colors', selected?.id === c.id && 'bg-[#FBF6E3]')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xs font-bold text-[#1B1B16] shrink-0">
                            {c.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1B1B16]">{c.name}</p>
                            <p className="text-xs text-[#A8A89F]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B6B62]">{c.skinType || '—'}</td>
                      <td className="px-4 py-3 text-[#6B6B62]">{c.totalVisits}</td>
                      <td className="px-4 py-3">
                        <Badge color="text-amber-700" bg="bg-amber-50">{c.loyaltyPoints.toLocaleString()} pts</Badge>
                      </td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">
                        {format(new Date(c.lastVisit + 'T12:00:00'), 'MMM d')}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">
                        {c.nextVisit ? format(new Date(c.nextVisit + 'T12:00:00'), 'MMM d') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-[#6B6B62] hover:text-[#1B1B16] font-medium">View →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between">
              <h3 className="font-semibold text-[#1B1B16]">Client Profile</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62]"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-base font-bold text-[#1B1B16] shrink-0">
                  {selected.avatar}
                </div>
                <div>
                  <p className="font-bold text-[#1B1B16]">{selected.name}</p>
                  <p className="text-xs text-[#6B6B62]">{selected.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Hash size={12} />, label: 'Visits',  value: selected.totalVisits },
                  { icon: <Star size={12} />, label: 'Points',  value: selected.loyaltyPoints.toLocaleString() },
                  { icon: <Calendar size={12} />, label: 'Since', value: format(new Date(selected.joinedDate + 'T12:00:00'), 'MMM yy') },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-[#FAFAF8] rounded-xl p-2.5 text-center">
                    <div className="flex justify-center text-[#A8A89F] mb-1">{icon}</div>
                    <p className="text-sm font-bold text-[#1B1B16]">{value}</p>
                    <p className="text-xs text-[#A8A89F]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="text-sm"><span className="font-medium text-[#1B1B16]">Skin type: </span><span className="text-[#6B6B62]">{selected.skinType || '—'}</span></div>

              {selected.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-amber-700">Staff Notes</p>
                  {selected.notes}
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 bg-[#F5F4F0] p-1 rounded-lg">
                {(['history', 'photos'] as const).map((t) => (
                  <button key={t} onClick={() => { setPhotoTab(t); if (t === 'photos' && selected) fetchClientPhotos(selected); }}
                    className={cn('flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize',
                      photoTab === t ? 'bg-white text-[#1B1B16] shadow-sm' : 'text-[#6B6B62] hover:text-[#1B1B16]')}>
                    {t === 'history' ? 'Booking History' : 'Before/After'}
                  </button>
                ))}
              </div>

              {photoTab === 'history' && (
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {clientAppts.length === 0 && <p className="text-xs text-[#A8A89F] text-center py-4">No bookings found</p>}
                  {clientAppts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-[#FAFAF8] rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-[#1B1B16]">{a.service}</p>
                        <p className="text-xs text-[#A8A89F]">{format(new Date(a.date + 'T12:00:00'), 'MMM d, yyyy')} · {a.time}</p>
                      </div>
                      <Badge color={a.status === 'completed' ? 'text-green-700' : a.status === 'no_show' ? 'text-red-700' : 'text-blue-700'}
                        bg={a.status === 'completed' ? 'bg-green-50' : a.status === 'no_show' ? 'bg-red-50' : 'bg-blue-50'}>
                        {a.status === 'no_show' ? 'No-show' : a.status === 'completed' ? 'Done' : 'Upcoming'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {photoTab === 'photos' && (
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                  {photosLoading && (
                    <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-[#E4C654]" /></div>
                  )}
                  {!photosLoading && Object.keys(photoMap).length === 0 && (
                    <p className="text-xs text-[#A8A89F] text-center py-4">No photos available</p>
                  )}
                  {!photosLoading && clientAppts.filter((a) => photoMap[a.id]).map((a) => {
                    const p = photoMap[a.id];
                    return (
                      <div key={a.id} className="flex flex-col gap-1">
                        <p className="text-xs font-semibold text-[#6B6B62]">{a.service} · {format(new Date(a.date + 'T12:00:00'), 'MMM d')}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {p.beforeUrl && (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.beforeUrl} alt="before" className="w-full h-20 object-cover rounded-xl" />
                              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">Before</span>
                            </div>
                          )}
                          {p.afterUrl && (
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.afterUrl} alt="after" className="w-full h-20 object-cover rounded-xl" />
                              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">After</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
