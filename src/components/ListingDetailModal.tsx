import {
  BadgeCheck,
  Check,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { CommentItem, Listing, User } from '../types.ts';
import {
  formatPhoneForTel,
  formatPhoneForWhatsApp,
  formatRelativeDateAz,
  getCardThemeClasses,
} from '../utils/helpers.ts';

interface ListingDetailModalProps {
  listing: Listing;
  comments: CommentItem[];
  currentUser: User | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onOpenProfile: (userId: string) => void;
  onTagClick: (tag: string) => void;
  onCommentAdded: (comment: CommentItem) => void;
}

export function ListingDetailModal({
  listing,
  comments,
  currentUser,
  onClose,
  onLike,
  onOpenProfile,
  onTagClick,
  onCommentAdded,
}: ListingDetailModalProps) {
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const tier = listing.tier || 'standard';
  const theme = getCardThemeClasses(
    listing.cardTheme,
    tier,
    listing.vipConfig?.frameVariant
  );
  const activeMedia = listing.media[activeMediaIdx];
  const listingComments = comments.filter((c) => c.listingId === listing.id);
  const whatsappText =
    (tier === 'pro' && listing.proConfig?.whatsappTemplate) ||
    `Salam, "Beton İşləri" platformasındakı "${listing.title}" elanınızla bağlı yazıram.`;

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/listings/${listing.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-user-token': token } : {}),
        },
        body: JSON.stringify({
          authorName: currentUser
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : authorName.trim() || 'Qonaq İstifadəçi',
          text: commentText.trim(),
          rating,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Rəy göndərilə bilmədi.');
      } else {
        onCommentAdded(data.comment);
        setCommentText('');
        setAuthorName('');
      }
    } catch {
      setError('Bağlantı xətası baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-3 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl ${theme.card}`}
      >
        {/* Top Bar */}
        <div
          className={`flex items-center justify-between gap-4 border-b border-[#E7E2DA] px-5 py-4 ${theme.headerBg}`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#3A3A3A]/70">
              {tier === 'vip' && (
                <span className="inline-flex items-center gap-1 font-bold text-[#7A6728]">
                  <Crown size={13} />
                  VIP · {listing.vipConfig?.sloganBanner || 'Seçilmiş Peşəkar'}
                </span>
              )}
              {tier === 'pro' && (
                <span className="inline-flex items-center gap-1 font-bold text-[#6B7A3F]">
                  <Sparkles size={13} />
                  PRO · {listing.proConfig?.highlightLabel || 'Peşəkar'}
                </span>
              )}
              {(tier === 'vip' || tier === 'pro') && <span aria-hidden="true">·</span>}
              <span className="font-semibold text-[#6B7A3F]">{listing.category}</span>
              <span aria-hidden="true">·</span>
              <span>{listing.regions.join(', ')}</span>
            </div>
            <h2 className="font-display mt-0.5 truncate text-lg font-bold text-[#3A3A3A] sm:text-xl">
              {listing.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] hover:border-[#3A3A3A]/40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Media + Key Info Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Gallery (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]">
                {activeMedia ? (
                  activeMedia.type === 'video' ? (
                    <video
                      src={activeMedia.url}
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={activeMedia.url}
                      alt={listing.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#3A3A3A]/55">
                    Media əlavə edilməyib
                  </div>
                )}
              </div>

              {listing.media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.media.map((m, idx) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMediaIdx(idx)}
                      className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border cursor-pointer ${
                        idx === activeMediaIdx
                          ? 'border-2 border-[#6B7A3F]'
                          : 'border-[#E7E2DA] opacity-75 hover:opacity-100'
                      }`}
                    >
                      {m.type === 'video' ? (
                        <video
                          src={m.url}
                          muted
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={m.url}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Info Module (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Master / Company Header */}
                <div className="flex items-start justify-between gap-3 border-b border-[#E7E2DA] pb-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProfile(listing.userId);
                        }}
                        className="font-display text-base font-bold text-[#3A3A3A] hover:text-[#6B7A3F] hover:underline cursor-pointer"
                      >
                        {listing.companyName || `${listing.firstName} ${listing.lastName}`}
                      </button>
                      {listing.verified && (
                        <BadgeCheck size={16} className="text-[#6B7A3F] shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[#3A3A3A]/75">
                      {listing.firstName} {listing.lastName}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProfile(listing.userId);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#6B7A3F] hover:underline cursor-pointer"
                    >
                      <UserIcon size={12} />
                      Profilə və portfelə bax
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-[#3A3A3A] tabular-nums">
                      {listing.priceType === 'per_m3' && listing.pricePerM3
                        ? `${listing.pricePerM3} AZN`
                        : 'Razılaşma'}
                    </div>
                    {listing.priceType === 'per_m3' && (
                      <div className="text-xs text-[#3A3A3A]/60">1 m³ üçün</div>
                    )}
                  </div>
                </div>

                {/* Specs Table */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-[#3A3A3A]/60">İş təcrübəsi</dt>
                    <dd className="font-medium text-[#3A3A3A] tabular-nums">
                      {listing.experienceYears} il
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#3A3A3A]/60">Minimum sifariş</dt>
                    <dd className="font-mono font-medium text-[#3A3A3A] tabular-nums">
                      {listing.minVolumeM3} m³
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-[#3A3A3A]/60">Xidmət regionları</dt>
                    <dd className="mt-0.5 flex items-center gap-1 font-medium text-[#3A3A3A]">
                      <MapPin size={14} className="text-[#6B7A3F] shrink-0" />
                      <span>{listing.regions.join(', ')}</span>
                    </dd>
                  </div>
                  {listing.concreteGrades.length > 0 && (
                    <div className="col-span-2">
                      <dt className="text-xs text-[#3A3A3A]/60">Beton markaları</dt>
                      <dd className="mt-0.5 font-mono text-xs font-semibold text-[#3A3A3A]">
                        {listing.concreteGrades.join(' · ')}
                      </dd>
                    </div>
                  )}
                  {listing.equipmentTypes.length > 0 && (
                    <div className="col-span-2">
                      <dt className="text-xs text-[#3A3A3A]/60">Texnika və avadanlıq</dt>
                      <dd className="mt-0.5 text-sm font-medium text-[#3A3A3A]">
                        {listing.equipmentTypes.join(' · ')}
                      </dd>
                    </div>
                  )}
                  {tier === 'pro' && listing.proConfig?.workingHours && (
                    <div className="col-span-2">
                      <dt className="text-xs text-[#3A3A3A]/60">İş qrafiki</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-[#6B7A3F]">
                        <Clock size={14} />
                        <span>{listing.proConfig.workingHours}</span>
                      </dd>
                    </div>
                  )}
                </dl>

                {/* VIP Guarantee & Advantages Card */}
                {tier === 'vip' && listing.vipConfig && (
                  <div className="rounded-xl border border-[#9B8740]/45 bg-[#9B8740]/10 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#7A6728]">
                      <Crown size={14} />
                      <span>VIP Zəmanət və Üstünlüklər</span>
                    </div>
                    {listing.vipConfig.keyAdvantages &&
                      listing.vipConfig.keyAdvantages.length > 0 && (
                        <ul className="space-y-1">
                          {listing.vipConfig.keyAdvantages.map((adv) => (
                            <li
                              key={adv}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#3A3A3A]"
                            >
                              <Check size={13} className="text-[#6B7A3F] shrink-0" />
                              <span>{adv}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    {listing.vipConfig.guaranteeText && (
                      <p className="border-t border-[#9B8740]/25 pt-2 text-[11px] text-[#3A3A3A]/80">
                        {listing.vipConfig.guaranteeText}
                      </p>
                    )}
                  </div>
                )}

                {/* Dynamic Social Links */}
                {listing.socialLinks.length > 0 && (
                  <div className="border-t border-[#E7E2DA] pt-3">
                    <div className="mb-1.5 text-xs text-[#3A3A3A]/60">Sosial şəbəkələr</div>
                    <div className="flex flex-wrap gap-2">
                      {listing.socialLinks.map((s) => (
                        <a
                          key={s.id}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-2.5 py-1.5 text-xs font-medium text-[#3A3A3A] hover:border-[#6B7A3F] hover:text-[#6B7A3F] transition-colors"
                        >
                          <span>{s.platform}</span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Call + WhatsApp + Like CTA */}
              <div className="space-y-2.5 border-t border-[#E7E2DA] pt-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={formatPhoneForTel(listing.phone)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6B7A3F] px-4 py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] transition-colors"
                  >
                    <Phone size={16} />
                    <span>Zəng et</span>
                  </a>
                  <a
                    href={formatPhoneForWhatsApp(listing.phone, whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#6B7A3F] bg-[#FAF7F2] px-4 py-2.5 text-sm font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/10 transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs text-[#3A3A3A]/65 pt-1">
                  <span className="font-mono">{listing.phone}</span>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={14} /> {listing.views} baxış
                    </span>
                    <button
                      type="button"
                      onClick={() => onLike(listing.id)}
                      className="inline-flex items-center gap-1 font-medium text-[#6B7A3F] hover:underline cursor-pointer"
                    >
                      <Heart size={14} /> {listing.likes} bəyənmə
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Tags */}
          <div className="border-t border-[#E7E2DA] pt-5 space-y-3">
            <h3 className="font-display text-sm font-semibold text-[#3A3A3A]">
              Xidmət haqqında ətraflı məlumat
            </h3>
            <p className="text-sm leading-relaxed text-[#3A3A3A]/85 whitespace-pre-line">
              {listing.description}
            </p>
            {listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-1 text-xs font-medium text-[#6B7A3F]">
                {listing.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      onTagClick(tag);
                      onClose();
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments & Reviews Section */}
          <div className="border-t border-[#E7E2DA] pt-5 space-y-4">
            <h3 className="font-display text-base font-bold text-[#3A3A3A]">
              Müştəri rəyləri və suallar ({listingComments.length})
            </h3>

            {/* Add Comment Form */}
            <form
              onSubmit={handleCommentSubmit}
              className="rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/35 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                {!currentUser ? (
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Adınız (məs: Kamran)"
                    className="flex-1 min-w-[180px] rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-medium text-[#3A3A3A]">
                    Rəy yazan: {currentUser.firstName} {currentUser.lastName}
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <span className="mr-1 text-xs text-[#3A3A3A]/70">Qiymət:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-0.5 cursor-pointer"
                      aria-label={`${star} ulduz`}
                    >
                      <Star
                        size={16}
                        className={
                          star <= rating
                            ? 'fill-[#6B7A3F] text-[#6B7A3F]'
                            : 'text-[#3A3A3A]/30'
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={2}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Görülmüş iş və ya xidmət barədə rəy yazın..."
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
              />

              {error && <p className="text-xs text-red-700">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submitting ? 'Göndərilir...' : 'Rəy əlavə et'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            {listingComments.length === 0 ? (
              <p className="text-sm text-[#3A3A3A]/60">
                Hələ rəy yazılmayıb. İlk rəyi siz yazın.
              </p>
            ) : (
              <div className="space-y-3">
                {listingComments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-[#3A3A3A]">
                          {c.authorName}
                        </span>
                        <span className="text-xs text-[#3A3A3A]/55">
                          · {c.authorRole}
                        </span>
                        {c.rating && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-mono text-[#6B7A3F]">
                            · ★ {c.rating}.0
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#3A3A3A]/55">
                        {formatRelativeDateAz(c.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-[#3A3A3A]/85">
                      {c.text}
                    </p>

                    {c.adminReply && (
                      <div className="mt-2 rounded-lg border border-[#6B7A3F]/30 bg-[#6B7A3F]/8 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A3F]">
                          <ShieldCheck size={14} />
                          <span>Admin Cavabı</span>
                          <span className="font-normal text-[#3A3A3A]/55">
                            · {formatRelativeDateAz(c.adminReply.repliedAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#3A3A3A]">
                          {c.adminReply.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
