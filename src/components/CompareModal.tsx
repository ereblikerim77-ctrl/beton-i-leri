import { BadgeCheck, Crown, MessageCircle, Phone, Scale, Trash2, X } from 'lucide-react';
import type { Listing } from '../types.ts';
import { formatPhoneForTel, formatPhoneForWhatsApp } from '../utils/helpers.ts';

interface CompareModalProps {
  listings: Listing[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onOpenDetail: (listing: Listing) => void;
}

export function CompareModal({
  listings,
  onClose,
  onRemove,
  onOpenDetail,
}: CompareModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#E7E2DA]/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-[#6B7A3F]" />
            <h2 className="font-display text-lg font-bold text-[#3A3A3A]">
              Usta və Texnika Müqayisəsi ({listings.length})
            </h2>
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

        <div className="overflow-auto p-6">
          {listings.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#3A3A3A]/65">
              Müqayisə etmək üçün elan kartlarındakı tərəzi ikonuna klikləyin.
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E7E2DA]">
                  <th className="w-36 py-3 pr-3 font-semibold text-[#3A3A3A]/65">
                    Kriteriya
                  </th>
                  {listings.map((l) => (
                    <th key={l.id} className="p-3 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDetail(l);
                          }}
                          className="text-left font-display text-sm font-bold text-[#3A3A3A] hover:text-[#6B7A3F] cursor-pointer"
                        >
                          {l.companyName}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(l.id)}
                          aria-label="Çıxar"
                          className="text-[#3A3A3A]/45 hover:text-red-700 cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#6B7A3F]">
                        {l.tier === 'vip' && <Crown size={12} className="text-[#9B8740]" />}
                        <span>{l.category}</span>
                        {l.verified && <BadgeCheck size={13} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2DA]">
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Qiymət</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 font-mono text-sm font-bold text-[#3A3A3A]">
                      {l.priceType === 'per_m3' && l.pricePerM3
                        ? `${l.pricePerM3} AZN/m³`
                        : 'Razılaşma'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Min. sifariş</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 font-mono text-[#3A3A3A]">
                      {l.minVolumeM3} m³
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Təcrübə</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 font-medium text-[#3A3A3A]">
                      {l.experienceYears} il
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Regionlar</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 text-[#3A3A3A]/85">
                      {l.regions.join(', ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Beton markaları</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 font-mono text-[#3A3A3A]">
                      {l.concreteGrades.join(', ') || '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Texnika</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3 text-[#3A3A3A]/85">
                      {l.equipmentTypes.join(', ') || 'Briqada'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 pr-3 font-medium text-[#3A3A3A]/70">Əlaqə</td>
                  {listings.map((l) => (
                    <td key={l.id} className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <a
                          href={formatPhoneForTel(l.phone)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#6B7A3F] px-2.5 py-1.5 text-[11px] font-semibold text-[#FAF7F2]"
                        >
                          <Phone size={11} />
                          Zəng
                        </a>
                        <a
                          href={formatPhoneForWhatsApp(l.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[#6B7A3F] px-2.5 py-1.5 text-[11px] font-semibold text-[#6B7A3F]"
                        >
                          <MessageCircle size={11} />
                          WhatsApp
                        </a>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
