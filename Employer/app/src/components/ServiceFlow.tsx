'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, AlertTriangle, ShieldCheck, Clock, CheckCircle, Trash2, RefreshCw,
  Package, CreditCard, FileText, Play, ChevronRight, Plus, Minus,
  Sun, Moon, Send, ArrowUp, ArrowDown, Sparkles, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types (mirror the clinical/checkout API responses) ────────────────────────
interface Conflict { allergy: { name: string; severity?: string; note?: string }; ingredient: string; }
interface ProtoProduct { id: string; name: string; brand?: string | null; ingredients: string[]; flagged: boolean; conflicts: Conflict[]; }
interface Alt { id: string; name: string; brand?: string | null; ingredients: string[]; }
interface Allergy { name: string; severity?: string; note?: string; }
interface Profile {
  medicalHistory?: string | null; medicalConditions?: string[]; employerName?: string | null;
  occupation?: string | null; currentProducts?: { name: string; brand?: string }[];
  allergies?: Allergy[]; notes?: string | null; storeCredit?: number;
}
interface HistoryProduct { name: string; qty?: number; }
interface HistoryVisit {
  bookingId: string; date: string; serviceName: string; status: string;
  notes?: string | null; productsUsed: HistoryProduct[];
}
interface Review {
  booking: { id: string; status: string; serviceName: string; durationMin: number };
  client: { id: string; firstName: string; lastName: string };
  profile: Profile | null;
  allergies: Allergy[];
  protocol: ProtoProduct[];
  hasConflicts: boolean;
  alternatives: Alt[];
  history?: HistoryVisit[];
}
interface RetailProduct { id: string; name: string; brand?: string | null; price: number; stock: number; }
interface CheckoutTotals {
  serviceSubtotal: number; retailSubtotal: number; tip: number; grossTotal: number;
  depositPaid: number; giftCardApplied: number; creditApplied: number; amountDue: number;
  giftCardBalance?: number;
}

interface Preference { id: string; label: string; type?: string; answer: string | string[] | null; }
type RoutinePeriod = 'AM' | 'PM';
interface RoutineStep { period: RoutinePeriod; order: number; product: string; instructions: string; frequency: string; notes: string; }
interface RoutineData { clientId: string; vendorId?: string; steps: RoutineStep[]; sentToClient: boolean; }
type EditStep = { product: string; instructions: string; frequency: string; notes: string };

type Step = 'review' | 'service' | 'record' | 'checkout' | 'done';

const gold = '#E4C654';

export function ServiceFlow({
  bookingId, initialStatus, onClose, onChanged,
}: { bookingId: string; initialStatus: string; onClose: () => void; onChanged: () => void; }) {
  const [step, setStep] = useState<Step>(
    initialStatus === 'in_progress' ? 'service' : initialStatus === 'completed' ? 'record' : 'review',
  );
  const [review, setReview] = useState<Review | null>(null);
  const [intake, setIntake] = useState<{ skinType?: string; allergens?: string[]; products?: string[]; goals?: string; notes?: string; submittedAt?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Client preferences (P11) + skincare routine builder (P13)
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [showRoutine, setShowRoutine] = useState(false);
  const clientId = review?.client.id ?? null;

  // Working protocol (after staff removals/replacements)
  const [working, setWorking] = useState<{ id: string; name: string; flagged: boolean }[]>([]);
  const [replacing, setReplacing] = useState<string | null>(null);

  // Timer
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number>(0);
  const [nowMs, setNowMs] = useState(Date.now());

  // Post-service record
  const [usedProducts, setUsedProducts] = useState<{ id: string; name: string }[]>([]);
  const [productPool, setProductPool] = useState<{ id: string; name: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [reactions, setReactions] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Checkout
  const [retail, setRetail] = useState<RetailProduct[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [giftCode, setGiftCode] = useState('');
  const [creditApplied, setCreditApplied] = useState(0);
  const [tip, setTip] = useState(0);
  const [totals, setTotals] = useState<CheckoutTotals | null>(null);

  // ── Load review ──
  const loadReview = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await api.get<Review>(`/clinical/bookings/${bookingId}/review`);
      setReview(r);
      setWorking(r.protocol.map((p) => ({ id: p.id, name: p.name, flagged: p.flagged })));
      setUsedProducts(r.protocol.map((p) => ({ id: p.id, name: p.name })));
      api.get<{ intakeForm: typeof intake }>(`/clinical/bookings/${bookingId}/intake`).then((res) => setIntake(res.intakeForm)).catch(() => {});
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { loadReview(); }, [loadReview]);

  // Load the client's saved preferences once we know who the client is.
  useEffect(() => {
    if (!clientId) return;
    api.get<Preference[]>(`/preferences/client/${clientId}`).then((p) => setPrefs(Array.isArray(p) ? p : [])).catch(() => {});
  }, [clientId]);

  // Ticking clock for silent countdown
  useEffect(() => {
    if (step !== 'service') return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  // Load retail products when reaching checkout
  useEffect(() => {
    if (step !== 'checkout') return;
    api.get<RetailProduct[]>('/products?type=retail&activeOnly=true').then(setRetail).catch(() => {});
  }, [step]);

  // Load the full product pool (for editing "products used") when reaching the record step
  useEffect(() => {
    if (step !== 'record') return;
    api.get<{ id: string; name: string }[]>('/products?activeOnly=true').then(setProductPool).catch(() => {});
  }, [step]);

  // Recompute checkout totals whenever inputs change
  useEffect(() => {
    if (step !== 'checkout') return;
    const retailItems = Object.entries(cart).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
    api.post<CheckoutTotals>(`/checkout/bookings/${bookingId}/preview`, {
      retailItems, giftCardCode: giftCode || undefined, creditApplied, tip,
    }).then(setTotals).catch(() => {});
  }, [step, cart, giftCode, creditApplied, tip, bookingId]);

  // ── Actions ──
  const removeProduct = (id: string) => setWorking((w) => w.filter((p) => p.id !== id));
  const replaceWith = (removeId: string, alt: Alt) => {
    setWorking((w) => w.map((p) => (p.id === removeId ? { id: alt.id, name: alt.name, flagged: false } : p)));
    setReplacing(null);
  };

  async function startService() {
    setBusy(true); setErr(null);
    try {
      const b = await api.post<{ timerStartedAt: string; timerDurationMin: number }>(`/bookings/${bookingId}/start`);
      setTimerStart(new Date(b.timerStartedAt).getTime());
      setDurationMin(b.timerDurationMin ?? review?.booking.durationMin ?? 0);
      setStep('service'); onChanged();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function markComplete() {
    setBusy(true); setErr(null);
    try {
      await api.post(`/bookings/${bookingId}/complete`);
      // Pre-fill "products used" with the adjusted protocol (staff can edit).
      setUsedProducts(working.map((w) => ({ id: w.id, name: w.name })));
      setStep('record'); onChanged();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function saveRecord() {
    setBusy(true); setErr(null);
    try {
      await api.post(`/clinical/bookings/${bookingId}/record`, {
        productsUsed: usedProducts.map((p) => ({ productId: p.id, name: p.name, qty: 1 })),
        notes, reactions, recommendations,
      });
      setStep('checkout');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function finishCheckout() {
    setBusy(true); setErr(null);
    try {
      const retailItems = Object.entries(cart).filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity }));
      await api.post(`/checkout/bookings/${bookingId}`, {
        retailItems, giftCardCode: giftCode || undefined, creditApplied, tip,
      });
      setStep('done'); onChanged();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const remainingSec = useMemo(() => {
    if (!timerStart || !durationMin) return null;
    return Math.round((timerStart + durationMin * 60000 - nowMs) / 1000);
  }, [timerStart, durationMin, nowMs]);

  const fmt = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${(Math.abs(s) % 60).toString().padStart(2, '0')}`;
  const unresolved = working.some((p) => p.flagged);

  const steps: { key: Step; label: string; icon: typeof ShieldCheck }[] = [
    { key: 'review', label: 'Review', icon: ShieldCheck },
    { key: 'service', label: 'Service', icon: Clock },
    { key: 'record', label: 'Notes', icon: FileText },
    { key: 'checkout', label: 'Checkout', icon: CreditCard },
  ];
  const stepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header + step rail */}
        <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#1B1B16]">
              {review ? `${review.client.firstName} ${review.client.lastName}` : 'Service'}
            </h2>
            <p className="text-xs text-[#6B6B62]">{review?.booking.serviceName}</p>
          </div>
          <button onClick={onClose} className="text-[#A8A89F] hover:text-[#1B1B16]"><X size={20} /></button>
        </div>
        {step !== 'done' && (
          <div className="px-5 py-3 flex items-center gap-1 border-b border-[#F0EFE8]">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={cn('flex items-center gap-1.5 text-xs font-semibold', i <= stepIdx ? 'text-[#1B1B16]' : 'text-[#C4C4BC]')}>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center', i < stepIdx ? 'bg-green-100 text-green-700' : i === stepIdx ? 'bg-[#E4C654] text-[#1B1B16]' : 'bg-[#F0EFE8]')}>
                    {i < stepIdx ? <CheckCircle size={13} /> : <s.icon size={13} />}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && <ChevronRight size={12} className="text-[#D4D4CC]" />}
              </div>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-5 flex-1">
          {err && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{err}</div>}
          {loading ? <p className="text-sm text-[#6B6B62]">Loading…</p> : (
            <>
              {step === 'review' && review && <ReviewStep review={review} intake={intake} prefs={prefs} working={working} replacing={replacing}
                setReplacing={setReplacing} removeProduct={removeProduct} replaceWith={replaceWith} />}
              {step === 'service' && (
                <div className="text-center py-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B62] mb-2 flex items-center justify-center gap-1.5">
                    <Clock size={13} /> {remainingSec !== null && remainingSec < 0 ? 'Overtime' : 'Time Remaining'}
                  </p>
                  <p className="text-6xl font-black tabular-nums" style={{ color: remainingSec !== null && remainingSec < 0 ? '#b91c1c' : '#1B1B16' }}>
                    {remainingSec !== null ? fmt(remainingSec) : `${durationMin}:00`}
                  </p>
                  <p className="text-xs text-[#A8A89F] mt-2">{durationMin} min planned · silent timer</p>
                </div>
              )}
              {step === 'record' && (
                <RecordStep used={usedProducts} setUsed={setUsedProducts} pool={productPool}
                  notes={notes} setNotes={setNotes} reactions={reactions}
                  setReactions={setReactions} recommendations={recommendations} setRecommendations={setRecommendations}
                  onOpenRoutine={clientId ? () => setShowRoutine(true) : undefined} />
              )}
              {step === 'checkout' && (
                <CheckoutStep retail={retail} cart={cart} setCart={setCart} giftCode={giftCode} setGiftCode={setGiftCode}
                  creditApplied={creditApplied} setCreditApplied={setCreditApplied} tip={tip} setTip={setTip}
                  totals={totals} storeCredit={review?.profile?.storeCredit ?? 0} />
              )}
              {step === 'done' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CheckCircle size={32} className="text-green-600" /></div>
                  <h3 className="font-bold text-lg text-[#1B1B16]">Service Complete</h3>
                  <p className="text-sm text-[#6B6B62] mt-1">Records saved and checkout finalized.</p>
                  {clientId && (
                    <Button variant="outline" className="mt-4" onClick={() => setShowRoutine(true)}>
                      <Sparkles size={15} /> Build AM/PM Routine
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!loading && step !== 'done' && (
          <div className="px-5 py-4 border-t border-[#E8E8E4]">
            {step === 'review' && (
              <>
                {unresolved && (
                  <p className="text-xs text-amber-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={13} /> Unresolved allergy conflict — remove or replace flagged products first.</p>
                )}
                <Button className="w-full" disabled={busy} onClick={startService}><Play size={15} /> Start Service</Button>
              </>
            )}
            {step === 'service' && <Button className="w-full" disabled={busy} onClick={markComplete}><CheckCircle size={15} /> Mark Complete</Button>}
            {step === 'record' && <Button className="w-full" disabled={busy} onClick={saveRecord}>Save & Continue to Checkout <ChevronRight size={15} /></Button>}
            {step === 'checkout' && (
              <Button className="w-full" disabled={busy} onClick={finishCheckout}>
                <CreditCard size={15} /> Complete Checkout{totals ? ` · $${totals.amountDue.toFixed(2)} due` : ''}
              </Button>
            )}
          </div>
        )}
        {step === 'done' && <div className="px-5 py-4 border-t border-[#E8E8E4]"><Button className="w-full" onClick={onClose}>Done</Button></div>}
      </div>

      {showRoutine && clientId && (
        <RoutineBuilder
          clientId={clientId}
          clientName={review ? `${review.client.firstName} ${review.client.lastName}` : ''}
          onClose={() => setShowRoutine(false)}
        />
      )}
    </div>
  );
}

// ── Review step ────────────────────────────────────────────────────────────────
function ReviewStep({ review, intake, prefs, working, replacing, setReplacing, removeProduct, replaceWith }: {
  review: Review; intake: { skinType?: string; allergens?: string[]; products?: string[]; goals?: string; notes?: string } | null;
  prefs: Preference[];
  working: { id: string; name: string; flagged: boolean }[];
  replacing: string | null; setReplacing: (id: string | null) => void;
  removeProduct: (id: string) => void; replaceWith: (id: string, alt: Alt) => void;
}) {
  const p = review.profile;
  const Field = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (<div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A89F]">{label}</p><p className="text-sm text-[#1B1B16]">{value}</p></div>) : null;

  return (
    <div className="space-y-4">
      {/* Pre-visit questionnaire the client submitted at booking */}
      {intake && (intake.skinType || intake.allergens?.length || intake.goals || intake.notes) && (
        <div className="bg-[#FFFBEB] border border-[#E4C654]/40 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B45309] flex items-center gap-1.5"><FileText size={13} /> Pre-Visit Questionnaire</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Skin type" value={intake.skinType} />
            <Field label="Goals" value={intake.goals} />
          </div>
          {!!intake.allergens?.length && <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A89F]">Declared allergies</p><p className="text-sm text-red-700 font-medium">{intake.allergens.join(', ')}</p></div>}
          {!!intake.products?.length && <Field label="Products used at home" value={intake.products.join(', ')} />}
          <Field label="Client notes" value={intake.notes} />
        </div>
      )}
      {/* Client info template */}
      <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62]">Client Information</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employer" value={p?.employerName} />
          <Field label="Occupation" value={p?.occupation} />
        </div>
        <Field label="Medical History" value={p?.medicalHistory} />
        {!!p?.medicalConditions?.length && (
          <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A89F]">Conditions</p>
            <div className="flex flex-wrap gap-1 mt-1">{p.medicalConditions.map((c) => <span key={c} className="text-xs bg-white border border-[#E8E8E4] rounded-full px-2 py-0.5">{c}</span>)}</div></div>
        )}
        {!!p?.currentProducts?.length && (
          <div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A89F]">Current Products</p>
            <p className="text-sm text-[#1B1B16]">{p.currentProducts.map((x) => x.name).join(', ')}</p></div>
        )}
        <Field label="Notes" value={p?.notes} />
      </div>

      {/* Client preferences (P11) — heated bed, music, pressure, etc. */}
      {!!prefs.length && (
        <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] flex items-center gap-1.5"><Heart size={13} /> Client Preferences</p>
          <div className="space-y-1.5">
            {prefs.map((pref) => {
              const a = pref.answer;
              const text = Array.isArray(a) ? (a.length ? a.join(', ') : '—') : (a === null || a === '' ? '—' : String(a));
              return (
                <div key={pref.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-[#6B6B62]">{pref.label}</span>
                  <span className={cn('text-right font-medium', text === '—' ? 'text-[#A8A89F]' : 'text-[#1B1B16]')}>{text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Allergies */}
      <div className={cn('rounded-xl p-4 border', review.allergies.length ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200')}>
        <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5" style={{ color: review.allergies.length ? '#b45309' : '#15803d' }}>
          {review.allergies.length ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
          Allergies & Sensitivities
        </p>
        {review.allergies.length ? (
          <div className="mt-2 space-y-1">
            {review.allergies.map((a) => (
              <div key={a.name} className="text-sm text-[#1B1B16]"><span className="font-semibold">{a.name}</span>
                {a.severity && <span className="text-xs text-amber-700"> · {a.severity}</span>}
                {a.note && <span className="text-xs text-[#6B6B62]"> — {a.note}</span>}</div>
            ))}
          </div>
        ) : <p className="text-sm text-green-700 mt-1">No known allergies.</p>}
      </div>

      {/* Previous visits / treatment history */}
      <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] flex items-center gap-1.5"><Clock size={13} /> Previous Visits</p>
        {review.history && review.history.length ? (
          <div className="space-y-2">
            {review.history.map((h) => (
              <div key={h.bookingId} className="rounded-lg border border-[#E8E8E4] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#1B1B16]">{h.serviceName}</p>
                  <p className="text-[11px] text-[#A8A89F]">{h.date ? new Date(h.date).toLocaleDateString() : ''}</p>
                </div>
                {h.notes && <p className="text-xs text-[#6B6B62] mt-1">{h.notes}</p>}
                {!!h.productsUsed?.length && (
                  <p className="text-xs text-[#6B6B62] mt-1">
                    <span className="font-semibold text-[#A8A89F]">Products used: </span>
                    {h.productsUsed.map((prod) => prod.name + (prod.qty && prod.qty > 1 ? ` ×${prod.qty}` : '')).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[#A8A89F]">No previous visits on record.</p>}
      </div>

      {/* Protocol + allergy check */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] mb-2">Planned Protocol · Ingredient Check</p>
        <div className="space-y-2">
          {working.map((wp) => {
            const orig = review.protocol.find((x) => x.id === wp.id);
            const flagged = wp.flagged;
            return (
              <div key={wp.id} className={cn('rounded-lg border p-3', flagged ? 'bg-red-50 border-red-200' : 'bg-white border-[#E8E8E4]')}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1B1B16] flex items-center gap-1.5">
                      {flagged && <AlertTriangle size={13} className="text-red-600" />}{wp.name}
                    </p>
                    {flagged && orig && (
                      <p className="text-xs text-red-700 mt-0.5">
                        Contains {orig.conflicts.map((c) => `${c.ingredient} (${c.allergy.name} allergy)`).join(', ')}
                      </p>
                    )}
                  </div>
                  {flagged && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setReplacing(replacing === wp.id ? null : wp.id)} title="Replace"
                        className="p-1.5 rounded-md border border-[#E8E8E4] bg-white hover:bg-[#FAFAF8]"><RefreshCw size={13} /></button>
                      <button onClick={() => removeProduct(wp.id)} title="Remove"
                        className="p-1.5 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
                {replacing === wp.id && (
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A89F] mb-1">Safe alternatives</p>
                    {review.alternatives.length ? review.alternatives.map((alt) => (
                      <button key={alt.id} onClick={() => replaceWith(wp.id, alt)}
                        className="block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-green-50 text-[#1B1B16]">
                        <ShieldCheck size={12} className="inline text-green-600 mr-1" />{alt.name}
                      </button>
                    )) : <p className="text-xs text-[#A8A89F]">No alternatives available — remove instead.</p>}
                  </div>
                )}
              </div>
            );
          })}
          {!working.length && <p className="text-sm text-[#A8A89F]">No products in protocol.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Record step ────────────────────────────────────────────────────────────────
function RecordStep({ used, setUsed, pool, notes, setNotes, reactions, setReactions, recommendations, setRecommendations, onOpenRoutine }: {
  used: { id: string; name: string }[]; setUsed: (v: { id: string; name: string }[]) => void;
  pool: { id: string; name: string }[];
  notes: string; setNotes: (v: string) => void; reactions: string; setReactions: (v: string) => void;
  recommendations: string; setRecommendations: (v: string) => void;
  onOpenRoutine?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const remove = (id: string) => setUsed(used.filter((p) => p.id !== id));
  const add = (p: { id: string; name: string }) => { if (!used.some((x) => x.id === p.id)) setUsed([...used, p]); setAdding(false); };
  const available = pool.filter((p) => !used.some((u) => u.id === p.id));
  const Ta = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
    <div>
      <label className="text-xs font-semibold text-[#6B6B62]">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
    </div>
  );
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-[#6B6B62] mb-1.5 flex items-center gap-1.5"><Package size={13} /> Products Used</p>
        <p className="text-[11px] text-[#A8A89F] mb-2">Confirm what was actually used — remove any you skipped, or add products.</p>
        <div className="flex flex-wrap gap-1.5">
          {used.map((p) => (
            <span key={p.id} className="text-xs bg-[#F0FBF4] border border-green-200 text-green-800 rounded-full pl-2.5 pr-1.5 py-1 flex items-center gap-1">
              {p.name}
              <button onClick={() => remove(p.id)} className="text-green-700 hover:text-red-600"><X size={12} /></button>
            </span>
          ))}
          {!used.length && <span className="text-sm text-[#A8A89F]">No products recorded</span>}
          <button onClick={() => setAdding((a) => !a)} className="text-xs border border-dashed border-[#D4D4CC] text-[#6B6B62] rounded-full px-2.5 py-1 flex items-center gap-1 hover:bg-[#FAFAF8]">
            <Plus size={12} /> Add
          </button>
        </div>
        {adding && (
          <div className="mt-2 border border-[#E8E8E4] rounded-lg max-h-40 overflow-y-auto">
            {available.length ? available.map((p) => (
              <button key={p.id} onClick={() => add(p)} className="block w-full text-left text-sm px-3 py-1.5 hover:bg-[#FAFAF8] text-[#1B1B16]">{p.name}</button>
            )) : <p className="text-xs text-[#A8A89F] px-3 py-2">All products already added.</p>}
          </div>
        )}
      </div>
      <Ta label="Service notes / description" value={notes} onChange={setNotes} placeholder="Short description of the service performed…" />
      <Ta label="Reactions / changes observed" value={reactions} onChange={setReactions} placeholder="Any reactions, skin changes, sensitivity…" />
      <Ta label="Recommendations for future visits" value={recommendations} onChange={setRecommendations} placeholder="Home care, next treatment, product suggestions…" />
      {onOpenRoutine && (
        <button onClick={onOpenRoutine}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D4D4CC] text-sm font-semibold text-[#6B6B62] py-2.5 hover:bg-[#FAFAF8]">
          <Sparkles size={15} /> Build AM/PM Skincare Routine
        </button>
      )}
    </div>
  );
}

// ── Checkout step ────────────────────────────────────────────────────────────────
function CheckoutStep({ retail, cart, setCart, giftCode, setGiftCode, creditApplied, setCreditApplied, tip, setTip, totals, storeCredit }: {
  retail: RetailProduct[]; cart: Record<string, number>; setCart: (f: (c: Record<string, number>) => Record<string, number>) => void;
  giftCode: string; setGiftCode: (v: string) => void; creditApplied: number; setCreditApplied: (v: number) => void;
  tip: number; setTip: (v: number) => void; totals: CheckoutTotals | null; storeCredit: number;
}) {
  const setQty = (id: string, delta: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  return (
    <div className="space-y-4">
      {/* Retail products */}
      <div>
        <p className="text-xs font-semibold text-[#6B6B62] mb-1.5 flex items-center gap-1.5"><Package size={13} /> Add Retail Products</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {retail.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-[#1B1B16]">{p.name} <span className="text-[#A8A89F]">${Number(p.price).toFixed(2)}</span></span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setQty(p.id, -1)} className="p-1 rounded border border-[#E8E8E4]"><Minus size={12} /></button>
                <span className="w-5 text-center tabular-nums">{cart[p.id] ?? 0}</span>
                <button onClick={() => setQty(p.id, 1)} className="p-1 rounded border border-[#E8E8E4]"><Plus size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Gift card */}
      <div>
        <label className="text-xs font-semibold text-[#6B6B62]">Gift Card</label>
        <input value={giftCode} onChange={(e) => setGiftCode(e.target.value.toUpperCase())} placeholder="TEDDY-XXXX-XXXX"
          className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
        {totals?.giftCardBalance !== undefined && <p className="text-[11px] text-green-700 mt-0.5">Card balance ${totals.giftCardBalance.toFixed(2)} · applying ${totals.giftCardApplied.toFixed(2)}</p>}
      </div>
      {/* Tip + credit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[#6B6B62]">Tip</label>
          <input type="number" min={0} value={tip || ''} onChange={(e) => setTip(Number(e.target.value) || 0)} placeholder="0"
            className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#6B6B62]">Store Credit (${storeCredit.toFixed(2)})</label>
          <input type="number" min={0} max={storeCredit} value={creditApplied || ''} onChange={(e) => setCreditApplied(Math.min(storeCredit, Number(e.target.value) || 0))} placeholder="0"
            className="mt-1 w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
        </div>
      </div>
      {/* Totals */}
      {totals && (
        <div className="bg-[#FAFAF8] border border-[#E8E8E4] rounded-xl p-3 text-sm space-y-1">
          <Row label="Service" value={totals.serviceSubtotal} />
          {totals.retailSubtotal > 0 && <Row label="Retail products" value={totals.retailSubtotal} />}
          {totals.tip > 0 && <Row label="Tip" value={totals.tip} />}
          {totals.depositPaid > 0 && <Row label="Deposit paid" value={-totals.depositPaid} />}
          {totals.giftCardApplied > 0 && <Row label="Gift card" value={-totals.giftCardApplied} />}
          {totals.creditApplied > 0 && <Row label="Store credit" value={-totals.creditApplied} />}
          <div className="border-t border-[#E8E8E4] pt-1 mt-1 flex justify-between font-bold text-[#1B1B16]">
            <span>Balance Due</span><span>${totals.amountDue.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between text-[#6B6B62]"><span>{label}</span><span className={value < 0 ? 'text-green-700' : ''}>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</span></div>;
}

// ── AM/PM Skincare Routine builder (P13) ─────────────────────────────────────────
const emptyStep = (): EditStep => ({ product: '', instructions: '', frequency: '', notes: '' });

function RoutineBuilder({ clientId, clientName, onClose }: { clientId: string; clientName: string; onClose: () => void }) {
  const [am, setAm] = useState<EditStep[]>([]);
  const [pm, setPm] = useState<EditStep[]>([]);
  const [sentToClient, setSentToClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<RoutineData>(`/routines/client/${clientId}`).then((r) => {
      if (!active) return;
      const steps = Array.isArray(r?.steps) ? r.steps : [];
      const split = (period: RoutinePeriod) => steps
        .filter((s) => s.period === period)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => ({ product: s.product ?? '', instructions: s.instructions ?? '', frequency: s.frequency ?? '', notes: s.notes ?? '' }));
      setAm(split('AM'));
      setPm(split('PM'));
      setSentToClient(!!r?.sentToClient);
    }).catch((e) => { if (active) setErr((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId]);

  const flatten = (): RoutineStep[] => [
    ...am.map((s, i) => ({ period: 'AM' as RoutinePeriod, order: i, ...s })),
    ...pm.map((s, i) => ({ period: 'PM' as RoutinePeriod, order: i, ...s })),
  ];

  async function save(): Promise<boolean> {
    setBusy(true); setErr(null); setFlash(null);
    try {
      await api.put(`/routines/client/${clientId}`, { steps: flatten() });
      setFlash('Routine saved.');
      return true;
    } catch (e) { setErr((e as Error).message); return false; }
    finally { setBusy(false); }
  }

  async function sendToClient() {
    setBusy(true); setErr(null); setFlash(null);
    try {
      // Persist the latest edits first, then mark as sent.
      await api.put(`/routines/client/${clientId}`, { steps: flatten() });
      await api.post(`/routines/client/${clientId}/send`);
      setSentToClient(true);
      setFlash('Sent to the client portal.');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#1B1B16] flex items-center gap-1.5"><Sparkles size={16} style={{ color: gold }} /> Skincare Routine</h2>
            <p className="text-xs text-[#6B6B62]">{clientName}{sentToClient ? ' · sent to client' : ''}</p>
          </div>
          <button onClick={onClose} className="text-[#A8A89F] hover:text-[#1B1B16]"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-5">
          {err && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{err}</div>}
          {flash && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{flash}</div>}
          {loading ? <p className="text-sm text-[#6B6B62]">Loading…</p> : (
            <>
              <RoutineGroup title="Morning" period="AM" icon={Sun} steps={am} setSteps={setAm} />
              <RoutineGroup title="Evening" period="PM" icon={Moon} steps={pm} setSteps={setPm} />
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#E8E8E4] flex gap-2">
          <Button variant="outline" className="flex-1" disabled={busy || loading} onClick={save}>Save</Button>
          <Button className="flex-1" disabled={busy || loading} onClick={sendToClient}><Send size={15} /> Send to Client Portal</Button>
        </div>
      </div>
    </div>
  );
}

function RoutineGroup({ title, period, icon: Icon, steps, setSteps }: {
  title: string; period: RoutinePeriod; icon: typeof Sun;
  steps: EditStep[]; setSteps: (updater: (s: EditStep[]) => EditStep[]) => void;
}) {
  const update = (i: number, key: keyof EditStep, value: string) =>
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, [key]: value } : step)));
  const remove = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const add = () => setSteps((s) => [...s, emptyStep()]);
  const move = (i: number, dir: -1 | 1) => setSteps((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const next = s.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#6B6B62] flex items-center gap-1.5"><Icon size={13} /> {title} · {period}</p>
        <button onClick={add} className="text-xs border border-dashed border-[#D4D4CC] text-[#6B6B62] rounded-full px-2.5 py-1 flex items-center gap-1 hover:bg-[#FAFAF8]"><Plus size={12} /> Add step</button>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="rounded-lg border border-[#E8E8E4] bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#A8A89F]">Step {i + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up"
                  className="p-1 rounded border border-[#E8E8E4] text-[#6B6B62] hover:bg-[#FAFAF8] disabled:opacity-30"><ArrowUp size={12} /></button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} title="Move down"
                  className="p-1 rounded border border-[#E8E8E4] text-[#6B6B62] hover:bg-[#FAFAF8] disabled:opacity-30"><ArrowDown size={12} /></button>
                <button onClick={() => remove(i)} title="Remove"
                  className="p-1 rounded border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
              </div>
            </div>
            <input value={step.product} onChange={(e) => update(i, 'product', e.target.value)} placeholder="Product"
              className="w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
            <input value={step.instructions} onChange={(e) => update(i, 'instructions', e.target.value)} placeholder="Instructions (e.g. apply to damp skin)"
              className="w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
            <div className="grid grid-cols-2 gap-2">
              <input value={step.frequency} onChange={(e) => update(i, 'frequency', e.target.value)} placeholder="Frequency (e.g. Daily)"
                className="w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
              <input value={step.notes} onChange={(e) => update(i, 'notes', e.target.value)} placeholder="Notes"
                className="w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]" />
            </div>
          </div>
        ))}
        {!steps.length && <p className="text-sm text-[#A8A89F]">No steps yet — add one.</p>}
      </div>
    </div>
  );
}
