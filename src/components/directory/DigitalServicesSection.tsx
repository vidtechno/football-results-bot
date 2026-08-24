import React from 'react';
import { DigitalService } from '@/lib/types/directory';
import { formatUzbekDate } from '@/lib/utils/formatters';
import {
  Globe,
  Smartphone,
  Send,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface DigitalServicesSectionProps {
  services: DigitalService[];
  sourceUrl?: string | null;
  sourceName?: string | null;
  lastVerifiedAt?: string | null;
}

export function DigitalServicesSection({
  services,
  sourceUrl,
  sourceName,
  lastVerifiedAt,
}: DigitalServicesSectionProps) {
  if (!services || services.length === 0) return null;

  // Deduplicate in component as defensive layer
  const uniqueServices = services.reduce<DigitalService[]>((acc, current) => {
    const key = `${current.service_type.toLowerCase()}:${current.url.trim().toLowerCase()}`;
    if (!acc.some((item) => `${item.service_type.toLowerCase()}:${item.url.trim().toLowerCase()}` === key)) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-400" />
            <span>Rasmiy raqamli xizmatlar va mobil ilovalar</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Davlat portallari, rasmiy veb-saytlar va tasdiqlangan ilovalar
          </p>
        </div>

        {sourceName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Manba: {sourceName}</span>
          </div>
        )}
      </div>

      {/* Grid of Digital Services */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {uniqueServices.map((service) => {
          let Icon = Globe;
          let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
          let buttonBg = 'bg-blue-600 hover:bg-blue-700 text-white';
          let typeLabel = 'Veb-Xizmat';

          if (service.service_type === 'android_app') {
            Icon = Smartphone;
            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            buttonBg = 'bg-emerald-600 hover:bg-emerald-700 text-white';
            typeLabel = 'Android Ilova (Google Play)';
          } else if (service.service_type === 'ios_app') {
            Icon = Smartphone;
            badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
            buttonBg = 'bg-slate-900 hover:bg-slate-800 text-white';
            typeLabel = 'iOS Ilova (App Store)';
          } else if (service.service_type === 'telegram_bot') {
            Icon = Send;
            badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
            buttonBg = 'bg-sky-500 hover:bg-sky-600 text-white';
            typeLabel = 'Telegram Bot / Kanal';
          } else if (service.service_type === 'web_portal') {
            Icon = Globe;
            badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
            buttonBg = 'bg-purple-600 hover:bg-purple-700 text-white';
            typeLabel = 'Davlat Elektron Portali';
          }

          return (
            <div
              key={service.id}
              className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                    {typeLabel}
                  </span>
                  {service.is_official && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Rasmiy</span>
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-slate-700 flex-shrink-0 shadow-sm border border-slate-200/60 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{service.title}</h3>
                    {service.description ? (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{service.description}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed italic">Rasmiy mobil xizmat va ilova</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-semibold">
                  {service.platform_name || 'Rasmiy havola'}
                </span>
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-sm transition-all active:scale-95 ${buttonBg}`}
                >
                  <span>O‘tish</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verification Footer Disclaimer */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 font-medium">
        {lastVerifiedAt && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Oxirgi tekshirildi: <strong>{formatUzbekDate(lastVerifiedAt)}</strong>
          </span>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-bold"
          >
            <span>Rasmiy manbani ko‘rish</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
