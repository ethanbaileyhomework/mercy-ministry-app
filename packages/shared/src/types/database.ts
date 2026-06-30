// ============================================================
// Mercy Ministry v2 — Simplified Types
// ============================================================

export type Area = 'kitchen' | 'hall';
export type SessionStatus = 'draft' | 'active' | 'completed';
export type FoodType = 'hot' | 'cold' | 'reheat' | 'fridge' | 'frozen';
export type FoodResult = 'PASS' | 'FAIL';
export type Severity = 'low' | 'medium' | 'high';

export interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  pin: string;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  area: Area;
  is_leader: boolean;
  wwcc_number: string | null;
  wwcc_expiry: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  session_date: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  coordinator_notes: string | null;
  people_served: number;
  meals_served: number;
  what_was_served: string | null;
  grocery_packs_given: number;
  created_at: string;
}

export interface VolunteerAttendance {
  id: string;
  session_id: string;
  volunteer_id: string;
  area_on_day: Area;
  is_leader_on_day: boolean;
  sign_in_time: string;
  sign_out_time: string | null;
  hours_served: number | null;
  volunteers?: Volunteer;
}

export interface FoodSafetyLog {
  id: string;
  session_id: string;
  food_item: string;
  food_type: FoodType;
  temp_celsius: number;
  result: FoodResult;
  corrective_action: string | null;
  logged_by_id: string | null;
  logged_at: string;
  probe_id: string | null;
  volunteers?: Volunteer;
}

export interface Incident {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  reported_by_id: string | null;
  reported_at: string;
  volunteers?: Volunteer;
}
