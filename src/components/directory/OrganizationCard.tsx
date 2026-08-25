'use client';

import React from 'react';
import Link from 'next/link';
import { Organization } from '@/lib/types/directory';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { isNewlyVerified } from '@/lib/utils/badges';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { CopyButton } from '@/components/ui/CopyButton';
import { trackEvent } from '@/lib/utils/analytics';
import { Phone, CheckCircle2, MapPin, ChevronRight, Sparkles } from 'lucide-react';

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
  const newlyVerified = isNewlyVerified(organization.last_verified_at);

  const handleCardClick = () => {
    trackEvent(organization.id, 'card_click');
  };

  if (isCompact) {
    return (
      <div className="app-card p-4 flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-3 min-w-0">
          <OrganizationAvatar
            name={organization.name}
            logoUrl={organization.logo_url}
            type={organization.organization_type}
            categorySlug={category?.slug}
            size="md"
          />

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/organizations/${organization.slug}`}
                onClick={handleCardClick}
                className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate"
              >
                {organization.name}
              </Link>
              {organization.is_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              {category && <span className="text-blue-600 font-bold">{category.name}</span>}
              {region && <span>• {region.name}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {phoneFormatted ? (
            <a
              href={phoneFormatted.href}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{phoneFormatted.display}</span>
            </a>
          ) : (
            <Link
              href={`/organizations/${organization.slug}`}
              onClick={handleCardClick}
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
    <div className="app-card p-4 sm:p-5 flex flex-col justify-between group relative">
      <div className="space-y-3">
        {/* Header Badges & Category */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {category ? (
            <span className="inline-flex items-center text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {category.name}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5">
            {newlyVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                <span>Yangi tekshirildi</span>
              </span>
            )}

            {organization.is_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Tasdiqlangan</span>
              </span>
            )}
          </div>
        </div>

        {/* Logo & Org Name */}
        <div className="flex items-start gap-3">
          <OrganizationAvatar
            name={organization.name}
            logoUrl={organization.logo_url}
            type={organization.organization_type}
            categorySlug={category?.slug}
            size="md"
          />

          <div className="space-y-0.5 min-w-0 flex-1">
            <Link
              href={`/organizations/${organization.slug}`}
              onClick={handleCardClick}
              className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug"
            >
              {organization.name}
            </Link>
            {region && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{region.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Short Description */}
        {organization.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
            {organization.description}
          </p>
        )}
      </div>

      {/* Primary Call CTA, Copy button, & Secondary Batafsil link */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {phoneFormatted ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <a
              href={phoneFormatted.href}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all min-h-[44px] truncate"
            >
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{phoneFormatted.display}</span>
            </a>
            <CopyButton textToCopy={primaryContact!.phone_number} showLabel={false} label="Nusxalash" className="bg-white min-h-[44px] min-w-[44px] flex-shrink-0" />
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Raqam yo‘q</span>
        )}

        <Link
          href={`/organizations/${organization.slug}`}
          onClick={handleCardClick}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all flex-shrink-0 min-h-[44px]"
        >
          <span>Batafsil</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
