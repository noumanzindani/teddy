'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Star, EyeOff, Eye, Flag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { type FlaggedReview, type ReviewStatus } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ApiReview {
  id: string;
  rating: number;
  text: string;
  status: string;
  flagReason?: string | null;
  vendor: { id: string; businessName: string };
  user: { id: string; firstName: string; lastName: string };
  booking: { id: string; service: { name: string } };
  createdAt: string;
}

function mapApiReview(r: ApiReview): FlaggedReview {
  return {
    id: r.id,
    clientName: `${r.user.firstName} ${r.user.lastName}`,
    vendorName: r.vendor.businessName,
    service: r.booking.service.name,
    rating: r.rating,
    body: r.text,
    flagReason: r.flagReason ?? 'Flagged for review',
    status: r.status.toLowerCase() as ReviewStatus,
    // postedAt used as both flaggedAt and bookingDate for display; API only gives createdAt
    flaggedAt: format(new Date(r.createdAt), 'yyyy-MM-dd'),
    bookingDate: format(new Date(r.createdAt), 'yyyy-MM-dd'),
  };
}

const STATUS_META: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
  flagged: { label: 'Flagged',  color: 'text-orange-700', bg: 'bg-orange-50' },
  visible: { label: 'Visible',  color: 'text-green-700',  bg: 'bg-green-50'  },
  hidden:  { label: 'Hidden',   color: 'text-gray-500',   bg: 'bg-gray-100'  },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'visible', label: 'Visible' },
  { key: 'hidden', label: 'Hidden' },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('flagged');
  const [selected, setSelected] = useState<FlaggedReview | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get<ApiReview[]>('/admin/reviews/flagged')
      .then(data => setReviews(data.map(mapApiReview)))
      .catch(e => showToast('Failed to load reviews: ' + e.message))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function updateReview(id: string, status: ReviewStatus) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  }

  async function handleKeep(r: FlaggedReview) {
    try {
      await api.post('/admin/reviews/' + r.id + '/show', {});
      updateReview(r.id, 'visible');
      showToast(`Review by ${r.clientName} kept visible`);
    } catch (e: unknown) {
      showToast('Error: ' + (e instanceof Error ? e.message : 'Request failed'));
    }
  }

  async function handleHide(r: FlaggedReview) {
    try {
      await api.post('/admin/reviews/' + r.id + '/hide', {});
      updateReview(r.id, 'hidden');
      showToast(`Review hidden — content policy notification sent to ${r.clientName}`);
    } catch (e: unknown) {
      showToast('Error: ' + (e instanceof Error ? e.message : 'Request failed'));
    }
  }

  const filtered = reviews.filter(r => tab === 'all' || r.status === tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#A8A89F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading reviews…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key ? 'bg-[#1A1A14] text-white' : 'bg-white border border-[#E4E4E0] text-[#6B6B62] hover:bg-[#F5F4F0]')}>
              {t.label}
              <span className={cn('ml-1.5 text-xs', tab === t.key ? 'text-white/60' : 'text-[#A8A89F]')}>
                {reviews.filter(r => t.key === 'all' ? true : r.status === t.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <Card className="flex flex-col items-center justify-center py-16 text-[#A8A89F]">
              <Flag size={32} className="mb-2 opacity-30" />
              <p className="font-medium">No reviews in this category</p>
            </Card>
          )}
          {filtered.map(r => {
            const meta = STATUS_META[r.status];
            return (
              <Card key={r.id} onClick={() => setSelected(r)}
                className={cn('p-5 cursor-pointer hover:shadow-md transition-shadow', selected?.id === r.id && 'ring-2 ring-[#E4C654]')}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1A1A14]">{r.clientName}</p>
                      <span className="text-[#A8A89F] text-xs">→</span>
                      <p className="text-sm text-[#6B6B62]">{r.vendorName}</p>
                      <span className="text-[#E4E4E0]">·</span>
                      <p className="text-sm text-[#6B6B62]">{r.service}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} size={12} fill={n <= r.rating ? '#E4C654' : 'transparent'} stroke={n <= r.rating ? '#E4C654' : '#D4D4CF'} />
                      ))}
                      <span className="text-xs text-[#A8A89F] ml-1">{format(new Date(r.bookingDate), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                  </div>
                </div>

                <p className="text-sm text-[#1A1A14] leading-relaxed mb-3">&ldquo;{r.body}&rdquo;</p>

                <div className="flex items-center justify-between">
                  <div className="bg-orange-50 rounded-lg px-3 py-1.5 text-xs text-orange-700 font-medium flex items-center gap-1.5">
                    <Flag size={11} /> {r.flagReason}
                  </div>
                  {r.status === 'flagged' && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleKeep(r)}>
                        <Eye size={12} /> Keep Visible
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleHide(r)}>
                        <EyeOff size={12} /> Hide
                      </Button>
                    </div>
                  )}
                  {r.status === 'hidden' && (
                    <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); handleKeep(r); }}>
                      <Eye size={12} /> Restore
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 shrink-0">
          <Card className="sticky top-6">
            <div className="px-5 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
              <h3 className="font-semibold text-[#1A1A14]">Review Detail</h3>
              <button onClick={() => setSelected(null)} className="text-[#A8A89F] hover:text-[#6B6B62] text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <p className="text-xs text-[#A8A89F] uppercase tracking-wide mb-1">Reviewer</p>
                <p className="font-semibold text-[#1A1A14]">{selected.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-[#A8A89F] uppercase tracking-wide mb-1">Vendor & Service</p>
                <p className="text-sm text-[#1A1A14]">{selected.vendorName}</p>
                <p className="text-xs text-[#6B6B62]">{selected.service}</p>
              </div>
              <div>
                <p className="text-xs text-[#A8A89F] uppercase tracking-wide mb-1">Rating</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => <Star key={n} size={14} fill={n <= selected.rating ? '#E4C654' : 'transparent'} stroke={n <= selected.rating ? '#E4C654' : '#D4D4CF'} />)}
                  <span className="text-sm font-semibold text-[#1A1A14] ml-1">{selected.rating}/5</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#A8A89F] uppercase tracking-wide mb-1">Flag Reason</p>
                <p className="text-sm text-orange-700 bg-orange-50 rounded-lg p-2">{selected.flagReason}</p>
              </div>
              <div>
                <p className="text-xs text-[#A8A89F] uppercase tracking-wide mb-1">Dates</p>
                <p className="text-xs text-[#6B6B62]">Booking: {format(new Date(selected.bookingDate), 'MMM d, yyyy')}</p>
                <p className="text-xs text-[#6B6B62]">Flagged: {format(new Date(selected.flaggedAt), 'MMM d, yyyy')}</p>
              </div>

              {selected.status === 'flagged' && (
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E4E4E0]">
                  <Button className="w-full" onClick={() => handleKeep(selected)}>
                    <Eye size={14} /> Keep Visible
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => handleHide(selected)}>
                    <EyeOff size={14} /> Hide Review
                  </Button>
                  <p className="text-xs text-[#A8A89F] text-center">Hiding will notify {selected.clientName} of our content policy and recalculate the vendor&apos;s rating.</p>
                </div>
              )}
              {selected.status === 'hidden' && (
                <Button variant="outline" className="w-full" onClick={() => handleKeep(selected)}>
                  <Eye size={14} /> Restore Review
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A14] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl z-50">{toast}</div>
      )}
    </div>
  );
}
