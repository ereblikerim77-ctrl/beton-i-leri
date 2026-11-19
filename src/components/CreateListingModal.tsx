import {
  Check,
  CreditCard,
  Crown,
  ImagePlus,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type {
  CardTheme,
  Listing,
  ListingTier,
  MediaItem,
  PaymentSimInfo,
  ProConfig,
  SocialLink,
  SocialPlatform,
  User,
  VipConfig,
  VipFrameVariant,
} from '../types.ts';
import {
  CATEGORIES,
  CONCRETE_GRADES,
  EQUIPMENT_TYPES,
  REGIONS,
  SOCIAL_PLATFORMS,
  TIER_PLANS,
  uploadMediaFile,
} from '../utils/helpers.ts';
import { VoiceInputButton } from './VoiceInputButton.tsx';

interface CreateListingModalProps {
  currentUser: User | null;
  requireApproval: boolean;
  onClose: () => void;
  onCreated: (listing: Listing) => void;
}

const THEME_OPTIONS: { id: CardTheme; title: string; previewClass: string }[] = [
  {
    id: 'standard',
    title: 'Standart Krem',
    previewClass: 'bg-[#FAF7F2] border border-[#E7E2DA]',
  },
  {
    id: 'concrete',
    title: 'Açıq Beton',
    previewClass: 'bg-[#E7E2DA] border border-[#3A3A3A]/20',
  },
  {
    id: 'olive',
    title: 'Zeytun Vurğulu',
    previewClass: 'bg-[#FAF7F2] border-2 border-[#6B7A3F]',
  },
  {
    id: 'vip',
    title: 'VIP Qızılı-Zeytun',
    previewClass: 'bg-[#FAF7F2] border-2 border-[#9B8740]',
  },
];

const VIP_FRAME_VARIANTS: { id: VipFrameVariant; title: string; preview: string }[] = [
  {
    id: 'gold_olive',
    title: 'Qızılı-Zeytun',
    preview: 'border-2 border-[#9B8740] bg-[#9B8740]/10',
  },
  {
    id: 'anthracite_gold',
    title: 'Antrasit & Qızılı',
    preview: 'border-2 border-[#3A3A3A] bg-[#3A3A3A]/10',
  },
  {
    id: 'emerald_stone',
    title: 'Zeytun Premium',
    preview: 'border-2 border-[#6B7A3F] bg-[#6B7A3F]/10',
  },
];

export function CreateListingModal({
  currentUser,
  requireApproval,
  onClose,
  onCreated,
}: CreateListingModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [description, setDescription] = useState('');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '+994');

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    currentUser?.socialLinks || []
  );
  const [tags, setTags] = useState<string[]>(['beton', 'baki']);
  const [tagInput, setTagInput] = useState('');

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [tier, setTier] = useState<ListingTier>('standard');
  const [cardTheme, setCardTheme] = useState<CardTheme>('standard');
  const [experienceYears, setExperienceYears] = useState(5);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Bakı']);
  const [minVolumeM3, setMinVolumeM3] = useState(10);
  const [priceType, setPriceType] = useState<'negotiable' | 'per_m3'>('per_m3');
  const [pricePerM3, setPricePerM3] = useState(115);
  const [concreteGrades, setConcreteGrades] = useState<string[]>(['M300']);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);

  // PRO-specific customizations
  const [proHighlightLabel, setProHighlightLabel] = useState('Sürətli Briqada');
  const [proCustomCta, setProCustomCta] = useState('Pulsuz Baxış Çağır');
  const [proWorkingHours, setProWorkingHours] = useState('08:00 - 20:00 (Hər gün)');
  const [proWhatsappTemplate, setProWhatsappTemplate] = useState(
    'Salam, elanınızla bağlı obyektə baxış və qiymət təklifi almaq istəyirəm.'
  );

  // VIP-specific customizations
  const [vipSlogan, setVipSlogan] = useState('24/7 Təcili Çıxış · Laboratoriya Sertifikatlı');
  const [vipAdv1, setVipAdv1] = useState('100% Dəqiq Kubmetr Zəmanəti');
  const [vipAdv2, setVipAdv2] = useState('Rəsmi Müqavilə və Qaimə');
  const [vipAdv3, setVipAdv3] = useState('Sertifikatlı Texnika və Briqada');
  const [vipGuaranteeText, setVipGuaranteeText] = useState(
    'Hər tökümdə laboratoriya pasportu və vaxtında təhvil zəmanəti.'
  );
  const [vipFrameVariant, setVipFrameVariant] = useState<VipFrameVariant>('gold_olive');
  const [vipPriorityPin, setVipPriorityPin] = useState(true);

  // Simulated payment checkout step
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'terminal'>('card');
  const [simCardLast4, setSimCardLast4] = useState('4242');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activePlan = TIER_PLANS[tier];

  function addSocialLink() {
    setSocialLinks((prev) => [
      ...prev,
      {
        id: `sl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: 'Instagram',
        url: '',
      },
    ]);
  }

  function updateSocialLink(
    id: string,
    field: 'platform' | 'url',
    val: string
  ) {
    setSocialLinks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'platform' ? (val as SocialPlatform) : val,
            }
          : item
      )
    );
  }

  function removeSocialLink(id: string) {
    setSocialLinks((prev) => prev.filter((item) => item.id !== id));
  }

  function addTag() {
    const cleaned = tagInput.replace(/^#/, '').trim().toLowerCase();
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagInput('');
  }

  function toggleItem(list: string[], val: string, setter: (v: string[]) => void) {
    if (list.includes(val)) {
      if (list.length > 1 || setter !== setSelectedRegions) {
        setter(list.filter((i) => i !== val));
      }
    } else {
      setter([...list, val]);
    }
  }

  async function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = Math.max(0, activePlan.maxMedia - media.length);
    if (remaining === 0) {
      setError(`${activePlan.name} paketi üçün maksimum ${activePlan.maxMedia} media faylı yüklənə bilər.`);
      return;
    }

    setUploadingMedia(true);
    setError('');
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const res = await uploadMediaFile(file);
        uploaded.push({
          id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: res.url,
          type: res.type,
          name: res.name,
        });
      }
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Media yüklənərkən xəta baş verdi.'
      );
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function publishListing(paymentSim?: PaymentSimInfo) {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('beton_user_token') || '';
      const validSocials = socialLinks.filter((s) => s.url.trim().length > 0);

      const proConfig: ProConfig | undefined =
        tier === 'pro'
          ? {
              highlightLabel: proHighlightLabel.trim() || 'PRO Usta',
              customCtaText: proCustomCta.trim() || 'Ətraflı',
              workingHours: proWorkingHours.trim() || '08:00 - 20:00',
              whatsappTemplate: proWhatsappTemplate.trim(),
            }
          : undefined;

      const vipConfig: VipConfig | undefined =
        tier === 'vip'
          ? {
              sloganBanner: vipSlogan.trim() || 'VIP Seçilmiş Peşəkar',
              keyAdvantages: [vipAdv1, vipAdv2, vipAdv3]
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 3),
              guaranteeText: vipGuaranteeText.trim(),
              frameVariant: vipFrameVariant,
              priorityPinOnMap: vipPriorityPin,
            }
          : undefined;

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-user-token': token } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: companyName.trim(),
          phone: phone.trim(),
          socialLinks: validSocials,
          tags,
          media,
          tier,
          cardTheme: tier === 'vip' ? 'vip' : cardTheme,
          proConfig,
          vipConfig,
          paymentSim,
          experienceYears,
          regions: selectedRegions,
          minVolumeM3,
          priceType,
          pricePerM3: priceType === 'per_m3' ? pricePerM3 : undefined,
          concreteGrades,
          equipmentTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Elan yerləşdirilmədi.');
        setStep('form');
      } else {
        onCreated(data.listing);
      }
    } catch {
      setError('Serverə qoşulmaq mümkün olmadı.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim() || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Zəhmət olmasa başlıq, ad, soyad və əlaqə nömrəsini doldurun.');
      return;
    }

    if (tier === 'standard') {
      publishListing();
    } else {
      setStep('payment');
    }
  }

  async function handleConfirmSimulatedPayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    // Brief realistic simulator confirmation delay
    await new Promise((r) => setTimeout(r, 650));

    const now = new Date();
    const expires = new Date(
      now.getTime() + activePlan.durationDays * 24 * 60 * 60 * 1000
    );
    const paymentInfo: PaymentSimInfo = {
      plan: tier,
      amountAzn: activePlan.priceAzn,
      durationDays: activePlan.durationDays,
      method: paymentMethod,
      transactionRef: `SIM-${tier.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      paidAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    await publishListing(paymentInfo);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-3 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#E7E2DA]/40 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#3A3A3A]">
              {step === 'payment'
                ? `Ödəniş Simulyatoru — ${activePlan.name}`
                : 'Yeni Elan Yerləşdir'}
            </h2>
            <p className="text-xs text-[#3A3A3A]/65">
              {step === 'payment'
                ? 'Test rejimi aktivdir: real kartdan vəsait çıxılmır.'
                : requireApproval
                ? 'Elanınız administrator təsdiqindən sonra dərc olunacaq.'
                : 'Elanınız dərhal platformada yayımlanacaq.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] hover:border-[#3A3A3A]/40 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'payment' ? (
          <form
            onSubmit={handleConfirmSimulatedPayment}
            className="overflow-y-auto p-6 space-y-5"
          >
            <div className="rounded-xl border border-[#9B8740]/45 bg-[#9B8740]/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-sm font-bold text-[#3A3A3A]">
                  {tier === 'vip' ? (
                    <Crown size={18} className="text-[#9B8740]" />
                  ) : (
                    <Sparkles size={18} className="text-[#6B7A3F]" />
                  )}
                  <span>{activePlan.name} Aktivləşdirməsi</span>
                </div>
                <span className="font-mono text-lg font-bold text-[#3A3A3A] tabular-nums">
                  {activePlan.priceAzn} AZN
                </span>
              </div>
              <p className="text-xs text-[#3A3A3A]/75">
                Elan: <span className="font-semibold text-[#3A3A3A]">{title}</span> · Müddət:{' '}
                <span className="font-mono font-semibold">{activePlan.durationDays} gün</span>
              </p>
              <div className="text-[11px] text-[#6B7A3F] font-medium">
                {activePlan.summary}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#3A3A3A]">
                Ödəniş üsulunu seçin (Simulyator)
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { id: 'card' as const, label: 'Bank Kartı (Visa/MC)', sub: 'Test **** 4242' },
                  { id: 'apple_pay' as const, label: 'Apple / Google Pay', sub: 'Ani təsdiq' },
                  { id: 'terminal' as const, label: 'eManat / MilliÖn', sub: 'Simulyasiya kodu' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-2 border-[#6B7A3F] bg-white'
                        : 'border-[#E7E2DA] bg-white/70 hover:border-[#6B7A3F]/50'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#3A3A3A]">{m.label}</div>
                    <div className="mt-0.5 text-[11px] text-[#3A3A3A]/60">{m.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'card' && (
              <div className="rounded-xl border border-[#E7E2DA] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#3A3A3A]/70">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#3A3A3A]">
                    <CreditCard size={15} className="text-[#6B7A3F]" />
                    Test Kart Məlumatları
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#6B7A3F]">
                    <Lock size={12} /> Simulyasiya rejimi
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] text-[#3A3A3A]/65">
                      Kart nömrəsi (Test)
                    </label>
                    <input
                      type="text"
                      value={`4169 7388 0000 ${simCardLast4}`}
                      onChange={(e) => setSimCardLast4(e.target.value.slice(-4) || '4242')}
                      className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-[#3A3A3A]/65">
                      Bitmə / CVV
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="12/28 · 777"
                      className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 font-mono text-xs text-[#3A3A3A]/75"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-[#E7E2DA] bg-[#E7E2DA]/35 px-3.5 py-2.5 text-xs text-[#3A3A3A]/80">
              <ShieldCheck size={16} className="text-[#6B7A3F] shrink-0" />
              <span>
                Bu ödəniş simulyatordur — test məqsədilə dərhal təsdiqlənir və elanınız{' '}
                <strong>{activePlan.name}</strong> statusu ilə yayımlanır.
              </span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-[#E7E2DA] pt-4">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2.5 text-sm font-medium text-[#3A3A3A] hover:bg-[#E7E2DA]/50 cursor-pointer"
              >
                Geri qayıt
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6B7A3F] px-5 py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 cursor-pointer"
              >
                <Check size={16} />
                <span>
                  {submitting
                    ? 'Ödəniş təsdiqlənir...'
                    : `Ödənişi Təsdiqlə (${activePlan.priceAzn} AZN) və Dərc Et`}
                </span>
              </button>
            </div>
          </form>
        ) : (
          /* Form Body */
          <form onSubmit={handleFormSubmit} className="overflow-y-auto p-6 space-y-6">
            {/* 0. Elan Paketi (Standart / PRO / VIP) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                  Elan Tarifi və Görünürlük Paketi
                </h3>
                <span className="text-[11px] font-medium text-[#6B7A3F]">
                  PRO & VIP ödəniş simulyatoru
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['standard', 'pro', 'vip'] as ListingTier[]).map((tId) => {
                  const p = TIER_PLANS[tId];
                  const selected = tier === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => {
                        setTier(tId);
                        if (tId === 'vip') setCardTheme('vip');
                        else if (tId === 'pro' && cardTheme === 'standard') setCardTheme('olive');
                      }}
                      className={`flex flex-col justify-between rounded-xl p-3.5 text-left transition-all cursor-pointer ${
                        selected
                          ? tId === 'vip'
                            ? 'border-2 border-[#9B8740] bg-[#9B8740]/10 ring-1 ring-[#9B8740]'
                            : 'border-2 border-[#6B7A3F] bg-[#6B7A3F]/8'
                          : 'border border-[#E7E2DA] bg-white hover:border-[#6B7A3F]/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-[#3A3A3A]">
                            {p.name}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums ${
                              tId === 'vip'
                                ? 'text-[#9B8740]'
                                : tId === 'pro'
                                ? 'text-[#6B7A3F]'
                                : 'text-[#3A3A3A]/70'
                            }`}
                          >
                            {p.priceAzn === 0 ? 'Pulsuz' : `${p.priceAzn} AZN`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-[#3A3A3A]/75">
                          {p.summary}
                        </p>
                      </div>
                      <div className="mt-2.5 text-[10px] font-mono text-[#3A3A3A]/60">
                        {p.durationDays} gün · {p.maxMedia} media
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* PRO Specific Customizations */}
              {tier === 'pro' && (
                <div className="rounded-xl border border-[#6B7A3F]/45 bg-[#6B7A3F]/6 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7A3F]">
                    <Sparkles size={14} />
                    <span>PRO Özəlləşdirmələri</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                        PRO Vurğu Etiketi
                      </label>
                      <input
                        type="text"
                        maxLength={28}
                        value={proHighlightLabel}
                        onChange={(e) => setProHighlightLabel(e.target.value)}
                        placeholder="Sürətli Briqada"
                        className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                        İş Qrafiki
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        value={proWorkingHours}
                        onChange={(e) => setProWorkingHours(e.target.value)}
                        placeholder="24/7 və ya 08:00-20:00"
                        className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                        Fərdi Düymə Mətni
                      </label>
                      <input
                        type="text"
                        maxLength={22}
                        value={proCustomCta}
                        onChange={(e) => setProCustomCta(e.target.value)}
                        placeholder="Pulsuz Baxış Çağır"
                        className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                      Hazır WhatsApp Sifariş Şablonu (müştəri kliklədikdə avtomatik yazılır)
                    </label>
                    <input
                      type="text"
                      value={proWhatsappTemplate}
                      onChange={(e) => setProWhatsappTemplate(e.target.value)}
                      className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* VIP Specific Customizations */}
              {tier === 'vip' && (
                <div className="rounded-xl border-2 border-[#9B8740]/55 bg-[#9B8740]/8 p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A6728]">
                      <Crown size={15} />
                      VIP Eksklüziv Özəlləşdirmələr
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3A3A3A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vipPriorityPin}
                        onChange={(e) => setVipPriorityPin(e.target.checked)}
                        className="accent-[#6B7A3F]"
                      />
                      Xəritədə xüsusi qızılı VIP pin
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                        Kart Üstü VIP Şüar Lenti
                      </label>
                      <input
                        type="text"
                        maxLength={48}
                        value={vipSlogan}
                        onChange={(e) => setVipSlogan(e.target.value)}
                        className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                        VIP Çərçivə Üslubu
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {VIP_FRAME_VARIANTS.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVipFrameVariant(v.id)}
                            className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold cursor-pointer ${
                              v.preview
                            } ${vipFrameVariant === v.id ? 'ring-2 ring-[#6B7A3F]' : ''}`}
                          >
                            {v.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                      Kartda Vurğulanan 3 Əsas Üstünlük
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={vipAdv1}
                        onChange={(e) => setVipAdv1(e.target.value)}
                        placeholder="Üstünlük 1"
                        className="rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={vipAdv2}
                        onChange={(e) => setVipAdv2(e.target.value)}
                        placeholder="Üstünlük 2"
                        className="rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={vipAdv3}
                        onChange={(e) => setVipAdv3(e.target.value)}
                        placeholder="Üstünlük 3"
                        className="rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-[#3A3A3A]/75">
                      VIP Rəsmi Zəmanət Mətni (Elan pəncərəsində göstərilir)
                    </label>
                    <input
                      type="text"
                      value={vipGuaranteeText}
                      onChange={(e) => setVipGuaranteeText(e.target.value)}
                      className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 1. Əsas Məlumatlar */}
            <div className="border-t border-[#E7E2DA] pt-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                1. Xidmət və Əlaqə Məlumatları
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Elanın başlığı *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Məs: 47m Beton Pompası və M300 Beton Tökümü"
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Kateqoriya *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'Hamısı').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Əlaqə nömrəsi (Zəng & WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+994501234567"
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Ad *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Rəşad"
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Məmmədov"
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Şirkət və ya Briqada adı
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Bakı Monolit Qrup"
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-[#3A3A3A]/75">
                      Xidmətin ətraflı təsviri
                    </label>
                    <VoiceInputButton
                      label="Səslə diktə et"
                      onTranscribed={(txt) =>
                        setDescription((prev) => (prev ? `${prev} ${txt}` : txt))
                      }
                      onError={(msg) => setError(msg)}
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Gördüyünüz işlər, texnika imkanları, iş qrafiki və keyfiyyət zəmanəti haqqında yazın və ya mikrofonla danışın..."
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Peşəkar Sahələr */}
            <div className="border-t border-[#E7E2DA] pt-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                2. Peşəkar Göstəricilər və Tikinti Parametrləri
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    İş təcrübəsi (il)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Minimum sifariş həcmi (m³)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minVolumeM3}
                    onChange={(e) => setMinVolumeM3(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Qiymət forması
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={priceType}
                      onChange={(e) =>
                        setPriceType(e.target.value as 'negotiable' | 'per_m3')
                      }
                      className="w-full rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                    >
                      <option value="per_m3">m³ qiyməti</option>
                      <option value="negotiable">Razılaşma</option>
                    </select>
                    {priceType === 'per_m3' && (
                      <input
                        type="number"
                        min={1}
                        value={pricePerM3}
                        onChange={(e) => setPricePerM3(Number(e.target.value))}
                        placeholder="AZN"
                        className="w-24 rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-2 font-mono text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Regions */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#3A3A3A]/75">
                  Xidmət göstərdiyi regionlar / şəhərlər
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.filter((r) => r !== 'Bütün şəhərlər').map((region) => {
                    const active = selectedRegions.includes(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() =>
                          toggleItem(selectedRegions, region, setSelectedRegions)
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                            : 'border border-[#E7E2DA] bg-white text-[#3A3A3A] hover:border-[#6B7A3F]'
                        }`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Concrete Grades & Equipment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#3A3A3A]/75">
                    Beton markaları
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONCRETE_GRADES.map((grade) => {
                      const active = concreteGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() =>
                            toggleItem(concreteGrades, grade, setConcreteGrades)
                          }
                          className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#3A3A3A] text-[#FAF7F2]'
                              : 'border border-[#E7E2DA] bg-white text-[#3A3A3A]'
                          }`}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#3A3A3A]/75">
                    Texnika növləri
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_TYPES.map((eq) => {
                      const active = equipmentTypes.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() =>
                            toggleItem(equipmentTypes, eq, setEquipmentTypes)
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                              : 'border border-[#E7E2DA] bg-white text-[#3A3A3A]'
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Dinamik Sosial Şəbəkələr */}
            <div className="border-t border-[#E7E2DA] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                  3. Sosial Şəbəkələr
                </h3>
                <button
                  type="button"
                  onClick={addSocialLink}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#6B7A3F] px-3 py-1.5 text-xs font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/10 cursor-pointer"
                >
                  <Plus size={14} />
                  Şəbəkə əlavə et
                </button>
              </div>

              {socialLinks.length === 0 ? (
                <p className="text-xs text-[#3A3A3A]/60">
                  İstənilən sayda Instagram, TikTok, YouTube, WhatsApp, Telegram və ya veb-sayt linki əlavə edə bilərsiniz.
                </p>
              ) : (
                <div className="space-y-2">
                  {socialLinks.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <select
                        value={item.platform}
                        onChange={(e) =>
                          updateSocialLink(item.id, 'platform', e.target.value)
                        }
                        className="w-36 rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-2 text-xs font-medium text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                      >
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) =>
                          updateSocialLink(item.id, 'url', e.target.value)
                        }
                        placeholder="https://..."
                        className="flex-1 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-xs text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSocialLink(item.id)}
                        aria-label="Sil"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E2DA] text-[#3A3A3A]/70 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Limitsiz Taqlar */}
            <div className="border-t border-[#E7E2DA] pt-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                4. Taqlar (Açar sözlər)
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Məs: monolit, pompa, keyfiyyet..."
                  className="flex-1 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="rounded-lg bg-[#E7E2DA] px-4 py-2 text-xs font-semibold text-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-[#FAF7F2] transition-colors cursor-pointer"
                >
                  Əlavə et
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-1 text-xs font-medium text-[#3A3A3A]"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() =>
                          setTags((prev) => prev.filter((item) => item !== t))
                        }
                        className="text-[#3A3A3A]/50 hover:text-[#3A3A3A] cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Birbaşa Cihazdan Media Yükləmə */}
            <div className="border-t border-[#E7E2DA] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                  5. Şəkil və Video Yükləmə (Cihazdan birbaşa)
                </h3>
                <span className="font-mono text-xs text-[#3A3A3A]/65 tabular-nums">
                  {media.length} / {activePlan.maxMedia}
                </span>
              </div>
              <p className="text-xs text-[#3A3A3A]/65">
                Xarici link qəbul edilmir. Yüksək keyfiyyətli şəkilləri və ya tanıtım videolarını birbaşa cihazınızdan serverə yükləyin.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelection}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#6B7A3F]/50 bg-[#E7E2DA]/25 px-4 py-6 text-sm font-medium text-[#3A3A3A] hover:border-[#6B7A3F] hover:bg-[#E7E2DA]/45 transition-colors cursor-pointer"
              >
                {uploadingMedia ? (
                  <span>Fayllar sıxılır və serverə yüklənir...</span>
                ) : (
                  <>
                    <Upload size={18} className="text-[#6B7A3F]" />
                    <span>Şəkil və ya video faylları seçin (çoxlu seçim)</span>
                  </>
                )}
              </button>

              {media.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {media.map((m) => (
                    <div
                      key={m.id}
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-[#E7E2DA] bg-[#E7E2DA]"
                    >
                      {m.type === 'video' ? (
                        <div className="relative h-full w-full">
                          <video
                            src={m.url}
                            muted
                            className="h-full w-full object-cover"
                          />
                          <Video
                            size={16}
                            className="absolute left-2 top-2 text-[#FAF7F2]"
                          />
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={m.name || ''}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setMedia((prev) => prev.filter((item) => item.id !== m.id))
                        }
                        aria-label="Faylı sil"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-[#3A3A3A]/85 text-[#FAF7F2] hover:bg-red-700 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Elan Pəncərəsinin Rəng Seçimi */}
            {tier !== 'vip' && (
              <div className="border-t border-[#E7E2DA] pt-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                  6. Elan Kartı və Pəncərə Rəngi
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {THEME_OPTIONS.map((opt) => {
                    const selected = cardTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCardTheme(opt.id)}
                        className={`flex items-center justify-between gap-2 rounded-xl p-3 text-left text-xs font-semibold text-[#3A3A3A] transition-all cursor-pointer ${
                          opt.previewClass
                        } ${selected ? 'ring-2 ring-[#6B7A3F] ring-offset-2 ring-offset-[#FAF7F2]' : ''}`}
                      >
                        <span>{opt.title}</span>
                        {selected && <Check size={14} className="text-[#6B7A3F] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-[#E7E2DA] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2.5 text-sm font-medium text-[#3A3A3A] hover:bg-[#E7E2DA]/50 cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingMedia}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6B7A3F] px-5 py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {tier === 'standard' ? <ImagePlus size={16} /> : <CreditCard size={16} />}
                <span>
                  {submitting
                    ? 'Yadda saxlanır...'
                    : tier === 'standard'
                    ? 'Elanı Dərc Et'
                    : `Ödəniş Simulyatoruna Keç (${activePlan.priceAzn} AZN)`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
