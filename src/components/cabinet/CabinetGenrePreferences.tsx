"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Sparkles, Check, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadGenres = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/user/genres", { headers });
      if (!res.ok) {
        throw new Error("Janrlar ro‘yxatini yuklab bo‘lmadi");
      }
      const data = await res.json();
      const rawGenres = data.genres || data.allGenres || [];
      const rawSelected = data.selectedGenreIds || data.preferredGenreIds || [];

      setGenres(rawGenres);
      setSelectedIds(rawSelected);
    } catch (err: any) {
      setErrorMsg(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  const toggleGenre = (id: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) {
        setErrorMsg("Ko‘pi bilan 5 ta janr tanlash mumkin");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length < 3) {
      setErrorMsg("Iltimos, kamida 3 ta janr tanlang");
      return;
    }
    if (selectedIds.length > 5) {
      setErrorMsg("Ko‘pi bilan 5 ta janr tanlash mumkin");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/user/genres", {
        method: "POST",
        headers,
        body: JSON.stringify({ genreIds: selectedIds }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Janrlarni saqlab bo‘lmadi");
      }

      setSuccessMsg("Sevimli janrlaringiz muvaffaqiyatli saqlandi");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#EAE5DD] bg-white p-6 sm:p-8 shadow-xs max-w-2xl space-y-5 animate-pulse">
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="h-10 w-10 rounded-2xl bg-stone-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-stone-200 rounded-md" />
            <div className="h-3 w-80 max-w-full bg-stone-200 rounded-md" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-stone-200 rounded-md" />
          <div className="h-5 w-36 bg-stone-200 rounded-full" />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-2xl bg-stone-200"
              style={{ width: `${60 + ((i * 17) % 45)}px` }}
            />
          ))}
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-stone-100">
          <div className="h-10 w-32 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (errorMsg && genres.length === 0) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-xs max-w-2xl text-center space-y-3">
        <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />
        <p className="text-xs font-semibold text-red-800">{errorMsg}</p>
        <button
          type="button"
          onClick={() => loadGenres()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Qayta urinish</span>
        </button>
      </div>
    );
  }

  if (genres.length === 0) {
    return (
      <div className="rounded-3xl border border-[#EAE5DD] bg-white p-6 sm:p-8 shadow-xs max-w-2xl text-center py-10 text-xs text-stone-500">
        Hozircha faol janrlar ro‘yxati mavjud emas.
      </div>
    );
  }

  const isValidCount = selectedIds.length >= 3 && selectedIds.length <= 5;

  return (
    <div className="rounded-3xl border border-[#EAE5DD] bg-white p-6 sm:p-8 shadow-xs max-w-2xl space-y-5">
      <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-sans text-lg font-black text-stone-900">
            Sevimli adabiy janrlar
          </h2>
          <p className="text-xs text-stone-500">
            Sizga mos asarlarni tavsiya qilishimiz uchun kamida 3 ta, ko‘pi bilan 5 ta janr tanlang
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected count badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-stone-700">Mavjud janrlar</span>
        <span
          className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
            isValidCount
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          Tanlangan: {selectedIds.length} / 5 (kamida 3 ta)
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {genres.map((genre) => {
          const isSelected = selectedIds.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => toggleGenre(genre.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 ${
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

      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValidCount}
          className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
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

        {!isValidCount && (
          <span className="text-[11px] text-stone-400 font-medium">
            {selectedIds.length < 3
              ? `Yana ${3 - selectedIds.length} ta janr tanlang`
              : "Ko‘pi bilan 5 ta tanlash mumkin"}
          </span>
        )}
      </div>
    </div>
  );
}
