import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrganizationBySlug } from '@/lib/db/directory';
import { formatPhoneNumber, formatUzbekDate } from '@/lib/utils/formatters';
import { OrganizationDetailClient } from './client';
import { DigitalServicesSection } from '@/components/directory/DigitalServicesSection';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import {
  Phone,
  CheckCircle2,
  MapPin,
  Globe,
  Clock,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Send,
  Instagram,
  Facebook,
  Youtube,
  ShieldCheck,
} from 'lucide-react';

interface OrganizationDetailProps {
  params: {
    slug: string;
  };
}

export const revalidate = 60;

export default async function OrganizationDetailPage({ params }: OrganizationDetailProps) {
  const org = await getOrganizationBySlug(params.slug);

  if (!org) {
    notFound();
  }

  const category = org.category;
  const region = org.region;
  const contacts = org.contacts || [];
  const socialLinks = org.social_links || [];
  const locations = org.locations || [];
  const digitalServices = org.digital_services || [];

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
  const primaryPhoneObj = primaryContact ? formatPhoneNumber(primaryContact.phone_number) : null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Back Link */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Qidiruvga qaytish</span>
      </Link>

      {/* Visually Strong Top Profile Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-lg shadow-blue-950/5 space-y-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <OrganizationAvatar
              name={org.name}
              logoUrl={org.logo_url}
              type={org.organization_type}
              categorySlug={category?.slug}
              size="lg"
            />

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{org.name}</h1>
                {org.is_verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rasmiy tasdiqlangan</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                {category && (
                  <Link
                    href={`/categories/${category.slug}`}
                    className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors font-bold"
                  >
                    {category.name}
                  </Link>
                )}
                {region && (
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {region.name}
                  </span>
                )}
                {org.organization_type === 'bank' && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                    Tijorat Banki
                  </span>
                )}
                {org.organization_type === 'government' && (
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    Davlat Organi
                  </span>
                )}
              </div>
            </div>
          </div>

          <OrganizationDetailClient organizationId={org.id} organizationName={org.name} />
        </div>

        {/* Primary Call CTA Button */}
        {primaryPhoneObj && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-emerald-600/20">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-900 block">{primaryContact?.label || 'Asosiy ishonch telefoni'}</span>
                <span className="text-xl font-black text-emerald-950">{primaryPhoneObj.display}</span>
              </div>
            </div>

            <a
              href={primaryPhoneObj.href}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Qo‘ng‘iroq qilish</span>
            </a>
          </div>
        )}

        {/* Description */}
        {org.description && (
          <div className="pt-2 text-sm text-slate-700 leading-relaxed font-medium">
            {org.description}
          </div>
        )}

        {/* Verification & Source Meta */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2 pt-3 border-t border-slate-100 font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Oxirgi tekshirilgan sana: <strong>{formatUzbekDate(org.last_verified_at || org.updated_at)}</strong>
          </span>
          {org.source_name && (
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tasdiqlangan manba: <strong className="text-slate-800">{org.source_name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Visually Prominent Digital Services Section */}
      <DigitalServicesSection
        services={digitalServices}
        sourceUrl={org.source_url}
        sourceName={org.source_name}
        lastVerifiedAt={org.last_verified_at}
      />

      {/* Grouped Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Numbers List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>Barcha aloqa raqamlari</span>
          </h2>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400">Telefon raqamlari kiritilmagan</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => {
                const formatted = formatPhoneNumber(c.phone_number);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80"
                  >
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">{c.label || 'Aloqa raqami'}</span>
                      <strong className="text-base font-black text-slate-900">{formatted.display}</strong>
                    </div>
                    <a
                      href={formatted.href}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Qo‘ng‘iroq</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Web & Social Links */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>Veb-sayt va tarmoqlar</span>
          </h2>

          <div className="space-y-3">
            {org.website_url && (
              <a
                href={org.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold truncate">{org.website_url.replace(/^https?:\/\//, '')}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </a>
            )}

            {socialLinks.map((s) => {
              const platformLower = s.platform.toLowerCase();
              let Icon = Globe;
              let label = 'Ijtimoiy tarmoq';
              let badgeColor = 'bg-slate-50 text-slate-800 border-slate-200';

              if (platformLower.includes('telegram')) {
                Icon = Send;
                label = 'Telegram rasmiy kanali';
                badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
              } else if (platformLower.includes('instagram')) {
                Icon = Instagram;
                label = 'Instagram sahifasi';
                badgeColor = 'bg-pink-50 text-pink-700 border-pink-200';
              } else if (platformLower.includes('facebook')) {
                Icon = Facebook;
                label = 'Facebook sahifasi';
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
              } else if (platformLower.includes('youtube')) {
                Icon = Youtube;
                label = 'YouTube kanali';
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              }

              return (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${badgeColor}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-bold">{label}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </a>
              );
            })}

            {!org.website_url && socialLinks.length === 0 && (
              <p className="text-xs text-slate-400">Havola yoki tarmoqlar kiritilmagan</p>
            )}
          </div>
        </div>
      </div>

      {/* Locations & Working Hours */}
      {locations.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>Manzil va ish rejimi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-800 font-bold">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{loc.address}</span>
                </div>

                {loc.working_hours && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ish vaqti: <strong className="text-slate-900">{loc.working_hours}</strong></span>
                  </div>
                )}

                {loc.map_url && (
                  <a
                    href={loc.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
                  >
                    <span>Xaritadan ko‘rish</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
