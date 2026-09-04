import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PenTool, ChevronRight, BookOpen, Users } from 'lucide-react';
import { getApprovedAuthors } from '@/lib/db/queries';

export const revalidate = 60;

export default async function AuthorsDirectoryPage() {
  const authors = await getApprovedAuthors(40);

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#78716C] font-semibold">
        <Link href="/" className="hover:text-[#B45309]">Bosh sahifa</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
        <span className="text-[#1C1917]">Mualliflar</span>
      </nav>

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-bold border border-[#FDE68A]">
          <PenTool className="w-3.5 h-3.5" />
          <span>Ijodkorlar maydoni</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-serif text-[#1C1917] tracking-tight">
          Platforma mualliflari
        </h1>
        <p className="text-sm text-[#78716C] font-medium max-w-2xl">
          O‘zbek adabiyotining eng yorqin zamonaviy mualliflari, novellistlari va serialized asar ijodkorlari bilan tanishing.
        </p>
      </div>

      {/* Authors List */}
      {authors.length === 0 ? (
        <div className="bg-[#FAF8F5] border border-[#EAE5DD] rounded-3xl p-12 text-center space-y-4">
          <Users className="w-12 h-12 text-[#A8A29E] mx-auto" />
          <h3 className="text-lg font-bold text-[#1C1917] font-serif">Hozircha mualliflar mavjud emas</h3>
          <p className="text-sm text-[#78716C] max-w-md mx-auto">
            Siz birinchilardan bo‘lib o‘z asarlaringizni Manbora platformasida e’lon qilishingiz mumkin.
          </p>
          <Link
            href="/muallif"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-sm transition-colors shadow-sm"
          >
            <PenTool className="w-4 h-4" />
            Mualliflikka ariza berish
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {authors.map((author) => {
            const profile = author.profile;
            const authorUrl = profile?.username ? `/mualliflar/${profile.username}` : '#';

            return (
              <Link
                key={author.user_id}
                href={authorUrl}
                className="group bg-white rounded-3xl border border-[#EAE5DD] p-6 hover:shadow-md hover:border-[#D6CEC4] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#B45309] to-[#D97706] text-white flex items-center justify-center text-xl font-bold font-serif shadow-xs overflow-hidden flex-shrink-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={author.pen_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <span>{author.pen_name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold font-serif text-[#1C1917] group-hover:text-[#B45309] transition-colors truncate">
                      {author.pen_name}
                    </h3>
                    {profile?.username && (
                      <p className="text-xs text-[#78716C] truncate">
                        @{profile.username}
                      </p>
                    )}
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] text-[10px] font-black uppercase tracking-wider">
                      Ijodkor
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#57534E] line-clamp-3 leading-relaxed">
                  {author.biography || 'Muallif tarjimayi holi tez orada joylanadi.'}
                </p>

                <div className="pt-2 border-t border-[#F5F2EC] flex items-center justify-between text-xs text-[#78716C] font-semibold">
                  <span className="group-hover:text-[#B45309] flex items-center gap-1 transition-colors">
                    Asarlarni ko‘rish
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
