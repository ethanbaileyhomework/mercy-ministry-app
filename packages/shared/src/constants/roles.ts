import { VOLUNTEER_ROLES, type VolunteerRole } from '../types/enums';

export const ROLE_LABELS: Record<VolunteerRole, string> = {
  Kitchen: 'Kitchen',
  Serving: 'Serving',
  Groceries: 'Groceries',
  Registration: 'Registration',
  Cleanup: 'Cleanup',
  Hosting: 'Hosting',
};

export const ROLE_ICONS: Record<VolunteerRole, string> = {
  Kitchen: 'chef-hat',
  Serving: 'utensils',
  Groceries: 'shopping-bag',
  Registration: 'clipboard-list',
  Cleanup: 'sparkles',
  Hosting: 'hand-heart',
};

export { VOLUNTEER_ROLES };
