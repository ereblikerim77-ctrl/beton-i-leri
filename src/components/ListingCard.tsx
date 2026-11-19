import {
  BadgeCheck,
  Check,
  Clock,
  Crown,
  Eye,
  Heart,
  Image as ImageIcon,
  Play,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { Listing } from '../types.ts';
import { getCardThemeClasses } from '../utils/helpers.ts';

interface ListingCardProps {
  listing: Listing;
  isCompared?: boolean;
  onOpenDetail: (listing: Listing) => void;
  onTagClick: (tag: string) => void;
  onLike: (e: React.MouseEvent, id: string) => void;
  onOpenProfile: (e: React.MouseEvent, userId: string) => void;
  onToggleCompare?: (e: React.MouseEvent, id: string) => void;
}

export function ListingCard({
  listing,
  isCompared = false,
  onOpenDetail,
  onTagClick,
  onLike,
  onOpenProfile,
  onToggleCompare,
}: ListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const tier = listing.tier || 'standard';
  const theme = getCardThemeClasses(
    listing.cardTheme,
    tier,
    listing.vipConfig?.frameVariant
  );
  const coverMedia = listing.media[0];

  const ctaLabel =
    tier === 'pro' && listing.proConfig?.customCtaText
      ? listing.proConfig.customCtaText
      : 'Ətraflı';

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl transition-transform duration-200 hover:-translate-y-0.5 ${theme.card}`}
    >
      {/* VIP Exclusive Top Slogan Strip */}
      {tier === 'vip' && (
        <div className="flex items-center justify-between gap-2 bg-[#9B8740]/18 px-3.5 py-1.5 text-[11px] font-semibold text-[#5C4E1F] border-b border-[#9B8740]/30">
          <span className="inline-flex items-center gap-1.5 truncate">
            <Crown size={13} className="text-[#8B752E] shrink-0" />
            <span className="truncate">
              {listing.vipConfig?.sloganBanner || 'VIP Seçilmiş Peşəkar'}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider shrink-0">
            VIP
          </span>
        </div>
      )}

      {/* PRO Subtle Top Highlight Strip */}
      {tier === 'pro' && (
        <div className="flex items-center justify-between gap-2 bg-[#6B7A3F]/10 px-3.5 py-1.5 text-[11px] font-semibold text-[#4E5B2B] border-b border-[#6B7A3F]/20">
          <span className="inline-flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-[#6B7A3F] shrink-0" />
            <span className="truncate">
              {listing.proConfig?.highlightLabel || 'PRO Usta'}
            </span>
          </span>
          {listing.proConfig?.workingHours && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#3A3A3A]/70 shrink-0">
              <Clock size={11} />
              {listing.proConfig.workingHours}
            </span>
          )}
        </div>
      )}

      {/* Cover Image / Video — uniform 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E7E2DA]">
        <button
          type="button"
          onClick={() => onOpenDetail(listing)}
          className="h-full w-full text-left cursor-pointer"
        >
          {coverMedia && coverMedia.type === 'video' ? (
            <div className="relative h-full w-full">
              <video
                src={coverMedia.url}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-[#3A3A3A]/80 px-2 py-1 text-[11px] font-medium text-[#FAF7F2]">
                <Play size={11} />
                Video
              </span>
            </div>
          ) : coverMedia && !imgError ? (
            <img
              src={coverMedia.url}
              alt={listing.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#E7E2DA] px-4 text-center text-[#3A3A3A]/55">
              <ImageIcon size={28} strokeWidth={1.5} />
              <span className="text-xs font-medium line-clamp-1">{listing.category}</span>
            </div>
          )}
        </button>

        {/* Compare Toggle Button */}
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => onToggleCompare(e, listing.id)}
            title={isCompared ? 'Müqayisədən çıxar' : 'Müqayisəyə əlavə et'}
            aria-label="Müqayisəyə əlavə et"
            className={`absolute right-2.5 top-2.5 inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold backdrop-blur-xs transition-colors cursor-pointer ${
              isCompared
                ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                : 'bg-[#FAF7F2]/90 text-[#3A3A3A] hover:bg-[#FAF7F2]'
            }`}
          >
            <Scale size={13} />
            {isCompared && <span className="hidden sm:inline">Seçildi</span>}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {/* Clean unboxed metadata kicker */}
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#3A3A3A]/65 truncate">
            <span className="font-medium text-[#6B7A3F]">{listing.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{listing.regions[0] || 'Bakı'}</span>
            {listing.concreteGrades[0] && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">
                  {listing.concreteGrades.slice(0, 2).join('/')}
                </span>
              </>
            )}
          </div>

          {/* Service Title */}
          <h3
            onClick={() => onOpenDetail(listing)}
            className="font-display text-base font-semibold leading-snug text-[#3A3A3A] line-clamp-2 cursor-pointer hover:text-[#6B7A3F] transition-colors"
          >
            {listing.title}
          </h3>

          {/* Master / Company Name + Verified */}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-[#3A3A3A]/80">
            <button
              type="button"
              onClick={(e) => onOpenProfile(e, listing.userId)}
              className="truncate font-medium hover:text-[#6B7A3F] hover:underline cursor-pointer"
            >
              {listing.companyName || `${listing.firstName} ${listing.lastName}`}
            </button>
            {listing.verified && (
              <span
                title="Təsdiqlənmiş usta / şirkət"
                className="inline-flex items-center gap-0.5 text-xs font-medium text-[#6B7A3F] shrink-0"
              >
                <BadgeCheck size={15} />
              </span>
            )}
          </div>

          {/* VIP Key Advantages List (only for VIP tier) */}
          {tier === 'vip' &&
            listing.vipConfig?.keyAdvantages &&
            listing.vipConfig.keyAdvantages.length > 0 && (
              <ul className="mt-2.5 space-y-1 border-t border-[#9B8740]/20 pt-2">
                {listing.vipConfig.keyAdvantages.slice(0, 3).map((adv) => (
                  <li
                    key={adv}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-[#3A3A3A]/85"
                  >
                    <Check size={12} className="text-[#6B7A3F] shrink-0" />
                    <span className="truncate">{adv}</span>
                  </li>
                ))}
              </ul>
            )}

          {/* Tags as clean unboxed typographic links */}
          {listing.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#3A3A3A]/60">
              {listing.tags.slice(0, 4).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="hover:text-[#6B7A3F] transition-colors cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Price + Views/Likes + CTA */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E7E2DA] pt-3">
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold text-[#3A3A3A] tabular-nums truncate">
              {listing.priceType === 'per_m3' && listing.pricePerM3
                ? `${listing.pricePerM3} AZN/m³`
                : 'Razılaşma'}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-[#3A3A3A]/60 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Eye size={13} />
                {listing.views}
              </span>
              <button
                type="button"
                onClick={(e) => onLike(e, listing.id)}
                className="inline-flex items-center gap-1 hover:text-[#6B7A3F] transition-colors cursor-pointer"
                aria-label="Elanı bəyən"
              >
                <Heart size={13} />
                {listing.likes}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail(listing)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold text-[#FAF7F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tier === 'vip'
                ? 'bg-[#3A3A3A] hover:bg-[#6B7A3F]'
                : 'bg-[#6B7A3F] hover:bg-[#5B6834]'
            }`}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
