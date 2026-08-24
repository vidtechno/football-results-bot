'use client';

import React from 'react';
import { Phone, ShieldAlert, Flame, Shield, Stethoscope, Flame as GasIcon, LifeBuoy } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface EmergencyService {
  number: string;
  name: string;
  shortDesc: string;
  icon: React.ElementType;
  badgeStyle: string;
  cardStyle: string;
}

const emergencyServices: EmergencyService[] = [
  {
    number: '101',
    name: 'Yong‘in xavfsizligi',
    shortDesc: 'Yong‘in va OChS',
    icon: Flame,
    badgeStyle: 'bg-rose-600 text-white',
    cardStyle: 'bg-gradient-to-b from-rose-50/80 to-white border-rose-200/80 hover:border-rose-300',
  },
  {
    number: '102',
    name: 'Ichki ishlar',
    shortDesc: 'Militsiya tartibi',
    icon: Shield,
    badgeStyle: 'bg-blue-600 text-white',
    cardStyle: 'bg-gradient-to-b from-blue-50/80 to-white border-blue-200/80 hover:border-blue-300',
  },
  {
    number: '103',
    name: 'Tez yordam',
    shortDesc: 'Tibbiy shoshilinch',
    icon: Stethoscope,
    badgeStyle: 'bg-emerald-600 text-white',
    cardStyle: 'bg-gradient-to-b from-emerald-50/80 to-white border-emerald-200/80 hover:border-emerald-300',
  },
  {
    number: '104',
    name: 'Gaz xizmati',
    shortDesc: 'Avariya va ta’mir',
    icon: GasIcon,
    badgeStyle: 'bg-amber-500 text-white',
    cardStyle: 'bg-gradient-to-b from-amber-50/80 to-white border-amber-200/80 hover:border-amber-300',
  },
  {
    number: '1050',
    name: 'FVV Qutqaruv',
    shortDesc: 'Qutqaruv xizmati',
    icon: LifeBuoy,
    badgeStyle: 'bg-purple-600 text-white',
    cardStyle: 'bg-gradient-to-b from-purple-50/80 to-white border-purple-200/80 hover:border-purple-300',
  },
];

export function EmergencyNumbersBanner() {
  return (
    <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Favqulodda Qisqa Raqamlar</h2>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Bepul shoshilinch qo‘ng‘iroq raqamlari</p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black flex-shrink-0">
          24/7 Shoshilinch Yordam
        </span>
      </div>

      {/* Cards Grid: 2 columns on mobile (5th card spans 2 cols), 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {emergencyServices.map((service, idx) => {
          const Icon = service.icon;
          const isFifthOnMobile = idx === 4;

          return (
            <div
              key={service.number}
              className={`p-3 rounded-2xl border ${service.cardStyle} ${
                isFifthOnMobile ? 'col-span-2 sm:col-span-1' : 'col-span-1'
              } flex flex-col justify-between space-y-2.5 transition-all duration-200 hover:-translate-y-0.5 shadow-sm`}
            >
              {/* Top Row: Prominent Number Badge + Service Icon */}
              <div className="flex items-center justify-between">
                <a
                  href={`tel:${service.number}`}
                  title={`${service.name}ga qo‘ng‘iroq qilish`}
                  className={`px-2.5 py-0.5 rounded-lg text-sm font-black tracking-wider ${service.badgeStyle} hover:opacity-90 active:scale-95 transition-all shadow-xs`}
                >
                  {service.number}
                </a>
                <Icon className="w-4 h-4 text-slate-500 opacity-80" />
              </div>

              {/* Title & Short Description */}
              <div>
                <strong className="text-xs font-black text-slate-900 block truncate">{service.name}</strong>
                <span className="text-[10px] text-slate-500 font-medium block truncate">{service.shortDesc}</span>
              </div>

              {/* Bottom Actions Row: Direct Call Button + Icon-Only Copy Button */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                <a
                  href={`tel:${service.number}`}
                  aria-label={`${service.name} (${service.number}) raqamiga qo‘ng‘iroq qilish`}
                  className="flex-1 min-h-[44px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs border border-slate-200/90 flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Qo‘ng‘iroq</span>
                </a>

                <CopyButton
                  textToCopy={service.number}
                  showLabel={false}
                  label="Nusxalash"
                  className="min-h-[44px] min-w-[44px]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
