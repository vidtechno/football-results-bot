'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/formatters';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface NewOrganizationFormClientProps {
  categories: any[];
  regions: any[];
}

export function NewOrganizationFormClient({
  categories,
  regions,
}: NewOrganizationFormClientProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugCustom, setIsSlugCustom] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [organizationType, setOrganizationType] = useState('private_service');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugCustom) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          category_id: categoryId ? Number(categoryId) : null,
          region_id: regionId ? Number(regionId) : null,
          organization_type: organizationType,
          description,
          website_url: websiteUrl,
          source_name: sourceName,
          source_url: sourceUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Tashkilotni yaratishda xatolik');
        setLoading(false);
        return;
      }

      router.push(`/diyoration/organizations/${data.organization.id}`);
    } catch {
      setError('Tarmoq xatoligi yuz berdi');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Tashkilot nomi *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Masalan: O‘zsanoatqurilishbank (SQB)"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 bg-slate-50/50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug (Avtomatik yoki moslashtirilgan)</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setIsSlugCustom(true);
            }}
            placeholder="sqb-bank"
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kategoriya</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Kategoriya tanlang</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Viloyat / Hudud</label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Hudud tanlang</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tashkilot turi</label>
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="bank">Tijorat Banki</option>
              <option value="government">Davlat Organi</option>
              <option value="utility">Kommunal</option>
              <option value="telecom">Telekom</option>
              <option value="public_service">Jamoat Xizmati</option>
              <option value="private_service">Xususiy Xizmat</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Qisqacha tavsifi (Uzbek Latin)</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tashkilot faoliyati haqida qisqacha ma’lumot..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 bg-slate-50/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Rasmiy Veb-Sayti</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://sqb.uz"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tasdiqlangan Manba Nomi</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Markaziy Bank (CBU)"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Manba URL Havolasi</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://cbu.uz/en/credit-organizations/banks/"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200"
        >
          Bekor qilish
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 active:scale-95 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Yaratish va davom etish</span>
        </button>
      </div>
    </form>
  );
}
