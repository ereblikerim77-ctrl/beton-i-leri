import { Plus, Search, User as UserIcon } from 'lucide-react';
import type { User } from '../types.ts';
import { BetonAILogo } from './BetonAILogo.tsx';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenCreate: () => void;
  onOpenAuthOrProfile: () => void;
  onToggleAI: () => void;
  onNavigateHome: () => void;
  currentUser: User | null;
}

export function Header({
  searchQuery,
  onSearchChange,
  onOpenCreate,
  onOpenAuthOrProfile,
  onToggleAI,
  onNavigateHome,
  currentUser,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E2DA] bg-[#FAF7F2]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:gap-8 sm:px-6">
        {/* Left: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="font-display text-lg font-extrabold tracking-tight text-[#3A3A3A] whitespace-nowrap shrink-0 cursor-pointer hover:text-[#6B7A3F] transition-colors sm:text-xl"
        >
          Beton İşləri
        </button>

        {/* Center: Compact Search Bar */}
        <div className="relative flex-1 max-w-md min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A3A]/50"
            size={16}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Xidmət, şəhər və ya #taq axtar..."
            aria-label="Elanlarda axtarış"
            className="w-full rounded-lg border border-[#E7E2DA] bg-white/70 py-2 pl-9 pr-3 text-sm text-[#3A3A3A] placeholder:text-[#3A3A3A]/45 focus:border-[#6B7A3F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        {/* Right: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleAI}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E2DA] bg-transparent hover:border-[#6B7A3F] transition-colors shrink-0 cursor-pointer"
            title="Beton AI"
            aria-label="Beton AI"
          >
            <BetonAILogo size="sm" />
          </button>

          <button
            type="button"
            onClick={onOpenAuthOrProfile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-transparent px-3 py-2 text-xs font-medium text-[#3A3A3A] hover:border-[#3A3A3A]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserIcon size={15} className="text-[#3A3A3A]/75" />
            <span className="hidden sm:inline max-w-[110px] truncate">
              {currentUser ? `${currentUser.firstName}` : 'Giriş / Profil'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B7A3F] px-3.5 py-2 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>Elan Yerləşdir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
