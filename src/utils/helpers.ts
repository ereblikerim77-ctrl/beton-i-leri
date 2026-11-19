import type { CardTheme, ListingTier, VipFrameVariant } from '../types.ts';

export const CATEGORIES = [
  'Hamısı',
  'Bünövrə betonu',
  'Monolit',
  'Beton pompası',
  'Mikser xidməti',
  'Şlifovka/Helikopter',
  'Usta briqadası',
  'Qəlib və Armatur',
];

export const CONCRETE_GRADES = ['M200', 'M250', 'M300', 'M350', 'M400'];

export const EQUIPMENT_TYPES = ['Pompa', 'Mikser', 'Helikopter', 'Qəlib sistemi', 'Vibrator'];

export const REGIONS = [
  'Bütün şəhərlər',
  'Bakı',
  'Abşeron',
  'Xırdalan',
  'Sumqayıt',
  'Gəncə',
  'Qarabağ',
  'Quba',
  'Lənkəran',
];

export const TIER_PLANS: Record<
  ListingTier,
  {
    id: ListingTier;
    name: string;
    priceAzn: number;
    durationDays: number;
    maxMedia: number;
    summary: string;
  }
> = {
  standard: {
    id: 'standard',
    name: 'Standart',
    priceAzn: 0,
    durationDays: 30,
    maxMedia: 4,
    summary: 'Əsas kataloqda yerləşmə, standart kart görünüşü',
  },
  pro: {
    id: 'pro',
    name: 'PRO Paket',
    priceAzn: 19,
    durationDays: 14,
    maxMedia: 8,
    summary: 'Ön sıralarda yerləşmə, iş qrafiki, fərdi düymə və WhatsApp şablonu',
  },
  vip: {
    id: 'vip',
    name: 'VIP Paket',
    priceAzn: 49,
    durationDays: 30,
    maxMedia: 16,
    summary: 'Ən üst sabit yerləşmə, VIP zəmanət lenti, 3 üstünlük və xüsusi xəritə pini',
  },
};

export const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Bakı: { lat: 40.4093, lng: 49.8671 },
  Abşeron: { lat: 40.4646, lng: 49.7544 },
  Xırdalan: { lat: 40.4481, lng: 49.755 },
  Sumqayıt: { lat: 40.5855, lng: 49.6317 },
  Gəncə: { lat: 40.6828, lng: 46.3606 },
  Qarabağ: { lat: 39.7575, lng: 46.7503 },
  Quba: { lat: 41.3611, lng: 48.5134 },
  Lənkəran: { lat: 38.7529, lng: 48.8511 },
};

export function getListingCoordinates(
  listing: { id: string; regions: string[]; coordinates?: { lat: number; lng: number } }
): { lat: number; lng: number } {
  if (listing.coordinates) return listing.coordinates;
  const primary = listing.regions[0] || 'Bakı';
  const base = REGION_COORDINATES[primary] || REGION_COORDINATES['Bakı'];
  let hash = 0;
  for (let i = 0; i < listing.id.length; i++) {
    hash = (hash * 31 + listing.id.charCodeAt(i)) % 1000;
  }
  const offsetLat = ((hash % 40) - 20) * 0.0012;
  const offsetLng = (((hash >> 3) % 40) - 20) * 0.0016;
  return {
    lat: Number((base.lat + offsetLat).toFixed(6)),
    lng: Number((base.lng + offsetLng).toFixed(6)),
  };
}

export const SOCIAL_PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'WhatsApp',
  'Telegram',
  'Veb-sayt',
] as const;

export function formatPhoneForTel(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

export function formatPhoneForWhatsApp(phone: string, text?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function getCardThemeClasses(
  theme: CardTheme,
  tier: ListingTier = 'standard',
  vipVariant?: VipFrameVariant
): {
  card: string;
  label: string;
  headerBg: string;
} {
  if (tier === 'vip') {
    if (vipVariant === 'anthracite_gold') {
      return {
        card: 'bg-[#FAF7F2] border-2 border-[#3A3A3A] shadow-[0_8px_28px_rgba(58,58,58,0.14)] ring-1 ring-[#9B8740]/45',
        label: 'VIP Antrasit & Qızılı',
        headerBg: 'bg-[#3A3A3A]/8',
      };
    }
    if (vipVariant === 'emerald_stone') {
      return {
        card: 'bg-[#FAF7F2] border-2 border-[#6B7A3F] shadow-[0_8px_28px_rgba(107,122,63,0.16)] ring-1 ring-[#6B7A3F]/30',
        label: 'VIP Zeytun Premium',
        headerBg: 'bg-[#6B7A3F]/12',
      };
    }
    return {
      card: 'bg-[#FAF7F2] border-2 border-[#9B8740] shadow-[0_8px_28px_rgba(155,135,64,0.16)]',
      label: 'VIP Qızılı-Zeytun',
      headerBg: 'bg-[#9B8740]/12',
    };
  }

  switch (theme) {
    case 'concrete':
      return {
        card: 'bg-[#E7E2DA]/60 border border-[#3A3A3A]/15',
        label: 'Açıq Beton',
        headerBg: 'bg-[#E7E2DA]',
      };
    case 'olive':
      return {
        card: 'bg-[#FAF7F2] border-2 border-[#6B7A3F]',
        label: 'Zeytun Vurğulu',
        headerBg: 'bg-[#6B7A3F]/10',
      };
    case 'vip':
      return {
        card: 'bg-[#FAF7F2] border-2 border-[#9B8740] shadow-[0_6px_24px_rgba(107,122,63,0.12)]',
        label: 'VIP Qızılı-Zeytun',
        headerBg: 'bg-[#9B8740]/12',
      };
    case 'standard':
    default:
      return {
        card: 'bg-[#FAF7F2] border border-[#E7E2DA]',
        label: 'Standart Krem',
        headerBg: 'bg-[#E7E2DA]/45',
      };
  }
}

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 450 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(file);

    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        0.82
      );
    };
    img.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(file: File): Promise<{
  url: string;
  type: 'image' | 'video';
  name: string;
}> {
  const prepared = file.type.startsWith('image/')
    ? await compressImageIfNeeded(file)
    : file;

  const formData = new FormData();
  formData.append('file', prepared);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Fayl yüklənmədi' }));
    throw new Error(err.error || 'Fayl yüklənə bilmədi.');
  }
  return res.json();
}

export function formatRelativeDateAz(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'İndicə';
  if (mins < 60) return `${mins} dəq əvvəl`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat əvvəl`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün əvvəl`;
  return new Date(iso).toLocaleDateString('az-AZ');
}
