'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type EventKey =
  | 'confirmation' | 'reminder' | 'reschedule' | 'cancellation'
  | 'formReminder' | 'waitlist' | 'membership' | 'followUp';

interface SmsMessage {
  label: string;
  active: boolean;
  text: string;
}

type SmsConfig = Record<string, SmsMessage>;

// Fallback ordering + labels so events render sensibly even before data loads.
const EVENT_ORDER: { key: EventKey; label: string }[] = [
  { key: 'confirmation', label: 'Booking confirmation' },
  { key: 'reminder',     label: 'Appointment reminder' },
  { key: 'reschedule',   label: 'Reschedule notice' },
  { key: 'cancellation', label: 'Cancellation notice' },
  { key: 'formReminder', label: 'Form reminder' },
  { key: 'waitlist',     label: 'Waitlist offer' },
  { key: 'membership',   label: 'Membership update' },
  { key: 'followUp',     label: 'Post-visit follow-up' },
];

export default function MessagingPage() {
  const [config, setConfig] = useState<SmsConfig>({});
  const [order, setOrder] = useState<string[]>(EVENT_ORDER.map((e) => e.key));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SmsConfig | { data: SmsConfig }>('/vendors/me/sms-config');
      const cfg = (res && 'data' in res ? res.data : res) as SmsConfig;
      const safe = cfg ?? {};
      setConfig(safe);
      // Preserve known ordering first, then any extra events returned by the API.
      const known = EVENT_ORDER.map((e) => e.key).filter((k) => k in safe);
      const extra = Object.keys(safe).filter((k) => !known.includes(k as EventKey));
      setOrder([...known, ...extra]);
    } catch {
      setConfig({});
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  function update(key: string, patch: Partial<SmsMessage>) {
    setSaved(false);
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const smsConfig: Record<string, { active: boolean; text: string }> = {};
      for (const [key, msg] of Object.entries(config)) {
        smsConfig[key] = { active: msg.active, text: msg.text };
      }
      await api.put('/vendors/me/sms-config', { smsConfig });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  function labelFor(key: string): string {
    return config[key]?.label || EVENT_ORDER.find((e) => e.key === key)?.label || key;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B1B16]">Auto Messages</h1>
        <p className="text-sm text-[#6B6B62]">Automated SMS sent to clients around their appointments.</p>
      </div>

      {/* Test-mode note */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-[#E4C654]/40 bg-[#FBF6DE] px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-[#8A7A2E]" />
        <p className="text-xs text-[#6B6B62]">
          SMS sends in test/log mode until Twilio credentials are configured.
        </p>
      </div>

      {loading ? (
        <p className="text-[#6B6B62]">Loading…</p>
      ) : !order.length ? (
        <Card className="p-8 text-center">
          <MessageSquare size={28} className="mx-auto text-[#C4C4BC]" />
          <p className="mt-3 text-sm text-[#6B6B62]">No message templates configured.</p>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {order.map((key) => {
              const msg = config[key];
              if (!msg) return null;
              return (
                <Card key={key} className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm font-bold text-[#1B1B16]">{labelFor(key)}</h2>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={msg.active}
                      onClick={() => update(key, { active: !msg.active })}
                      className="flex items-center gap-2 shrink-0 group"
                    >
                      <span className="text-xs font-medium text-[#6B6B62]">
                        {msg.active ? 'Active' : 'Off'}
                      </span>
                      <span
                        className={cn(
                          'relative w-9 h-5 rounded-full transition-colors',
                          msg.active ? 'bg-[#E4C654]' : 'bg-[#E0E0DA] group-hover:bg-[#D2D2CA]',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                            msg.active && 'translate-x-4',
                          )}
                        />
                      </span>
                    </button>
                  </div>
                  <textarea
                    value={msg.text}
                    onChange={(e) => update(key, { text: e.target.value })}
                    rows={3}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-lg border bg-white text-[#1B1B16] placeholder-[#A8A89F] text-sm transition-colors resize-y',
                      'focus:outline-none focus:ring-2 focus:ring-[#E4C654] focus:border-transparent',
                      'border-[#E8E8E4] hover:border-[#A8A89F]',
                    )}
                  />
                  <p className="mt-1.5 text-xs text-[#6B6B62]">
                    Placeholders:{' '}
                    <code className="text-[#1B1B16]">{'{name}'}</code>{' '}
                    <code className="text-[#1B1B16]">{'{service}'}</code>{' '}
                    <code className="text-[#1B1B16]">{'{date}'}</code>{' '}
                    <code className="text-[#1B1B16]">{'{business}'}</code>
                  </p>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {saved && <span className="text-xs font-semibold text-green-600">Saved ✓</span>}
            {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}
