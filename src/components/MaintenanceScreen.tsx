import { ShieldCheck, Wrench } from 'lucide-react';

interface MaintenanceScreenProps {
  onGoAdmin: () => void;
}

export function MaintenanceScreen({ onGoAdmin }: MaintenanceScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-6 py-12 text-[#3A3A3A]">
      <div className="w-full max-w-lg rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-8 text-center sm:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/60 text-[#6B7A3F]">
          <Wrench size={26} />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#3A3A3A] text-balance sm:text-3xl">
          Beton İşləri
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#3A3A3A]/80">
          Saytda texniki yenilənmə işləri aparılır, tezliklə xidmətinizdəyik.
        </p>
        <div className="mt-8 border-t border-[#E7E2DA] pt-6">
          <button
            type="button"
            onClick={onGoAdmin}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#3A3A3A]/55 hover:text-[#6B7A3F] transition-colors cursor-pointer"
          >
            <ShieldCheck size={14} />
            <span>Administrator girişi (/admin_panel)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
