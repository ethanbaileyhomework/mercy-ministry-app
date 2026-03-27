import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', autoFocus = true }: SearchInputProps) {
  return (
    <div className="relative">
      <Search size={28} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full bg-white/10 border-2 border-white/20 rounded-2xl pl-16 pr-14 py-5
                   text-kiosk-xl text-white placeholder-white/40
                   focus:outline-none focus:border-gold/60 focus:bg-white/15
                   transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white touch-target"
        >
          <X size={28} />
        </button>
      )}
    </div>
  );
}
