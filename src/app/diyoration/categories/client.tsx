'use client';

import React, { useState } from 'react';
import { slugify } from '@/lib/utils/formatters';
import { Plus, FolderTree, Edit3, CheckCircle2, Loader2 } from 'lucide-react';

interface CategoriesManagerClientProps {
  initialCategories: any[];
}

export function CategoriesManagerClient({ initialCategories }: CategoriesManagerClientProps) {
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description, sort_order: categories.length + 1 }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setName('');
        setSlug('');
        setDescription('');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Category Card */}
      <form onSubmit={handleAddCategory} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Yangi Kategoriya Qo‘shish</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kategoriya Nomi *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Masalan: Logistika va Tashuvlar"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="logistika-va-tashuvlar"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-slate-800 bg-slate-50/50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4" />}
          <span>Kategoriyani saqlash</span>
        </button>
      </form>

      {/* Existing Categories List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
        <h3 className="text-base font-black text-slate-900">Mavjud Kategoriyalar ({categories.length})</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((c) => (
            <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <strong className="text-sm font-extrabold text-slate-900 block">{c.name}</strong>
                <span className="text-xs font-mono text-slate-400">/{c.slug}</span>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Tartib: #{c.sort_order}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
