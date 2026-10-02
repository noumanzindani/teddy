'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, DollarSign, TrendingUp, BookOpen, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const PERIODS = ['This Week', 'This Month', 'Last Month', 'Custom'] as const;
type Period = (typeof PERIODS)[number];

interface EarningEntry {
  id: string;
  date: string;
  clientName: string;
  service: string;
  gross: number;
  staffShare: number;
  tip: number;
  status: 'paid' | 'pending';
}

interface ApiEarning {
  id: string;
  completedAt: string | null;
  startsAt: string;
  totalAmount: number;
  vendorPayout: number;
  tipAmount?: number;
  service: { name: string };
  client: { firstName: string; lastName: string };
}

function adaptEarning(e: ApiEarning): EarningEntry {
  const dateStr = e.completedAt ?? e.startsAt;
  return {
    id: e.id,
    date: format(new Date(dateStr), 'yyyy-MM-dd'),
    clientName: `${e.client.firstName} ${e.client.lastName}`,
    service: e.service.name,
    gross: e.totalAmount,
    staffShare: Math.round(e.totalAmount * 0.5),
    tip: Number(e.tipAmount ?? 0),
    status: 'paid',
  };
}

function groupByDay(entries: EarningEntry[]) {
  const map: Record<string, number> = {};
  entries.forEach((e) => {
    map[e.date] = (map[e.date] ?? 0) + e.staffShare;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date: format(new Date(date + 'T12:00:00'), 'MMM d'), amount }));
}

export default function EarningsPage() {
  const [period, setPeriod] = useState<Period>('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<ApiEarning[]>('/staff/me/earnings')
      .then((data) => {
        setEarnings(data.map(adaptEarning));
      })
      .catch(() => {
        setEarnings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const filteredEarnings = earnings.filter((e) => {
    const d = new Date(e.date + 'T12:00:00');
    if (period === 'This Week') {
      const monday = new Date(today); monday.setDate(today.getDate() - today.getDay() + 1);
      return d >= monday;
    }
    if (period === 'This Month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    if (period === 'Last Month') {
      const lm = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const ly = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      return d.getMonth() === lm && d.getFullYear() === ly;
    }
    if (period === 'Custom') {
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo && d > new Date(customTo + 'T23:59:59')) return false;
      return true;
    }
    return true;
  });

  const totalTips     = filteredEarnings.reduce((s, e) => s + e.tip, 0);
  const totalEarned   = filteredEarnings.reduce((s, e) => s + e.staffShare + e.tip, 0);
  const totalBookings = filteredEarnings.length;
  const avgPerBooking = totalBookings > 0 ? Math.round(totalEarned / totalBookings) : 0;
  const pending       = filteredEarnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.staffShare, 0);

  const chartData = groupByDay(filteredEarnings);

  function downloadCSV() {
    const rows = [['Date', 'Client', 'Service', 'Gross', 'Your Share', 'Tip', 'Status'],
      ...filteredEarnings.map((e) => [e.date, e.clientName, e.service, `$${e.gross}`, `$${e.staffShare}`, `$${e.tip.toFixed(2)}`, e.status])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'earnings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-[#E4C654]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-[#E8E8E4] rounded-lg p-1">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-[#1B1B16] text-white' : 'text-[#6B6B62] hover:bg-[#F0EFE8]'}`}>
              {p}
            </button>
          ))}
        </div>
        {period === 'Custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
            <span className="text-sm text-[#A8A89F]">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-[#E8E8E4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
          </div>
        )}
        <button onClick={downloadCSV}
          className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-[#E8E8E4] bg-white rounded-lg hover:bg-[#FAFAF8] transition-colors">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Earned',    value: `$${totalEarned.toLocaleString()}`, sub: totalTips > 0 ? `${period} · incl. $${totalTips.toFixed(2)} tips` : period, icon: <DollarSign size={16} />, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Avg per Booking', value: `$${avgPerBooking}`,               sub: `${totalBookings} bookings`, icon: <TrendingUp size={16} />, color: 'text-blue-700',  bg: 'bg-blue-50'  },
          { label: 'Pending Payout',  value: `$${pending.toLocaleString()}`,    sub: 'Awaiting transfer',   icon: <BookOpen size={16} />,   color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map((k) => (
          <Card key={k.label} className={`p-4 border ${k.bg}`}>
            <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center ${k.color} mb-2`}>{k.icon}</div>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-sm font-medium text-[#1B1B16] mt-0.5">{k.label}</p>
            <p className="text-xs text-[#A8A89F] mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><h2 className="font-bold text-[#1B1B16]">Earnings Over Time</h2></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E4C654" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E4C654" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE8" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A89F' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v}`, 'Earned']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E4E4E0' }} />
              <Area type="monotone" dataKey="amount" stroke="#E4C654" strokeWidth={2} fill="url(#earningsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardHeader><h2 className="font-bold text-[#1B1B16]">Per-Booking Breakdown</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E8E4] bg-[#FAFAF8]">
                {['Date', 'Client', 'Service', 'Gross', 'Your Share', 'Tip', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B62] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E4]">
              {filteredEarnings.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-[#A8A89F]">No earnings in this period</td></tr>
              )}
              {filteredEarnings.map((e) => (
                <tr key={e.id} className="hover:bg-[#FAFAF8] transition-colors">
                  <td className="px-4 py-3 text-[#6B6B62] whitespace-nowrap">
                    {format(new Date(e.date + 'T12:00:00'), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1B1B16]">{e.clientName}</td>
                  <td className="px-4 py-3 text-[#6B6B62]">{e.service}</td>
                  <td className="px-4 py-3 text-[#6B6B62]">${e.gross}</td>
                  <td className="px-4 py-3 font-semibold text-[#1B1B16]">${e.staffShare}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">{e.tip > 0 ? `+$${e.tip.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      color={e.status === 'paid' ? 'text-green-700' : 'text-amber-700'}
                      bg={e.status === 'paid' ? 'bg-green-50' : 'bg-amber-50'}>
                      {e.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
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
