import React from 'react';
import { FavoritesManager } from '@/components/favorites/FavoritesManager';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
          <span>Sevimli jamoalar va musobaqalar</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Siz kuzatib borayotgan jamoalar va ligalar natijalarini bu yerda tezda ko‘rishingiz mumkin.
        </p>
      </div>

      <FavoritesManager />
    </div>
  );
}
