'use client';

import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface Goal {
  id: string;
  metric: string;
  label: string;
  target: number;
  period: string;
  current: number;
  progressPct: number;
}

export function GoalsCard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get<Goal[]>('/goals/me')
      .then((data) => { if (active) setGoals(data); })
      .catch(() => { if (active) setGoals([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#1B1B16]" />
          <h2 className="font-bold text-[#1B1B16]">My Goals</h2>
        </div>
      </CardHeader>
      <CardBody>
        {loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 bg-[#F0EFE8] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <p className="text-sm text-[#A8A89F] text-center py-6">No goals set yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {goals.map((g) => {
              const pct = Math.max(0, Math.min(100, Math.round(g.progressPct)));
              const done = pct >= 100;
              return (
                <div key={g.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1B1B16] truncate">{g.label || (g.metric.charAt(0).toUpperCase() + g.metric.slice(1))}</p>
                      <p className="text-xs text-[#A8A89F]">{g.metric} · {g.period}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1B1B16]">
                        {g.current}<span className="text-[#A8A89F] font-medium"> / {g.target}</span>
                      </p>
                      <p className={`text-xs font-semibold ${done ? 'text-green-600' : 'text-[#6B6B62]'}`}>{pct}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F0EFE8] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${done ? 'bg-green-400' : 'bg-[#E4C654]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
