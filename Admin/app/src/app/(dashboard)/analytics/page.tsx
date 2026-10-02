'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, TrendingUp, Users, BookOpen, DollarSign } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
// TODO: fetch from /admin/analytics when endpoint provides this data
import { MOCK_TOP_VENDORS, MOCK_CATEGORY_SPLIT } from '@/lib/mock-data';
import { api } from '@/lib/api';

interface DailyEntry {
  date: string;
  revenue: number;
  bookings: number;
  newUsers: number;
}

interface AnalyticsData {
  revenue: { total: number; today: number; thisWeek: number; thisMonth: number };
  bookings: { total: number; today: number; thisWeek: number; thisMonth: number };
  users: { total: number; newThisWeek: number; newThisMonth: number };
  vendors: { total: number; pending: number; approved: number; suspended: number };
  daily: DailyEntry[];
}

const COLORS = ['#E4C654', '#1A1A14', '#6B6B62', '#A8A89F', '#C9AD3A', '#D4D4CF'];

const DATE_RANGES = ['Last 7 days', 'Last 14 days', 'Last 30 days'];
const CITIES = ['All cities', 'Miami', 'Miami Beach', 'Fort Lauderdale', 'Coral Gables'];
const CATEGORIES = ['All categories', 'Facial & Skin', 'Massage & Wellness', 'Lashes & Brows', 'Waxing', 'Nails'];

function KpiCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#F5F4F0] flex items-center justify-center text-[#6B6B62]">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-black text-[#1A1A14]">{value}</p>
      <p className="text-sm font-medium text-[#1A1A14] mt-0.5">{label}</p>
      <p className="text-xs text-[#A8A89F] mt-0.5">{sub}</p>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('Last 30 days');
  const [city, setCity] = useState('All cities');
  const [category, setCategory] = useState('All categories');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.get<AnalyticsData>('/admin/analytics')
      .then(data => setAnalytics(data))
      .finally(() => setLoading(false));
  }, []);

  const rangeMap: Record<string, number> = { 'Last 7 days': 7, 'Last 14 days': 14, 'Last 30 days': 30 };
  const days = rangeMap[range] ?? 30;
  const data = (analytics?.daily ?? []).slice(-days);

  const totalRevenue = analytics?.revenue?.thisMonth ?? 0;
  const totalBookings = analytics?.bookings?.thisMonth ?? 0;
  const totalNewUsers = analytics?.users?.newThisMonth ?? 0;
  const avgRevPerBooking = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  function downloadCSV() {
    const daily = analytics?.daily ?? [];
    const rows = [['Date', 'Revenue', 'Bookings', 'New Users'], ...daily.map(d => [d.date, d.revenue, d.bookings, d.newUsers])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'teddy_platform_data.csv'; a.click();
    URL.revokeObjectURL(url);
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
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Period', value: range, onChange: setRange, options: DATE_RANGES },
          { label: 'City', value: city, onChange: setCity, options: CITIES },
          { label: 'Category', value: category, onChange: setCategory, options: CATEGORIES },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-sm text-[#6B6B62] font-medium">{f.label}</span>
            <select value={f.value} onChange={e => f.onChange(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-[#E4E4E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#E4C654] text-[#1A1A14]">
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <Button variant="outline" size="sm" className="ml-auto gap-2" onClick={downloadCSV}>
          <Download size={13} /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Platform Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`${range}`} icon={<DollarSign size={17} />} />
        <KpiCard label="Total Bookings" value={totalBookings.toLocaleString()} sub={`${range}`} icon={<BookOpen size={17} />} />
        <KpiCard label="New Users" value={totalNewUsers.toLocaleString()} sub={`${range}`} icon={<Users size={17} />} />
        <KpiCard label="Avg Rev / Booking" value={`$${avgRevPerBooking}`} sub="Platform average" icon={<TrendingUp size={17} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="font-bold text-[#1A1A14]">Revenue Trend</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E4C654" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E4C654" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} interval={Math.floor(days / 6)} />
                <YAxis tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E4E0' }} />
                <Area type="monotone" dataKey="revenue" stroke="#E4C654" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category split — TODO: fetch from /admin/analytics when endpoint provides this data */}
        <Card>
          <CardHeader><h2 className="font-bold text-[#1A1A14]">Revenue by Category</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={MOCK_CATEGORY_SPLIT} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name" paddingAngle={3}>
                  {MOCK_CATEGORY_SPLIT.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, 'Share']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {MOCK_CATEGORY_SPLIT.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[#6B6B62]">{c.name}</span>
                  </div>
                  <span className="font-semibold text-[#1A1A14]">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bookings + Users bar chart */}
      <Card>
        <CardHeader><h2 className="font-bold text-[#1A1A14]">Daily Bookings &amp; New Users</h2></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} interval={Math.floor(days / 6)} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E4E0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="bookings" name="Bookings" fill="#1A1A14" radius={[3, 3, 0, 0]} />
              <Bar dataKey="newUsers" name="New Users" fill="#E4C654" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Top vendors — TODO: fetch from /admin/analytics when endpoint provides this data */}
      <Card>
        <CardHeader><h2 className="font-bold text-[#1A1A14]">Top Vendors — 30 Days</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E4E0] bg-[#FAFAF8]">
                {['#', 'Vendor', 'City', 'Revenue', 'Bookings', 'Avg Rating'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E0]">
              {MOCK_TOP_VENDORS.map((v, i) => (
                <tr key={v.name} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-4 py-3 text-[#A8A89F] font-medium">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-[#1A1A14]">{v.name}</td>
                  <td className="px-4 py-3 text-[#6B6B62]">{v.city}</td>
                  <td className="px-4 py-3 font-semibold text-[#1A1A14]">${v.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#6B6B62]">{v.bookings}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[#E4C654]">★</span>
                      <span className="font-semibold text-[#1A1A14]">{v.rating}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
