import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getOrganizationBySlug } from '@/lib/db/directory';
import { formatPhoneNumber, formatUzbekDate } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { OrganizationDetailClient } from './client';
import {
  Phone,
  CheckCircle2,
  MapPin,
  Globe,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Share2,
  ExternalLink,
  Send,
  Instagram,
  Facebook,
  Youtube,
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Qidiruvga qaytish</span>
      </Link>

      {/* Main Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            {org.logo_url ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Image
                  src={org.logo_url}
                  alt={org.name}
                  width={80}
                  height={80}
                  className="object-contain max-h-16"
                />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700 font-extrabold text-3xl flex-shrink-0">
                {org.name.charAt(0)}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{org.name}</h1>
                {org.is_verified && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Rasmiy tasdiqlangan</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                {category && (
                  <Link
                    href={`/categories/${category.slug}`}
                    className="hover:text-sky-600 underline font-semibold"
                  >
                    {category.name}
                  </Link>
                )}
                {region && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {region.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <OrganizationDetailClient organizationId={org.id} organizationName={org.name} />
        </div>

        {/* Description */}
        {org.description && (
          <div className="pt-4 border-t border-slate-100 text-sm text-slate-700 leading-relaxed">
            {org.description}
          </div>
        )}

        {/* Verification / Update Meta */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Oxirgi tekshirilgan sana: {org.last_verified_at ? formatUzbekDate(org.last_verified_at) : formatUzbekDate(org.updated_at)}
          </span>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone Numbers */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>Telefon raqamlari</span>
          </h2>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400">Rasmiy telefon raqamlari kiritilmagan</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c) => {
                const formatted = formatPhoneNumber(c.phone_number);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                  >
                    <div>
                      <span className="text-xs text-slate-500 font-semibold block">{c.label || 'Aloqa raqami'}</span>
                      <strong className="text-base font-extrabold text-slate-900">{formatted.display}</strong>
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

        {/* Official Web & Social Links */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-600" />
            <span>Veb-sayt va ijtimoiy tarmoqlar</span>
          </h2>

          <div className="space-y-3">
            {org.website_url && (
              <a
                href={org.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  <span className="text-sm font-bold truncate">{org.website_url.replace(/^https?:\/\//, '')}</span>
                </div>
                <ExternalLink className="w-4 h-4 text-sky-600" />
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
              <p className="text-xs text-slate-400">Rasmiy havola yoki tarmoqlar kiritilmagan</p>
            )}
          </div>
        </div>
      </div>

      {/* Locations & Working Hours */}
      {locations.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-600" />
            <span>Manzil va ish vaqti</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-800 font-semibold">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{loc.address}</span>
                </div>

                {loc.working_hours && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ish vaqti: <strong>{loc.working_hours}</strong></span>
                  </div>
                )}

                {loc.map_url && (
                  <a
                    href={loc.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline pt-1"
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
