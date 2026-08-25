'use client';

import React, { useState } from 'react';
import { Organization } from '@/lib/types/directory';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { MapPin, Navigation, X, Loader2, Info } from 'lucide-react';

interface NearbyOrganizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Calculate Haversine distance in kilometers
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function NearbyOrganizationsModal({ isOpen, onClose }: NearbyOrganizationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [nearbyOrgs, setNearbyOrgs] = useState<Organization[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [locationFetched, setLocationFetched] = useState(false);

  if (!isOpen) return null;

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Brauzeringiz geolokatsiyani qo‘llab-quvvatlamaydi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch('/api/search');
          if (!res.ok) throw new Error('Ma’lumotlarni yuklashda xatolik');

          const data = await res.json();
          const orgs: Organization[] = data.organizations || [];

          // Sort by coordinates if available
          const orgsWithDist = orgs.map((org) => {
            if (org.latitude && org.longitude) {
              const dist = getHaversineDistance(latitude, longitude, Number(org.latitude), Number(org.longitude));
              return { ...org, distance_km: dist };
            }
            return { ...org, distance_km: 9999 };
          });

          orgsWithDist.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));

          setNearbyOrgs(orgsWithDist.slice(0, 10));
          setLocationFetched(true);
        } catch {
          setErrorMsg('Yaqin joylarni aniqlashda xatolik yuz berdi.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Geolokatsiyaga ruxsat berilmadi. Ruxsat berib qayta urinib ko‘ring.');
        } else {
          setErrorMsg('Joylashingizni aniqlab bo‘lmadi.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">Sizga yaqin tashkilotlar</h3>
              <p className="text-xs text-slate-500 font-medium">Joylashuvingiz asosida yaqin idoralar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!locationFetched ? (
            <div className="p-6 text-center space-y-4 rounded-2xl bg-slate-50 border border-slate-200/80 my-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-900">Geolokatsiyani yoqish</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium leading-relaxed">
                  Manbora foydalanuvchi joylashuvini avtomatik saqlamaydi. Yaqin filiallarni topish uchun tugmani bosing.
                </p>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {errorMsg}
                </p>
              )}

              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-extrabold text-xs sm:text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/30 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joylashuv aniqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Yaqin joylarni ko‘rsat</span>
                  </>
                )}
              </button>
            </div>
          ) : nearbyOrgs.length === 0 ? (
            <div className="p-6 text-center space-y-2 rounded-2xl bg-slate-50 border border-slate-200/80">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-bold">Yaqin hududda tashkilotlar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyOrgs.map((org) => (
                <div key={org.id} className="relative">
                  {org.distance_km && org.distance_km < 9000 && (
                    <span className="absolute top-2 right-2 z-10 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                      {org.distance_km} km
                    </span>
                  )}
                  <OrganizationCard organization={org} variant="compact" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
