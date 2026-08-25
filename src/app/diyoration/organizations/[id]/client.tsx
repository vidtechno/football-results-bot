'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify, formatUzbekDate } from '@/lib/utils/formatters';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { DigitalServicesSection } from '@/components/directory/DigitalServicesSection';
import {
  Building2,
  Phone,
  Mail,
  Smartphone,
  Share2,
  MapPin,
  ShieldCheck,
  History,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Send,
  Instagram,
  Facebook,
  Youtube,
} from 'lucide-react';
import { clsx } from 'clsx';

interface EditOrganizationTabbedClientProps {
  organization: any;
  categories: any[];
  regions: any[];
  auditLogs: any[];
}

export function EditOrganizationTabbedClient({
  organization,
  categories,
  regions,
  auditLogs,
}: EditOrganizationTabbedClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'basic' | 'contacts' | 'emails' | 'services' | 'social' | 'locations' | 'verification' | 'history'
  >('basic');

  // Basic Form State
  const [name, setName] = useState(organization.name || '');
  const [slug, setSlug] = useState(organization.slug || '');
  const [description, setDescription] = useState(organization.description || '');
  const [categoryId, setCategoryId] = useState(organization.category_id || '');
  const [regionId, setRegionId] = useState(organization.region_id || '');
  const [organizationType, setOrganizationType] = useState(organization.organization_type || 'private_service');
  const [websiteUrl, setWebsiteUrl] = useState(organization.website_url || '');
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || '');
  const [status, setStatus] = useState(organization.status || 'published');
  const [verificationStatus, setVerificationStatus] = useState(organization.verification_status || 'verified');
  const [sourceName, setSourceName] = useState(organization.source_name || '');
  const [sourceUrl, setSourceUrl] = useState(organization.source_url || '');

  // Contacts List State
  const [contacts, setContacts] = useState<any[]>(organization.contacts || []);

  // Emails List State
  const [emails, setEmails] = useState<any[]>(organization.emails || []);

  // Digital Services State
  const [services, setServices] = useState<any[]>(organization.digital_services || []);

  // Social Links State
  const [socialLinks, setSocialLinks] = useState<any[]>(organization.social_links || []);

  // Locations State
  const [locations, setLocations] = useState<any[]>(organization.locations || []);

  // Branch & Parent State
  const [isBranch, setIsBranch] = useState(Boolean(organization.is_branch));
  const [parentId, setParentId] = useState(organization.parent_id || '');
  const [branchType, setBranchType] = useState(organization.branch_type || 'main');

  // Aliases & Service Keywords State
  const [aliases, setAliases] = useState<any[]>(
    organization.aliases || [{ alias: '' }]
  );
  const [serviceKeywords, setServiceKeywords] = useState<any[]>(
    organization.service_keywords || [{ service_title: '', keywords: [] }]
  );

  // Working Hours & Coordinates State
  const [is247, setIs247] = useState(Boolean(organization.is_24_7));
  const [workingSchedule, setWorkingSchedule] = useState<any>(organization.working_schedule || {});
  const [latitude, setLatitude] = useState(organization.latitude || '');
  const [longitude, setLongitude] = useState(organization.longitude || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Save changes handler
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: organization.id,
          name,
          slug,
          description,
          category_id: categoryId ? Number(categoryId) : null,
          region_id: regionId ? Number(regionId) : null,
          organization_type: organizationType,
          website_url: websiteUrl,
          logo_url: logoUrl,
          status,
          verification_status: verificationStatus,
          is_verified: verificationStatus === 'verified',
          source_name: sourceName,
          source_url: sourceUrl,
          parent_id: parentId ? Number(parentId) : null,
          is_branch: isBranch,
          branch_type: branchType,
          is_24_7: is247,
          working_schedule: workingSchedule,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          contacts,
          emails,
          digital_services: services,
          social_links: socialLinks,
          locations,
          aliases: aliases.filter((a) => a.alias && a.alias.trim()),
          service_keywords: serviceKeywords.filter((sk) => sk.service_title && sk.service_title.trim()),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Saqlashda xatolik yuz berdi' });
        setSaving(false);
        return;
      }

      setMessage({ type: 'success', text: 'Tashkilot ma’lumotlari muvaffaqiyatli saqlandi!' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Tarmoq xatoligi yuz berdi' });
    } finally {
      setSaving(false);
    }
  };

  // Contacts helpers
  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: 'Call-Markaz',
        phone_number: '+998',
        contact_type: 'call_center',
        is_primary: prev.length === 0,
      },
    ]);
  };

  const updateContact = (index: number, field: string, value: any) => {
    setContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'is_primary' && value === true) {
        updated.forEach((c, idx) => {
          if (idx !== index) c.is_primary = false;
        });
      }
      return updated;
    });
  };

  const removeContact = (index: number) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Emails helpers
  const addEmail = () => {
    setEmails((prev) => [
      ...prev,
      {
        id: Date.now(),
        email: '',
        label: 'Umumiy murojaatlar',
        is_primary: prev.length === 0,
        is_verified: true,
      },
    ]);
  };

  const updateEmail = (index: number, field: string, value: any) => {
    setEmails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'is_primary' && value === true) {
        updated.forEach((e, idx) => {
          if (idx !== index) e.is_primary = false;
        });
      }
      return updated;
    });
  };

  const removeEmail = (index: number) => {
    setEmails((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Services helpers
  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: '',
        description: '',
        service_type: 'android_app',
        url: '',
        platform_name: 'Google Play',
        is_official: true,
      },
    ]);
  };

  const updateService = (index: number, field: string, value: any) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Social helpers
  const addSocial = () => {
    setSocialLinks((prev) => [...prev, { id: Date.now(), platform: 'telegram', url: 'https://t.me/' }]);
  };

  // Location helpers
  const addLocation = () => {
    setLocations((prev) => [...prev, { id: Date.now(), address: '', working_hours: '09:00 - 18:00' }]);
  };

  const tabs = [
    { key: 'basic', label: '1. Asosiy Ma’lumotlar', icon: Building2 },
    { key: 'contacts', label: `2. Telefon Raqamlar (${contacts.length})`, icon: Phone },
    { key: 'emails', label: `3. Elektron Pochta (${emails.length})`, icon: Mail },
    { key: 'services', label: `4. Raqamli Xizmatlar (${services.length})`, icon: Smartphone },
    { key: 'social', label: `5. Ijtimoiy Tarmoqlar (${socialLinks.length})`, icon: Share2 },
    { key: 'locations', label: `6. Manzil & Ish Rejimi (${locations.length})`, icon: MapPin },
    { key: 'verification', label: '7. Manba & Verifikatsiya', icon: ShieldCheck },
    { key: 'history', label: `8. Tarix (${auditLogs.length})`, icon: History },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Status Bar & Global Save */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OrganizationAvatar name={name} logoUrl={logoUrl} type={organizationType} size="md" />
          <div>
            <h2 className="font-black text-slate-900 text-base">{name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <span className="font-mono">ID: #{organization.id}</span>
              <span>•</span>
              <span className="text-blue-600 font-bold">/{slug}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {message && (
            <span
              className={clsx(
                'text-xs font-bold px-3 py-1.5 rounded-xl border',
                message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200',
              )}
            >
              {message.text}
            </span>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
            <span>O‘zgarishlarni Saqlash</span>
          </button>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-extrabold">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all flex-shrink-0',
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BASIC INFORMATION */}
      {activeTab === 'basic' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">1. Asosiy Ma’lumotlar</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tashkilot nomi *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold text-slate-900 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-bold text-slate-800 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategoriya</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="">Kategoriya tanlang</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Viloyat / Hudud</label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="">Hudud tanlang</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tashkilot turi</label>
              <select
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="bank">Tijorat Banki</option>
                <option value="government">Davlat Organi</option>
                <option value="utility">Kommunal</option>
                <option value="telecom">Telekom</option>
                <option value="public_service">Jamoat Xizmati</option>
                <option value="private_service">Xususiy Xizmat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Qisqacha tavsifi (Uzbek Latin)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rasmiy Veb-Sayti</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-900 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chop Etish Statusi</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="published">Chop etilgan (Published)</option>
                <option value="draft">Qoralama (Draft)</option>
                <option value="archived">Arxivlangan (Archived)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL (Ixtiyoriy)</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/logos/sqb.png yoki SVG"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-medium text-slate-900 bg-slate-50/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTACT NUMBERS */}
      {activeTab === 'contacts' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">2. Telefon Raqamlar Redaktori</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Mavjud aloqa raqamlari tartiblang, turini belgilang va yangi raqamlar qo‘shing</p>
            </div>
            <button
              type="button"
              onClick={addContact}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-sm hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              <span>Raqam qo‘shish</span>
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Hali telefon raqamlari qo‘shilmagan</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((c, index) => (
                <div key={c.id || index} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomi / Label</label>
                    <input
                      type="text"
                      value={c.label || ''}
                      onChange={(e) => updateContact(index, 'label', e.target.value)}
                      placeholder="Call-Markaz 24/7"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Telefon Raqami *</label>
                    <input
                      type="text"
                      value={c.phone_number || ''}
                      onChange={(e) => updateContact(index, 'phone_number', e.target.value)}
                      placeholder="+998712000000"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Aloqa Turi</label>
                    <select
                      value={c.contact_type || 'call_center'}
                      onChange={(e) => updateContact(index, 'contact_type', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="call_center">Call-Markaz (Qo‘llab-quvvatlash)</option>
                      <option value="head_office">Bosh Ofis / Devonxona</option>
                      <option value="business_support">Biznes Mijozlar</option>
                      <option value="fraud_hotline">Ishonch Liniyasi</option>
                      <option value="other">Boshqa</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:pt-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(c.is_primary)}
                        onChange={(e) => updateContact(index, 'is_primary', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Asosiy raqam</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMAIL ADDRESSES */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">3. Elektron Pochta Manzillari Redaktori</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Rasmiy elektron pochta manzillarini kiriting, turini va verifikatsiyasini belgilang
              </p>
            </div>
            <button
              type="button"
              onClick={addEmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Email qo‘shish</span>
            </button>
          </div>

          {emails.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Hali elektron pochta manzillari qo‘shilmagan</p>
          ) : (
            <div className="space-y-3">
              {emails.map((e, index) => (
                <div
                  key={e.id || index}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Elektron Pochta Manzili *</label>
                    <input
                      type="email"
                      value={e.email || ''}
                      onChange={(ev) => updateEmail(index, 'email', ev.target.value)}
                      placeholder="info@tashkilot.uz"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Nomi / Label</label>
                    <input
                      type="text"
                      value={e.label || ''}
                      onChange={(ev) => updateEmail(index, 'label', ev.target.value)}
                      placeholder="Umumiy murojaatlar"
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(e.is_primary)}
                        onChange={(ev) => updateEmail(index, 'is_primary', ev.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Asosiy</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(e.is_verified)}
                        onChange={(ev) => updateEmail(index, 'is_verified', ev.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Tasdiqlangan</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DIGITAL SERVICES & APPS */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">4. Raqamli Xizmatlar & Mobil Ilovalar</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Android, iOS ilovalar, veb-portallar va Telegram botlarni maqsadi bilan kiritish</p>
            </div>
            <button
              type="button"
              onClick={addService}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-sm hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              <span>Xizmat qo‘shish</span>
            </button>
          </div>

          {services.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Hali raqamli xizmatlar qo‘shilmagan</p>
          ) : (
            <div className="space-y-4">
              {services.map((s, index) => (
                <div key={s.id || index} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Xizmat Nomi *</label>
                      <input
                        type="text"
                        value={s.title || ''}
                        onChange={(e) => updateService(index, 'title', e.target.value)}
                        placeholder="NBU Mobile Banking (Android)"
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Xizmat Turi</label>
                      <select
                        value={s.service_type || 'android_app'}
                        onChange={(e) => updateService(index, 'service_type', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 bg-white"
                      >
                        <option value="android_app">Android Ilova (Google Play)</option>
                        <option value="ios_app">iOS Ilova (App Store)</option>
                        <option value="web_portal">Davlat Elektron Portali</option>
                        <option value="website">Rasmiy Veb-Sayt</option>
                        <option value="telegram_bot">Telegram Bot / Kanal</option>
                        <option value="online_service">Onlayn Xizmat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Rasmiy URL Havola *</label>
                      <input
                        type="url"
                        value={s.url || ''}
                        onChange={(e) => updateService(index, 'url', e.target.value)}
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-medium text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Aniq Maqsadi va Tavsifi (1–2 cümlə Uzbek Latin) *</label>
                    <input
                      type="text"
                      value={s.description || ''}
                      onChange={(e) => updateService(index, 'description', e.target.value)}
                      placeholder="Kartadan kartaga pul o‘tkazmalari, kommunal to‘lovlar, omonatlar va valyuta konvertatsiyasi ilovasi."
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold">Tartib o‘rni: #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xizmatni o‘chirish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live Preview Section */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Saytdagi Ko‘rinish Prevyusi</h4>
            <DigitalServicesSection services={services} sourceName={sourceName} sourceUrl={sourceUrl} />
          </div>
        </div>
      )}

      {/* TAB 5: SOCIAL LINKS */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900">5. Ijtimoiy Tarmoqlar</h3>
            <button
              type="button"
              onClick={addSocial}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white font-extrabold text-xs shadow-sm hover:bg-sky-700"
            >
              <Plus className="w-4 h-4" />
              <span>Tarmoq qo‘shish</span>
            </button>
          </div>

          {socialLinks.map((s, index) => (
            <div key={s.id || index} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <select
                value={s.platform || 'telegram'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSocialLinks((prev) => {
                    const copy = [...prev];
                    copy[index].platform = val;
                    return copy;
                  });
                }}
                className="rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 bg-white w-40"
              >
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="website">Veb-sayt</option>
              </select>

              <input
                type="url"
                value={s.url || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSocialLinks((prev) => {
                    const copy = [...prev];
                    copy[index].url = val;
                    return copy;
                  });
                }}
                placeholder="https://t.me/rasmiy_kanal"
                className="flex-1 rounded-xl border border-slate-200 p-2 text-xs font-mono font-medium text-slate-900 bg-white"
              />

              <button
                type="button"
                onClick={() => setSocialLinks((prev) => prev.filter((_, i) => i !== index))}
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: LOCATIONS & WORKING HOURS */}
      {activeTab === 'locations' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900">6. Manzil va Ish Rejimi</h3>
            <button
              type="button"
              onClick={addLocation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Manzil qo‘shish</span>
            </button>
          </div>

          {locations.map((loc, index) => (
            <div key={loc.id || index} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">To‘liq Manzil *</label>
                <input
                  type="text"
                  value={loc.address || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocations((prev) => {
                      const copy = [...prev];
                      copy[index].address = val;
                      return copy;
                    });
                  }}
                  placeholder="Toshkent sh., Amir Temur ko‘chasi, 107-uy"
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ish Rejimi (Vaqti)</label>
                  <input
                    type="text"
                    value={loc.working_hours || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocations((prev) => {
                        const copy = [...prev];
                        copy[index].working_hours = val;
                        return copy;
                      });
                    }}
                    placeholder="Dush-Juma: 09:00 - 18:00 (Tushlik: 13:00-14:00)"
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-medium text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Xarita Havolasi (Map URL)</label>
                  <input
                    type="url"
                    value={loc.map_url || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocations((prev) => {
                        const copy = [...prev];
                        copy[index].map_url = val;
                        return copy;
                      });
                    }}
                    placeholder="https://maps.google.com/..."
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs font-mono font-medium text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 7: VERIFICATION & OFFICIAL SOURCES */}
      {activeTab === 'verification' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">7. Rasmiy Manbalar & Verifikatsiya</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Verifikatsiya Statusi</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="verified">Tasdiqlangan (Verified)</option>
                <option value="pending_review">Ko‘rib Chiqilmoqda (Pending Review)</option>
                <option value="unverified">Tasdiqlanmagan (Unverified)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tasdiqlangan Manba Nomi</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="O‘zbekiston Respublikasi Markaziy Banki (CBU)"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-900 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Manba URL Havolasi</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://cbu.uz/en/credit-organizations/banks/"
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono font-medium text-slate-900 bg-slate-50/50"
            />
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium space-y-1">
            <span className="font-bold block flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Oxirgi rasmiy verifikatsiya qilingan vaqt:
            </span>
            <strong className="text-sm font-black">{formatUzbekDate(organization.last_verified_at || organization.updated_at)}</strong>
          </div>
        </div>
      )}

      {/* TAB 8: ACTIVITY HISTORY AUDIT LOGS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">8. O‘zgarishlar va Audit Tarixi</h3>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Ushbu tashkilot uchun audit yozuvlari yo‘q</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{log.admin_username} tomonidan {log.action} amali bajarildi</span>
                    <span className="text-[11px] text-slate-500 font-medium">{formatUzbekDate(log.created_at)}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
