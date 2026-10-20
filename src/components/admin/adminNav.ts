import {
  LayoutDashboard,
  CreditCard,
  BookOpen,
  PenTool,
  Users,
  Settings,
  ShieldCheck,
  Zap,
  FileDiff,
  DollarSign,
  Languages,
  Flag,
  type LucideIcon,
} from 'lucide-react';

/** Kutayotgan ishlar soni kalitlari (`/api/admin/pending-counts` javobi bilan mos). */
export type AdminBadgeKey = 'authors' | 'works' | 'revisions' | 'payouts' | 'reports';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: AdminBadgeKey;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

/** Admin menyusi: sidebar va mobil menyu uchun yagona manba. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Asosiy',
    items: [{ label: 'Boshqaruv paneli', href: '/diyoration/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Odamlar',
    items: [
      { label: 'Foydalanuvchilar', href: '/diyoration/foydalanuvchilar', icon: Users },
      { label: 'Mualliflar', href: '/diyoration/mualliflar', icon: PenTool, badge: 'authors' },
      { label: 'Shikoyatlar', href: '/diyoration/shikoyatlar', icon: Flag, badge: 'reports' },
    ],
  },
  {
    title: 'Kontent',
    items: [
      { label: 'Asarlar', href: '/diyoration/asarlar', icon: BookOpen, badge: 'works' },
      { label: 'Tahrirlar moderatsiyasi', href: '/diyoration/tahrirlar', icon: FileDiff, badge: 'revisions' },
      { label: 'Tarjima asarlar', href: '/diyoration/tarjima-asarlar', icon: Languages },
      { label: 'Manbora Plus', href: '/diyoration/plus', icon: Zap },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { label: 'Pul yechish so‘rovlari', href: '/diyoration/yechish-sorovlari', icon: CreditCard, badge: 'payouts' },
      { label: 'Moliyaviy tarix', href: '/diyoration/moliya', icon: DollarSign },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { label: 'Audit jurnali', href: '/diyoration/audit', icon: ShieldCheck },
      { label: 'Sozlamalar', href: '/diyoration/settings', icon: Settings },
    ],
  },
];

/** Mobil pastki panelda ko'rinadigan asosiy bo'limlar; qolganlari "Menyu" ichida. */
export const ADMIN_MOBILE_PRIMARY = [
  '/diyoration/dashboard',
  '/diyoration/foydalanuvchilar',
  '/diyoration/asarlar',
  '/diyoration/yechish-sorovlari',
];
