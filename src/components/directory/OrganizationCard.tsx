import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Organization } from '@/lib/types/directory';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { Phone, CheckCircle2, MapPin, Globe, ChevronRight } from 'lucide-react';

interface OrganizationCardProps {
  organization: Organization;
}

export function OrganizationCard({ organization }: OrganizationCardProps) {
  const primaryContact =
    organization.contacts?.find((c) => c.is_primary) || organization.contacts?.[0];
  const phoneFormatted = primaryContact
    ? formatPhoneNumber(primaryContact.phone_number)
    : null;

  const category = organization.category;
  const region = organization.region;

  return (
    <div className="directory-card p-5 flex flex-col justify-between group">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {organization.logo_url ? (
              <div className="w-12 h-12 rounded-xl bg-slate-50 p-2 border border-slate-200 flex items-center justify-center flex-shrink-0">
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={36}
                  height={36}
                  className="object-contain max-h-9"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg flex-shrink-0">
                {organization.name.charAt(0)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/organizations/${organization.slug}`}
                  className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors line-clamp-1"
                >
                  {organization.name}
                </Link>
                {organization.is_verified && (
                  <span className="inline-flex items-center text-emerald-600" title="Rasmiy tasdiqlangan">
                    <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
                  </span>
                )}
              </div>
              {category && (
                <span className="text-xs text-slate-500 font-medium">{category.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Short Description */}
        {organization.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {organization.description}
          </p>
        )}

        {/* Location / Region */}
        {region && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{region.name}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        {phoneFormatted ? (
          <a
            href={phoneFormatted.href}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{phoneFormatted.display}</span>
          </a>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Telefon ko‘rsatilmagan</span>
        )}

        <Link
          href={`/organizations/${organization.slug}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform"
        >
          <span>Batafsil</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
