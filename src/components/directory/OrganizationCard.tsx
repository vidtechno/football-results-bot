import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Organization } from '@/lib/types/directory';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { Phone, CheckCircle2, MapPin, ChevronRight, Building2 } from 'lucide-react';

interface OrganizationCardProps {
  organization: Organization;
  variant?: 'normal' | 'compact';
}

export function OrganizationCard({ organization, variant = 'normal' }: OrganizationCardProps) {
  const primaryContact =
    organization.contacts?.find((c) => c.is_primary) || organization.contacts?.[0];
  const phoneFormatted = primaryContact
    ? formatPhoneNumber(primaryContact.phone_number)
    : null;

  const category = organization.category;
  const region = organization.region;
  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <div className="directory-card p-4 flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-3 min-w-0">
          {organization.logo_url ? (
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center flex-shrink-0">
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={36}
                height={36}
                className="object-contain max-h-8"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 font-extrabold flex items-center justify-center flex-shrink-0 text-base">
              {organization.name.charAt(0)}
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/organizations/${organization.slug}`}
                className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate"
              >
                {organization.name}
              </Link>
              {organization.is_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              {category && <span className="text-blue-600 font-semibold">{category.name}</span>}
              {region && <span>• {region.name}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {phoneFormatted ? (
            <a
              href={phoneFormatted.href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{phoneFormatted.display}</span>
            </a>
          ) : (
            <Link
              href={`/organizations/${organization.slug}`}
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
            >
              Batafsil
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="directory-card p-5 flex flex-col justify-between group relative">
      <div className="space-y-3.5">
        {/* Header Badges & Category */}
        <div className="flex items-center justify-between gap-2">
          {category ? (
            <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {category.name}
            </span>
          ) : (
            <span />
          )}

          {organization.is_verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Tasdiqlangan</span>
            </span>
          )}
        </div>

        {/* Logo & Org Name */}
        <div className="flex items-start gap-3.5">
          {organization.logo_url ? (
            <div className="w-12 h-12 rounded-2xl bg-slate-50 p-2 border border-slate-200/80 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={36}
                height={36}
                className="object-contain max-h-9"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-sky-100 border border-blue-200/60 flex items-center justify-center text-blue-700 font-extrabold text-lg flex-shrink-0">
              {organization.name.charAt(0)}
            </div>
          )}

          <div className="space-y-1 min-w-0">
            <Link
              href={`/organizations/${organization.slug}`}
              className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1"
            >
              {organization.name}
            </Link>
            {region && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{region.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Short Description */}
        {organization.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
            {organization.description}
          </p>
        )}
      </div>

      {/* Primary CTA & Secondary link */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        {phoneFormatted ? (
          <a
            href={phoneFormatted.href}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{phoneFormatted.display}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Raqam yo‘q</span>
        )}

        <Link
          href={`/organizations/${organization.slug}`}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all"
        >
          <span>Batafsil</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
