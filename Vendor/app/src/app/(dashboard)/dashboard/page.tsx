'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { TrendingUp, CalendarCheck, Clock, DollarSign, Star, AlertCircle, ArrowRight, PackageX } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { STATUS_META } from '@/lib/mock-data';
import { api, normaliseStatus, getVendorId } from '@/lib/api';
import Link from 'next/link';

interface DashboardData {
  todayBookings: ApiBooking[];
  weekBookings: ApiBooking[];
  monthRevenue: number;
  pendingPayouts: number;
}

interface ApiBooking {
  id: string;
  status: string;
  startsAt: string;
  totalAmount: number;
  service: { name: string; durationMin: number };
  client: { firstName: string; lastName: string };
  staffMember: { user: { firstName: string; lastName: string } } | null;
}

interface VendorProfile {
  businessName: string;
  avgRating: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
}

interface ApiReview {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  client: { firstName: string; lastName: string };
  booking: { service: { name: string } | null; staffMember: { user: { firstName: string; lastName: string } } | null };
}

// Word-scale label matching the client feedback options.
function ratingLabel(v: number): { label: string; color: string; bg: string } {
  if (v >= 5) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50' };
  if (v === 4) return { label: 'Good',      color: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (v === 3) return { label: 'Average',   color: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: 'Bad', color: 'text-red-700', bg: 'bg-red-50' };
}

function toFrontendBooking(b: ApiBooking) {
  return {
    id: b.id,
    clientName: `${b.client.firstName} ${b.client.lastName}`,
    service: b.service.name,
    duration: b.service.durationMin,
    time: format(new Date(b.startsAt), 'HH:mm'),
    price: Number(b.totalAmount),
    status: normaliseStatus(b.status),
    staffName: b.staffMember ? `${b.staffMember.user.firstName} ${b.staffMember.user.lastName[0]}.` : '—',
  };
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const vendorId = getVendorId();
    Promise.all([
      api.get<DashboardData>('/vendors/me/dashboard'),
      api.get<VendorProfile>('/vendors/me'),
      vendorId ? api.get<ApiReview[]>(`/reviews/${vendorId}`).catch(() => [] as ApiReview[]) : Promise.resolve([] as ApiReview[]),
      api.get<LowStockProduct[] | { data: LowStockProduct[] }>('/products/low-stock').catch(() => [] as LowStockProduct[]),
    ]).then(([d, v, r, ls]) => {
      setDashboard(d);
      setVendor(v);
      setReviews(r);
      setLowStock(Array.isArray(ls) ? ls : (ls?.data ?? []));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayBookings = (dashboard?.todayBookings ?? []).map(toFrontendBooking);
  const weekBookings  = (dashboard?.weekBookings  ?? []).map(toFrontendBooking);
  const todayRevenue  = todayBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
  const pendingCount  = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;
  const upcomingToday = todayBookings.filter(b => ['confirmed', 'pending', 'in_progress'].includes(b.status));

  const weekCompleted = weekBookings.filter(b => b.status === 'completed').length;
  const weekNoShows   = weekBookings.filter(b => b.status === 'no_show').length;
  const weekRevenue   = weekBookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);

  const KPI_CARDS = [
    { label: "Today's Bookings", value: todayBookings.length, sub: `${todayBookings.filter(b => b.status === 'completed').length} completed`, icon: CalendarCheck, color: 'bg-blue-50 text-blue-600' },
    { label: "Today's Revenue",  value: `$${todayRevenue}`,  sub: 'from completed services', icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Pending Actions',  value: pendingCount,         sub: 'need attention',           icon: Clock,          color: 'bg-amber-50 text-amber-600' },
    { label: 'Avg Rating',       value: vendor?.avgRating.toFixed(1) ?? '—', sub: 'overall', icon: Star, color: 'bg-purple-50 text-purple-600' },
  ];

  const pendingAlerts = todayBookings.filter(b => b.status === 'pending');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1B1B16]">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {vendor?.businessName ?? 'there'} 👋
        </h2>
        <p className="text-sm text-[#6B6B62] mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — here&apos;s your day at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#6B6B62] font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-[#1B1B16] mt-0.5">{value}</p>
                <p className="text-xs text-[#A8A89F]">{sub}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h3 className="font-semibold text-[#1B1B16]">Today&apos;s Schedule</h3>
              <Link href="/bookings" className="text-xs text-[#6B6B62] hover:text-[#1B1B16] flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {upcomingToday.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-[#A8A89F]">
                  <CalendarCheck size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No appointments remaining today</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E8E8E4]">
                  {upcomingToday.map(b => {
                    const meta = STATUS_META[b.status];
                    return (
                      <div key={b.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors">
                        <div className="text-center w-14 shrink-0">
                          <p className="text-sm font-bold text-[#1B1B16]">{b.time}</p>
                          <p className="text-xs text-[#A8A89F]">{b.duration}m</p>
                        </div>
                        <div className="w-px h-10 bg-[#E8E8E4] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1B1B16] truncate">{b.clientName}</p>
                          <p className="text-xs text-[#6B6B62] truncate">{b.service}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                          <p className="text-xs text-[#6B6B62] mt-1">{b.staffName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-[#1B1B16]">Alerts</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-3 py-3">
              {pendingAlerts.length === 0 ? (
                <p className="text-sm text-[#A8A89F]">No pending actions</p>
              ) : pendingAlerts.map(b => (
                <div key={b.id} className="flex gap-3 items-start">
                  <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1B1B16]">Pending booking</p>
                    <p className="text-xs text-[#6B6B62]">{b.clientName} — {b.time} today</p>
                  </div>
                </div>
              ))}
              {dashboard && dashboard.pendingPayouts > 0 && (
                <div className="flex gap-3 items-start">
                  <TrendingUp size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1B1B16]">${dashboard.pendingPayouts.toFixed(0)} pending payout</p>
                    <p className="text-xs text-[#6B6B62]">releasing soon</p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-semibold text-[#1B1B16]">This Week</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {[
                { label: 'Total bookings', value: weekBookings.length },
                { label: 'Completed',      value: weekCompleted },
                { label: 'No-shows',       value: weekNoShows },
                { label: 'Revenue',        value: `$${weekRevenue.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[#6B6B62]">{label}</span>
                  <span className="font-semibold text-[#1B1B16]">{value}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <PackageX size={16} className="text-amber-500" />
              <h3 className="font-semibold text-[#1B1B16]">Low stock</h3>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {lowStock.length === 0 ? (
                <p className="text-sm text-[#A8A89F]">All stocked up ✓</p>
              ) : lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-[#6B6B62] truncate">{p.name}</span>
                  <span className="font-semibold text-amber-600 shrink-0 ml-2">{p.stock} left</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent client feedback */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-semibold text-[#1B1B16]">Recent Feedback</h3>
          <span className="flex items-center gap-1 text-sm">
            <Star size={14} fill="#E4C654" stroke="#E4C654" />
            <span className="font-bold text-[#1B1B16]">{vendor?.avgRating.toFixed(1) ?? '—'}</span>
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {reviews.length === 0 ? (
            <p className="text-sm text-[#A8A89F] text-center py-8">No client feedback yet.</p>
          ) : (
            <div className="divide-y divide-[#F0EFE8]">
              {reviews.slice(0, 8).map((r) => {
                const meta = ratingLabel(r.rating);
                const staff = r.booking.staffMember?.user;
                return (
                  <div key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xs font-bold text-[#1B1B16] shrink-0">
                      {`${r.client.firstName[0] ?? ''}${r.client.lastName[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1B1B16]">{r.client.firstName} {r.client.lastName[0]}.</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} ${meta.bg}`}>{meta.label}</span>
                        {r.booking.service?.name && <span className="text-xs text-[#A8A89F]">· {r.booking.service.name}</span>}
                        {staff && <span className="text-xs text-[#A8A89F]">· {staff.firstName} {staff.lastName[0]}.</span>}
                      </div>
                      {r.body && <p className="text-sm text-[#6B6B62] mt-1">{r.body}</p>}
                    </div>
                    <span className="text-xs text-[#A8A89F] shrink-0">
                      {format(new Date(r.createdAt), 'MMM d')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
