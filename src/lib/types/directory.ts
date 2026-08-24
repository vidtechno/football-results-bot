import { z } from 'zod';

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  sort_order: number;
  organization_count?: number;
}

export interface Region {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  organization_count?: number;
}

export interface Contact {
  id: number;
  organization_id: number;
  label?: string | null;
  phone_number: string;
  contact_type?: 'call_center' | 'head_office' | 'business_support' | 'fraud_hotline' | 'other';
  source_url?: string | null;
  last_verified_at?: string | null;
  is_primary: boolean;
}

export interface SocialLink {
  id: number;
  organization_id: number;
  platform: 'telegram' | 'instagram' | 'facebook' | 'youtube' | 'website' | 'other' | string;
  url: string;
}

export interface Location {
  id: number;
  organization_id: number;
  address: string;
  map_url?: string | null;
  working_hours?: string | null;
}

export interface DigitalService {
  id: number;
  organization_id: number;
  title: string;
  description?: string | null;
  service_type: 'website' | 'web_portal' | 'android_app' | 'ios_app' | 'telegram_bot' | 'online_service';
  url: string;
  platform_name?: string | null;
  is_official: boolean;
  source_url?: string | null;
  last_verified_at?: string | null;
  sort_order: number;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  category_id?: number | null;
  region_id?: number | null;
  website_url?: string | null;
  is_verified: boolean;
  organization_type?: 'bank' | 'government' | 'public_service' | 'utility' | 'telecom' | 'private_service';
  source_url?: string | null;
  source_name?: string | null;
  verification_status?: 'verified' | 'pending_review' | 'unverified';
  status: 'draft' | 'published' | 'archived';
  last_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  region?: Region | null;
  contacts?: Contact[];
  social_links?: SocialLink[];
  locations?: Location[];
  digital_services?: DigitalService[];
}

export interface OrganizationReport {
  id?: number;
  organization_id: number;
  report_type: 'wrong_phone' | 'wrong_address' | 'closed' | 'other';
  message: string;
  status?: 'pending' | 'reviewed' | 'resolved';
  created_at?: string;
}

export const ReportSchema = z.object({
  organization_id: z.number({ required_error: 'Tashkilot ID tanlanmagan' }),
  report_type: z.enum(['wrong_phone', 'wrong_address', 'closed', 'other']),
  message: z.string().min(5, 'Xabar kamida 5 ta belgidan iborat bo‘lishi kerak'),
});
