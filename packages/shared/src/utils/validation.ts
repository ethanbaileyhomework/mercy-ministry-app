import { z } from 'zod';
import { VOLUNTEER_ROLES, SESSION_STATUSES, FOOD_CATEGORIES, FOOD_SAFETY_RESULTS, INVENTORY_CATEGORIES, INVENTORY_UNITS, TRANSACTION_TYPES } from '../types/enums';

export const volunteerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').nullable().optional(),
  phone: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  preferred_roles: z.array(z.enum(VOLUNTEER_ROLES)).default([]),
  onboarded_date: z.string().nullable().optional(),
  wwcc_number: z.string().nullable().optional(),
  wwcc_expiry: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sessionSchema = z.object({
  session_date: z.string().min(1, 'Date is required'),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  coordinator_id: z.string().uuid().nullable().optional(),
  status: z.enum(SESSION_STATUSES).default('draft'),
  session_notes: z.string().nullable().optional(),
  weather_conditions: z.string().nullable().optional(),
});

export const attendanceSchema = z.object({
  session_id: z.string().uuid('Invalid session'),
  volunteer_id: z.string().uuid('Invalid volunteer'),
  role_on_day: z.enum(VOLUNTEER_ROLES),
  sign_in_time: z.string(),
  notes: z.string().nullable().optional(),
});

export const guestRecordSchema = z.object({
  session_id: z.string().uuid(),
  registration_number: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  family_size: z.number().int().min(1).default(1),
  adults: z.number().int().min(0).default(1),
  children: z.number().int().min(0).default(0),
  meals_received: z.number().int().min(0).default(1),
  grocery_pack_received: z.boolean().default(false),
  dietary_notes: z.string().nullable().optional(),
  is_new_guest: z.boolean().default(false),
  referral_source: z.string().nullable().optional(),
});

export const foodSafetyLogSchema = z.object({
  session_id: z.string().uuid(),
  food_item: z.string().min(1, 'Food item name is required'),
  food_category: z.enum(FOOD_CATEGORIES).nullable().optional(),
  temp_celsius: z.number().min(-50).max(300).nullable().optional(),
  check_time: z.string(),
  logged_by_id: z.string().uuid().nullable().optional(),
  corrective_action: z.string().nullable().optional(),
  probe_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const inventoryItemSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  category: z.enum(INVENTORY_CATEGORIES).nullable().optional(),
  unit: z.enum(INVENTORY_UNITS).nullable().optional(),
  minimum_threshold: z.number().min(0).nullable().optional(),
  storage_location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const inventoryTransactionSchema = z.object({
  item_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
  transaction_type: z.enum(TRANSACTION_TYPES),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().nullable().optional(),
  donor_name: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  recorded_by_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().nullable().optional(),
  display_on_kiosk: z.boolean().default(false),
  created_by_id: z.string().uuid().nullable().optional(),
  expires_at: z.string().nullable().optional(),
});
