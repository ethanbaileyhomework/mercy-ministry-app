export interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  area: string;
  is_leader: boolean;
  is_active: boolean;
  wwcc_number: string | null;
  wwcc_expiry: string | null;
  notes: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  session_date: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  coordinator_notes: string | null;
  people_served: number | null;
  meals_served: number | null;
  what_was_served: string | null;
  grocery_packs_given: number | null;
  created_at: string;
}

export interface VolunteerAttendance {
  id: string;
  session_id: string;
  volunteer_id: string;
  area_on_day: string;
  is_leader_on_day: boolean;
  sign_in_time: string;
  sign_out_time: string | null;
  hours_served: number | null;
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
  food_type: string | null;
  temp_celsius: number | null;
  logged_at: string;
  logged_by_id: string | null;
  result: string | null;
  corrective_action: string | null;
  probe_id: string | null;
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

// Insert types
export type VolunteerInsert = Omit<Volunteer, 'id' | 'created_at' | 'is_active'> & {
  is_active?: boolean;
};

export type SessionInsert = Omit<Session, 'id' | 'created_at' | 'people_served' | 'meals_served' | 'grocery_packs_given'>;

export type AttendanceInsert = Omit<VolunteerAttendance, 'id' | 'sign_out_time' | 'hours_served'>;

export type GuestRecordInsert = Omit<GuestRecord, 'id' | 'registered_at'>;

export type FoodSafetyLogInsert = Omit<FoodSafetyLog, 'id' | 'result'>;

export type InventoryItemInsert = Omit<InventoryItem, 'id' | 'last_updated' | 'current_quantity' | 'is_active'>;

export type InventoryTransactionInsert = Omit<InventoryTransaction, 'id' | 'created_at'>;

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at' | 'is_active'>;

// Import enums used above
import type { InventoryCategory, InventoryUnit, TransactionType } from './enums';
