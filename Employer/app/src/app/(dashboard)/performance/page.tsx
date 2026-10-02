'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { GoalsCard } from './GoalsCard';

const PERIODS = ['This Week', 'This Month', 'Last Month'];

// Fallback rating breakdown — shown only until real reviews exist
const RATING_BREAKDOWN = [
  { stars: 5, count: 119 },
  { stars: 4, count: 18  },
  { stars: 3, count: 4   },
  { stars: 2, count: 1   },
  { stars: 1, count: 0   },
];

interface ApiPerformance {
  total: number;
  completed: number;
  noShow: number;
  completionRate: number;
  avgRating: number;
  reviewCount: number;
}

interface ApiReview {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  client: { firstName: string; lastName: string; avatarUrl: string | null };
  booking: { service: { name: string } | null; completedAt: string | null };
}

// Word-scale label + colour matching the client feedback options.
function ratingLabel(v: number): { label: string; color: string; bg: string } {
  if (v >= 5) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50' };
  if (v === 4) return { label: 'Good',      color: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (v === 3) return { label: 'Average',   color: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: 'Bad', color: 'text-red-700', bg: 'bg-red-50' };
}

function StatCard({ label, value, suffix = '', sub, trend, trendDir }: {
  label: string; value: number | string; suffix?: string; sub: string;
  trend?: number; trendDir?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trendDir === 'up' ? TrendingUp : trendDir === 'down' ? TrendingDown : Minus;
  const trendColor = trendDir === 'up' ? 'text-green-600' : trendDir === 'down' ? 'text-red-500' : 'text-[#A8A89F]';

  return (
    <Card className="p-5">
      <p className="text-2xl font-black text-[#1B1B16]">{value}{suffix}</p>
      <p className="text-sm font-medium text-[#1B1B16] mt-0.5">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <p className="text-xs text-[#A8A89F]">{sub}</p>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
            <TrendIcon size={11} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="h-8 w-20 bg-[#F0EFE8] rounded animate-pulse mb-1" />
      <div className="h-4 w-32 bg-[#F0EFE8] rounded animate-pulse mt-0.5" />
      <div className="h-3 w-24 bg-[#F0EFE8] rounded animate-pulse mt-1" />
    </Card>
  );
}

export default function PerformancePage() {
  const [period, setPeriod] = useState('This Month');
  const [perf, setPerf] = useState<ApiPerformance | null>(null);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const [data, revs] = await Promise.all([
        api.get<ApiPerformance>('/staff/me/performance'),
        api.get<ApiReview[]>('/staff/me/reviews').catch(() => [] as ApiReview[]),
      ]);
      setPerf(data);
      setReviews(revs);
    } catch {
      // silently fail — keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  // Real rating breakdown from the fetched reviews (falls back to sample data
  // only when this staff member has no reviews yet).
  const realBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const hasReviews = reviews.length > 0;
  const breakdown = hasReviews ? realBreakdown : RATING_BREAKDOWN;
  const totalRatings = breakdown.reduce((s, r) => s + r.count, 0);

  // Use dynamic avgRating for the rating breakdown display if available
  const displayRating = perf ? perf.avgRating.toFixed(1) : '—';

  return (
    <div className="flex flex-col gap-6">
      {/* Period selector */}
      <div className="flex gap-1 bg-white border border-[#E8E8E4] rounded-lg p-1 self-start">
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-[#1B1B16] text-white' : 'text-[#6B6B62] hover:bg-[#F0EFE8]'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Avg Rating"
              value={perf ? perf.avgRating.toFixed(1) : '—'}
              suffix="/5"
              sub={perf ? `${perf.reviewCount} reviews` : '—'}
            />
            <StatCard
              label="Completion Rate"
              value={perf ? Math.round(perf.completionRate) : '—'}
              suffix="%"
              sub="Appointments completed"
            />
            <StatCard
              label="Total Bookings"
              value={perf ? perf.total : '—'}
              sub={period}
            />
          </>
        )}
      </div>

      {/* Performance goals */}
      <GoalsCard />

      <div className="grid grid-cols-1 gap-6">
        {/* Rating breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1B1B16]">Rating Breakdown</h2>
              <div className="flex items-center gap-1">
                <Star size={14} fill="#E4C654" stroke="#E4C654" />
                <span className="text-sm font-bold text-[#1B1B16]">{displayRating}</span>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3">
              {breakdown.slice().sort((a, b) => b.stars - a.stars).map((r) => {
                const pct = totalRatings > 0 ? Math.round((r.count / totalRatings) * 100) : 0;
                return (
                  <div key={r.stars} className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5 w-16 shrink-0">
                      {Array.from({ length: r.stars }).map((_, i) => (
                        <Star key={i} size={11} fill="#E4C654" stroke="#E4C654" />
                      ))}
                    </div>
                    <div className="flex-1 h-2 bg-[#F0EFE8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#E4C654] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-[#6B6B62] w-8 text-right shrink-0">{r.count}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[#A8A89F] text-center mt-4">
              {perf ? perf.reviewCount : totalRatings} total reviews
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Recent client feedback */}
      <Card>
        <CardHeader><h2 className="font-bold text-[#1B1B16]">Recent Feedback</h2></CardHeader>
        <CardBody>
          {reviews.length === 0 ? (
            <p className="text-sm text-[#A8A89F] text-center py-6">No client feedback yet — it will appear here after completed services.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#F0EFE8]">
              {reviews.slice(0, 12).map((r) => {
                const meta = ratingLabel(r.rating);
                const initials = `${r.client.firstName[0] ?? ''}${r.client.lastName[0] ?? ''}`.toUpperCase();
                return (
                  <div key={r.id} className="flex items-start gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-[#E4C654]/20 flex items-center justify-center text-xs font-bold text-[#1B1B16] shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1B1B16]">{r.client.firstName} {r.client.lastName[0]}.</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color} ${meta.bg}`}>{meta.label}</span>
                        {r.booking.service?.name && (
                          <span className="text-xs text-[#A8A89F]">· {r.booking.service.name}</span>
                        )}
                      </div>
                      {r.body && <p className="text-sm text-[#6B6B62] mt-1">{r.body}</p>}
                    </div>
                    <span className="text-xs text-[#A8A89F] shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
