'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Clock, DollarSign, Tag, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { api, getVendorId } from '@/lib/api';
import { AddOnsModal } from '@/components/AddOnsModal';
import { ProtocolModal } from '@/components/ProtocolModal';
import { cn } from '@/lib/utils';

const API_BASE = 'https://teddy-api-996781771538.us-east1.run.app';

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  description?: string;
  isActive: boolean;
  depositPercentage: number;
  isTimed: boolean;
  extraTimeRate?: number | null;
  requiresCardOnFile?: boolean;
  directBookingSlug?: string | null;
}

type ServiceForm = Omit<Service, 'id'>;

const CATEGORIES = [
  'Facial Treatments', 'Skin Treatments', 'Laser Treatments',
  'Massage', 'Threading & Brows', 'Waxing Services', "Men's Grooming", 'Other',
];

const EMPTY_FORM: ServiceForm = {
  name: '', category: CATEGORIES[0], price: 0, durationMin: 30, description: '', isActive: true,
  depositPercentage: 100, isTimed: false, extraTimeRate: null,
  requiresCardOnFile: false, directBookingSlug: '',
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState('All');
  const [addOnsFor, setAddOnsFor] = useState<Service | null>(null);
  const [protocolFor, setProtocolFor] = useState<Service | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const vendorId = getVendorId();
      if (!vendorId) return;
      const data = await api.get<Service[]>(`/services/${vendorId}`);
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];
  const categoryOptions = Array.from(new Set([...CATEGORIES, ...services.map(s => s.category).filter(Boolean)]));
  const filtered = services.filter(s => filterCategory === 'All' || s.category === filterCategory);

  function openAdd() { setForm(EMPTY_FORM); setEditing(null); setCopied(false); setShowForm(true); }
  function openEdit(s: Service) {
    setForm({ name: s.name, category: s.category, price: s.price, durationMin: s.durationMin, description: s.description ?? '', isActive: s.isActive, depositPercentage: s.depositPercentage ?? 100, isTimed: s.isTimed ?? false, extraTimeRate: s.extraTimeRate ?? null, requiresCardOnFile: s.requiresCardOnFile ?? false, directBookingSlug: s.directBookingSlug ?? '' });
    setEditing(s);
    setCopied(false);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.patch<Service>(`/services/${editing.id}`, {
          name: form.name, category: form.category, price: form.price,
          durationMin: form.durationMin, description: form.description, isActive: form.isActive,
          depositPercentage: form.depositPercentage, isTimed: form.isTimed,
          extraTimeRate: form.isTimed ? form.extraTimeRate ?? 0 : null,
          requiresCardOnFile: form.requiresCardOnFile,
          directBookingSlug: form.directBookingSlug?.trim() || null,
        });
        setServices(prev => prev.map(s => s.id === editing.id ? updated : s));
      } else {
        const created = await api.post<Service>('/vendors/me/services', {
          name: form.name, category: form.category, price: form.price,
          durationMin: form.durationMin, description: form.description, isActive: form.isActive,
          depositPercentage: form.depositPercentage, isTimed: form.isTimed,
          ...(form.isTimed && form.extraTimeRate != null ? { extraTimeRate: form.extraTimeRate } : {}),
          requiresCardOnFile: form.requiresCardOnFile,
          ...(form.directBookingSlug?.trim() ? { directBookingSlug: form.directBookingSlug.trim() } : {}),
        });
        setServices(prev => [...prev, created]);
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Service) {
    try {
      const updated = await api.patch<Service>(`/services/${s.id}`, { isActive: !s.isActive });
      setServices(prev => prev.map(x => x.id === s.id ? updated : x));
    } catch (err) {
      console.error(err);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1B1B16]">Services</h2>
          <p className="text-sm text-[#6B6B62] mt-0.5">{services.length} services · {services.filter(s => s.isActive).length} active</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus size={16} /> Add Service
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors',
              filterCategory === c
                ? 'bg-[#1B1B16] text-white border-[#1B1B16]'
                : 'bg-white text-[#6B6B62] border-[#E8E8E4] hover:bg-[#FAFAF8]'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <Card key={s.id} className={cn('transition-opacity', !s.isActive && 'opacity-60')}>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1B1B16] truncate">{s.name}</p>
                  <Badge color="text-[#6B6B62]" bg="bg-[#F0EFE8]">{s.category}</Badge>
                </div>
                <button onClick={() => toggleActive(s)} className="text-[#A8A89F] hover:text-[#6B6B62] transition-colors shrink-0 mt-0.5">
                  {s.isActive ? <ToggleRight size={22} className="text-[#E4C654]" /> : <ToggleLeft size={22} />}
                </button>
              </div>

              {s.description && (
                <p className="text-sm text-[#6B6B62] line-clamp-2">{s.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-[#6B6B62]">
                <span className="flex items-center gap-1.5"><DollarSign size={13} />${s.price}</span>
                <span className="flex items-center gap-1.5"><Clock size={13} />{s.durationMin} min</span>
                <span className="flex items-center gap-1.5"><Tag size={13} />{s.category}</span>
              </div>

              <div className="pt-2 border-t border-[#E8E8E4] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setAddOnsFor(s)} className="text-xs text-[#C9AD3A] hover:text-[#1B1B16] font-semibold flex items-center gap-1">
                    <Plus size={12} /> Add-ons
                  </button>
                  <button onClick={() => setProtocolFor(s)} className="text-xs text-[#C9AD3A] hover:text-[#1B1B16] font-semibold flex items-center gap-1">
                    <Package size={12} /> Protocol
                  </button>
                </div>
                <button onClick={() => openEdit(s)} className="flex items-center gap-1.5 text-xs text-[#6B6B62] hover:text-[#1B1B16] transition-colors font-medium">
                  <Pencil size={12} /> Edit
                </button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-[#A8A89F]">
            <Tag size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No services in this category</p>
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#1B1B16] mb-5">
              {editing ? 'Edit Service' : 'New Service'}
            </h3>
            <div className="flex flex-col gap-4">
              <Input
                label="Service name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. HydraFacial"
              />
              <Input
                label="Category"
                list="service-category-options"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Type or pick a category"
              />
              <datalist id="service-category-options">
                {categoryOptions.map(c => <option key={c} value={c} />)}
              </datalist>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Price ($)"
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
                <Input
                  label="Duration (min)"
                  type="number"
                  value={form.durationMin}
                  onChange={e => setForm(f => ({ ...f, durationMin: parseInt(e.target.value) || 30 }))}
                />
              </div>
              {/* Deposit */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Deposit to confirm (%)"
                  type="number"
                  value={form.depositPercentage}
                  onChange={e => setForm(f => ({ ...f, depositPercentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                />
                <div className="flex items-end pb-1">
                  <p className="text-xs text-[#6B6B62]">
                    {form.depositPercentage >= 100
                      ? 'Client pays in full at booking.'
                      : `Client pays $${((form.price * form.depositPercentage) / 100).toFixed(2)} now, $${(form.price * (100 - form.depositPercentage) / 100).toFixed(2)} at the salon.`}
                  </p>
                </div>
              </div>

              {/* Timed service */}
              <div className="rounded-lg border border-[#E8E8E4] p-3 flex flex-col gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isTimed}
                    onChange={e => setForm(f => ({ ...f, isTimed: e.target.checked }))}
                    className="accent-[#E4C654] w-4 h-4"
                  />
                  <span className="text-sm text-[#1B1B16]">Timed service (staff runs an on-site countdown)</span>
                </label>
                {form.isTimed && (
                  <Input
                    label="Extra time rate ($ per 15 min)"
                    type="number"
                    value={form.extraTimeRate ?? 0}
                    onChange={e => setForm(f => ({ ...f, extraTimeRate: parseFloat(e.target.value) || 0 }))}
                  />
                )}
              </div>

              {/* Card on file + direct booking link */}
              <div className="rounded-lg border border-[#E8E8E4] p-3 flex flex-col gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.requiresCardOnFile}
                    onChange={e => setForm(f => ({ ...f, requiresCardOnFile: e.target.checked }))}
                    className="accent-[#E4C654] w-4 h-4"
                  />
                  <span className="text-sm text-[#1B1B16]">Require card on file</span>
                </label>
                <Input
                  label="Direct booking link (slug)"
                  value={form.directBookingSlug ?? ''}
                  onChange={e => setForm(f => ({ ...f, directBookingSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="e.g. hydrafacial-express"
                  hint="Lowercase letters, numbers and hyphens only."
                />
                {editing && (form.directBookingSlug?.trim() ?? '') !== '' && (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={`${API_BASE}/book?service=${form.directBookingSlug?.trim()}`}
                      className="flex-1 px-2.5 py-2 rounded-lg border border-[#E8E8E4] bg-[#FAFAF8] text-xs text-[#6B6B62] focus:outline-none"
                      onFocus={e => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${API_BASE}/book?service=${form.directBookingSlug?.trim()}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#1B1B16]">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of the service..."
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E8E4] text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654] placeholder-[#A8A89F] resize-none"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="accent-[#E4C654] w-4 h-4"
                />
                <span className="text-sm text-[#1B1B16]">Active (visible to clients)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!form.name.trim() || saving} onClick={save}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Service'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addOnsFor && (
        <AddOnsModal serviceId={addOnsFor.id} serviceName={addOnsFor.name} onClose={() => setAddOnsFor(null)} />
      )}

      {protocolFor && (
        <ProtocolModal serviceId={protocolFor.id} serviceName={protocolFor.name} onClose={() => setProtocolFor(null)} />
      )}
    </div>
  );
}
