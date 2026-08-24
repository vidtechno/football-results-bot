import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrganizationBySlug } from '@/lib/db/directory';
import { formatPhoneNumber, formatUzbekDate } from '@/lib/utils/formatters';
import { isNewlyVerified } from '@/lib/utils/badges';
import { OrganizationDetailClient } from './client';
import { DigitalServicesSection } from '@/components/directory/DigitalServicesSection';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { CopyButton } from '@/components/ui/CopyButton';
import { ShareButton } from '@/components/ui/ShareButton';
import {
  Phone,
  Mail,
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
  Headphones,
  Building,
  Briefcase,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface OrganizationDetailProps {
  params: {
    slug: string;
  };
}

export const revalidate = 60;

export async function generateMetadata({ params }: OrganizationDetailProps): Promise<Metadata> {
  const org = await getOrganizationBySlug(params.slug);
  if (!org) {
    return {
      title: 'Tashkilot topilmadi | Manbora',
    };
  }

  const title = `${org.name} — Telefon raqami, manzil va rasmiy xizmatlar`;
  const description = org.description
    ? `${org.name} aloqa ma’lumotlari: ${org.description.slice(0, 140)}...`
    : `${org.name} rasmiy ishonch telefonlari, manzillari va raqamli xizmatlari Manbora katalogida.`;
  const canonicalUrl = `https://manbora.uz/organizations/${org.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${org.name} | Manbora`,
      description,
      url: canonicalUrl,
      siteName: 'Manbora',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${org.name} | Manbora`,
      description,
    },
  };
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailProps) {
  const org = await getOrganizationBySlug(params.slug);

  if (!org) {
    notFound();
  }

  const category = org.category;
  const region = org.region;
  const contacts = org.contacts || [];
  const emails = org.emails || [];
  const socialLinks = org.social_links || [];
  const locations = org.locations || [];
  const digitalServices = org.digital_services || [];

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
  const primaryPhoneObj = primaryContact ? formatPhoneNumber(primaryContact.phone_number) : null;
  const newlyVerified = isNewlyVerified(org.last_verified_at);

  const fullUrl = `https://manbora.uz/organizations/${org.slug}`;

  // Organization / LocalBusiness JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: fullUrl,
    logo: org.logo_url || undefined,
    description: org.description || undefined,
    telephone: primaryContact?.phone_number || undefined,
    sameAs: [
      org.website_url,
      ...socialLinks.map((s) => s.url),
    ].filter(Boolean),
    address: locations[0]
      ? {
          '@type': 'PostalAddress',
          streetAddress: locations[0].address,
          addressLocality: locations[0].city_district || region?.name || 'Toshkent',
          addressCountry: 'UZ',
        }
      : undefined,
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:pb-12 px-4 sm:px-0">
      {/* Inject Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation & Single Action Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Qidiruvga qaytish</span>
        </Link>

        <div className="flex items-center gap-2">
          <OrganizationDetailClient organizationId={org.id} organizationName={org.name} />
          <ShareButton title={org.name} url={fullUrl} description={org.description || undefined} />
        </div>
      </div>

      {/* Visually Strong Profile Hero Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200/90 shadow-md shadow-blue-950/5 space-y-4 sm:space-y-6 relative overflow-hidden">
        <div className="flex items-start gap-3.5 sm:gap-6 min-w-0 w-full">
          <OrganizationAvatar
            name={org.name}
            logoUrl={org.logo_url}
            type={org.organization_type}
            categorySlug={category?.slug}
            size="lg"
          />

          <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight break-words">
              {org.name}
            </h1>

            {/* Compact Inline Metadata Badges */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] sm:text-xs pt-0.5">
              {org.is_verified && (
                <span className="inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span>Rasmiy tasdiqlangan</span>
                </span>
              )}

              {newlyVerified && (
                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200/80">
                  <Sparkles className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                  <span>Yangi tekshirildi</span>
                </span>
              )}

              {category && (
                <Link
                  href={`/categories/${category.slug}`}
                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors font-extrabold"
                >
                  {category.name}
                </Link>
              )}

              {region && (
                <span className="inline-flex items-center gap-1 font-semibold text-slate-600 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>{region.name}</span>
                </span>
              )}

              {org.organization_type === 'bank' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-extrabold border border-amber-200/80">
                  Tijorat Banki
                </span>
              )}

              {org.organization_type === 'government' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200/80">
                  Davlat Organi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Call CTA Button & Copy Button */}
        {primaryPhoneObj ? (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-emerald-600/20">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-900 block truncate">
                  {primaryContact?.label || 'Asosiy ishonch telefoni'}
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-950 block tracking-tight">
                  {primaryPhoneObj.display}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={primaryPhoneObj.href}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/30 active:scale-95 transition-all min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                <span>Qo‘ng‘iroq qilish</span>
              </a>
              <CopyButton textToCopy={primaryContact!.phone_number} className="bg-white py-2.5 px-3 min-h-[44px] min-w-[44px]" />
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-slate-500 text-xs font-medium">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Ushbu tashkilot uchun ochiq aloqa telefon raqami ko‘rsatilmadi</span>
          </div>
        )}

        {/* Description */}
        {org.description && (
          <div className="pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {org.description}
          </div>
        )}

        {/* Verification & Official Source Link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs text-slate-500 gap-2 pt-3 border-t border-slate-100 font-medium">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Oxirgi tekshirildi: <strong className="text-slate-900">{formatUzbekDate(org.last_verified_at || org.updated_at)}</strong>
          </span>

          {org.source_url && (
            <a
              href={org.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-extrabold text-blue-600 hover:underline"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Rasmiy manba ({org.source_name || 'Hujjat'})</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Digital Services Section */}
      <DigitalServicesSection
        services={digitalServices}
        sourceUrl={org.source_url}
        sourceName={org.source_name}
        lastVerifiedAt={org.last_verified_at}
      />

      {/* Email Addresses Section */}
      {emails.length > 0 && (
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Elektron pochta manzillari</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emails.map((e) => (
              <div
                key={e.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      <Mail className="w-3 h-3" />
                      <span>{e.label || 'Umumiy murojaatlar'}</span>
                    </span>

                    {e.is_primary && (
                      <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Asosiy
                      </span>
                    )}

                    {e.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Tasdiqlangan</span>
                      </span>
                    )}
                  </div>

                  <a
                    href={`mailto:${e.email}`}
                    className="text-xs sm:text-sm font-black text-slate-900 hover:text-blue-600 transition-colors block truncate font-mono"
                  >
                    {e.email}
                  </a>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <CopyButton textToCopy={e.email} showLabel={false} label="Nusxalash" className="bg-white min-h-[44px] min-w-[44px]" />
                  <a
                    href={`mailto:${e.email}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center shadow-xs active:scale-95 transition-all"
                    title={`${e.email} ga xat yuborish`}
                    aria-label={`${e.email} ga xat yuborish`}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grouped Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Contact Numbers List */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>Barcha aloqa raqamlari</span>
          </h2>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Telefon raqamlari kiritilmagan</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => {
                const formatted = formatPhoneNumber(c.phone_number);
                let Icon = Headphones;
                let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                if (c.contact_type === 'head_office') {
                  Icon = Building;
                  badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                } else if (c.contact_type === 'business_support') {
                  Icon = Briefcase;
                  badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                } else if (c.contact_type === 'fraud_hotline') {
                  Icon = AlertTriangle;
                  badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                }

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 gap-3"
                  >
                    <div className="min-w-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md border mb-1 ${badgeStyle}`}>
                        <Icon className="w-3 h-3" />
                        <span>{c.label || 'Aloqa raqami'}</span>
                      </span>
                      <strong className="text-sm sm:text-base font-black text-slate-900 block tracking-tight">{formatted.display}</strong>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <CopyButton textToCopy={c.phone_number} className="min-h-[44px] min-w-[44px]" />
                      <a
                        href={formatted.href}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1 active:scale-95 min-h-[44px]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Qo‘ng‘iroq</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Web & Social Links */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>Veb-sayt va tarmoqlar</span>
          </h2>

          <div className="space-y-3">
            {org.website_url && (
              <div className="flex items-center gap-2">
                <a
                  href={org.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-bold truncate">{org.website_url.replace(/^https?:\/\//, '')}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 ml-1" />
                </a>
                <CopyButton textToCopy={org.website_url} className="min-h-[44px] min-w-[44px]" />
              </div>
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
                <div key={s.id} className="flex items-center gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center justify-between p-3.5 rounded-2xl border transition-colors min-h-[44px] ${badgeColor}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-bold truncate">{label}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-70 flex-shrink-0 ml-1" />
                  </a>
                  <CopyButton textToCopy={s.url} className="min-h-[44px] min-w-[44px]" />
                </div>
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
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>Manzil va ish rejimi</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-bold">
                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span>{loc.address}</span>
                      {loc.city_district && (
                        <span className="block text-xs text-blue-600 font-bold mt-0.5">{loc.city_district}</span>
                      )}
                    </div>
                  </div>
                  <CopyButton textToCopy={loc.address} className="min-h-[44px] min-w-[44px]" />
                </div>

                {loc.working_hours && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Ish vaqti: <strong className="text-slate-900">{loc.working_hours}</strong></span>
                  </div>
                )}

                {loc.map_url && (
                  <a
                    href={loc.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1 min-h-[36px]"
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
