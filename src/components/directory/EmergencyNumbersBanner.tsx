'use client';

import React from 'react';
import {
  Flame,
  Shield,
  Stethoscope,
  LifeBuoy,
  Leaf,
  PhoneCall,
  CloudSun,
  Clock,
  Droplets,
  Pill,
  Thermometer,
  HelpCircle,
  Phone,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface ShortService {
  number: string;
  name: string;
  icon: React.ElementType;
  style?: string;
  badgeStyle?: string;
}

const emergencyGroup: ShortService[] = [
  {
    number: '101',
    name: 'O‘t o‘chirish xizmati',
    icon: Flame,
    style: 'bg-rose-50/70 border-rose-200/80 hover:border-rose-300 text-rose-900',
    badgeStyle: 'bg-rose-600 text-white',
  },
  {
    number: '102',
    name: 'Ichki ishlar organi (Politsiya)',
    icon: Shield,
    style: 'bg-blue-50/70 border-blue-200/80 hover:border-blue-300 text-blue-900',
    badgeStyle: 'bg-blue-600 text-white',
  },
  {
    number: '103',
    name: 'Tez tibbiy yordam',
    icon: Stethoscope,
    style: 'bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300 text-emerald-900',
    badgeStyle: 'bg-emerald-600 text-white',
  },
  {
    number: '104',
    name: 'Gaz xizmati',
    icon: Zap,
    style: 'bg-amber-50/70 border-amber-200/80 hover:border-amber-300 text-amber-900',
    badgeStyle: 'bg-amber-600 text-white',
  },
  {
    number: '1050',
    name: 'Qutqaruv xizmati',
    icon: LifeBuoy,
    style: 'bg-purple-50/70 border-purple-200/80 hover:border-purple-300 text-purple-900',
    badgeStyle: 'bg-purple-600 text-white',
  },
];

const generalGroup: ShortService[] = [
  {
    number: '1157',
    name: 'Tabiatga zarar yetkazish',
    icon: Leaf,
  },
  {
    number: '1159',
    name: 'Iste’molchilar huquqi call-markazi',
    icon: PhoneCall,
  },
  {
    number: '1001',
    name: 'Ob-havo ma’lumoti',
    icon: CloudSun,
  },
  {
    number: '1004',
    name: 'Aniq vaqt xizmati',
    icon: Clock,
  },
  {
    number: '1054',
    name: 'Suvsoz avariya xizmati',
    icon: Droplets,
  },
  {
    number: '1069',
    name: 'Dorixona va dori-darmon ma’lumoti',
    icon: Pill,
  },
  {
    number: '1347',
    name: 'Issiqlik va issiq suv ta’minoti',
    icon: Thermometer,
  },
  {
    number: '1009',
    name: 'Ma’lumotnoma xizmati',
    icon: HelpCircle,
  },
];

export function EmergencyNumbersBanner() {
  return (
    <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Muhim qisqa raqamlar
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Shoshilinch va kundalik kerak bo‘ladigan xizmatlarga tezkor qo‘ng‘iroq qiling.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-extrabold flex-shrink-0">
          <Phone className="w-3.5 h-3.5" />
          <span>24/7 Bepul Qo‘ng‘iroq</span>
        </div>
      </div>

      {/* First Group: Shoshilinch xizmatlar */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          <span>Shoshilinch xizmatlar</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {emergencyGroup.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                title={`${item.name} (${item.number}) raqamiga qo‘ng‘iroq qilish`}
                aria-label={`${item.name} (${item.number}) raqamiga qo‘ng‘iroq qilish`}
                className={`group p-3 rounded-2xl border ${item.style} flex flex-col justify-between space-y-2 min-h-[76px] transition-all duration-200 hover:-translate-y-0.5 shadow-2xs active:scale-95`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-black tracking-wider ${item.badgeStyle}`}>
                    {item.number}
                  </span>
                  <Icon className="w-4 h-4 opacity-75 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-xs font-black leading-tight truncate">
                  {item.name}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Second Group: Boshqa muhim xizmatlar */}
      <div className="space-y-2.5 pt-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Boshqa muhim xizmatlar</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {generalGroup.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.number}
                href={`tel:${item.number}`}
                title={`${item.name} (${item.number}) raqamiga qo‘ng‘iroq qilish`}
                aria-label={`${item.name} (${item.number}) raqamiga qo‘ng‘iroq qilish`}
                className="group p-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-blue-300 text-slate-900 flex flex-col justify-between space-y-2 min-h-[76px] transition-all duration-200 hover:-translate-y-0.5 shadow-2xs active:scale-95"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-base sm:text-lg font-black text-blue-700 tracking-tight group-hover:text-blue-800">
                    {item.number}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-700 leading-tight truncate">
                  {item.name}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer Source Note */}
      <div className="pt-2 border-t border-slate-100 text-right">
        <span className="text-[11px] text-slate-400 font-medium">
          Manba: my.gov.uz
        </span>
      </div>
    </section>
  );
}
