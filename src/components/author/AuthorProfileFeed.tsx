'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  MessageSquare,
  Share2,
  Check,
  Pin,
  Pencil,
  Trash2,
  Send,
  Loader2,
  Plus,
} from 'lucide-react';
import { WorkCard } from '@/components/work/WorkCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import type { Work } from '@/lib/types/platform';

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
  authorUserId?: string;
}

export function AuthorProfileFeed({
  works,
  posts,
  authorPenName,
  authorUserId,
}: AuthorProfileFeedProps) {
  const { user, profile } = useAuth();
  const isAuthorOwner = Boolean(
    user && authorUserId && (user.id === authorUserId || profile?.is_admin),
  );

  const [activeTab, setActiveTab] = useState<'all_works' | 'stories' | 'posts'>('all_works');
  const [copied, setCopied] = useState(false);

  // Feed Posts state
  const [feedPosts, setFeedPosts] = useState<AuthorPostItem[]>(posts);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostPinned, setNewPostPinned] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Editing state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostPinned, setEditPostPinned] = useState(false);
  const [savingEditPost, setSavingEditPost] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);

  const filteredWorks = works.filter((w) => {
    if (activeTab === 'stories') return w.type === 'serialized_story';
    return true;
  });

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${authorPenName} — Manbora`,
          text: `${authorPenName}ning asarlarini Manborada o‘qing`,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      setSubmittingPost(true);
      setFeedError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/author/posts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: newPostContent.trim(),
          pinned: newPostPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Postni chop etishda xatolik yuz berdi');
      }

      setFeedPosts((prev) => [data.post, ...prev]);
      setNewPostContent('');
      setNewPostPinned(false);
    } catch (err: any) {
      setFeedError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmittingPost(false);
    }
  };

  const startEditingPost = (post: AuthorPostItem) => {
    setEditingPostId(post.id);
    setEditPostContent(post.content);
    setEditPostPinned(Boolean(post.pinned));
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditPostContent('');
    setEditPostPinned(false);
  };

  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId || !editPostContent.trim()) return;

    try {
      setSavingEditPost(true);
      setFeedError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/author/posts', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: editingPostId,
          content: editPostContent.trim(),
          pinned: editPostPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Postni yangilashda xatolik yuz berdi');
      }

      const updated = data.post;
      setFeedPosts((prev) => prev.map((p) => (p.id === editingPostId ? { ...p, ...updated } : p)));
      cancelEditingPost();
    } catch (err: any) {
      setFeedError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSavingEditPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Haqiqatan ham ushbu xabarni o‘chirmoqchimisiz?')) return;

    try {
      setFeedError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/author/posts?id=${postId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'O‘chirishda xatolik');
      }
    } catch (err: any) {
      setFeedError(err.message || 'Xatolik yuz berdi');
    }
  };

  const handleTogglePin = async (post: AuthorPostItem) => {
    try {
      setFeedError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/author/posts', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          id: post.id,
          pinned: !post.pinned,
        }),
      });

      if (res.ok) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, pinned: !post.pinned } : p)),
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation & Share Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5DD] pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('all_works')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === 'all_works'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]'
            }`}
          >
            Asarlar ({works.length})
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeTab === 'stories'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]'
            }`}
          >
            Hikoyalar ({works.filter((w) => w.type === 'serialized_story').length})
          </button>
          {(feedPosts.length > 0 || isAuthorOwner) && (
            <button
              onClick={() => setActiveTab('posts')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'posts'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-white text-[#78716C] hover:bg-[#F5F2EC] hover:text-[#1C1917]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Yangiliklar ({feedPosts.length})</span>
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

      {feedError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {feedError}
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'posts' ? (
        <div className="space-y-4 max-w-2xl">
          {/* Create Post Box for Author Owner */}
          {isAuthorOwner && (
            <form
              onSubmit={handleCreatePost}
              className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 shadow-2xs"
            >
              <label className="block text-xs font-bold text-amber-950">
                Kitobxonlaringiz uchun yangi e’lon yoki xabar yozing:
              </label>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Yangi bob chiqishi, ijodiy rejalar yoki fikr-mulohazalaringizni yozing..."
                rows={3}
                className="w-full p-3 rounded-xl bg-white border border-amber-200/80 text-xs sm:text-sm focus:border-amber-600 outline-hidden resize-none placeholder:text-stone-400"
                required
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-bold text-stone-700">
                  <input
                    type="checkbox"
                    checked={newPostPinned}
                    onChange={(e) => setNewPostPinned(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                  />
                  <span>Yuqoriga qadash (Pin)</span>
                </label>
                <button
                  type="submit"
                  disabled={submittingPost || !newPostContent.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  {submittingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Chop etilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Chop etish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {feedPosts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#EAE5DD] text-stone-500 text-xs font-semibold shadow-xs">
              Hozircha muallif tomonidan yangiliklar e’lon qilinmagan.
            </div>
          ) : (
            feedPosts.map((post) => (
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

                  <div className="flex items-center gap-3">
                    <span>{new Date(post.created_at).toLocaleDateString('uz-UZ')}</span>
                    {isAuthorOwner && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(post)}
                          className={`p-1 transition-colors ${
                            post.pinned ? 'text-amber-700' : 'text-stone-400 hover:text-stone-700'
                          }`}
                          title={post.pinned ? 'Qadalganini bekor qilish' : 'Yuqoriga qadash'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingPost(post)}
                          className="p-1 text-stone-400 hover:text-amber-700 transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {editingPostId === post.id ? (
                  <form onSubmit={handleSaveEditPost} className="space-y-3 pt-1">
                    <textarea
                      value={editPostContent}
                      onChange={(e) => setEditPostContent(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden resize-none"
                      rows={3}
                      required
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-stone-700">
                        <input
                          type="checkbox"
                          checked={editPostPinned}
                          onChange={(e) => setEditPostPinned(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Qadash</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingPost}
                          className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 font-bold"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="submit"
                          disabled={savingEditPost || !editPostContent.trim()}
                          className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingEditPost ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          <span>Saqlash</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm leading-relaxed text-[#292524] whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {filteredWorks.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#EAE5DD] text-stone-500 text-xs font-semibold shadow-xs">
              Bu bo‘limda asarlar topilmadi.
            </div>
          ) : (
            <div className="grid grid-cols-2 min-[430px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4.5">
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
