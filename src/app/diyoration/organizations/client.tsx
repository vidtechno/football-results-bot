'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  ArrowUpDown,
  Building2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { clsx } from 'clsx';

interface OrganizationsTableClientProps {
  initialOrganizations: any[];
  categories: any[];
  regions: any[];
}

export function OrganizationsTableClient({
  initialOrganizations,
  categories,
  regions,
}: OrganizationsTableClientProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>(initialOrganizations);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter organizations locally
  const filtered = organizations.filter((org) => {
    if (categoryFilter && org.category_id !== Number(categoryFilter)) return false;
    if (regionFilter && org.region_id !== Number(regionFilter)) return false;
    if (typeFilter && org.organization_type !== typeFilter) return false;
    if (statusFilter && org.status !== statusFilter) return false;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const matchName = org.name?.toLowerCase().includes(q);
      const matchSlug = org.slug?.toLowerCase().includes(q);
      const matchPhone = org.contacts?.some((c: any) => c.phone_number?.includes(q));
      return matchName || matchSlug || matchPhone;
    }

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/organizations?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setOrganizations((prev) => prev.filter((o) => o.id !== deleteTarget.id));
        setDeleteTarget(null);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tashkilot nomi, slug yoki telefon raqami..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 bg-slate-50/50"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Barcha viloyatlar</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Barcha turlar</option>
              <option value="bank">Tijorat Banki</option>
              <option value="government">Davlat Organi</option>
              <option value="utility">Kommunal</option>
              <option value="telecom">Telekom</option>
              <option value="private_service">Xususiy Xizmat</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
            >
              <option value="">Barcha statuslar</option>
              <option value="published">Chop etilgan</option>
              <option value="draft">Qoralama</option>
              <option value="archived">Arxivlangan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Result Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
        <span>Topildi: <strong className="text-slate-900 font-bold">{filtered.length} ta tashkilot</strong></span>
        {selectedIds.length > 0 && (
          <span className="text-blue-600 font-bold">{selectedIds.length} ta tanlandi</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button type="button" onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Tashkilot</th>
                <th className="p-4">Kategoriya & Hudud</th>
                <th className="p-4">Tur</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amallar</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Tashkilotlar topilmadi
                  </td>
                </tr>
              ) : (
                filtered.map((org) => {
                  const isSelected = selectedIds.includes(org.id);

                  return (
                    <tr key={org.id} className={clsx('hover:bg-slate-50/80 transition-colors', isSelected && 'bg-blue-50/50')}>
                      <td className="p-4 text-center">
                        <button type="button" onClick={() => toggleSelectOne(org.id)} className="text-slate-400 hover:text-blue-600">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <OrganizationAvatar
                            name={org.name}
                            logoUrl={org.logo_url}
                            type={org.organization_type}
                            categorySlug={org.category?.slug}
                            size="sm"
                          />
                          <div>
                            <Link href={`/diyoration/organizations/${org.id}`} className="font-extrabold text-slate-900 hover:text-blue-600 transition-colors block">
                              {org.name}
                            </Link>
                            <span className="text-[11px] text-slate-400 block font-mono">/{org.slug}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block">{org.category?.name || 'Kategoriyasiz'}</span>
                          <span className="text-[11px] text-slate-500 block">{org.region?.name || 'Toshkent'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {org.organization_type || 'private'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            org.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {org.status === 'published' ? 'Chop etilgan' : 'Qoralama'}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/organizations/${org.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Ommaaviy ko‘rish"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/diyoration/organizations/${org.id}`}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(org)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                            title="O‘chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Tashkilotni o‘chirish"
        message={`Haqiqatdan ham “${deleteTarget?.name}” tashkilotini o‘chirib tashlamoqchimisiz? Ushbu amalni ortga qaytarib bo‘lmaydi.`}
        confirmLabel="Ha, o‘chirish"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
