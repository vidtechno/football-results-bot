'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function RoyxatdanOtishPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (username.length < 3) {
      setError('Foydalanuvchi nomi (username) kamida 3 ta belgidan iborat bo‘lishi lozim');
      return;
    }

    if (password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo‘lishi lozim');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: cleanUsername,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (data.session) {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      }

      router.push('/kabinet');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Ro‘yxatdan o‘tish
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manbora kitobxonlari va mualliflari safiga qo‘shiling
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Ismingiz yoki taxallusingiz
            </label>
            <input
              type="text"
              placeholder="Masalan: Sardor Aliyev"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Foydalanuvchi nomi (@username)
            </label>
            <input
              type="text"
              placeholder="sardor_aliyev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm font-mono text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email manzilingiz
            </label>
            <input
              type="email"
              placeholder="ism@manzil.uz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Parol (kamida 6 ta belgi)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Yaratilmoqda...</span>
              </>
            ) : (
              <>
                <span>Ro‘yxatdan o‘tish</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
          Allaqachon hisobingiz bormi?{' '}
          <Link
            href="/kirish"
            className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Kirish
          </Link>
        </div>
      </div>
    </div>
  );
}
