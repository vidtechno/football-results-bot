'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, X, Users } from 'lucide-react';

export function AuthorConnections({
  authorId,
  followers,
  following,
}: {
  authorId: string;
  followers: number;
  following: number;
}) {
  const [open, setOpen] = useState<'followers' | 'following' | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function show(type: 'followers' | 'following') {
    setOpen(type);
    setLoading(true);
    setPeople([]);
    try {
      const response = await fetch(
        `/api/authors/connections?authorId=${encodeURIComponent(authorId)}&type=${type}`,
      );
      const data = await response.json();
      setPeople(Array.isArray(data.people) ? data.people : []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => show('followers')}
        className="flex min-h-[52px] min-w-[96px] flex-col items-center justify-center px-3 text-center transition-colors hover:text-amber-800"
      >
        <strong className="block text-xl text-stone-950">
          {followers.toLocaleString('uz-UZ')}
        </strong>
        <span className="text-[11px] font-semibold text-stone-500">Obunachilar</span>
      </button>
      <button
        type="button"
        onClick={() => show('following')}
        className="flex min-h-[52px] min-w-[106px] flex-col items-center justify-center px-3 text-center transition-colors hover:text-amber-800"
      >
        <strong className="block text-xl text-stone-950">
          {following.toLocaleString('uz-UZ')}
        </strong>
        <span className="text-[11px] font-semibold text-stone-500">Kuzatayotgan</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[75vh] w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h2 className="font-black text-stone-950">
                {open === 'followers' ? 'Obunachilar' : 'Kuzatayotgan mualliflar'}
              </h2>
              <button
                onClick={() => setOpen(null)}
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-stone-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                </div>
              ) : people.length === 0 ? (
                <div className="p-10 text-center text-sm text-stone-500">
                  <Users className="mx-auto mb-2 w-7 h-7" />
                  Hozircha ro‘yxat bo‘sh
                </div>
              ) : (
                people.map((person) =>
                  person.isAuthor ? (
                    <Link
                      key={person.id}
                      href={`/mualliflar/${person.username || person.id}`}
                      onClick={() => setOpen(null)}
                      className="flex min-h-[60px] items-center gap-3 rounded-2xl p-3 hover:bg-stone-50"
                    >
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-emerald-800 text-white flex items-center justify-center font-black">
                        {person.avatarUrl ? (
                          <Image
                            src={person.avatarUrl}
                            alt={person.displayName}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          person.displayName?.slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{person.displayName}</p>
                        <p className="truncate text-xs text-stone-500">@{person.username}</p>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={person.id}
                      className="flex min-h-[60px] items-center gap-3 rounded-2xl p-3"
                    >
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-stone-700 text-white flex items-center justify-center font-black">
                        {person.avatarUrl ? (
                          <Image
                            src={person.avatarUrl}
                            alt={person.displayName}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          person.displayName?.slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{person.displayName}</p>
                        <p className="truncate text-xs text-stone-500">Kitobxon</p>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
