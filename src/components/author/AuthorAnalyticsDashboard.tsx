"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Bookmark,
  Heart,
  MessageSquare,
  AlertTriangle,
  Coins,
  ChevronLeft,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";

interface AnalyticsSummary {
  totalReads: number;
  uniqueReaders: number;
  totalFollowers: number;
  totalBookmarks: number;
  totalLibraryAdds: number;
  totalReactions: number;
  totalComments: number;
  totalEarningsUzs: number;
}

interface ChapterFunnelItem {
  chapterId: string;
  chapterNumber: number;
  title: string;
  reads: number;
  dropOffRatePercent: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  chapterFunnel: ChapterFunnelItem[];
  dropOffAlert: {
    chapterNumber: number;
    title: string;
    dropOffCount: number;
  } | null;
  worksList: Array<{ id: string; title: string }>;
}

export default function AuthorAnalyticsDashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [selectedWorkId, setSelectedWorkId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("period", period);
        if (selectedWorkId !== "all") {
          params.set("work_id", selectedWorkId);
        }
        const res = await fetch(`/api/author/analytics?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Analitika ma'lumotlarini yuklab bo‘lmadi");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [period, selectedWorkId]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16 pt-8 text-[#1A1A1A]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top bar navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/muallif"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5A5550] shadow-sm transition hover:bg-[#F2EFE9] hover:text-[#1A1A1A]"
            >
              <ChevronLeft className="h-4 w-4" />
              Muallif kabineti
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A] sm:text-2xl">
              Asarlar tahlili va kitobxonlar oqimi
            </h1>
          </div>

          {/* Work Selector */}
          {data?.worksList && data.worksList.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#8A847C]" />
              <select
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="rounded-lg border border-[#E5E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] shadow-sm focus:border-[#4B6BFB] focus:outline-none"
              >
                <option value="all">Barcha asarlarim</option>
                {data.worksList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Time period filter tabs */}
        <div className="mb-8 flex items-center gap-2 border-b border-[#E5E0D8] pb-3">
          <Calendar className="mr-1 h-4 w-4 text-[#8A847C]" />
          {(
            [
              { id: "7d", label: "Oxirgi 7 kun" },
              { id: "30d", label: "30 kun" },
              { id: "90d", label: "90 kun" },
              { id: "all", label: "Barcha vaqt" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                period === t.id
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-white text-[#5A5550] hover:bg-[#EAE6DF]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#4B6BFB]" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* Drop-off Alert Card */}
            {data.dropOffAlert && (
              <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-amber-900">
                    O‘quvchilar chiqib ketish xavfi aniqlandi
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    Kitobxonlarning eng katta qismi{" "}
                    <strong>
                      {data.dropOffAlert.chapterNumber}-bob: &quot;
                      {data.dropOffAlert.title}&quot;
                    </strong>{" "}
                    bobidan keyin o‘qishni to‘xtatmoqda ({data.dropOffAlert.dropOffCount} ta o‘quvchi kamaygan).
                    Ushbu bobning syujet sur’ati yoki tushunarliligini qayta ko‘rib chiqishni tavsiya qilamiz.
                  </p>
                </div>
              </div>
            )}

            {/* Metric Summary Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <BookOpen className="h-4 w-4 text-[#4B6BFB]" />
                  Jami mutolaalar
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {data.summary.totalReads.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  Ko‘rilgan boblar soni
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Noyob kitobxonlar
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {data.summary.uniqueReaders.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  Haqiqiy faol o‘quvchilar
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <Bookmark className="h-4 w-4 text-amber-600" />
                  Kutubxona & Xatcho‘p
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {(data.summary.totalLibraryAdds + data.summary.totalBookmarks).toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  {data.summary.totalLibraryAdds} javonga, {data.summary.totalBookmarks} xatcho‘pga
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <Coins className="h-4 w-4 text-amber-500" />
                  Muallif daromadi
                </div>
                <div className="mt-2 text-2xl font-extrabold text-emerald-600">
                  {data.summary.totalEarningsUzs.toLocaleString()} <span className="text-xs font-semibold text-[#8A847C]">so‘m</span>
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  80% muallif ulushi
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  Kuzatuvchilar
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {data.summary.totalFollowers.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  Asarni kuzatayotganlar
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Reaksiyalar
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {data.summary.totalReactions.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  Boblardagi hissiyotlar
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E0D8] bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#8A847C]">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Izohlar
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  {data.summary.totalComments.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[#8A847C]">
                  Kitobxonlar fikrlari
                </div>
              </div>
            </div>

            {/* Chapter Funnel Section */}
            <div className="rounded-xl border border-[#E5E0D8] bg-white p-5 shadow-xs sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A]">
                    Boblar bo‘yicha o‘qilish voronkasi
                  </h3>
                  <p className="text-xs text-[#8A847C]">
                    Har bir bob necha marta o‘qilgani va oldingi bobga nisbatan yo‘qotish foizi
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-[#8A847C]" />
              </div>

              {data.chapterFunnel.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8A847C]">
                  Hozircha boblar bo‘yicha mutolaa ma’lumotlari yetarli emas.
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const maxReads = Math.max(...data.chapterFunnel.map((c) => c.reads), 1);
                    return data.chapterFunnel.map((ch) => {
                      const percentage = Math.round((ch.reads / maxReads) * 100);
                      const isHighDrop = ch.dropOffRatePercent > 35;
                      return (
                        <div key={ch.chapterId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#1A1A1A]">
                              {ch.chapterNumber}-bob: {ch.title}
                            </span>
                            <div className="flex items-center gap-3">
                              {ch.dropOffRatePercent > 0 && (
                                <span
                                  className={`font-semibold ${
                                    isHighDrop ? "text-red-600" : "text-[#8A847C]"
                                  }`}
                                >
                                  -{ch.dropOffRatePercent}% chiqish
                                </span>
                              )}
                              <span className="font-bold text-[#1A1A1A]">
                                {ch.reads.toLocaleString()} o‘qish
                              </span>
                            </div>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F2EFE9]">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isHighDrop ? "bg-amber-500" : "bg-[#4B6BFB]"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
