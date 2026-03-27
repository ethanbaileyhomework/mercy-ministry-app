import { ChefHat, Utensils, ShoppingBag, ClipboardList, Sparkles, Heart } from 'lucide-react';
import type { VolunteerRole } from '@mercy/shared';

const ROLE_ICON_MAP: Record<VolunteerRole, React.ComponentType<{ size?: number }>> = {
  Kitchen: ChefHat,
  Serving: Utensils,
  Groceries: ShoppingBag,
  Registration: ClipboardList,
  Cleanup: Sparkles,
  Hosting: Heart,
};

interface RoleChipProps {
  role: VolunteerRole;
  selected: boolean;
  suggested?: boolean;
  onClick: () => void;
}

export function RoleChip({ role, selected, suggested = false, onClick }: RoleChipProps) {
  const Icon = ROLE_ICON_MAP[role];

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-3 rounded-2xl p-6 min-h-[120px]
        border-2 transition-all duration-200 active:scale-95 touch-target
        ${selected
          ? 'bg-gold text-navy border-gold shadow-lg shadow-gold/30'
          : suggested
            ? 'bg-white/15 text-white border-gold/40'
            : 'bg-white/10 text-white/80 border-white/15 hover:border-white/30'
        }
      `}
    >
      <Icon size={36} />
      <span className="text-kiosk-body font-semibold">{role}</span>
    </button>
  );
}
