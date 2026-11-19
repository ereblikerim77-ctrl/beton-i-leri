import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  Edit3,
  ExternalLink,
  Eye,
  Heart,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  Listing,
  MediaItem,
  SocialLink,
  SocialPlatform,
  User,
  UserReview,
} from '../types.ts';
import {
  SOCIAL_PLATFORMS,
  formatPhoneForTel,
  formatPhoneForWhatsApp,
  formatRelativeDateAz,
  uploadMediaFile,
} from '../utils/helpers.ts';
import { ListingCard } from './ListingCard.tsx';

interface ProfileViewProps {
  userId: string;
  currentUser: User | null;
  onBack: () => void;
  onOpenListing: (listing: Listing) => void;
  onTagClick: (tag: string) => void;
  onLikeListing: (e: React.MouseEvent, id: string) => void;
  onProfileUpdated: (user: User) => void;
  onLogout: () => void;
}

export function ProfileView({
  userId,
  currentUser,
  onBack,
  onOpenListing,
  onTagClick,
  onLikeListing,
  onProfileUpdated,
  onLogout,
}: ProfileViewProps) {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    avgRating: 5.0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit form states
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSocials, setEditSocials] = useState<SocialLink[]>([]);
  const [editPortfolio, setEditPortfolio] = useState<MediaItem[]>([]);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);

  // Review form
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const isOwnProfile = Boolean(currentUser && currentUser.id === userId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.user) return;
        setProfileUser(data.user);
        setListings(data.listings || []);
        setReviews(data.reviews || []);
        setStats(
          data.stats || {
            totalViews: 0,
            totalLikes: 0,
            avgRating: 5.0,
            reviewCount: 0,
          }
        );
        setEditFirstName(data.user.firstName);
        setEditLastName(data.user.lastName);
        setEditCompany(data.user.companyName || '');
        setEditPhone(data.user.phone || '');
        setEditBio(data.user.bio || '');
        setEditSocials(data.user.socialLinks || []);
        setEditPortfolio(data.user.portfolioGallery || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profileUser) return;
    setUploadingCover(true);
    try {
      const uploaded = await uploadMediaFile(file);
      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/users/${profileUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': token,
        },
        body: JSON.stringify({
          coverMediaUrl: uploaded.url,
          coverMediaType: uploaded.type,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileUser(data.user);
        onProfileUpdated(data.user);
      }
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profileUser) return;
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadMediaFile(file);
      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/users/${profileUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': token,
        },
        body: JSON.stringify({ avatarUrl: uploaded.url }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileUser(data.user);
        onProfileUpdated(data.user);
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !profileUser) return;
    setUploadingGallery(true);
    try {
      const added: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await uploadMediaFile(file);
        added.push({
          id: `pg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: uploaded.url,
          type: uploaded.type,
          name: uploaded.name,
        });
      }
      const nextGallery = [...editPortfolio, ...added];
      setEditPortfolio(nextGallery);

      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/users/${profileUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': token,
        },
        body: JSON.stringify({ portfolioGallery: nextGallery }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileUser(data.user);
        onProfileUpdated(data.user);
      }
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileUser) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/users/${profileUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-token': token,
        },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          companyName: editCompany,
          phone: editPhone,
          bio: editBio,
          socialLinks: editSocials.filter((s) => s.url.trim()),
          portfolioGallery: editPortfolio,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileUser(data.user);
        onProfileUpdated(data.user);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revText.trim() || !profileUser) return;
    setRevSubmitting(true);
    try {
      const token = localStorage.getItem('beton_user_token') || '';
      const res = await fetch(`/api/users/${profileUser.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-user-token': token } : {}),
        },
        body: JSON.stringify({
          authorName: currentUser
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : revName.trim() || 'Sifarişçi',
          rating: revRating,
          text: revText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.review) {
        const updated = [data.review, ...reviews];
        setReviews(updated);
        const avg = Number(
          (updated.reduce((s, r) => s + r.rating, 0) / updated.length).toFixed(1)
        );
        setStats((prev) => ({
          ...prev,
          avgRating: avg,
          reviewCount: updated.length,
        }));
        setRevText('');
        setRevName('');
      }
    } finally {
      setRevSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="h-64 animate-pulse rounded-2xl bg-[#E7E2DA]" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 text-center sm:px-6">
        <p className="text-base text-[#3A3A3A]/75">İstifadəçi profili tapılmadı.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-lg bg-[#6B7A3F] px-4 py-2 text-sm font-medium text-[#FAF7F2] cursor-pointer"
        >
          Ana səhifəyə qayıt
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 space-y-8">
      {/* Top Return Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3A3A3A] hover:text-[#6B7A3F] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Elanlara qayıt</span>
        </button>

        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A3A3A] hover:border-[#6B7A3F] cursor-pointer"
            >
              <Edit3 size={14} />
              <span>{editing ? 'Redaktəni bağla' : 'Profili redaktə et'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A]/80 hover:text-red-700 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Çıxış</span>
            </button>
          </div>
        )}
      </div>

      {/* Cover Media + Profile Header */}
      <section className="overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2]">
        <div className="relative h-56 w-full overflow-hidden bg-[#E7E2DA] sm:h-72">
          {profileUser.coverMediaType === 'video' ? (
            <video
              src={profileUser.coverMediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={profileUser.coverMediaUrl}
              alt={`${profileUser.firstName} ${profileUser.lastName} arxa fon`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3A3A3A]/55 via-transparent to-transparent" />

          {isOwnProfile && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-[#FAF7F2]/90 px-3 py-2 text-xs font-semibold text-[#3A3A3A] hover:bg-[#FAF7F2] cursor-pointer"
              >
                <Camera size={14} />
                <span>
                  {uploadingCover
                    ? 'Yüklənir...'
                    : 'Cover şəkil / video dəyiş'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Profile Main Identity Row */}
        <div className="relative px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              {/* Avatar */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-[#FAF7F2] bg-[#E7E2DA]">
                <img
                  src={profileUser.avatarUrl}
                  alt={`${profileUser.firstName} ${profileUser.lastName}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                {isOwnProfile && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      title="Profil şəkli dəyiş"
                      className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#3A3A3A]/85 text-[#FAF7F2] hover:bg-[#6B7A3F] cursor-pointer"
                    >
                      <Camera size={13} />
                    </button>
                  </>
                )}
              </div>

              <div className="pt-2 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold text-[#3A3A3A]">
                    {profileUser.firstName} {profileUser.lastName}
                  </h1>
                  {profileUser.verified && (
                    <BadgeCheck size={20} className="text-[#6B7A3F]" />
                  )}
                  <span className="text-xs font-semibold text-[#6B7A3F]">
                    · {profileUser.role}
                  </span>
                </div>
                {profileUser.companyName && (
                  <p className="text-sm font-medium text-[#3A3A3A]/75">
                    {profileUser.companyName}
                  </p>
                )}
              </div>
            </div>

            {/* Direct Call & WhatsApp */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={formatPhoneForTel(profileUser.phone)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6B7A3F] px-4 py-2.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] transition-colors"
              >
                <Phone size={15} />
                <span className="font-mono">{profileUser.phone}</span>
              </a>
              <a
                href={formatPhoneForWhatsApp(profileUser.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[#6B7A3F] px-4 py-2.5 text-xs font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/10 transition-colors"
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Bio + Socials + Stats Strip */}
          <div className="mt-6 grid grid-cols-1 gap-6 border-t border-[#E7E2DA] pt-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-4">
              <p className="text-sm leading-relaxed text-[#3A3A3A]/85">
                {profileUser.bio}
              </p>
              {profileUser.socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profileUser.socialLinks.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] hover:border-[#6B7A3F] hover:text-[#6B7A3F] transition-colors"
                    >
                      <span>{s.platform}</span>
                      <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Summary */}
            <div className="lg:col-span-4 grid grid-cols-3 gap-3 rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/30 p-4 text-center">
              <div>
                <div className="font-mono text-lg font-bold text-[#3A3A3A] tabular-nums">
                  {listings.length}
                </div>
                <div className="text-[11px] text-[#3A3A3A]/65">Aktiv elan</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-[#3A3A3A] tabular-nums inline-flex items-center gap-1">
                  <Eye size={14} className="text-[#6B7A3F]" />
                  {stats.totalViews}
                </div>
                <div className="text-[11px] text-[#3A3A3A]/65">Ümumi baxış</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-[#3A3A3A] tabular-nums inline-flex items-center gap-1">
                  <Star size={14} className="fill-[#6B7A3F] text-[#6B7A3F]" />
                  {stats.avgRating}
                </div>
                <div className="text-[11px] text-[#3A3A3A]/65">
                  {stats.reviewCount} rəy
                </div>
              </div>
            </div>
          </div>

          {/* Inline Edit Panel for Own Profile */}
          {editing && isOwnProfile && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-6 space-y-4 rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/25 p-5"
            >
              <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                Profil məlumatlarını yenilə
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Ad"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Soyad"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Şirkət / Briqada"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Əlaqə nömrəsi"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Haqqınızda qısa məlumat"
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              />

              {/* Dynamic Socials Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#3A3A3A]">
                    Sosial şəbəkələr
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSocials((prev) => [
                        ...prev,
                        {
                          id: `s-${Date.now()}`,
                          platform: 'Instagram',
                          url: '',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B7A3F] cursor-pointer"
                  >
                    <Plus size={13} /> Şəbəkə əlavə et
                  </button>
                </div>
                {editSocials.map((s) => (
                  <div key={s.id} className="flex gap-2">
                    <select
                      value={s.platform}
                      onChange={(e) =>
                        setEditSocials((prev) =>
                          prev.map((item) =>
                            item.id === s.id
                              ? {
                                  ...item,
                                  platform: e.target.value as SocialPlatform,
                                }
                              : item
                          )
                        )
                      }
                      className="w-32 rounded-lg border border-[#E7E2DA] bg-white px-2 py-1.5 text-xs"
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={s.url}
                      onChange={(e) =>
                        setEditSocials((prev) =>
                          prev.map((item) =>
                            item.id === s.id
                              ? { ...item, url: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditSocials((prev) =>
                          prev.filter((item) => item.id !== s.id)
                        )
                      }
                      className="px-2 text-[#3A3A3A]/60 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-[#E7E2DA] bg-white px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
                >
                  {saving ? 'Yadda saxlanır...' : 'Yadda saxla'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Active Listings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
            Aktiv Elanlar ({listings.length})
          </h2>
          <span className="text-xs text-[#3A3A3A]/60 tabular-nums inline-flex items-center gap-1">
            <Heart size={13} className="text-[#6B7A3F]" /> {stats.totalLikes} bəyənmə
          </span>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/25 p-8 text-center text-sm text-[#3A3A3A]/65">
            Bu istifadəçinin hazırda aktiv elanı yoxdur.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onOpenDetail={onOpenListing}
                onTagClick={onTagClick}
                onLike={onLikeListing}
                onOpenProfile={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      {/* Portfolio Gallery */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
            Görülmüş İşlər Qalereyası
          </h2>
          {isOwnProfile && (
            <>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleGalleryUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#6B7A3F] px-3 py-1.5 text-xs font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/10 cursor-pointer"
              >
                <Upload size={13} />
                <span>
                  {uploadingGallery ? 'Yüklənir...' : 'İş fotosu / video əlavə et'}
                </span>
              </button>
            </>
          )}
        </div>

        {(profileUser.portfolioGallery || []).length === 0 ? (
          <div className="rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/25 p-6 text-sm text-[#3A3A3A]/65">
            Qalereyada hələ iş nümunəsi paylaşılmayıb.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profileUser.portfolioGallery.map((g) => (
              <div
                key={g.id}
                className="overflow-hidden rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  {g.type === 'video' ? (
                    <video
                      src={g.url}
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={g.url}
                      alt={g.name || 'Portfolio işi'}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                {g.name && (
                  <div className="bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#3A3A3A]">
                    {g.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Client Reviews */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
          Müştəri Rəyləri ({reviews.length})
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleReviewSubmit}
            className="lg:col-span-5 rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/30 p-5 space-y-3 h-fit"
          >
            <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
              Usta / Şirkət haqqında rəy yaz
            </h3>
            {!currentUser && (
              <input
                type="text"
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                placeholder="Adınız"
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
              />
            )}
            <div className="flex items-center gap-1">
              <span className="mr-2 text-xs text-[#3A3A3A]/70">Reytinq:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRevRating(s)}
                  className="p-0.5 cursor-pointer"
                >
                  <Star
                    size={16}
                    className={
                      s <= revRating
                        ? 'fill-[#6B7A3F] text-[#6B7A3F]'
                        : 'text-[#3A3A3A]/30'
                    }
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={revText}
              onChange={(e) => setRevText(e.target.value)}
              placeholder="İşin keyfiyyəti və dəqiqliyi barədə təəssüratınız..."
              className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={revSubmitting || !revText.trim()}
              className="w-full rounded-lg bg-[#6B7A3F] py-2.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 cursor-pointer"
            >
              {revSubmitting ? 'Göndərilir...' : 'Rəy əlavə et'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-[#3A3A3A]/60">
                Hələ rəy yazılmayıb.
              </p>
            ) : (
              reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-[#E7E2DA] bg-[#FAF7F2] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#3A3A3A]">
                        {r.authorName}
                      </span>
                      <span className="font-mono text-xs text-[#6B7A3F]">
                        ★ {r.rating}.0
                      </span>
                    </div>
                    <span className="text-xs text-[#3A3A3A]/55">
                      {formatRelativeDateAz(r.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#3A3A3A]/85">{r.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
