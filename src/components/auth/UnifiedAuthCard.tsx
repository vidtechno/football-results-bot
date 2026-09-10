'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus, AlertCircle, Loader2, ArrowRight, PenTool, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { useAuth } from '@/components/providers/AuthProvider';

interface UnifiedAuthCardProps {
  initialRedirect?: string;
  defaultMode?: 'login' | 'register';
}

export function UnifiedAuthCard({ initialRedirect = '/kabinet', defaultMode = 'login' }: UnifiedAuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();

  const modeParam = searchParams.get('mode');
  const roleParam = searchParams.get('role');
  const rawRedirect = searchParams.get('redirect') || searchParams.get('returnUrl') || initialRedirect;
  const redirectUrl = getSafeRedirectUrl(rawRedirect, '/kabinet');

  const [mode, setMode] = useState<'login' | 'register'>(
    modeParam === 'register' || defaultMode === 'register' ? 'register' : 'login'
  );

  useEffect(() => {
    if (modeParam === 'register') {
      setMode('register');
    } else if (modeParam === 'login') {
      setMode('login');
    }
  }, [modeParam]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Switch tabs
  const handleTabChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLoginError(null);
    setRegisterError(null);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', newMode);
    window.history.replaceState({}, '', url.toString());
  };

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword,
      });

      if (signInError) {
        throw new Error(
          signInError.message.includes('Invalid login credentials')
            ? 'Email yoki parol noto‘g‘ri kiritildi'
            : signInError.message
        );
      }

      await refreshAuth();
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setLoginError(err.message || 'Kirishda xatolik yuz berdi');
      setLoginLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (username.length < 3) {
      setRegisterError('Foydalanuvchi nomi (username) kamida 3 ta belgidan iborat bo‘lishi lozim');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Parol kamida 6 ta belgidan iborat bo‘lishi lozim');
      return;
    }

    setRegisterLoading(true);
    setRegisterError(null);

    try {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registerEmail.trim(),
        password: registerPassword,
        options: {
          data: {
            display_name: displayName.trim(),
            username: cleanUsername,
            role_intent: roleParam === 'author' ? 'author' : 'reader',
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // Check if session was immediately created
      if (data.session) {
        await refreshAuth();
        router.push(redirectUrl);
        router.refresh();
      } else {
        setRegisteredSuccess(true);
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl overflow-hidden">
      {/* Role Banner if Author */}
      {roleParam === 'author' && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 px-5 py-2.5 flex items-center justify-between text-xs font-bold shadow-inner">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4" />
            <span>Muallif sifatida ro‘yxatdan o‘tish</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-wider bg-stone-950/10 px-2 py-0.5 rounded-md">
            80% daromad
          </span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="grid grid-cols-2 p-1.5 bg-stone-100 border-b border-stone-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={clsx(
            'py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all',
            mode === 'login'
              ? 'bg-white text-stone-900 shadow-xs font-black'
              : 'text-stone-500 hover:text-stone-900'
          )}
        >
          <LogIn className="w-4 h-4" />
          <span>Kirish</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('register')}
          className={clsx(
            'py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all',
            mode === 'register'
              ? 'bg-white text-stone-900 shadow-xs font-black'
              : 'text-stone-500 hover:text-stone-900'
          )}
        >
          <UserPlus className="w-4 h-4" />
          <span>Ro‘yxatdan o‘tish</span>
        </button>
      </div>

      <div className="p-6 sm:p-8">
        {mode === 'login' ? (
          /* LOGIN TAB */
          <div>
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-2xl font-black font-sans text-stone-900 tracking-tight">
                Xush kelibsiz
              </h1>
              <p className="text-xs text-stone-500">
                Kutubxona va mutolaangizni davom ettirish uchun kiring
              </p>
            </div>

            {loginError && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4" autoComplete="on">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-stone-700 mb-1.5">
                  Email manzili
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ism@manzil.uz"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-bold text-stone-700">
                    Parol
                  </label>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <span>Tizimga kirish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-500">
                Hisobingiz yo‘qmi?{' '}
                <button
                  type="button"
                  onClick={() => handleTabChange('register')}
                  className="font-bold text-amber-700 hover:text-amber-800 transition-colors"
                >
                  Ro‘yxatdan o‘tish
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* REGISTER TAB */
          <div>
            {registeredSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-sans text-stone-900">
                    Ro‘yxatdan o‘tdingiz!
                  </h3>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto">
                    Profilingiz muvaffaqiyatli yaratildi. Agar pochtangizga tasdiqlash xati yuborilgan bo‘lsa, uni tekshiring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('login')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-stone-900 text-white font-bold text-xs"
                >
                  <span>Kirish bo‘limiga o‘tish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="text-center space-y-1 mb-6">
                  <h1 className="text-2xl font-black font-sans text-stone-900 tracking-tight">
                    {roleParam === 'author' ? 'Muallif sifatida qo‘shiling' : 'Ro‘yxatdan o‘tish'}
                  </h1>
                  <p className="text-xs text-stone-500">
                    Manbora kitobxonlari va mualliflari oilasiga xush kelibsiz
                  </p>
                </div>

                {registerError && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-3.5" autoComplete="on">
                  <div>
                    <label htmlFor="reg-displayName" className="block text-xs font-bold text-stone-700 mb-1">
                      {roleParam === 'author' ? 'Mualliflik taxallusingiz yoki ismingiz' : 'Ismingiz yoki taxallusingiz'}
                    </label>
                    <input
                      id="reg-displayName"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Masalan: Abdulla Qodiriy"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-username" className="block text-xs font-bold text-stone-700 mb-1">
                      Foydalanuvchi nomi (@username)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                        @
                      </span>
                      <input
                        id="reg-username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        placeholder="taxallus"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-bold text-stone-700 mb-1">
                      Email manzilingiz
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="ism@manzil.uz"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold text-stone-700 mb-1">
                      Parol (kamida 6 ta belgi)
                    </label>
                    <input
                      id="reg-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900 transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-950 font-black text-xs sm:text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
                  >
                    {registerLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Ro‘yxatdan o‘tkazilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <span>{roleParam === 'author' ? 'Muallif sifatida a’zo bo‘lish' : 'Hisob yaratish'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-stone-100 text-center">
                  <p className="text-xs text-stone-500">
                    Allaqachon hisobingiz bormi?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('login')}
                      className="font-bold text-amber-700 hover:text-amber-800 transition-colors"
                    >
                      Kirish
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
