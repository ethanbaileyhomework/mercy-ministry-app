interface NameTileProps {
  firstName: string;
  lastName: string;
  subtitle?: string;
  onClick: () => void;
}

export function NameTile({ firstName, lastName, subtitle, onClick }: NameTileProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white/10 hover:bg-white/20 active:bg-gold/20 active:scale-[0.98]
                 border-2 border-white/15 hover:border-gold/40
                 rounded-2xl p-5 text-left transition-all duration-150 touch-target"
    >
      <div className="text-kiosk-xl font-semibold">
        {firstName} {lastName}
      </div>
      {subtitle && (
        <div className="text-kiosk-body text-white/60 mt-1">{subtitle}</div>
      )}
    </button>
  );
}
