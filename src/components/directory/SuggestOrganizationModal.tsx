'use client';

import React, { useState } from 'react';
import { PlusCircle, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Category, Region } from '@/lib/types/directory';

interface SuggestOrganizationModalProps {
  categories: Category[];
  regions: Region[];
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
}

export function SuggestOrganizationModal({
  categories,
  regions,
  isOpen,
  onClose,
  initialName = '',
}: SuggestOrganizationModalProps) {
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cityDistrict, setCityDistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen && initialName) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category_id: categoryId ? Number(categoryId) : null,
          region_id: regionId ? Number(regionId) : null,
          city_district: cityDistrict,
          phone_number: phone,
          website_url: websiteUrl,
          source_url: sourceUrl,
          note,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Taklif yuborishda xatolik yuz berdi');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setName('');
        setNote('');
      }, 2000);
    } catch {
      setError('Tarmoq xatoligi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-blue-600" />
            <span>Tashkilot Qo‘shishni Taklif Qilish</span>
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-extrabold text-emerald-900 text-base">Rahmat! Taklifingiz qabul qilindi</h4>
            <p className="text-xs text-emerald-700 font-medium">Administratorlarimiz tez orada tekshirib reestrga kiritishadi.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Anti-spam honeypot hidden field */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            <div>
              <label className="block mb-1">Tashkilot yoki Xizmat Nomi *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Yagona portali (my.gov.uz)"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 bg-slate-50/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">Kategoriya</label>
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
                <label className="block mb-1">Viloyat / Hudud</label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">Shahar / Tuman (Ixtiyoriy)</label>
                <input
                  type="text"
                  value={cityDistrict}
                  onChange={(e) => setCityDistrict(e.target.value)}
                  placeholder="Yunusobod tumani"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block mb-1">Telefon Raqami (Ixtiyoriy)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 71 200 00 00"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">Veb-sayt Havolasi (Ixtiyoriy)</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block mb-1">Manba URL (Ixtiyoriy)</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://gov.uz/..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1">Qo‘shimcha Izoh (Ixtiyoriy)</label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ushbu tashkilot haqida qo‘shimcha ma’lumot..."
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs hover:bg-slate-200"
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" />}
                <span>Taklifni yuborish</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
