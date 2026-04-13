import { z } from 'zod';

export const volunteerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  area: z.enum(['kitchen', 'serving', 'cleanup', 'admin', 'other']),
  is_leader: z.boolean().default(false),
});

export const sessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  status: z.enum(['draft', 'active', 'completed']),
  started_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  coordinator_notes: z.string().nullable().optional(),
  people_served: z.number().min(0).default(0),
  meals_served: z.number().min(0).default(0),
  what_was_served: z.string().nullable().optional(),
  grocery_packs_given: z.number().min(0).default(0),
});

export const foodSafetyLogSchema = z.object({
  session_id: z.string().uuid(),
  food_item: z.string().min(1, 'Food item is required'),
  food_type: z.enum(['hot', 'cold', 'reheat', 'fridge']),
  temp_celsius: z.number().min(-50).max(300),
  corrective_action: z.string().nullable().optional(),
  logged_by_id: z.string().uuid().nullable().optional(),
  probe_id: z.string().nullable().optional(),
});

export const incidentSchema = z.object({
  session_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  severity: z.enum(['low', 'medium', 'high']).default('low'),
  reported_by_id: z.string().uuid().nullable().optional(),
});
