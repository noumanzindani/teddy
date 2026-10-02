'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Package, ToggleLeft, ToggleRight, X, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  type: 'retail' | 'professional' | 'both';
  price: number;
  stock: number;
  ingredients: string[];
  isActive: boolean;
}

const TYPE_META: Record<Product['type'], { label: string; cls: string }> = {
  retail:       { label: 'Retail',       cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  professional: { label: 'Professional', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  both:         { label: 'Retail + Pro', cls: 'bg-green-50 text-green-700 border-green-200' },
};

const empty = { name: '', brand: '', description: '', type: 'retail' as Product['type'], price: 0, stock: 0, ingredientsText: '', isActive: true };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProducts(await api.get<Product[]>('/products')); } catch { /* */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(empty); setShowForm(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, brand: p.brand ?? '', description: p.description ?? '', type: p.type, price: Number(p.price), stock: p.stock, ingredientsText: (p.ingredients ?? []).join(', '), isActive: p.isActive });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name, brand: form.brand, description: form.description, type: form.type,
      price: Number(form.price), stock: Number(form.stock), isActive: form.isActive,
      ingredients: form.ingredientsText.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) await api.patch(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      setShowForm(false); await load();
    } catch { /* */ } finally { setSaving(false); }
  }

  async function toggleActive(p: Product) {
    try { await api.patch(`/products/${p.id}`, { isActive: !p.isActive }); await load(); } catch { /* */ }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B1B16]">Products</h1>
          <p className="text-sm text-[#6B6B62]">Manage in-store retail & professional products and their ingredients.</p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Add Product</Button>
      </div>

      {loading ? <p className="text-[#6B6B62]">Loading…</p> : (
        <div className="grid gap-3">
          {products.map((p) => (
            <Card key={p.id} className={cn('p-4 flex items-center gap-4', !p.isActive && 'opacity-60')}>
              <div className="w-10 h-10 rounded-lg bg-[#E4C654]/15 flex items-center justify-center"><Package size={18} className="text-[#C9AD3A]" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#1B1B16]">{p.name}</p>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', TYPE_META[p.type].cls)}>{TYPE_META[p.type].label}</span>
                </div>
                <p className="text-xs text-[#6B6B62]">{p.brand}{p.brand && ' · '}{p.ingredients.length} ingredients · stock {p.stock}</p>
              </div>
              {p.type !== 'professional' && <p className="font-bold text-[#1B1B16]">${Number(p.price).toFixed(2)}</p>}
              <button onClick={() => toggleActive(p)} title={p.isActive ? 'Deactivate' : 'Activate'} className="text-[#6B6B62]">
                {p.isActive ? <ToggleRight size={22} className="text-green-600" /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => openEdit(p)} className="text-[#6B6B62] hover:text-[#1B1B16]"><Pencil size={16} /></button>
            </Card>
          ))}
          {!products.length && <Card className="p-8 text-center text-[#6B6B62]">No products yet. Add your first product.</Card>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <Card className="w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#1B1B16]">{editing ? 'Edit' : 'New'} Product</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-[#A8A89F]" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name"><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand"><input className={inp} value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
                <Field label="Type">
                  <select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product['type'] })}>
                    <option value="retail">Retail (sold at checkout)</option>
                    <option value="professional">Professional (back-bar)</option>
                    <option value="both">Both</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price ($)"><input type="number" className={inp} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
                <Field label="Stock"><input type="number" className={inp} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Ingredients (comma-separated)">
                <textarea className={inp} rows={3} placeholder="Aqua, Glycerin, Parfum…" value={form.ingredientsText} onChange={(e) => setForm({ ...form, ingredientsText: e.target.value })} />
                <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Used for the client allergy safety check.</p>
              </Field>
              <Field label="Description"><textarea className={inp} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Button className="w-full" disabled={saving || !form.name} onClick={save}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Product'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full rounded-lg border border-[#E8E8E4] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4C654]';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-semibold text-[#6B6B62]">{label}</label><div className="mt-1">{children}</div></div>;
}
