export const SESSION_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const FOOD_CATEGORIES = ['hot_meal', 'cold_item', 'dairy', 'produce', 'packaged'] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_SAFETY_RESULTS = ['PASS', 'FAIL', 'ADVISORY'] as const;
export type FoodSafetyResult = (typeof FOOD_SAFETY_RESULTS)[number];

export const INVENTORY_CATEGORIES = ['dry_goods', 'produce', 'dairy', 'frozen', 'hygiene', 'other'] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_UNITS = ['kg', 'g', 'L', 'mL', 'each', 'bag', 'box', 'can'] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const TRANSACTION_TYPES = ['donation_in', 'distribution_out', 'waste', 'adjustment'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const APP_ROLES = ['kiosk', 'coordinator', 'leader', 'read_only'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const REFERRAL_SOURCES = [
  'Word of mouth',
  'Church',
  'Community centre',
  'Social media',
  'Council referral',
  'Other',
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];
