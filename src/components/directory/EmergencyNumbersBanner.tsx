'use client';

import React from 'react';
import { PhoneCall, ShieldAlert, Flame, Shield, Stethoscope, Flame as GasIcon, LifeBuoy } from 'lucide-react';
import { CopyButton } from '@/components/ui/CopyButton';

interface EmergencyService {
  number: string;
  name: string;
  description: string;
  icon: any;
  colorClass: string;
  badgeBg: string;
}

const emergencyServices: EmergencyService[] = [
  {
    number: '101',
    name: 'Yong‘in xavfsizligi',
    description: 'Yong‘in va favqulodda holatlar xizmati',
    icon: Flame,
    colorClass: 'text-rose-600 border-rose-200 bg-rose-50',
    badgeBg: 'bg-rose-600 text-white',
  },
  {
    number: '102',
    name: 'Ichki ishlar',
    description: 'Militsiya va jamoat tartibini saqlash',
    icon: Shield,
    colorClass: 'text-blue-600 border-blue-200 bg-blue-50',
    badgeBg: 'bg-blue-600 text-white',
  },
  {
    number: '103',
    name: 'Tez yordam',
    description: 'Tibbiy shoshilinch yordam xizmati',
    icon: Stethoscope,
    colorClass: 'text-emerald-600 border-emerald-200 bg-emerald-50',
    badgeBg: 'bg-emerald-600 text-white',
  },
  {
    number: '104',
    name: 'Gaz avariya xizmati',
    description: 'Gaz sizib chiqishi va avariya ta’mirlash',
    icon: GasIcon,
    colorClass: 'text-amber-600 border-amber-200 bg-amber-50',
    badgeBg: 'bg-amber-600 text-white',
  },
  {
    number: '1050',
    name: 'FVV Qutqaruv',
    description: 'Qutqaruv va qidiruv maxsus xizmati',
    icon: LifeBuoy,
    colorClass: 'text-purple-600 border-purple-200 bg-purple-50',
    badgeBg: 'bg-purple-600 text-white',
  },
];

export function EmergencyNumbersBanner() {
  return (
    <section className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Favqulodda Qisqa Raqamlar</h2>
            <p className="text-xs text-slate-500 font-medium">Shoshilinch holatlarda barcha uyali operatorlardan bepul qo‘ng‘iroq</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black">
          24/7 Shoshilinch Yordam
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {emergencyServices.map((service) => {
          const Icon = service.icon;

          return (
            <div
              key={service.number}
              className={`p-4 rounded-2xl border ${service.colorClass} flex flex-col justify-between space-y-3 transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-xl text-sm font-black tracking-wider ${service.badgeBg}`}>
                  {service.number}
                </span>
                <Icon className="w-5 h-5 opacity-80" />
              </div>

              <div>
                <strong className="text-xs font-black text-slate-900 block">{service.name}</strong>
                <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">{service.description}</p>
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                <a
                  href={`tel:${service.number}`}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-xs border border-slate-200/80 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Qo‘ng‘iroq</span>
                </a>
                <CopyButton textToCopy={service.number} label="Nusxalash" className="bg-white border-slate-200/80" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
