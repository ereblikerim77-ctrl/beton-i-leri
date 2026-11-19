import fs from 'fs';
import path from 'path';
import type {
  AnalyticsSnapshot,
  AuditLogEntry,
  CommentItem,
  Listing,
  PlatformSettings,
  QuoteRequest,
  User,
  UserReview,
} from '../src/types.ts';

export interface DatabaseState {
  users: User[];
  listings: Listing[];
  comments: CommentItem[];
  reviews: UserReview[];
  quotes: QuoteRequest[];
  auditLogs: AuditLogEntry[];
  settings: PlatformSettings;
  analytics: AnalyticsSnapshot;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function formatTimestampMs(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
}

function createDefaultQuotes(now: Date): QuoteRequest[] {
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const sixHoursAgo = new Date(now.getTime() - 6 * 3600 * 1000).toISOString();
  return [
    {
      id: 'q-101',
      customerName: 'Samir Nəsirov',
      phone: '+994504112233',
      region: 'Bakı',
      category: 'Bünövrə betonu',
      concreteGrade: 'M300',
      volumeM3: 42,
      needsPump: true,
      targetDate: 'Bu həftə sonu',
      notes: 'Mərdəkanda 2 mərtəbəli villa bünövrəsi üçün 42 m³ M300 beton və 38m pompa lazımdır.',
      status: 'open',
      createdAt: twoHoursAgo,
    },
    {
      id: 'q-102',
      customerName: 'Tural İsmayılov',
      phone: '+994558221040',
      region: 'Sumqayıt',
      category: 'Şlifovka/Helikopter',
      concreteGrade: 'M350',
      volumeM3: 85,
      needsPump: true,
      targetDate: 'Növbəti bazar ertəsi',
      notes: '600 m² qapalı anbar döşəməsi, lazer niveli + kvarts səpmə və helikopter cilalama.',
      status: 'open',
      createdAt: sixHoursAgo,
    },
  ];
}

export function createInitialSeed(): DatabaseState {
  const now = new Date();
  const isoNow = now.toISOString();
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000).toISOString();
  const threeHoursAgo = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 22 * 3600 * 1000).toISOString();
  const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  const in14Days = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString();

  const users: User[] = [
    {
      id: 'u-rashad',
      email: 'rashad@betonishleri.az',
      passwordHash: 'demo1234',
      authProvider: 'email',
      firstName: 'Rəşad',
      lastName: 'Məmmədov',
      companyName: 'Bakı Monolit Qrup',
      phone: '+994503124567',
      role: 'Creator',
      verified: true,
      banned: false,
      bio: '14 illik təcrübəyə malik monolit, bünövrə və sənaye döşəmə briqadası. M200-M400 markalı betonların qəbulu, vibrasiyası və helikopter cilalanması.',
      avatarUrl: '/src/assets/images/monolith_formwork_rebar_1795097617939.jpg',
      coverMediaUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
      coverMediaType: 'image',
      socialLinks: [
        { id: 's-1', platform: 'Instagram', url: 'https://instagram.com/bakimonolit' },
        { id: 's-2', platform: 'WhatsApp', url: 'https://wa.me/994503124567' },
        { id: 's-3', platform: 'YouTube', url: 'https://youtube.com/@bakimonolit' },
      ],
      portfolioGallery: [
        { id: 'pg-1', url: '/src/assets/images/monolith_formwork_rebar_1795097617939.jpg', type: 'image', name: 'Ağ Şəhər Monolit Layihəsi' },
        { id: 'pg-2', url: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg', type: 'image', name: 'Sənaye Kompleksi Qəlib İşləri' },
      ],
      lastSeenAt: isoNow,
      lastLoginAt: oneHourAgo,
      createdAt: yesterday,
    },
    {
      id: 'u-elvin',
      email: 'elvin@pompaxidmeti.az',
      passwordHash: 'demo1234',
      authProvider: 'email',
      firstName: 'Elvin',
      lastName: 'Həsənov',
      companyName: 'Abşeron Pompa & Mikser',
      phone: '+994557891122',
      role: 'Creator',
      verified: true,
      banned: false,
      bio: '38m, 47m və 52m beton pompaları və 9-12 m³ mikserlərlə Bakı və Abşeron üzrə 7/24 fasiləsiz beton çatdırılması.',
      avatarUrl: '/src/assets/images/concrete_pump_site_1795097617269.jpg',
      coverMediaUrl: '/src/assets/images/concrete_mixer_truck_1795097617899.jpg',
      coverMediaType: 'image',
      socialLinks: [
        { id: 's-4', platform: 'Instagram', url: 'https://instagram.com/abseronpompa' },
        { id: 's-5', platform: 'TikTok', url: 'https://tiktok.com/@abseronpompa' },
        { id: 's-6', platform: 'Telegram', url: 'https://t.me/abseronpompa' },
      ],
      portfolioGallery: [
        { id: 'pg-3', url: '/src/assets/images/concrete_pump_site_1795097617269.jpg', type: 'image', name: '47m Pompa Bünövrə Tökümü' },
        { id: 'pg-4', url: '/src/assets/images/concrete_mixer_truck_1795097617899.jpg', type: 'image', name: 'Mikser Parkı' },
      ],
      lastSeenAt: oneHourAgo,
      lastLoginAt: threeHoursAgo,
      createdAt: yesterday,
    },
    {
      id: 'u-kamran',
      email: 'kamran@slifovka.az',
      passwordHash: 'demo1234',
      authProvider: 'email',
      firstName: 'Kamran',
      lastName: 'Əliyev',
      companyName: 'ProFloor Sənaye Döşəmələri',
      phone: '+994704569900',
      role: 'Moderator',
      verified: true,
      banned: false,
      bio: 'Anbar, qaraj, fabrik və ticarət mərkəzləri üçün lazer niveli ilə beton tökmə, kvarts sərtləşdirici və helikopter şlifovka işləri.',
      avatarUrl: '/src/assets/images/helicopter_floor_polishing_1795097620223.jpg',
      coverMediaUrl: '/src/assets/images/helicopter_floor_polishing_1795097620223.jpg',
      coverMediaType: 'image',
      socialLinks: [
        { id: 's-7', platform: 'Veb-sayt', url: 'https://profloor.az' },
        { id: 's-8', platform: 'Instagram', url: 'https://instagram.com/proflooraz' },
      ],
      portfolioGallery: [
        { id: 'pg-5', url: '/src/assets/images/helicopter_floor_polishing_1795097620223.jpg', type: 'image', name: 'Sumqayıt Logistika Anbarı' },
      ],
      lastSeenAt: threeHoursAgo,
      lastLoginAt: yesterday,
      createdAt: yesterday,
    },
    {
      id: 'u-orxan',
      email: 'orxan@sifarisci.az',
      passwordHash: 'demo1234',
      authProvider: 'email',
      firstName: 'Orxan',
      lastName: 'Quliyev',
      companyName: 'Qarabağ Tikinti Layihə',
      phone: '+994512348899',
      role: 'User',
      verified: false,
      banned: false,
      bio: 'Fərdi evlər və kommersiya obyektləri üçün peşəkar beton ustaları və texnika axtaran layihə rəhbəri.',
      avatarUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
      coverMediaUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
      coverMediaType: 'image',
      socialLinks: [
        { id: 's-9', platform: 'WhatsApp', url: 'https://wa.me/994512348899' },
      ],
      portfolioGallery: [],
      lastSeenAt: yesterday,
      lastLoginAt: yesterday,
      createdAt: yesterday,
    },
  ];

  const listings: Listing[] = [
    {
      id: 'l-101',
      userId: 'u-elvin',
      title: '47m və 52m Beton Pompası + Sertifikatlı Beton Tökümü',
      description: 'Bakı, Xırdalan və Abşeron yarımadasında istənilən hündürlüyə və məsafəyə beton pompalarının göndərilməsi. Laboratoriya sınaqlı M250, M300, M350 və M400 markalı hazır beton qarışıqları vaxtında və dəqiq kubmetrlə təhvil verilir.',
      category: 'Beton pompası',
      firstName: 'Elvin',
      lastName: 'Həsənov',
      companyName: 'Abşeron Pompa & Mikser',
      phone: '+994557891122',
      socialLinks: [
        { id: 'ls-1', platform: 'Instagram', url: 'https://instagram.com/abseronpompa' },
        { id: 'ls-2', platform: 'WhatsApp', url: 'https://wa.me/994557891122' },
      ],
      tags: ['pompa', 'baki', 'abseron', 'm300', 'm350', 'texnika'],
      media: [
        { id: 'm-1', url: '/src/assets/images/concrete_pump_site_1795097617269.jpg', type: 'image', name: '47m Beton Pompası İşdə' },
        { id: 'm-2', url: '/src/assets/images/concrete_mixer_truck_1795097617899.jpg', type: 'image', name: 'Mikser Təchizatı' },
      ],
      cardTheme: 'vip',
      tier: 'vip',
      vipConfig: {
        sloganBanner: '24/7 Təcili Çıxış · Laboratoriya Sertifikatlı',
        keyAdvantages: [
          '100% Dəqiq Kubmetr Zəmanəti',
          '52m-ə qədər Almaniya Pompa Parkı',
          'Rəsmi Müqavilə və Qaimə',
        ],
        guaranteeText: 'Hər mikserdən nümunə götürülür və rəsmi laboratoriya pasportu təqdim olunur.',
        frameVariant: 'gold_olive',
        priorityPinOnMap: true,
      },
      paymentSim: {
        plan: 'vip',
        amountAzn: 49,
        durationDays: 30,
        method: 'card',
        transactionRef: 'SIM-VIP-9041',
        paidAt: threeHoursAgo,
        expiresAt: in30Days,
      },
      experienceYears: 11,
      regions: ['Bakı', 'Xırdalan', 'Abşeron', 'Sumqayıt'],
      minVolumeM3: 15,
      priceType: 'per_m3',
      pricePerM3: 118,
      concreteGrades: ['M250', 'M300', 'M350', 'M400'],
      equipmentTypes: ['Pompa', 'Mikser'],
      verified: true,
      status: 'active',
      views: 428,
      likes: 47,
      likedBy: [],
      createdAt: threeHoursAgo,
      updatedAt: oneHourAgo,
    },
    {
      id: 'l-102',
      userId: 'u-rashad',
      title: 'Monolit Karkas, Qəlib və Armatur Briqadası (Tam Təhvil)',
      description: '12 nəfərlik ixtisaslaşmış usta briqadası ilə villa, yaşayış binası və kommersiya obyektlərinin bünövrə, sütun, rigel və monolit örtük işləri. Özümüzün teleskopik dirək və Doka tipli qəlib sistemlərimiz mövcuddur.',
      category: 'Monolit',
      firstName: 'Rəşad',
      lastName: 'Məmmədov',
      companyName: 'Bakı Monolit Qrup',
      phone: '+994503124567',
      socialLinks: [
        { id: 'ls-3', platform: 'Instagram', url: 'https://instagram.com/bakimonolit' },
        { id: 'ls-4', platform: 'YouTube', url: 'https://youtube.com/@bakimonolit' },
      ],
      tags: ['monolit', 'qelib', 'armatur', 'baki', 'briqada', 'bunovre'],
      media: [
        { id: 'm-3', url: '/src/assets/images/monolith_formwork_rebar_1795097617939.jpg', type: 'image', name: 'Armatur və Qəlib Montajı' },
        { id: 'm-4', url: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg', type: 'image', name: 'Tamamlanmış Monolit Struktur' },
      ],
      cardTheme: 'olive',
      tier: 'pro',
      proConfig: {
        highlightLabel: 'Doka Qəlib & Briqada',
        customCtaText: 'Pulsuz Baxış Çağır',
        workingHours: '08:00 - 20:00 (Hər gün)',
        whatsappTemplate: 'Salam Rəşad usta, obyektə yerində baxış və monolit smetası üçün əlaqə saxlayıram.',
      },
      paymentSim: {
        plan: 'pro',
        amountAzn: 19,
        durationDays: 14,
        method: 'card',
        transactionRef: 'SIM-PRO-4412',
        paidAt: yesterday,
        expiresAt: in14Days,
      },
      experienceYears: 14,
      regions: ['Bakı', 'Sumqayıt', 'Abşeron', 'Quba'],
      minVolumeM3: 25,
      priceType: 'negotiable',
      concreteGrades: ['M250', 'M300', 'M350', 'M400'],
      equipmentTypes: ['Qəlib sistemi', 'Vibrator'],
      verified: true,
      status: 'active',
      views: 365,
      likes: 39,
      likedBy: [],
      createdAt: yesterday,
      updatedAt: threeHoursAgo,
    },
    {
      id: 'l-103',
      userId: 'u-kamran',
      title: 'Sənaye Döşəmələri, Helikopter Şlifovka və Epoksid Hazırlığı',
      description: 'Anbarlar, yeraltı qarajlar, zavod və logistika mərkəzləri üçün lazer səviyyəli beton döşəmə tökmə, kvarts (korund) toz səpmə və cüt pərli helikopterlə güzgü cilalanması.',
      category: 'Şlifovka/Helikopter',
      firstName: 'Kamran',
      lastName: 'Əliyev',
      companyName: 'ProFloor Sənaye Döşəmələri',
      phone: '+994704569900',
      socialLinks: [
        { id: 'ls-5', platform: 'Veb-sayt', url: 'https://profloor.az' },
        { id: 'ls-6', platform: 'Instagram', url: 'https://instagram.com/proflooraz' },
      ],
      tags: ['slifovka', 'helikopter', 'senayedoseme', 'sumqayit', 'baki', 'lazer'],
      media: [
        { id: 'm-5', url: '/src/assets/images/helicopter_floor_polishing_1795097620223.jpg', type: 'image', name: 'Helikopter Şlifovka Prosesi' },
      ],
      cardTheme: 'concrete',
      tier: 'pro',
      proConfig: {
        highlightLabel: 'Lazer Nivelir & Kvarts',
        customCtaText: 'Kv.m Qiyməti Al',
        workingHours: '24/7 Növbəli Briqada',
        whatsappTemplate: 'Salam Kamran bəy, sənaye döşəməsi şlifovkası üçün qiymət təklifi almaq istəyirəm.',
      },
      paymentSim: {
        plan: 'pro',
        amountAzn: 19,
        durationDays: 14,
        method: 'apple_pay',
        transactionRef: 'SIM-PRO-3309',
        paidAt: yesterday,
        expiresAt: in14Days,
      },
      experienceYears: 9,
      regions: ['Bakı', 'Sumqayıt', 'Gəncə', 'Qarabağ'],
      minVolumeM3: 40,
      priceType: 'per_m3',
      pricePerM3: 132,
      concreteGrades: ['M300', 'M350', 'M400'],
      equipmentTypes: ['Helikopter', 'Lazer nivelir'],
      verified: true,
      status: 'active',
      views: 294,
      likes: 31,
      likedBy: [],
      createdAt: yesterday,
      updatedAt: oneHourAgo,
    },
    {
      id: 'l-104',
      userId: 'u-elvin',
      title: '9 m³ və 12 m³ Mikser Xidməti — Birbaşa Zavoddan Çatdırılma',
      description: 'Kiçik və böyük həcmli bünövrə, həyət bağlama, pilləkən və kəmər betonları üçün M200-dən M400-ə qədər sertifikatlı hazır betonun mikserlə birbaşa obyektə çatdırılması.',
      category: 'Mikser xidməti',
      firstName: 'Elvin',
      lastName: 'Həsənov',
      companyName: 'Abşeron Pompa & Mikser',
      phone: '+994557891122',
      socialLinks: [
        { id: 'ls-7', platform: 'Telegram', url: 'https://t.me/abseronpompa' },
        { id: 'ls-8', platform: 'WhatsApp', url: 'https://wa.me/994557891122' },
      ],
      tags: ['mikser', 'beton', 'm200', 'm250', 'xirdalan', 'baki'],
      media: [
        { id: 'm-6', url: '/src/assets/images/concrete_mixer_truck_1795097617899.jpg', type: 'image', name: 'Mikser Boşaltma' },
      ],
      cardTheme: 'standard',
      tier: 'standard',
      experienceYears: 11,
      regions: ['Bakı', 'Xırdalan', 'Abşeron'],
      minVolumeM3: 6,
      priceType: 'per_m3',
      pricePerM3: 104,
      concreteGrades: ['M200', 'M250', 'M300', 'M350'],
      equipmentTypes: ['Mikser'],
      verified: true,
      status: 'active',
      views: 215,
      likes: 22,
      likedBy: [],
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: 'l-105',
      userId: 'u-rashad',
      title: 'Fərdi Ev Bünövrəsi, Lentvari Fundament və Qəlib İşləri',
      description: 'Mərdəkan, Şüvəlan, Bilgəh və Novxanı bağ evləri üçün dəqiq layihə üzrə xəndək, armatur karkas, hidroizolyasiya və M300 bünövrə betonu tökülməsi.',
      category: 'Bünövrə betonu',
      firstName: 'Rəşad',
      lastName: 'Məmmədov',
      companyName: 'Bakı Monolit Qrup',
      phone: '+994503124567',
      socialLinks: [
        { id: 'ls-9', platform: 'WhatsApp', url: 'https://wa.me/994503124567' },
      ],
      tags: ['bunovre', 'fundament', 'merdekan', 'monolit', 'keyfiyyet'],
      media: [
        { id: 'm-7', url: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg', type: 'image', name: 'Bünövrə və Karkas İşi' },
      ],
      cardTheme: 'standard',
      tier: 'standard',
      experienceYears: 14,
      regions: ['Bakı', 'Abşeron'],
      minVolumeM3: 10,
      priceType: 'negotiable',
      concreteGrades: ['M250', 'M300'],
      equipmentTypes: ['Qəlib sistemi'],
      verified: true,
      status: 'active',
      views: 184,
      likes: 19,
      likedBy: [],
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ];

  const comments: CommentItem[] = [
    {
      id: 'c-1',
      listingId: 'l-101',
      userId: 'u-orxan',
      authorName: 'Orxan Quliyev',
      authorRole: 'User',
      text: 'Mərdəkanda 38 kub M300 beton sifariş etdik, pompa da mikserlər də dəqiq vaxtında gəldi. Kubmetrdə heç bir əskiklik olmadı.',
      rating: 5,
      createdAt: oneHourAgo,
      adminReply: {
        text: 'Təşəkkür edirik! Keyfiyyətli və vaxtında təhvil platformamızın əsas standartıdır.',
        repliedBy: 'Admin',
        repliedAt: isoNow,
      },
    },
    {
      id: 'c-2',
      listingId: 'l-102',
      userId: 'u-orxan',
      authorName: 'Fərid Əhmədov',
      authorRole: 'Qonaq',
      text: 'Rəşad ustanın briqadası 2 mərtəbəli evin monolit pilləkən və örtüyünü çox səliqəli işlədi. Qəliblər təmiz açıldı.',
      rating: 5,
      createdAt: threeHoursAgo,
    },
  ];

  const reviews: UserReview[] = [
    {
      id: 'rev-1',
      targetUserId: 'u-rashad',
      authorName: 'Orxan Quliyev',
      rating: 5,
      text: 'Layihə çertyojuna tam uyğun armatur toxunuşu və yüksək iş intizamı.',
      createdAt: oneHourAgo,
    },
    {
      id: 'rev-2',
      targetUserId: 'u-elvin',
      authorName: 'Natiq Səfərov',
      rating: 5,
      text: '47 metrlik pompa dar küçədə belə rahat quruldu. Peşəkar operator.',
      createdAt: threeHoursAgo,
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'log-1',
      timestampMs: formatTimestampMs(new Date(now.getTime() - 7200000)),
      epochMs: now.getTime() - 7200000,
      ip: '185.43.190.12',
      actorName: 'Elvin Həsənov',
      actorRole: 'Creator',
      action: 'ELAN_YARADILDI',
      details: 'Yeni VIP elan dərc edildi: "47m və 52m Beton Pompası + Sertifikatlı Beton Tökümü" (l-101) · 49 AZN (Simulyator)',
      severity: 'info',
    },
    {
      id: 'log-2',
      timestampMs: formatTimestampMs(new Date(now.getTime() - 3600000)),
      epochMs: now.getTime() - 3600000,
      ip: '91.214.88.45',
      actorName: 'Orxan Quliyev',
      actorRole: 'User',
      action: 'REY_ELAVE_EDILDI',
      details: 'l-101 elanına 5 ulduzlu rəy yazıldı',
      severity: 'info',
    },
  ];

  const settings: PlatformSettings = {
    maintenanceMode: false,
    registrationEnabled: true,
    requireApproval: false,
  };

  const currentHour = now.getHours();
  const hourlyVisits = Array.from({ length: 12 }, (_, idx) => {
    const h = (currentHour - 11 + idx + 24) % 24;
    const label = `${String(h).padStart(2, '0')}:00`;
    const base = [14, 18, 22, 19, 31, 45, 58, 63, 71, 68, 84, 92][idx];
    return { hour: label, visits: base };
  });

  const analytics: AnalyticsSnapshot = {
    hourlyVisits,
    tagSearches: {
      pompa: 142,
      monolit: 118,
      m300: 96,
      baki: 89,
      slifovka: 67,
      mikser: 64,
      bunovre: 53,
    },
    deviceCounts: {
      mobile: 318,
      desktop: 194,
    },
    regionCounts: {
      Bakı: 286,
      Abşeron: 94,
      Sumqayıt: 61,
      Xırdalan: 44,
      Gəncə: 18,
      Qarabağ: 15,
    },
  };

  return {
    users,
    listings,
    comments,
    reviews,
    quotes: createDefaultQuotes(now),
    auditLogs,
    settings,
    analytics,
  };
}

class DBStore {
  private state: DatabaseState;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseState>;
        const seed = createInitialSeed();
        this.state = {
          users: (parsed.users || seed.users).map((u) => ({
            ...u,
            authProvider: u.authProvider || 'email',
          })),
          listings: (parsed.listings || seed.listings).map((l) => {
            const fallbackSeed = seed.listings.find((s) => s.id === l.id);
            const inferredTier =
              l.tier ||
              fallbackSeed?.tier ||
              (l.cardTheme === 'vip' ? 'vip' : l.cardTheme === 'olive' ? 'pro' : 'standard');
            return {
              ...l,
              tier: inferredTier,
              vipConfig: l.vipConfig || fallbackSeed?.vipConfig,
              proConfig: l.proConfig || fallbackSeed?.proConfig,
              paymentSim: l.paymentSim || fallbackSeed?.paymentSim,
            };
          }),
          comments: parsed.comments || seed.comments,
          reviews: parsed.reviews || seed.reviews,
          quotes: Array.isArray(parsed.quotes) ? parsed.quotes : seed.quotes,
          auditLogs: parsed.auditLogs || seed.auditLogs,
          settings: parsed.settings || seed.settings,
          analytics: parsed.analytics || seed.analytics,
        };
        this.save();
      } catch {
        this.state = createInitialSeed();
        this.save();
      }
    } else {
      this.state = createInitialSeed();
      this.save();
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public save(): void {
    try {
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('Failed to persist DB:', err);
    }
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestampMs' | 'epochMs'>): AuditLogEntry {
    const now = new Date();
    const record: AuditLogEntry = {
      id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      timestampMs: formatTimestampMs(now),
      epochMs: now.getTime(),
      ...entry,
    };
    this.state.auditLogs.unshift(record);
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
    return record;
  }
}

export const db = new DBStore();
