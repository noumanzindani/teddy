'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, CalendarCheck, UserX, XCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { format, subDays, startOfWeek, getISOWeek } from 'date-fns';
import { api, normaliseStatus } from '@/lib/api';
import { cn } from '@/lib/utils';

type Range = '7d' | '30d' | '4w';

const RANGE_OPTS: { key: Range; label: string }[] = [
  { key: '7d',  label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '4w',  label: 'By week' },
];

const PIE_COLORS = ['#E4C654', '#1B1B16', '#A8A89F', '#6B6B62', '#C9AD3A', '#F0D87A', '#333328', '#E8E8E4'];

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  totalAmount: number;
  service: { name: string };
}

interface DailyRevenue { date: string; revenue: number; bookings: number; }
interface ServiceRevenue { service: string; revenue: number; count: number; }
interface WeeklyStats { week: string; revenue: number; completed: number; noShow: number; cancelled: number; }

function buildAnalytics(bookings: ApiBooking[], range: Range) {
  const now = new Date();
  const days = range === '7d' ? 7 : 30;

  // Daily revenue (last N days)
  const dailyMap: Record<string, { revenue: number; bookings: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = format(subDays(now, i), range === '4w' ? "'W'w" : 'MMM d');
    dailyMap[d] = { revenue: 0, bookings: 0 };
  }

  const serviceMap: Record<string, { revenue: number; count: number }> = {};
  const weekMap: Record<string, WeeklyStats> = {};

  bookings.forEach(b => {
    const date = new Date(b.startsAt);
    const status = normaliseStatus(b.status);
    const amount = Number(b.totalAmount);
    const dayKey = format(date, range === '4w' ? "'W'w" : 'MMM d');
    const weekKey = `W${getISOWeek(date)}`;

    if (dayKey in dailyMap && (status === 'completed' || status === 'confirmed')) {
      dailyMap[dayKey].revenue += amount;
      dailyMap[dayKey].bookings += 1;
    }

    if (status === 'completed') {
      const svc = b.service.name;
      if (!serviceMap[svc]) serviceMap[svc] = { revenue: 0, count: 0 };
      serviceMap[svc].revenue += amount;
      serviceMap[svc].count += 1;
    }

    if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, revenue: 0, completed: 0, noShow: 0, cancelled: 0 };
    if (status === 'completed') { weekMap[weekKey].revenue += amount; weekMap[weekKey].completed += 1; }
    if (status === 'no_show')   weekMap[weekKey].noShow += 1;
    if (status === 'cancelled') weekMap[weekKey].cancelled += 1;
  });

  const daily: DailyRevenue[] = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v }));
  const services: ServiceRevenue[] = Object.entries(serviceMap)
    .map(([service, v]) => ({ service, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
  const weekly: WeeklyStats[] = Object.values(weekMap).slice(-4);

  return { daily, services, weekly };
}

export default function AnalyticsPage() {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.get<{ bookings: ApiBooking[] }>('/vendors/me/bookings?limit=500');
      setBookings(data.bookings ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const { daily, services, weekly } = buildAnalytics(bookings, range);

  const totalRevenue   = daily.reduce((s, d) => s + d.revenue, 0);
  const totalBookings  = daily.reduce((s, d) => s + d.bookings, 0);
  const avgPerBooking  = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  const totalNoShow    = bookings.filter(b => normaliseStatus(b.status) === 'no_show').length;
  const totalCancelled = bookings.filter(b => normaliseStatus(b.status) === 'cancelled').length;

  const chartData = range === '4w' ? weekly.map(w => ({ date: w.week, revenue: w.revenue, bookings: w.completed })) : daily;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1B1B16]">Analytics</h2>
          <p className="text-sm text-[#6B6B62] mt-0.5">Performance overview for your salon</p>
        </div>
        <div className="flex gap-1 bg-[#F0EFE8] rounded-xl p-1">
          {RANGE_OPTS.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                range === r.key ? 'bg-white text-[#1B1B16] shadow-sm' : 'text-[#6B6B62] hover:text-[#1B1B16]'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-50 text-green-600', trend: null },
          { label: 'Total Bookings', value: totalBookings, icon: CalendarCheck, color: 'bg-blue-50 text-blue-600', trend: null },
          { label: 'Avg Per Booking', value: `$${avgPerBooking}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600', trend: null },
          { label: 'No-shows', value: totalNoShow, icon: UserX, color: 'bg-red-50 text-red-600', trend: null },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${color} shrink-0`}><Icon size={18} /></div>
              <div>
                <p className="text-xs text-[#6B6B62] font-medium uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-[#1B1B16] mt-0.5">{value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-[#1B1B16]">Revenue Over Time</h3>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E4C654" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#E4C654" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#E4C654" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>

        {/* Service breakdown pie */}
        <Card>
          <CardHeader><h3 className="font-semibold text-[#1B1B16]">Revenue by Service</h3></CardHeader>
          <CardBody>
            {services.length === 0 ? (
              <p className="text-sm text-[#A8A89F] text-center py-8">No completed bookings yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={services.slice(0, 8)} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      dataKey="revenue" nameKey="service" paddingAngle={2}>
                      {services.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
                  {services.slice(0, 5).map((s, i) => (
                    <div key={s.service} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[#6B6B62] truncate max-w-28">{s.service}</span>
                      </div>
                      <span className="font-semibold text-[#1B1B16]">${s.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bookings bar chart */}
      <Card>
        <CardHeader><h3 className="font-semibold text-[#1B1B16]">Bookings Volume</h3></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E8E8E4', fontSize: 12 }} />
              <Bar dataKey="bookings" fill="#E4C654" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cancelled bookings', value: totalCancelled, icon: XCircle, color: 'text-red-500' },
          { label: 'No-show rate', value: totalBookings > 0 ? `${Math.round((totalNoShow / totalBookings) * 100)}%` : '—', icon: UserX, color: 'text-amber-500' },
          { label: 'Top service', value: services[0]?.service ?? '—', icon: CalendarCheck, color: 'text-green-500' },
          { label: 'Top service revenue', value: services[0] ? `$${services[0].revenue.toLocaleString()}` : '—', icon: DollarSign, color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-center gap-3">
              <Icon size={16} className={cn('shrink-0', color)} />
              <div className="min-w-0">
                <p className="text-xs text-[#6B6B62]">{label}</p>
                <p className="text-sm font-bold text-[#1B1B16] truncate">{value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
