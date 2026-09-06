"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Check, Loader2, CheckCircle2 } from "lucide-react";

interface GenreItem {
  id: string;
  name: string;
  slug: string;
}

export function CabinetGenrePreferences() {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadGenres() {
      try {
        const res = await fetch("/api/user/genres");
        if (res.ok) {
          const data = await res.json();
          setGenres(data.allGenres || []);
          setSelectedIds(data.preferredGenreIds || []);
        }
      } catch (err) {
        console.error("Failed to load user genres:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGenres();
  }, []);

  const toggleGenre = (id: string) => {
    setSuccessMsg(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/user/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genreIds: selectedIds }),
      });
      if (res.ok) {
        setSuccessMsg("Sevimli janrlaringiz muvaffaqiyatli saqlandi");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error("Failed to save genres:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#EAE5DD] bg-white p-6 sm:p-8 shadow-xs max-w-2xl flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#EAE5DD] bg-white p-6 sm:p-8 shadow-xs max-w-2xl space-y-5">
      <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-black text-stone-900">
            Sevimli adabiy janrlar
          </h2>
          <p className="text-xs text-stone-500">
            Sizga mos asarlarni tavsiya qilishimiz uchun qiziqishlaringizni belgilang
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {genres.map((genre) => {
          const isSelected = selectedIds.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => toggleGenre(genre.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                isSelected
                  ? "bg-amber-600 text-white shadow-xs"
                  : "border border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-300 hover:bg-amber-50/50"
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
              <span>{genre.name}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saqlanmoqda...</span>
            </>
          ) : (
            <span>Janrlarni saqlash</span>
          )}
        </button>
      </div>
    </div>
  );
}
