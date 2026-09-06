"use client";

import React, { useState } from "react";
import { BookOpen, MessageSquare, Share2, Check, Pin } from "lucide-react";
import { WorkCard } from "@/components/work/WorkCard";
import type { Work } from "@/lib/types/platform";

interface AuthorPostItem {
  id: string;
  content: string;
  pinned: boolean;
  created_at: string;
}

interface AuthorProfileFeedProps {
  works: Work[];
  posts: AuthorPostItem[];
  authorPenName: string;
}

export function AuthorProfileFeed({
  works,
  posts,
  authorPenName,
}: AuthorProfileFeedProps) {
  const [activeTab, setActiveTab] = useState<"all_works" | "ongoing" | "completed" | "posts">("all_works");
  const [copied, setCopied] = useState(false);

  const filteredWorks = works.filter((w) => {
    if (activeTab === "ongoing") return w.completion_status === "ongoing";
    if (activeTab === "completed") return w.completion_status === "completed";
    return true;
  });

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${authorPenName} — Manbora`,
          text: `${authorPenName}ning asarlarini Manborada o‘qing`,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Share Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5DD] pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab("all_works")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "all_works"
                ? "bg-[#1C1917] text-white shadow-xs"
                : "bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]"
            }`}
          >
            Barcha asarlar ({works.length})
          </button>
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "ongoing"
                ? "bg-[#1C1917] text-white shadow-xs"
                : "bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]"
            }`}
          >
            Davom etayotgan ({works.filter((w) => w.completion_status === "ongoing").length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === "completed"
                ? "bg-[#1C1917] text-white shadow-xs"
                : "bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]"
            }`}
          >
            Tugallangan ({works.filter((w) => w.completion_status === "completed").length})
          </button>
          {posts.length > 0 && (
            <button
              onClick={() => setActiveTab("posts")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "posts"
                  ? "bg-[#1C1917] text-white shadow-xs"
                  : "bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Yangiliklar ({posts.length})</span>
            </button>
          )}
        </div>

        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE5DD] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#57534E] shadow-xs transition hover:bg-[#F5F2EC] hover:text-[#1C1917]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Havola nusxalandi!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-[#A8A29E]" />
              <span>Ulashish</span>
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      {activeTab === "posts" ? (
        <div className="space-y-4 max-w-2xl">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-[#EAE5DD] bg-white p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-[#78716C]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1C1917]">{authorPenName}</span>
                  {post.pinned && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      <Pin className="h-3 w-3" />
                      Qadalgan
                    </span>
                  )}
                </div>
                <span>{new Date(post.created_at).toLocaleDateString("uz-UZ")}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#292524] whitespace-pre-wrap">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredWorks.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#EAE5DD] text-stone-500 text-xs font-semibold shadow-xs">
              Bu bo‘limda asarlar topilmadi.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
              {filteredWorks.map((work) => (
                <WorkCard key={work.id} work={work} context="catalogue" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
