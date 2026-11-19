/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calculator, ClipboardList, LayoutGrid, Map as MapIcon, Scale } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { BetonAIDrawer } from './components/BetonAIDrawer.tsx';
import { CompareModal } from './components/CompareModal.tsx';
import { ConcreteCalculatorModal } from './components/ConcreteCalculatorModal.tsx';
import { CreateListingModal } from './components/CreateListingModal.tsx';
import { GoogleMapsPanel } from './components/GoogleMapsPanel.tsx';
import { Header } from './components/Header.tsx';
import { ListingCard } from './components/ListingCard.tsx';
import { ListingDetailModal } from './components/ListingDetailModal.tsx';
import { MaintenanceScreen } from './components/MaintenanceScreen.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { TendersPanel } from './components/TendersPanel.tsx';
import type {
  CommentItem,
  Listing,
  PlatformSettings,
  QuoteRequest,
  User,
} from './types.ts';
import {
  CATEGORIES,
  CONCRETE_GRADES,
  EQUIPMENT_TYPES,
  REGIONS,
} from './utils/helpers.ts';

type SortMode = 'recommended' | 'newest' | 'views' | 'price_asc';

export default function App() {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  const [listings, setListings] = useState<Listing[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    requireApproval: false,
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'tenders'>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Hamısı');
  const [selectedRegion, setSelectedRegion] = useState('Bütün şəhərlər');
  const [selectedGrade, setSelectedGrade] = useState('Hamısı');
  const [selectedEquipment, setSelectedEquipment] = useState('Hamısı');

  // Navigation / Modals
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [tenderPrefill, setTenderPrefill] = useState<{ volumeM3?: number; grade?: string } | null>(
    null
  );
  const [notice, setNotice] = useState('');

  const navigateTo = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPathname(nextPath);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const userToken = localStorage.getItem('beton_user_token') || '';
      const adminToken = localStorage.getItem('beton_admin_token') || '';
      const res = await fetch('/api/bootstrap', {
        headers: {
          ...(userToken ? { 'x-user-token': userToken } : {}),
          ...(adminToken ? { 'x-admin-token': adminToken } : {}),
        },
      });
      const data = await res.json();
      setListings(data.listings || []);
      setComments(data.comments || []);
      setQuotes(data.quotes || []);
      setSettings(
        data.settings || {
          maintenanceMode: false,
          registrationEnabled: true,
          requireApproval: false,
        }
      );
      setCurrentUser(data.currentUser || null);
      setIsAdminSession(Boolean(data.isAdmin));
      if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && data.mapsApiKey) {
        setMapsApiKey(data.mapsApiKey);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  // Visit analytics & heartbeat
  useEffect(() => {
    const device = window.innerWidth < 768 ? 'mobile' : 'desktop';
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'visit', device }),
    }).catch(() => {});

    const hb = setInterval(() => {
      const token = localStorage.getItem('beton_user_token');
      if (token) {
        fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'x-user-token': token },
        }).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(hb);
  }, []);

  function handleTagSearch(tag: string) {
    const formatted = `#${tag.replace(/^#/, '')}`;
    setSearchQuery(formatted);
    setActiveProfileId(null);
    setViewMode('grid');
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tag_search', value: tag }),
    }).catch(() => {});
  }

  async function handleOpenListing(listing: Listing) {
    setSelectedListing(listing);
    try {
      const res = await fetch(`/api/listings/${listing.id}/view`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && typeof data.views === 'number') {
        setListings((prev) =>
          prev.map((l) => (l.id === listing.id ? { ...l, views: data.views } : l))
        );
        setSelectedListing((prev) =>
          prev && prev.id === listing.id ? { ...prev, views: data.views } : prev
        );
      }
    } catch {
      // ignore view count failure
    }
  }

  async function handleLikeListing(id: string) {
    const token = localStorage.getItem('beton_user_token') || '';
    let visitorId = localStorage.getItem('beton_visitor_id');
    if (!visitorId) {
      visitorId = `v-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('beton_visitor_id', visitorId);
    }

    try {
      const res = await fetch(`/api/listings/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-user-token': token } : {}),
        },
        body: JSON.stringify({ visitorId }),
      });
      const data = await res.json();
      if (res.ok && typeof data.likes === 'number') {
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, likes: data.likes } : l))
        );
        setSelectedListing((prev) =>
          prev && prev.id === id ? { ...prev, likes: data.likes } : prev
        );
      }
    } catch {
      // ignore
    }
  }

  function handleToggleCompare(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        setNotice('Maksimum 3 elanı eyni anda müqayisə edə bilərsiniz.');
        setTimeout(() => setNotice(''), 3000);
        return prev;
      }
      return [...prev, id];
    });
  }

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    const filtered = listings.filter((item) => {
      if (selectedCategory !== 'Hamısı' && item.category !== selectedCategory) {
        return false;
      }
      if (
        selectedRegion !== 'Bütün şəhərlər' &&
        !item.regions.includes(selectedRegion)
      ) {
        return false;
      }
      if (
        selectedGrade !== 'Hamısı' &&
        !item.concreteGrades.includes(selectedGrade)
      ) {
        return false;
      }
      if (
        selectedEquipment !== 'Hamısı' &&
        !item.equipmentTypes.includes(selectedEquipment)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        `${item.firstName} ${item.lastName}`.toLowerCase().includes(q) ||
        item.regions.some((r) => r.toLowerCase().includes(q)) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    const tierRank = (t?: string) => (t === 'vip' ? 3 : t === 'pro' ? 2 : 1);

    return [...filtered].sort((a, b) => {
      if (sortMode === 'recommended') {
        const diff = tierRank(b.tier) - tierRank(a.tier);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === 'views') {
        return b.views - a.views;
      }
      if (sortMode === 'price_asc') {
        const pa = a.priceType === 'per_m3' && a.pricePerM3 ? a.pricePerM3 : 999999;
        const pb = b.priceType === 'per_m3' && b.pricePerM3 ? b.pricePerM3 : 999999;
        return pa - pb;
      }
      return 0;
    });
  }, [
    listings,
    searchQuery,
    selectedCategory,
    selectedRegion,
    selectedGrade,
    selectedEquipment,
    sortMode,
  ]);

  const compareListings = useMemo(
    () => listings.filter((l) => compareIds.includes(l.id)),
    [listings, compareIds]
  );

  // ==================== ROUTING: /admin_panel ====================
  if (pathname === '/admin_panel') {
    return (
      <AdminPanel
        onExitToSite={() => {
          navigateTo('/');
          loadBootstrap();
        }}
        onSettingsChanged={(next) => setSettings(next)}
      />
    );
  }

  // ==================== MAINTENANCE MODE ====================
  if (settings.maintenanceMode && !isAdminSession) {
    return <MaintenanceScreen onGoAdmin={() => navigateTo('/admin_panel')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#3A3A3A]">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Compact Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          if (activeProfileId) setActiveProfileId(null);
          if (viewMode === 'tenders') setViewMode('grid');
        }}
        onOpenCreate={() => setShowCreateModal(true)}
        onOpenAuthOrProfile={() => {
          if (currentUser) {
            setActiveProfileId(currentUser.id);
          } else {
            setShowAuthModal(true);
          }
        }}
        onToggleAI={() => setShowAI((prev) => !prev)}
        onNavigateHome={() => {
          setActiveProfileId(null);
          setViewMode('grid');
          navigateTo('/');
        }}
        currentUser={currentUser}
      />

      {/* Feedback Banner */}
      {notice && (
        <div className="border-b border-[#6B7A3F]/30 bg-[#6B7A3F]/10 px-4 py-2.5 text-center text-xs font-medium text-[#3A3A3A]">
          {notice}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {activeProfileId ? (
          <ProfileView
            userId={activeProfileId}
            currentUser={currentUser}
            onBack={() => setActiveProfileId(null)}
            onOpenListing={handleOpenListing}
            onTagClick={handleTagSearch}
            onLikeListing={(e, id) => {
              e.stopPropagation();
              handleLikeListing(id);
            }}
            onProfileUpdated={(u) => setCurrentUser(u)}
            onLogout={() => {
              localStorage.removeItem('beton_user_token');
              setCurrentUser(null);
              setActiveProfileId(null);
            }}
          />
        ) : (
          <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 space-y-6">
            {/* Compact Editorial Hero Intro */}
            <section className="flex flex-col justify-between gap-4 border-b border-[#E7E2DA] pb-6 md:flex-row md:items-end">
              <div className="max-w-2xl space-y-1.5">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#3A3A3A] text-balance sm:text-3xl">
                  Beton, qəlib, armatur və texnika ustalarının peşəkar şəbəkəsi
                </h1>
                <p className="text-sm leading-relaxed text-[#3A3A3A]/75">
                  Təsdiqlənmiş monolit briqadaları, beton pompaları, mikser xidmətləri və sənaye döşəmə ustaları ilə birbaşa əlaqə.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#3A3A3A]/70 tabular-nums shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#6B7A3F]/50 bg-white px-3 py-2 text-xs font-semibold text-[#6B7A3F] hover:bg-[#6B7A3F]/8 transition-colors cursor-pointer"
                >
                  <Calculator size={14} />
                  <span>Beton Kalkulyatoru</span>
                </button>
                <span className="hidden sm:inline">{listings.length} aktiv elan</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span className="hidden sm:inline">{quotes.length} aktiv tender</span>
              </div>
            </section>

            {/* Clean Category & Industry Filters */}
            <section className="space-y-3">
              {/* Horizontal Scrollable Categories */}
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        if (viewMode === 'tenders') setViewMode('grid');
                      }}
                      className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                          : 'border border-[#E7E2DA] bg-white/75 text-[#3A3A3A] hover:border-[#6B7A3F]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Industry-Specific Dropdown Filters + Sort + View Switch */}
              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRegion(val);
                    if (val !== 'Bütün şəhərlər') {
                      fetch('/api/analytics/event', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'region', value: val }),
                      }).catch(() => {});
                    }
                  }}
                  aria-label="Şəhər və ya region"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                >
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  aria-label="Beton markası"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                >
                  <option value="Hamısı">Beton markası: Hamısı</option>
                  {CONCRETE_GRADES.map((g) => (
                    <option key={g} value={g}>
                      Marka: {g}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  aria-label="Texnika növü"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                >
                  <option value="Hamısı">Texnika: Hamısı</option>
                  {EQUIPMENT_TYPES.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  aria-label="Sıralama"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
                >
                  <option value="recommended">Sırala: VIP / PRO öncə</option>
                  <option value="newest">Ən yeni</option>
                  <option value="views">Ən çox baxılan</option>
                  <option value="price_asc">Qiymət: Ucuzdan bahaya</option>
                </select>

                {(searchQuery ||
                  selectedCategory !== 'Hamısı' ||
                  selectedRegion !== 'Bütün şəhərlər' ||
                  selectedGrade !== 'Hamısı' ||
                  selectedEquipment !== 'Hamısı') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Hamısı');
                      setSelectedRegion('Bütün şəhərlər');
                      setSelectedGrade('Hamısı');
                      setSelectedEquipment('Hamısı');
                    }}
                    className="text-xs font-medium text-[#6B7A3F] hover:underline cursor-pointer px-2"
                  >
                    Filtrləri sıfırla
                  </button>
                )}

                <div className="ml-auto flex items-center gap-1 rounded-lg border border-[#E7E2DA] bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                        : 'text-[#3A3A3A]/75 hover:text-[#3A3A3A]'
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span>Siyahı</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                        : 'text-[#3A3A3A]/75 hover:text-[#3A3A3A]'
                    }`}
                  >
                    <MapIcon size={13} />
                    <span>Xəritə</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('tenders')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'tenders'
                        ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                        : 'text-[#3A3A3A]/75 hover:text-[#3A3A3A]'
                    }`}
                  >
                    <ClipboardList size={13} />
                    <span>Tenderlər ({quotes.length})</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Main View: Listings Grid | Google Maps | Client Tenders */}
            {viewMode === 'tenders' ? (
              <TendersPanel
                quotes={quotes}
                prefill={tenderPrefill}
                onQuoteCreated={(q) => {
                  setQuotes((prev) => [q, ...prev]);
                  setTenderPrefill(null);
                  setNotice('Sifariş sorğunuz tender lövhəsinə əlavə edildi.');
                  setTimeout(() => setNotice(''), 4000);
                }}
              />
            ) : viewMode === 'map' ? (
              <GoogleMapsPanel
                apiKey={mapsApiKey}
                listings={filteredListings}
                onOpenListing={handleOpenListing}
              />
            ) : loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-96 animate-pulse rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/40"
                  />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="rounded-2xl border border-[#E7E2DA] bg-white/60 p-12 text-center space-y-3">
                <p className="font-display text-base font-semibold text-[#3A3A3A]">
                  Axtarış kriteriyalarına uyğun elan tapılmadı
                </p>
                <p className="text-sm text-[#3A3A3A]/65">
                  Başqa açar söz yoxlayın və ya Beton AI-dan uyğun usta tapmasını istəyin.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Hamısı');
                      setSelectedRegion('Bütün şəhərlər');
                      setSelectedGrade('Hamısı');
                      setSelectedEquipment('Hamısı');
                    }}
                    className="rounded-lg border border-[#E7E2DA] bg-white px-4 py-2 text-xs font-semibold text-[#3A3A3A] cursor-pointer"
                  >
                    Hamısını göstər
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAI(true)}
                    className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
                  >
                    Beton AI-dan soruş
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isCompared={compareIds.includes(listing.id)}
                    onOpenDetail={handleOpenListing}
                    onTagClick={handleTagSearch}
                    onLike={(e, id) => {
                      e.stopPropagation();
                      handleLikeListing(id);
                    }}
                    onOpenProfile={(e, uid) => {
                      e.stopPropagation();
                      setActiveProfileId(uid);
                    }}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Compare Pill when user selects listings to compare */}
      {compareListings.length > 0 && !activeProfileId && (
        <div className="fixed bottom-5 left-5 z-40">
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6B7A3F] bg-[#3A3A3A] px-4 py-2.5 text-xs font-semibold text-[#FAF7F2] shadow-lg hover:bg-[#6B7A3F] transition-colors cursor-pointer"
          >
            <Scale size={15} />
            <span>Müqayisə et ({compareListings.length}/3)</span>
          </button>
        </div>
      )}

      {/* Clean Minimal Footer */}
      <footer className="mt-12 border-t border-[#E7E2DA] bg-[#FAF7F2] py-6">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 text-xs text-[#3A3A3A]/65 sm:px-6">
          <span>© {new Date().getFullYear()} Beton İşləri — Peşəkar Tikinti Şəbəkəsi</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="hover:text-[#6B7A3F] transition-colors cursor-pointer"
            >
              Beton Kalkulyatoru
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveProfileId(null);
                setViewMode('tenders');
              }}
              className="hover:text-[#6B7A3F] transition-colors cursor-pointer"
            >
              Sifariş Tenderləri
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/admin_panel')}
              className="hover:text-[#6B7A3F] transition-colors cursor-pointer"
            >
              İdarəetmə (/admin_panel)
            </button>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          comments={comments}
          currentUser={currentUser}
          onClose={() => setSelectedListing(null)}
          onLike={handleLikeListing}
          onOpenProfile={(uid) => setActiveProfileId(uid)}
          onTagClick={handleTagSearch}
          onCommentAdded={(c) => setComments((prev) => [c, ...prev])}
        />
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <CreateListingModal
          currentUser={currentUser}
          requireApproval={settings.requireApproval}
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setShowCreateModal(false);
            if (created.status === 'active') {
              setListings((prev) => [created, ...prev]);
              setNotice(
                created.tier === 'vip'
                  ? 'VIP elanınız (simulyator) uğurla dərc olundu və ön sıraya yerləşdirildi.'
                  : created.tier === 'pro'
                  ? 'PRO elanınız (simulyator) uğurla dərc olundu.'
                  : 'Elanınız uğurla dərc olundu.'
              );
            } else {
              setNotice(
                'Elanınız qəbul edildi. Administrator təsdiqindən sonra yayımlanacaq.'
              );
            }
            setTimeout(() => setNotice(''), 5000);
          }}
        />
      )}

      {/* Concrete & Mixer Calculator Modal */}
      {showCalculator && (
        <ConcreteCalculatorModal
          listings={listings}
          onClose={() => setShowCalculator(false)}
          onFilterMatching={(grade) => {
            setSelectedGrade(grade);
            setViewMode('grid');
            setShowCalculator(false);
          }}
          onCreateTenderFromCalc={(prefill) => {
            setTenderPrefill(prefill);
            setShowCalculator(false);
            setViewMode('tenders');
          }}
        />
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <CompareModal
          listings={compareListings}
          onClose={() => setShowCompareModal(false)}
          onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
          onOpenDetail={handleOpenListing}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          registrationEnabled={settings.registrationEnabled}
          onClose={() => setShowAuthModal(false)}
          onAuthenticated={(user, token) => {
            localStorage.setItem('beton_user_token', token);
            setCurrentUser(user);
            setShowAuthModal(false);
            setActiveProfileId(user.id);
          }}
        />
      )}

      {/* Floating Beton AI Assistant */}
      <BetonAIDrawer
        isOpen={showAI}
        onToggle={() => setShowAI((v) => !v)}
        onOpenListing={handleOpenListing}
      />
    </div>
  );
}
