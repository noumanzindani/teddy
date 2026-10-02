'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, Users, AlertTriangle, Banknote, Star, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

function KpiCard({ label, value, sub, icon, href, accent }: {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; href: string; accent: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-black text-[#1A1A14]">{value}</p>
        <p className="text-sm font-semibold text-[#1A1A14] mt-0.5">{label}</p>
        <p className="text-xs text-[#A8A89F] mt-0.5">{sub}</p>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pendingVendors, setPendingVendors] = useState(0);
  const [openDisputes, setOpenDisputes] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState<{ id: string; status: string; amount: number }[]>([]);
  const [pendingPayoutAmount, setPendingPayoutAmount] = useState(0);
  const [flaggedReviews, setFlaggedReviews] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [attentionPayouts, setAttentionPayouts] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<AnalyticsData>('/admin/analytics'),
      api.get<{ id: string; status: string }[]>('/admin/vendors/pending'),
      api.get<{ id: string; status: string }[]>('/admin/disputes'),
      api.get<{ id: string; status: string; amount: number }[]>('/admin/payouts'),
      api.get<{ id: string; status: string }[]>('/admin/reviews/flagged'),
      api.get<{ id: string; role: string }[]>('/admin/users'),
    ])
      .then(([analyticsData, vendors, disputes, payouts, reviews, users]) => {
        setAnalytics(analyticsData);

        const pending = vendors.filter(v => v.status === 'PENDING' || v.status === 'pending');
        setPendingVendors(pending.length);

        const open = disputes.filter(d => d.status === 'open' || d.status === 'OPEN');
        setOpenDisputes(open.length);

        const pendingP = payouts.filter(p => p.status === 'pending' || p.status === 'PENDING');
        setPendingPayouts(pendingP);
        setPendingPayoutAmount(pendingP.reduce((s, p) => s + p.amount, 0));

        const needAttention = payouts.filter(p =>
          p.status === 'flagged' || p.status === 'FLAGGED' ||
          p.status === 'failed' || p.status === 'FAILED'
        );
        setAttentionPayouts(needAttention.length);

        setFlaggedReviews(reviews.length);
        setTotalUsers(users.length);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = analytics?.revenue?.thisMonth ?? 0;
  const todayRevenue = analytics?.revenue?.today ?? 0;

  const recentActivity = [
    { icon: <Store size={14} />, text: 'Glow Studio Miami applied for vendor approval', time: '1h ago', href: '/vendors', dot: 'bg-amber-400' },
    { icon: <AlertTriangle size={14} />, text: 'New dispute opened — Amara Osei vs Skincuress Salon', time: '3h ago', href: '/disputes', dot: 'bg-red-400' },
    { icon: <Star size={14} />, text: 'Review flagged for abusive language — Ryan Brooks', time: '5h ago', href: '/reviews', dot: 'bg-orange-400' },
    { icon: <Banknote size={14} />, text: 'Payout flagged for manual review — Bare Beauty', time: '6h ago', href: '/payouts', dot: 'bg-orange-400' },
    { icon: <CheckCircle size={14} />, text: 'Serenity Spa payout of $1,746 completed', time: '1d ago', href: '/payouts', dot: 'bg-green-400' },
    { icon: <Users size={14} />, text: 'Ryan Brooks account banned by admin', time: '2d ago', href: '/users', dot: 'bg-gray-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="30-day Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`$${todayRevenue} today`} icon={<TrendingUp size={18} className="text-[#E4C654]" />} href="/analytics" accent="bg-[#E4C654]/20" />
        <KpiCard label="Pending Vendors" value={pendingVendors} sub="Awaiting review" icon={<Store size={18} className="text-amber-600" />} href="/vendors" accent="bg-amber-50" />
        <KpiCard label="Registered Users" value={totalUsers} sub="All roles" icon={<Users size={18} className="text-blue-600" />} href="/users" accent="bg-blue-50" />
        <KpiCard label="Open Disputes" value={openDisputes} sub="Sorted by priority" icon={<AlertTriangle size={18} className="text-red-600" />} href="/disputes" accent="bg-red-50" />
        <KpiCard label="Pending Payouts" value={`$${pendingPayoutAmount.toLocaleString()}`} sub={`${pendingPayouts.length} transfers`} icon={<Banknote size={18} className="text-green-600" />} href="/payouts" accent="bg-green-50" />
        <KpiCard label="Flagged Reviews" value={flaggedReviews} sub="Awaiting moderation" icon={<Star size={18} className="text-orange-600" />} href="/reviews" accent="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending actions */}
        <Card>
          <div className="px-5 py-4 border-b border-[#E4E4E0]">
            <h2 className="font-bold text-[#1A1A14]">Pending Actions</h2>
          </div>
          <CardBody className="flex flex-col gap-3">
            {[
              { label: `${pendingVendors} vendor applications`, sub: 'Awaiting approval decision', href: '/vendors', badge: pendingVendors, badgeColor: 'text-amber-700', badgeBg: 'bg-amber-50' },
              { label: `${openDisputes} open disputes`, sub: 'Sorted by priority and value', href: '/disputes', badge: openDisputes, badgeColor: 'text-red-700', badgeBg: 'bg-red-50' },
              { label: `${flaggedReviews} flagged reviews`, sub: 'Content policy violations', href: '/reviews', badge: flaggedReviews, badgeColor: 'text-orange-700', badgeBg: 'bg-orange-50' },
              { label: `${attentionPayouts} payouts need attention`, sub: 'Flagged or failed transfers', href: '/payouts', badge: attentionPayouts, badgeColor: 'text-red-700', badgeBg: 'bg-red-50' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E4E4E0] hover:bg-[#F5F4F0] transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1A1A14]">{item.label}</p>
                  <p className="text-xs text-[#A8A89F] mt-0.5">{item.sub}</p>
                </div>
                <Badge color={item.badgeColor} bg={item.badgeBg}>{item.badge}</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>

        {/* Recent activity */}
        <Card>
          <div className="px-5 py-4 border-b border-[#E4E4E0]">
            <h2 className="font-bold text-[#1A1A14]">Recent Activity</h2>
          </div>
          <CardBody className="flex flex-col gap-1">
            {recentActivity.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-[#F5F4F0] transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${a.dot} mt-1.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1A1A14] leading-snug">{a.text}</p>
                </div>
                <span className="text-xs text-[#A8A89F] whitespace-nowrap flex items-center gap-1">
                  <Clock size={11} /> {a.time}
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
