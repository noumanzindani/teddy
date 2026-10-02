'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Percent, Gift, RefreshCcw, Clock, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface PlatformSettings {
  platformCommissionRate: number;   // decimal, e.g. 0.15
  pointsPerDollar: number;
  payoutDelayDays: number;
  maxBookingAdvanceDays: number;
  cancellationWindowHours: number;
  lateCancellationRefundPct: number; // decimal, e.g. 0.5
  maintenanceMode: boolean;
  newVendorRegistration: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#1A1A14] flex items-center justify-center text-[#E4C654]">{icon}</div>
        <h2 className="text-base font-bold text-[#1A1A14]">{title}</h2>
      </div>
      <Card className="p-6">{children}</Card>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-4 border-b border-[#F0EFE8] last:border-0">
      <div>
        <p className="text-sm font-medium text-[#1A1A14]">{label}</p>
        {hint && <p className="text-xs text-[#A8A89F] mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, suffix, min, max }: {
  value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number;
}) {
  return (
    <div className="relative w-36">
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[#E4E4E0] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] text-[#1A1A14] bg-[#F5F4F0]"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A89F] text-sm">{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="py-4 border-b border-[#F0EFE8] last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#1A1A14]">{label}</p>
          {hint && <p className="text-xs text-[#A8A89F] mt-0.5">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#E4C654]',
            checked
              ? 'bg-[#1A1A14] text-white'
              : 'bg-[#F5F4F0] text-[#6B6B62] border border-[#E4E4E0]'
          )}
        >
          {checked
            ? <><ToggleRight size={16} /> On</>
            : <><ToggleLeft size={16} /> Off</>
          }
        </button>
      </div>
    </div>
  );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveBar({ onSave, saveState }: { onSave: () => void; saveState: SaveState }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#F0EFE8]">
      {saveState === 'saved' && (
        <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle size={14} /> Saved — applied to future transactions
        </span>
      )}
      {saveState === 'error' && (
        <span className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
          <AlertCircle size={14} /> Save failed — please try again
        </span>
      )}
      <Button onClick={onSave} disabled={saveState === 'saving'}>
        {saveState === 'saving' ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  );
}

const NAV = [
  { id: 'financial',  label: 'Financial',         icon: <Percent size={14} /> },
  { id: 'booking',    label: 'Booking Rules',      icon: <Clock size={14} /> },
  { id: 'loyalty',    label: 'Loyalty',            icon: <Gift size={14} /> },
  { id: 'platform',   label: 'Platform Controls',  icon: <RefreshCcw size={14} /> },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    api.get<PlatformSettings>('/admin/settings')
      .then(data => setSettings(data))
      .catch(() => {
        // Provide sensible defaults so the page is still usable offline / before backend is up
        setSettings({
          platformCommissionRate: 0.15,
          pointsPerDollar: 10,
          payoutDelayDays: 2,
          maxBookingAdvanceDays: 60,
          cancellationWindowHours: 24,
          lateCancellationRefundPct: 0.5,
          maintenanceMode: false,
          newVendorRegistration: true,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setSaveState('idle');
  }

  async function handleSave() {
    if (!settings) return;
    setSaveState('saving');
    try {
      const saved = await api.patch<PlatformSettings>('/admin/settings', settings);
      setSettings(saved);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#A8A89F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E4C654] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  // Display helpers: store as decimals, show as percentages
  const commissionPct       = Math.round(settings.platformCommissionRate * 100);
  const lateCancelRefundPct = Math.round(settings.lateCancellationRefundPct * 100);

  return (
    <div className="flex gap-8 max-w-4xl mx-auto">
      {/* Sticky side nav */}
      <aside className="w-44 shrink-0 hidden lg:block">
        <div className="sticky top-6 flex flex-col gap-1">
          {NAV.map(({ id, label, icon }) => (
            <a key={id} href={`#${id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6B6B62] hover:bg-[#ECEAE4] hover:text-[#1A1A14] transition-colors font-medium">
              {icon} {label}
            </a>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-8 min-w-0">

        {/* Financial */}
        <Section id="financial" icon={<Percent size={15} />} title="Financial">
          <Field label="Platform commission rate" hint="Percentage taken from each booking">
            <div className="flex items-center gap-3">
              <NumInput
                value={commissionPct}
                onChange={v => set('platformCommissionRate', v / 100)}
                suffix="%" min={0} max={50}
              />
              <p className="text-xs text-[#A8A89F]">of booking value per transaction</p>
            </div>
          </Field>
          <Field label="Payout delay" hint="Days after booking completion before vendor receives funds">
            <div className="flex items-center gap-3">
              <NumInput
                value={settings.payoutDelayDays}
                onChange={v => set('payoutDelayDays', v)}
                suffix="days" min={0} max={30}
              />
              <p className="text-xs text-[#A8A89F]">after booking completion</p>
            </div>
          </Field>
          <SaveBar onSave={handleSave} saveState={saveState} />
        </Section>

        {/* Booking Rules */}
        <Section id="booking" icon={<Clock size={15} />} title="Booking Rules">
          <Field label="Max advance booking" hint="How far ahead clients can book appointments">
            <div className="flex items-center gap-3">
              <NumInput
                value={settings.maxBookingAdvanceDays}
                onChange={v => set('maxBookingAdvanceDays', v)}
                suffix="days" min={1} max={365}
              />
              <p className="text-xs text-[#A8A89F]">in advance</p>
            </div>
          </Field>
          <Field label="Free cancellation window" hint="No fee if cancelled before this cutoff">
            <div className="flex items-center gap-3">
              <NumInput
                value={settings.cancellationWindowHours}
                onChange={v => set('cancellationWindowHours', v)}
                suffix="hrs" min={0} max={168}
              />
              <p className="text-xs text-[#A8A89F]">before appointment start</p>
            </div>
          </Field>
          <Field label="Late cancellation refund" hint="Refund % when client cancels inside the free window">
            <div className="flex items-center gap-3">
              <NumInput
                value={lateCancelRefundPct}
                onChange={v => set('lateCancellationRefundPct', v / 100)}
                suffix="%" min={0} max={100}
              />
              <p className="text-xs text-[#A8A89F]">of booking value refunded</p>
            </div>
          </Field>
          <div className="bg-[#F5F4F0] rounded-xl p-4 mt-2 text-sm text-[#6B6B62]">
            <p className="font-semibold text-[#1A1A14] mb-1">Current Policy Summary</p>
            <p>
              Free cancellation up to <strong>{settings.cancellationWindowHours}h</strong> before appointment.
              Late cancellations receive a <strong>{lateCancelRefundPct}%</strong> refund.
              Clients can book up to <strong>{settings.maxBookingAdvanceDays} days</strong> in advance.
            </p>
          </div>
          <SaveBar onSave={handleSave} saveState={saveState} />
        </Section>

        {/* Loyalty */}
        <Section id="loyalty" icon={<Gift size={15} />} title="Loyalty">
          <Field label="Points per dollar" hint="Awarded to client on booking completion">
            <div className="flex items-center gap-3">
              <NumInput
                value={settings.pointsPerDollar}
                onChange={v => set('pointsPerDollar', v)}
                suffix="pts" min={1} max={100}
              />
              <p className="text-xs text-[#A8A89F]">per $1 spent</p>
            </div>
          </Field>
          <SaveBar onSave={handleSave} saveState={saveState} />
        </Section>

        {/* Platform Controls */}
        <Section id="platform" icon={<RefreshCcw size={15} />} title="Platform Controls">
          <Toggle
            checked={settings.maintenanceMode}
            onChange={v => set('maintenanceMode', v)}
            label="Maintenance mode"
            hint="When on, the platform is inaccessible to clients and vendors. Only admins can log in."
          />
          <Toggle
            checked={settings.newVendorRegistration}
            onChange={v => set('newVendorRegistration', v)}
            label="New vendor registration"
            hint="Allow new vendors to submit applications. Disable to pause onboarding."
          />
          {settings.maintenanceMode && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-0.5">Maintenance mode is ON</p>
              <p>The platform is currently unavailable to end users. Remember to turn this off when maintenance is complete.</p>
            </div>
          )}
          <SaveBar onSave={handleSave} saveState={saveState} />
        </Section>

      </div>
    </div>
  );
}
