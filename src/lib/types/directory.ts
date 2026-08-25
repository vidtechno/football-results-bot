import { z } from 'zod';

export type BranchType = 'main' | 'branch' | 'regional_office' | 'district_office';

export interface DaySchedule {
  open?: string | null;
  close?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  is_closed?: boolean;
}

export interface WorkingSchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  note?: string | null;
}

export interface OrganizationAlias {
  id: number;
  organization_id: number;
  alias: string;
  created_at?: string;
}

export interface OrganizationServiceKeyword {
  id: number;
  organization_id: number;
  service_title: string;
  keywords: string[];
  created_at?: string;
}

export interface SearchQueryAnalytic {
  id: number;
  query_text: string;
  has_results: boolean;
  result_count: number;
  visitor_hash: string;
  created_at: string;
}

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
  city_district?: string | null;
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

export interface OrganizationEmail {
  id: number;
  organization_id: number;
  email: string;
  label?: string | null;
  is_primary: boolean;
  is_verified: boolean;
  sort_order: number;
  created_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  category_id?: number | null;
  region_id?: number | null;
  city_district?: string | null;
  address?: string | null;
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

  // Branch & Location Coordinates
  parent_id?: number | null;
  is_branch?: boolean;
  branch_type?: BranchType;
  working_schedule?: WorkingSchedule | null;
  is_24_7?: boolean;
  latitude?: number | null;
  longitude?: number | null;

  // Search Match Context (Runtime)
  match_reason?: string;
  distance_km?: number;

  // Joined Relations
  category?: Category | null;
  region?: Region | null;
  contacts?: Contact[];
  emails?: OrganizationEmail[];
  social_links?: SocialLink[];
  locations?: Location[];
  digital_services?: DigitalService[];
  aliases?: OrganizationAlias[];
  service_keywords?: OrganizationServiceKeyword[];
  branches?: Organization[];
  parent_org?: Organization | null;
}

export interface OrganizationReport {
  id?: number;
  organization_id: number;
  report_type: 'wrong_phone' | 'wrong_address' | 'closed' | 'contact_issue' | 'other';
  message: string;
  target_contact?: string | null;
  internal_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  status?: 'pending' | 'reviewed' | 'resolved';
  created_at?: string;
}

export interface AdminNotification {
  id: number;
  type: 'report' | 'suggestion' | 'system';
  title: string;
  summary: string;
  link_url: string;
  target_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface OrganizationSuggestion {
  id: number;
  name: string;
  category_id?: number | null;
  region_id?: number | null;
  city_district?: string | null;
  phone_number?: string | null;
  website_url?: string | null;
  source_url?: string | null;
  note?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  category?: Category | null;
  region?: Region | null;
}

export const ReportSchema = z.object({
  organization_id: z.number({ required_error: 'Tashkilot ID tanlanmagan' }),
  report_type: z.enum(['wrong_phone', 'wrong_address', 'closed', 'contact_issue', 'other']),
  message: z.string().min(3, 'Xabar kamida 3 ta belgidan iborat bo‘lishi kerak'),
  target_contact: z.string().optional().nullable(),
});

export const SuggestionSchema = z.object({
  name: z.string().min(3, 'Tashkilot nomi kamida 3 ta belgidan iborat bo‘lishi kerak'),
  category_id: z.number().optional().nullable(),
  region_id: z.number().optional().nullable(),
  city_district: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  website_url: z.string().optional().nullable(),
  source_url: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  honeypot: z.string().optional(), // Anti-spam honeypot
});
