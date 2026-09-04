'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Profile, AuthorProfile } from '@/lib/types/platform';

interface AuthContextValue {
  user: any | null;
  profile: Profile | null;
  author: AuthorProfile | null;
  balance: number | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  author: null,
  balance: null,
  isAdmin: false,
  isLoading: true,
  refreshAuth: async () => {},
  updateBalance: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (sessionUser: any, token?: string) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      setAuthor(null);
      setBalance(null);
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    setUser(sessionUser);

    try {
      // Run profile, wallet balance, and author profile concurrently (single round-trip batch)
      const profilePromise = (async () => {
        try {
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('/api/auth/profile', { headers });
          if (res.ok) {
            const data = await res.json();
            return {
              profile: data.profile as Profile,
              isAdmin: Boolean(data.isAdmin),
            };
          }
        } catch {
          // fallback
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle();
        return {
          profile: prof as Profile,
          isAdmin: Boolean(prof?.is_admin),
        };
      })();

      const balancePromise = supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('user_id', sessionUser.id)
        .eq('account_type', 'reader_credit')
        .maybeSingle();

      const authorPromise = supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', sessionUser.id)
        .maybeSingle();

      const [profResult, balanceResult, authorResult] = await Promise.all([
        profilePromise,
        balancePromise,
        authorPromise,
      ]);

      if (profResult) {
        setProfile(profResult.profile);
        setIsAdmin(profResult.isAdmin);
      }

      if (balanceResult.data) {
        setBalance(Number(balanceResult.data.balance));
      } else {
        setBalance(0);
      }

      if (authorResult.data) {
        setAuthor(authorResult.data as AuthorProfile);
      } else {
        setAuthor(null);
      }
    } catch (err) {
      console.error('Foydalanuvchi ma’lumotlarini yuklashda xatolik:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        fetchUserData(session?.user || null, session?.access_token);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        fetchUserData(session?.user || null, session?.access_token);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const refreshAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchUserData(session?.user || null, session?.access_token);
  }, [fetchUserData]);

  const updateBalance = useCallback((newBalance: number) => {
    setBalance(newBalance);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    // Clean up any legacy cookies
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'sb-auth-token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'supabase-auth-token=; path=/; max-age=0; SameSite=Lax';
    setUser(null);
    setProfile(null);
    setAuthor(null);
    setBalance(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      author,
      balance,
      isAdmin,
      isLoading,
      refreshAuth,
      updateBalance,
      signOut,
    }),
    [user, profile, author, balance, isAdmin, isLoading, refreshAuth, updateBalance, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
