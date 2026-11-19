import { Calculator, CheckCircle2, ClipboardList, Truck, X } from 'lucide-react';
import { useState } from 'react';
import type { Listing } from '../types.ts';
import { CONCRETE_GRADES } from '../utils/helpers.ts';

interface ConcreteCalculatorModalProps {
  listings: Listing[];
  onClose: () => void;
  onFilterMatching: (grade: string) => void;
  onCreateTenderFromCalc: (prefill: { volumeM3: number; grade: string }) => void;
}

type ShapeMode = 'slab' | 'strip' | 'column';

export function ConcreteCalculatorModal({
  listings,
  onClose,
  onFilterMatching,
  onCreateTenderFromCalc,
}: ConcreteCalculatorModalProps) {
  const [shape, setShape] = useState<ShapeMode>('slab');
  const [grade, setGrade] = useState('M300');

  // Dimensions
  const [lengthM, setLengthM] = useState(12);
  const [widthM, setWidthM] = useState(10);
  const [thicknessCm, setThicknessCm] = useState(20);
  const [count, setCount] = useState(8);

  const netVolume = (() => {
    const tMeters = (Number(thicknessCm) || 0) / 100;
    if (shape === 'slab') {
      return (Number(lengthM) || 0) * (Number(widthM) || 0) * tMeters;
    }
    if (shape === 'strip') {
      // Total perimeter length * strip width * depth
      return (Number(lengthM) || 0) * (Number(widthM) || 0) * tMeters;
    }
    // Column: count * (width * thickness/depth in m) * height(lengthM)
    return (
      (Number(count) || 1) *
      (Number(lengthM) || 0) *
      (Number(widthM) || 0) *
      tMeters
    );
  })();

  const roundedNet = Number(netVolume.toFixed(2));
  const withReserve = Number((netVolume * 1.05).toFixed(2));
  const mixers9m3 = withReserve > 0 ? Math.ceil(withReserve / 9) : 0;
  const mixers12m3 = withReserve > 0 ? Math.ceil(withReserve / 12) : 0;

  // Estimate budget based on active per_m3 listings
  const pricedListings = listings.filter(
    (l) => l.priceType === 'per_m3' && typeof l.pricePerM3 === 'number' && l.pricePerM3 > 0
  );
  const avgPricePerM3 =
    pricedListings.length > 0
      ? Math.round(
          pricedListings.reduce((sum, l) => sum + (l.pricePerM3 || 0), 0) /
            pricedListings.length
        )
      : 115;

  const estimatedMinCost = Math.round(withReserve * Math.max(95, avgPricePerM3 - 10));
  const estimatedMaxCost = Math.round(withReserve * (avgPricePerM3 + 12));

  const matchingCount = listings.filter(
    (l) =>
      (l.concreteGrades.length === 0 || l.concreteGrades.includes(grade)) &&
      l.minVolumeM3 <= Math.max(1, withReserve)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2]">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#E7E2DA]/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6B7A3F] text-[#FAF7F2]">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#3A3A3A]">
                Beton & Mikser Kalkulyatoru
              </h2>
              <p className="text-xs text-[#3A3A3A]/65">
                Dəqiq kubmetr, +5% itki ehtiyatı, mikser sayı və təxmini büdcə hesabı
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Structure Type Switch */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#E7E2DA]/60 p-1">
            {[
              { id: 'slab' as const, label: 'Plitə / Döşəmə' },
              { id: 'strip' as const, label: 'Lentvari Bünövrə' },
              { id: 'column' as const, label: 'Sütun / Rigel' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setShape(item.id)}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  shape === item.id
                    ? 'bg-[#FAF7F2] text-[#3A3A3A] shadow-xs'
                    : 'text-[#3A3A3A]/70 hover:text-[#3A3A3A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                {shape === 'strip'
                  ? 'Ümumi uzunluq (m)'
                  : shape === 'column'
                  ? 'Hündürlük (m)'
                  : 'Uzunluq (m)'}
              </label>
              <input
                type="number"
                min={0.1}
                step="0.1"
                value={lengthM}
                onChange={(e) => setLengthM(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                {shape === 'strip' ? 'Xəndək eni (m)' : 'En (m)'}
              </label>
              <input
                type="number"
                min={0.1}
                step="0.05"
                value={widthM}
                onChange={(e) => setWidthM(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                {shape === 'slab' ? 'Qalınlıq (sm)' : 'Hündürlük / Dərinlik (sm)'}
              </label>
              <input
                type="number"
                min={1}
                step="1"
                value={thicknessCm}
                onChange={(e) => setThicknessCm(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
              />
            </div>

            {shape === 'column' ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                  Sütun sayı (ədəd)
                </label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                  Beton markası
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
                >
                  {CONCRETE_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {shape === 'column' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#3A3A3A]/75">Beton markası:</span>
              {CONCRETE_GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-xs font-semibold cursor-pointer ${
                    grade === g
                      ? 'bg-[#3A3A3A] text-[#FAF7F2]'
                      : 'border border-[#E7E2DA] bg-white text-[#3A3A3A]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Output Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#6B7A3F]/35 bg-[#6B7A3F]/8 p-4">
              <div className="text-xs text-[#3A3A3A]/70">Tövsiyə olunan sifariş (+5%)</div>
              <div className="mt-1 font-mono text-2xl font-bold text-[#6B7A3F] tabular-nums">
                {withReserve} m³
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[#3A3A3A]/60 tabular-nums">
                Xalis həcm: {roundedNet} m³
              </div>
            </div>

            <div className="rounded-xl border border-[#E7E2DA] bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs text-[#3A3A3A]/70">
                <Truck size={14} className="text-[#6B7A3F]" />
                <span>Lazım olan mikser</span>
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-[#3A3A3A] tabular-nums">
                {mixers9m3} × 9m³
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[#3A3A3A]/60 tabular-nums">
                və ya {mixers12m3} ədəd 12m³ mikser
              </div>
            </div>

            <div className="rounded-xl border border-[#E7E2DA] bg-white p-4">
              <div className="text-xs text-[#3A3A3A]/70">Təxmini beton büdcəsi</div>
              <div className="mt-1 font-mono text-xl font-bold text-[#3A3A3A] tabular-nums">
                {estimatedMinCost.toLocaleString('az-AZ')}–{estimatedMaxCost.toLocaleString('az-AZ')} ₼
              </div>
              <div className="mt-0.5 text-[11px] text-[#3A3A3A]/60">
                Orta bazar (~{avgPricePerM3} AZN/m³)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/35 px-4 py-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#3A3A3A]">
              <CheckCircle2 size={15} className="text-[#6B7A3F] shrink-0" />
              <span>
                Bu həcm və <strong>{grade}</strong> markası üzrə platformada{' '}
                <strong className="font-mono">{matchingCount}</strong> uyğun elan var.
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E7E2DA] pt-4">
            <button
              type="button"
              onClick={() => onCreateTenderFromCalc({ volumeM3: Math.ceil(withReserve), grade })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#6B7A3F] bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/10 cursor-pointer"
            >
              <ClipboardList size={15} />
              <span>Bu ölçü ilə Tender Sorğusu Aç</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterMatching(grade)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B7A3F] px-4 py-2.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] cursor-pointer"
            >
              <span>Uyğun Ustaları Göstər ({matchingCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
