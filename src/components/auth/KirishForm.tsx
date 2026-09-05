'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { useAuth } from '@/components/providers/AuthProvider';

interface KirishFormProps {
  initialRedirect?: string;
}

export function KirishForm({ initialRedirect = '/kabinet' }: KirishFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();

  const rawRedirect = searchParams.get('redirect') || initialRedirect;
  const redirectUrl = getSafeRedirectUrl(rawRedirect, '/kabinet');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        throw new Error(
          signInError.message.includes('Invalid login credentials')
            ? 'Email yoki parol noto‘g‘ri kiritildi'
            : signInError.message
        );
      }

      // Refresh client auth context to synchronize profile and admin status
      await refreshAuth();

      // Navigate to the verified safe redirect target
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
      <div className="text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Manboraga kirish
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Shaxsiy kabinet va mutolaangizni boshqarish uchun hisobingizga kiring
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
            Email manzilingiz
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="ism@manzil.uz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-xs font-bold text-slate-700">Parol</label>
            <Link
              href="/tiklash"
              className="text-[11px] font-semibold text-blue-600 hover:underline"
            >
              Parolni unutdingizmi?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
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
              <span>Tekshirilmoqda...</span>
            </>
          ) : (
            <>
              <span>Kirish</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
        Hali ro‘yxatdan o‘tmaganmisiz?{' '}
        <Link
          href={rawRedirect ? `/royxatdan-otish?redirect=${encodeURIComponent(rawRedirect)}` : '/royxatdan-otish'}
          className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Hisob yaratish
        </Link>
      </div>
    </div>
  );
}
