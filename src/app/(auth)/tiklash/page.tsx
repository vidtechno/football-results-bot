'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function TiklashPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/kirish`,
      });

      if (resetError) {
        throw new Error(resetError.message);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Parolni tiklash
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Email manzilingizni kiriting, tiklash havolasini yuboramiz
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Agar <strong>{email}</strong> tizimda mavjud bo‘lsa, parolni tiklash havolasi yuborildi. Pochtangizni tekshiring.
            </p>
            <Link
              href="/kirish"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
            >
              <span>Kirish sahifasiga qaytish</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <span>Havolani yuborish</span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <Link
            href="/kirish"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kirish sahifasiga qaytish</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
