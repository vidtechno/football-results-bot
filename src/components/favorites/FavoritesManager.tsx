'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Trophy, Shield, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface FavItem {
  id: string | number;
  name: string;
  logoUrl?: string;
  addedAt?: string;
}

export function FavoritesManager() {
  const [favCompetitions, setFavCompetitions] = useState<FavItem[]>([]);
  const [favTeams, setFavTeams] = useState<FavItem[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const comps = localStorage.getItem('fav_competitions');
      const teams = localStorage.getItem('fav_teams');
      if (comps) setFavCompetitions(JSON.parse(comps));
      if (teams) setFavTeams(JSON.parse(teams));
    } catch {
      // Ignore parse errors
    }
  };

  const removeFav = (type: 'competition' | 'team', id: string | number) => {
    try {
      const key = `fav_${type}s`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: FavItem[] = JSON.parse(stored);
        const filtered = parsed.filter((item) => String(item.id) !== String(id));
        localStorage.setItem(key, JSON.stringify(filtered));
        if (type === 'competition') setFavCompetitions(filtered);
        if (type === 'team') setFavTeams(filtered);
      }
    } catch {
      // Ignore write errors
    }
  };

  const hasAnyFav = favCompetitions.length > 0 || favTeams.length > 0;

  return (
    <div className="space-y-8">
      {!hasAnyFav ? (
        <EmptyState
          title="Sevimlilar ro‘yxati bo‘sh"
          description="Siz hali hech qanday jamoa yoki musobaqani sevimlilarga qo‘shmadingiz. Guruhlar yoki jamoalar yonidagi yulduzcha tugmasini bosing."
          icon="search"
        />
      ) : (
        <>
          {/* Favorite Competitions */}
          {favCompetitions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Sevimli musobaqalar</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favCompetitions.map((comp) => (
                  <div
                    key={comp.id}
                    className="glass-card rounded-xl p-4 flex items-center justify-between border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      {comp.logoUrl ? (
                        <Image
                          src={comp.logoUrl}
                          alt={comp.name}
                          width={36}
                          height={36}
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 font-bold">
                          🏆
                        </div>
                      )}
                      <span className="font-semibold text-slate-200">{comp.name}</span>
                    </div>
                    <button
                      onClick={() => removeFav('competition', comp.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Teams */}
          {favTeams.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Sevimli jamoalar</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favTeams.map((team) => (
                  <div
                    key={team.id}
                    className="glass-card rounded-xl p-4 flex items-center justify-between border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      {team.logoUrl ? (
                        <Image
                          src={team.logoUrl}
                          alt={team.name}
                          width={36}
                          height={36}
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                          🛡️
                        </div>
                      )}
                      <span className="font-semibold text-slate-200">{team.name}</span>
                    </div>
                    <button
                      onClick={() => removeFav('team', team.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
