export interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  preferred_roles: VolunteerRole[];
  is_active: boolean;
  onboarded_date: string | null;
  wwcc_number: string | null;
  wwcc_expiry: string | null;
  notes: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  coordinator_id: string | null;
  status: SessionStatus;
  total_guests_served: number;
  total_meals_served: number;
  total_grocery_packs: number;
  session_notes: string | null;
  weather_conditions: string | null;
  created_at: string;
}

export interface VolunteerAttendance {
  id: string;
  session_id: string;
  volunteer_id: string;
  role_on_day: VolunteerRole;
  sign_in_time: string;
  sign_out_time: string | null;
  hours_calculated: number | null;
  notes: string | null;
}

export interface GuestRecord {
  id: string;
  session_id: string;
  registration_number: string | null;
  first_name: string | null;
  family_size: number;
  adults: number;
  children: number;
  meals_received: number;
  grocery_pack_received: boolean;
  dietary_notes: string | null;
  is_new_guest: boolean;
  referral_source: string | null;
  registered_at: string;
}

export interface FoodSafetyLog {
  id: string;
  session_id: string;
  food_item: string;
  food_category: FoodCategory | null;
  temp_celsius: number | null;
  check_time: string;
  logged_by_id: string | null;
  pass_fail: FoodSafetyResult | null;
  corrective_action: string | null;
  probe_id: string | null;
  notes: string | null;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  category: InventoryCategory | null;
  unit: InventoryUnit | null;
  current_quantity: number;
  minimum_threshold: number | null;
  storage_location: string | null;
  is_active: boolean;
  notes: string | null;
  last_updated: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  session_id: string | null;
  transaction_type: TransactionType;
  quantity: number;
  unit: string | null;
  donor_name: string | null;
  expiry_date: string | null;
  recorded_by_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  display_on_kiosk: boolean;
  is_active: boolean;
  created_by_id: string | null;
  expires_at: string | null;
  created_at: string;
}

// Insert types (omit auto-generated fields)
export type VolunteerInsert = Omit<Volunteer, 'id' | 'created_at' | 'is_active'> & {
  is_active?: boolean;
};

export type SessionInsert = Omit<Session, 'id' | 'created_at' | 'total_guests_served' | 'total_meals_served' | 'total_grocery_packs'>;

export type AttendanceInsert = Omit<VolunteerAttendance, 'id' | 'sign_out_time' | 'hours_calculated'>;

export type GuestRecordInsert = Omit<GuestRecord, 'id' | 'registered_at'>;

export type FoodSafetyLogInsert = Omit<FoodSafetyLog, 'id' | 'pass_fail'>;

export type InventoryItemInsert = Omit<InventoryItem, 'id' | 'last_updated' | 'current_quantity' | 'is_active'>;

export type InventoryTransactionInsert = Omit<InventoryTransaction, 'id' | 'created_at'>;

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at' | 'is_active'>;

// Import enums used above
import type { VolunteerRole, SessionStatus, FoodCategory, FoodSafetyResult, InventoryCategory, InventoryUnit, TransactionType } from './enums';
