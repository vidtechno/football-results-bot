'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Reply,
  Trash2,
  AlertTriangle,
  Send,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { formatUzbekDate } from '@/lib/utils/formatters';

interface CommentUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

interface CommentItem {
  id: string;
  chapter_id: string;
  work_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_spoiler: boolean;
  is_deleted: boolean;
  is_author: boolean;
  is_edited?: boolean;
  edited_at?: string | null;
  created_at: string;
  updated_at: string;
  user?: CommentUser;
  replies?: CommentItem[];
}

interface ChapterCommentsSectionProps {
  chapterId: string;
  workId: string;
  chapterTitle: string;
  authorUserId?: string;
}

export function ChapterCommentsSection({
  chapterId,
  workId,
  chapterTitle,
  authorUserId,
}: ChapterCommentsSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editIsSpoiler, setEditIsSpoiler] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEditing = (comment: CommentItem) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setEditIsSpoiler(Boolean(comment.is_spoiler));
    setReplyingTo(null);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditContent('');
    setEditIsSpoiler(false);
  };

  const handleSaveEdit = async (e: React.FormEvent, isReply = false, parentId?: string) => {
    e.preventDefault();
    if (!editingCommentId || !editContent.trim()) return;

    try {
      setSavingEdit(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/chapters/comments', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          commentId: editingCommentId,
          content: editContent.trim(),
          isSpoiler: editIsSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Izohni yangilashda xatolik yuz berdi');
      }

      const updated = data.comment;
      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((root) =>
            root.id === parentId
              ? {
                  ...root,
                  replies: (root.replies || []).map((r) =>
                    r.id === editingCommentId ? { ...r, ...updated } : r
                  ),
                }
              : root
          )
        );
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === editingCommentId
              ? { ...c, ...updated, replies: c.replies }
              : c
          )
        );
      }
      cancelEditing();
    } catch (err: any) {
      setError(err.message || 'Izohni yangilashda xatolik yuz berdi');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      try {
        setLoading(true);
        const res = await fetch(`/api/chapters/comments?chapterId=${chapterId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setComments(data.comments || []);
            setTotalCount(data.totalCount || 0);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadComments();
    return () => {
      isMounted = false;
    };
  }, [chapterId]);

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePostComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    if (!user) return;

    const text = parentId ? replyContent.trim() : content.trim();
    if (!text) return;

    try {
      setSubmitting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/chapters/comments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chapterId,
          workId,
          parentId,
          content: text,
          isSpoiler: parentId ? false : isSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Izohni saqlashda xatolik yuz berdi');
      }

      const newComment = data.comment;
      if (parentId) {
        setComments((prev) =>
          prev.map((root) =>
            root.id === parentId
              ? { ...root, replies: [...(root.replies || []), newComment] }
              : root
          )
        );
        setReplyingTo(null);
        setReplyContent('');
      } else {
        setComments((prev) => [newComment, ...prev]);
        setContent('');
        setIsSpoiler(false);
      }
      setTotalCount((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string, isReply = false, parentId?: string) => {
    if (!confirm('Haqiqatan ham bu izohni o‘chirmoqchimisiz?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/chapters/comments?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((root) =>
              root.id === parentId
                ? {
                    ...root,
                    replies: (root.replies || []).map((r) =>
                      r.id === id ? { ...r, is_deleted: true, content: 'Ushbu izoh o‘chirildi' } : r
                    ),
                  }
                : root
            )
          );
        } else {
          setComments((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, is_deleted: true, content: 'Ushbu izoh o‘chirildi' } : c
            )
          );
        }
      }
    } catch {
      // ignore
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-stone-200/80 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
            <MessageSquare className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <h3 className="font-serif font-black text-lg text-stone-900 tracking-tight">
              Bob yuzasidan fikrlar
            </h3>
            <p className="text-[11px] text-stone-500 font-medium">
              «{chapterTitle}» bobi bo‘yicha kitobxonlar munozarasi ({totalCount})
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {/* Write Comment Box */}
      {user ? (
        <form onSubmit={(e) => handlePostComment(e, null)} className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>{profile?.display_name || user.email?.split('@')[0] || 'Siz'} sifatida yozing:</span>
            </span>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
              />
              <span>Spoiler</span>
            </label>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bob haqidagi taassurotlaringizni yozing..."
            rows={3}
            className="w-full p-3 rounded-xl bg-white border border-stone-200 text-xs sm:text-sm focus:border-amber-600 focus:ring-1 focus:ring-amber-400 outline-hidden resize-none transition-all placeholder:text-stone-400"
            required
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Fikr bildirish</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-4 text-center space-y-2">
          <p className="text-xs text-amber-950 font-bold">
            Fikr bildirish va boshqa kitobxonlar bilan munozara qilish uchun tizimga kiring.
          </p>
          <Link
            href={`/kirish?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors shadow-2xs"
          >
            Kirish yoki ro‘yxatdan o‘tish
          </Link>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4 pt-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-stone-400 font-medium">
            Izohlar yuklanmoqda...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 italic">
            Hozircha ushbu bobga fikr bildirilmagan. Birinchi bo‘lib o‘z taassurotingizni qoldiring!
          </div>
        ) : (
          comments.map((c) => {
            const isAuthor = c.is_author || (authorUserId && c.user_id === authorUserId);
            const isSpoilerVisible = !c.is_spoiler || revealedSpoilers[c.id];
            const canDelete = user && (user.id === c.user_id || profile?.is_admin);
            const canEdit = user && user.id === c.user_id;

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3 shadow-2xs">
                {/* User Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center uppercase shrink-0">
                      {(c.user?.display_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-900">
                          {c.user?.display_name || 'Kitobxon'}
                        </span>
                        {isAuthor && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[9px] uppercase tracking-wider border border-amber-300">
                            Muallif
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                        <span>{formatUzbekDate(c.created_at)}</span>
                        {c.is_edited && (
                          <span
                            className="text-[9px] text-stone-400 italic"
                            title={c.edited_at ? `Tahrirlangan: ${formatUzbekDate(c.edited_at)}` : 'Tahrirlangan'}
                          >
                            (tahrirlangan)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && !c.is_deleted && editingCommentId !== c.id && (
                      <button
                        type="button"
                        onClick={() => startEditing(c)}
                        className="p-1 text-stone-400 hover:text-amber-700 transition-colors"
                        title="Izohni tahrirlash"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && !c.is_deleted && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Izohni o‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Content (with Inline Edit or Spoiler blur) */}
                {editingCommentId === c.id ? (
                  <form onSubmit={(e) => handleSaveEdit(e, false)} className="space-y-2 pt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:bg-white focus:border-amber-600 outline-hidden resize-none"
                      rows={3}
                      required
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-amber-900">
                        <input
                          type="checkbox"
                          checked={editIsSpoiler}
                          onChange={(e) => setEditIsSpoiler(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Spoiler</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 font-bold"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="submit"
                          disabled={savingEdit || !editContent.trim()}
                          className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          <span>Saqlash</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : c.is_deleted ? (
                  <p className="text-xs text-stone-400 italic py-1">
                    Ushbu izoh muallif tomonidan o‘chirildi.
                  </p>
                ) : c.is_spoiler && !isSpoilerVisible ? (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ushbu izohda syujet tafsilotlari (spoiler) mavjud</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSpoiler(c.id)}
                      className="px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-950 font-bold text-[10px] hover:bg-amber-300 transition-colors shrink-0"
                    >
                      Ko‘rish
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {c.is_spoiler && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700">
                        <EyeOff className="w-3 h-3" />
                        <span>Spoiler</span>
                      </div>
                    )}
                    <p className="text-xs text-stone-800 leading-relaxed font-normal whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                )}

                {/* Reply action & replies list */}
                {!c.is_deleted && editingCommentId !== c.id && (
                  <div className="pt-1 flex items-center gap-3 text-xs">
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(replyingTo === c.id ? null : c.id);
                          setReplyContent('');
                        }}
                        className="text-stone-500 hover:text-amber-800 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Javob berish</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Reply Form */}
                {replyingTo === c.id && (
                  <form onSubmit={(e) => handlePostComment(e, c.id)} className="pl-4 pt-2 border-l-2 border-amber-200 space-y-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Javobingizni yozing..."
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:bg-white focus:border-amber-600 outline-hidden"
                      required
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 font-bold"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !replyContent.trim()}
                        className="px-3 py-1 rounded-xl bg-stone-900 text-white text-xs font-bold disabled:opacity-50"
                      >
                        Javob berish
                      </button>
                    </div>
                  </form>
                )}

                {/* Threaded Replies (1-level deep) */}
                {c.replies && c.replies.length > 0 && (
                  <div className="pl-4 space-y-2.5 border-l-2 border-stone-100 mt-2">
                    {c.replies.map((reply) => {
                      const isReplyAuthor = reply.is_author || (authorUserId && reply.user_id === authorUserId);
                      const canDeleteReply = user && (user.id === reply.user_id || profile?.is_admin);
                      const canEditReply = user && user.id === reply.user_id;

                      return (
                        <div key={reply.id} className="bg-stone-50/70 p-3 rounded-xl space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900">
                                {reply.user?.display_name || 'Kitobxon'}
                              </span>
                              {isReplyAuthor && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[8px] uppercase tracking-wider border border-amber-300">
                                  Muallif
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                <span>{formatUzbekDate(reply.created_at)}</span>
                                {reply.is_edited && (
                                  <span
                                    className="text-[9px] text-stone-400 italic"
                                    title={reply.edited_at ? `Tahrirlangan: ${formatUzbekDate(reply.edited_at)}` : 'Tahrirlangan'}
                                  >
                                    (tahrirlangan)
                                  </span>
                                )}
                              </span>
                              {canEditReply && !reply.is_deleted && editingCommentId !== reply.id && (
                                <button
                                  type="button"
                                  onClick={() => startEditing(reply)}
                                  className="p-0.5 text-stone-400 hover:text-amber-700 transition-colors"
                                  title="Tahrirlash"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {canDeleteReply && !reply.is_deleted && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(reply.id, true, c.id)}
                                  className="p-0.5 text-stone-400 hover:text-rose-600 transition-colors"
                                  title="O‘chirish"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {editingCommentId === reply.id ? (
                            <form onSubmit={(e) => handleSaveEdit(e, true, c.id)} className="space-y-2 pt-1">
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs focus:border-amber-600 outline-hidden"
                                required
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-2 py-0.5 text-[11px] text-stone-500 hover:text-stone-800 font-bold"
                                >
                                  Bekor qilish
                                </button>
                                <button
                                  type="submit"
                                  disabled={savingEdit || !editContent.trim()}
                                  className="px-2.5 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold disabled:opacity-50 flex items-center gap-1"
                                >
                                  {savingEdit ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : null}
                                  <span>Saqlash</span>
                                </button>
                              </div>
                            </form>
                          ) : reply.is_deleted ? (
                            <p className="text-stone-400 italic text-[11px]">Ushbu izoh o‘chirildi</p>
                          ) : (
                            <p className="text-stone-700 leading-relaxed font-normal whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
