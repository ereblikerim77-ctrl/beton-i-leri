import {
  Activity,
  ArrowLeft,
  Ban,
  BarChart3,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  LayoutDashboard,
  Lock,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type {
  AnalyticsSnapshot,
  AuditLogEntry,
  CardTheme,
  CommentItem,
  Listing,
  ListingTier,
  PlatformSettings,
  User,
  UserRole,
} from '../types.ts';
import { CATEGORIES, formatRelativeDateAz } from '../utils/helpers.ts';

type AdminTab =
  | 'dashboard'
  | 'listings'
  | 'users'
  | 'comments'
  | 'analytics'
  | 'audit'
  | 'settings';

interface AdminOverviewData {
  stats: {
    totalListings: number;
    totalUsers: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    vipCount?: number;
    proCount?: number;
    simRevenueAzn?: number;
  };
  recent24hSummary: {
    eventsCount: number;
    newListings: number;
    newComments: number;
    failedAdminAttempts: number;
  };
  listings: Listing[];
  users: User[];
  comments: CommentItem[];
  auditLogs: AuditLogEntry[];
  settings: PlatformSettings;
  analytics: AnalyticsSnapshot;
}

interface AdminPanelProps {
  onExitToSite: () => void;
  onSettingsChanged: (settings: PlatformSettings) => void;
}

export function AdminPanel({
  onExitToSite,
  onSettingsChanged,
}: AdminPanelProps) {
  const [adminToken, setAdminToken] = useState<string>(
    () => localStorage.getItem('beton_admin_token') || ''
  );
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Filters
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatusFilter, setListingStatusFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Modals / Inline editors
  const [previewListing, setPreviewListing] = useState<Listing | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<CommentItem | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const fetchOverview = useCallback(async () => {
    if (!adminToken) return;
    setLoadingData(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { 'x-admin-token': adminToken },
      });
      if (res.status === 401) {
        localStorage.removeItem('beton_admin_token');
        setAdminToken('');
        setData(null);
        return;
      }
      const json = (await res.json()) as AdminOverviewData;
      setData(json);
    } finally {
      setLoadingData(false);
    }
  }, [adminToken]);

  useEffect(() => {
    if (adminToken) {
      fetchOverview();
    }
  }, [adminToken, fetchOverview]);

  // Real-time auto-refresh when viewing Analytics or Dashboard
  useEffect(() => {
    if (!adminToken || (activeTab !== 'analytics' && activeTab !== 'dashboard')) {
      return;
    }
    const interval = setInterval(() => {
      fetchOverview();
    }, 5000);
    return () => clearInterval(interval);
  }, [adminToken, activeTab, fetchOverview]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAuthError(json.error || 'Giriş rədd edildi.');
      } else {
        localStorage.setItem('beton_admin_token', json.token);
        setAdminToken(json.token);
        setPassword('');
      }
    } catch {
      setAuthError('Serverlə əlaqə xətası.');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleAdminLogout() {
    localStorage.removeItem('beton_admin_token');
    setAdminToken('');
    setData(null);
  }

  async function updateListing(id: string, patch: Partial<Listing>, msg: string) {
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast(msg);
      fetchOverview();
    }
  }

  async function deleteListing(id: string) {
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken },
    });
    if (res.ok) {
      showToast('Elan həmişəlik silindi.');
      fetchOverview();
    }
  }

  async function updateUser(id: string, patch: Partial<User>, msg: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast(msg);
      fetchOverview();
    }
  }

  async function sendAdminReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTarget || !replyText.trim()) return;
    const res = await fetch(`/api/admin/comments/${replyTarget.id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ text: replyText.trim() }),
    });
    if (res.ok) {
      setReplyTarget(null);
      setReplyText('');
      showToast('Admin cavabı dərc edildi.');
      fetchOverview();
    }
  }

  async function saveCommentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingComment || !editingCommentText.trim()) return;
    const res = await fetch(`/api/admin/comments/${editingComment.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ text: editingCommentText.trim() }),
    });
    if (res.ok) {
      setEditingComment(null);
      setEditingCommentText('');
      showToast('Rəy redaktə edildi.');
      fetchOverview();
    }
  }

  async function deleteComment(id: string) {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken },
    });
    if (res.ok) {
      showToast('Rəy silindi.');
      fetchOverview();
    }
  }

  async function updateSettings(patch: Partial<PlatformSettings>) {
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (res.ok && json.settings) {
      onSettingsChanged(json.settings);
      showToast('Sistem tənzimləməsi yeniləndi.');
      fetchOverview();
    }
  }

  // ==================== PASSWORD GATE ====================
  if (!adminToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6B7A3F] text-[#FAF7F2]">
                <Lock size={18} />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold text-[#3A3A3A]">
                  Admin Panel Girişi
                </h1>
                <p className="text-xs text-[#3A3A3A]/65">
                  Beton İşləri Təhlükəsizlik Sistemi
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onExitToSite}
              className="text-xs font-medium text-[#3A3A3A]/65 hover:text-[#6B7A3F] cursor-pointer"
            >
              Sayta qayıt
            </button>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#3A3A3A]/80">
                Administrator Şifrəsi
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrəni daxil edin..."
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3.5 py-2.5 font-mono text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
              />
            </div>

            {authError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-lg bg-[#6B7A3F] py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {authLoading ? 'Yoxlanılır...' : 'Daxil ol'}
            </button>
          </form>

          <p className="text-[11px] leading-relaxed text-[#3A3A3A]/55">
            Qeyd: Bütün uğurlu və səhv giriş cəhdləri IP ünvanı və millisaniyə dəqiqliyi ilə Audit Log jurnalında qeydə alınır.
          </p>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Ana Bölmə', icon: <LayoutDashboard size={16} /> },
    { id: 'listings', label: 'Elanlar', icon: <FileText size={16} /> },
    { id: 'users', label: 'İnsanlar', icon: <Users size={16} /> },
    { id: 'comments', label: 'Rəylər', icon: <MessageSquare size={16} /> },
    { id: 'analytics', label: 'Analitika', icon: <BarChart3 size={16} /> },
    { id: 'audit', label: 'Audit Logs', icon: <Activity size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  const filteredListings = (data?.listings || []).filter((l) => {
    const matchesStatus =
      listingStatusFilter === 'all' || l.status === listingStatusFilter;
    const q = listingSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.companyName.toLowerCase().includes(q) ||
      l.phone.includes(q);
    return matchesStatus && matchesQuery;
  });

  const filteredLogs = (data?.auditLogs || []).filter((log) => {
    const matchesSev = auditFilter === 'all' || log.severity === auditFilter;
    const q = auditSearch.trim().toLowerCase();
    const matchesQ =
      !q ||
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.ip.includes(q);
    return matchesSev && matchesQ;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#3A3A3A]">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E7E2DA] bg-[#FAF7F2]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExitToSite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] hover:border-[#6B7A3F] cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} />
              <span>Platformaya qayıt</span>
            </button>
            <div className="truncate">
              <span className="font-display text-sm font-bold text-[#3A3A3A]">
                Beton İşləri / Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast && (
              <span className="hidden sm:inline rounded-lg bg-[#6B7A3F] px-3 py-1 text-xs font-medium text-[#FAF7F2]">
                {toast}
              </span>
            )}
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs font-medium text-[#3A3A3A] hover:border-[#6B7A3F] cursor-pointer"
            >
              <RefreshCw size={13} className={loadingData ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Yenilə</span>
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="rounded-lg bg-[#3A3A3A] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2] hover:bg-red-800 cursor-pointer"
            >
              Çıxış
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row sm:px-6">
        {/* Sidebar Navigation (7 Sections) */}
        <aside className="w-full shrink-0 lg:w-60">
          <nav className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                      : 'border border-transparent text-[#3A3A3A]/80 hover:border-[#E7E2DA] hover:bg-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Viewport */}
        <main className="min-w-0 flex-1 space-y-6">
          {!data ? (
            <div className="rounded-xl border border-[#E7E2DA] bg-white p-10 text-center text-sm text-[#3A3A3A]/65">
              Məlumatlar yüklənir...
            </div>
          ) : (
            <>
              {/* 1. ANA BÖLMƏ (DASHBOARD) */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                    Ana Bölmə — Ümumi İcmal
                  </h2>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      { label: 'Total Elanlar', value: data.stats.totalListings },
                      { label: 'VIP / PRO Elan', value: `${data.stats.vipCount || 0} / ${data.stats.proCount || 0}` },
                      { label: 'Sim. Gəlir (AZN)', value: `${data.stats.simRevenueAzn || 0} ₼` },
                      { label: 'Total İstifadəçilər', value: data.stats.totalUsers },
                      { label: 'Total Baxışlar', value: data.stats.totalViews },
                      { label: 'Total Rəylər', value: data.stats.totalComments },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-[#E7E2DA] bg-white p-4"
                      >
                        <div className="text-xs text-[#3A3A3A]/65">{stat.label}</div>
                        <div className="mt-1.5 font-mono text-2xl font-bold text-[#3A3A3A] tabular-nums">
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Son 24 Saatlıq Aktivlik Xülasəsi */}
                  <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-[#3A3A3A]">
                        Son 24 saatın aktivlik xülasəsi
                      </h3>
                      <span className="font-mono text-xs text-[#6B7A3F] tabular-nums">
                        {data.recent24hSummary.eventsCount} hadisə
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] p-3.5">
                        <div className="text-xs text-[#3A3A3A]/65">Yeni elanlar (24s)</div>
                        <div className="mt-1 font-mono text-xl font-bold text-[#3A3A3A] tabular-nums">
                          {data.recent24hSummary.newListings}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] p-3.5">
                        <div className="text-xs text-[#3A3A3A]/65">Yeni rəylər (24s)</div>
                        <div className="mt-1 font-mono text-xl font-bold text-[#3A3A3A] tabular-nums">
                          {data.recent24hSummary.newComments}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] p-3.5">
                        <div className="text-xs text-[#3A3A3A]/65">
                          Səhv admin giriş cəhdləri
                        </div>
                        <div className="mt-1 font-mono text-xl font-bold text-red-700 tabular-nums">
                          {data.recent24hSummary.failedAdminAttempts}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#E7E2DA] pt-4 space-y-2">
                      <div className="text-xs font-semibold text-[#3A3A3A]/75">
                        Son əməliyyatlar
                      </div>
                      {data.auditLogs.slice(0, 6).map((log) => (
                        <div
                          key={log.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5 border-b border-[#E7E2DA]/60 last:border-none"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-[#3A3A3A]">
                              {log.actorName}
                            </span>{' '}
                            <span className="text-[#3A3A3A]/75">— {log.details}</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#3A3A3A]/55 tabular-nums">
                            {log.timestampMs}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ELANLAR (LISTINGS MANAGEMENT) */}
              {activeTab === 'listings' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                      Elanların İdarə Edilməsi ({filteredListings.length})
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A3A]/50"
                        />
                        <input
                          type="search"
                          value={listingSearch}
                          onChange={(e) => setListingSearch(e.target.value)}
                          placeholder="Başlıq, şirkət, nömrə..."
                          className="rounded-lg border border-[#E7E2DA] bg-white py-1.5 pl-8 pr-3 text-xs focus:border-[#6B7A3F] focus:outline-none"
                        />
                      </div>
                      <select
                        value={listingStatusFilter}
                        onChange={(e) => setListingStatusFilter(e.target.value)}
                        className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs"
                      >
                        <option value="all">Bütün statuslar</option>
                        <option value="active">Aktiv</option>
                        <option value="pending">Gözləmədə</option>
                        <option value="blocked">Bloklanmış</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#E7E2DA] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E7E2DA] bg-[#E7E2DA]/35 text-[#3A3A3A]/75">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Elan / Şirkət</th>
                          <th className="px-4 py-3 font-semibold">Paket</th>
                          <th className="px-4 py-3 font-semibold">Kateqoriya</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Baxış / Bəyənmə
                          </th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Əməliyyatlar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E2DA]">
                        {filteredListings.map((l) => (
                          <tr key={l.id} className="hover:bg-[#FAF7F2]">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#3A3A3A] line-clamp-1">
                                {l.title}
                              </div>
                              <div className="text-[11px] text-[#3A3A3A]/60">
                                {l.companyName} ·{' '}
                                <span className="font-mono">{l.phone}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={l.tier || 'standard'}
                                onChange={(e) =>
                                  updateListing(
                                    l.id,
                                    { tier: e.target.value as ListingTier },
                                    `Elan paketi ${e.target.value.toUpperCase()} olaraq yeniləndi.`
                                  )
                                }
                                className="rounded border border-[#E7E2DA] bg-[#FAF7F2] px-2 py-1 text-[11px] font-semibold text-[#3A3A3A]"
                              >
                                <option value="standard">Standart</option>
                                <option value="pro">PRO</option>
                                <option value="vip">VIP</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {l.category}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-semibold">
                              {l.status === 'active' && (
                                <span className="text-[#6B7A3F]">Aktiv</span>
                              )}
                              {l.status === 'pending' && (
                                <span className="text-amber-700">Gözləmədə</span>
                              )}
                              {l.status === 'blocked' && (
                                <span className="text-red-700">Bloklanıb</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                              {l.views} / {l.likes}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewListing(l)}
                                  title="Önizləmə"
                                  className="rounded border border-[#E7E2DA] p-1.5 hover:border-[#6B7A3F] cursor-pointer"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingListing({ ...l })}
                                  title="Redaktə et"
                                  className="rounded border border-[#E7E2DA] p-1.5 hover:border-[#6B7A3F] cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                                {l.status !== 'active' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateListing(
                                        l.id,
                                        { status: 'active' },
                                        'Elan təsdiqləndi və aktivləşdirildi.'
                                      )
                                    }
                                    title="Aktivləşdir / Təsdiqlə"
                                    className="rounded border border-[#6B7A3F] p-1.5 text-[#6B7A3F] hover:bg-[#6B7A3F]/10 cursor-pointer"
                                  >
                                    <CheckCircle2 size={13} />
                                  </button>
                                )}
                                {l.status !== 'blocked' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateListing(
                                        l.id,
                                        { status: 'blocked' },
                                        'Elan bloklandı (saytdan gizlədildi).'
                                      )
                                    }
                                    title="Blokla / Gizlət"
                                    className="rounded border border-[#E7E2DA] p-1.5 text-amber-700 hover:border-amber-600 cursor-pointer"
                                  >
                                    <Ban size={13} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => deleteListing(l.id)}
                                  title="Həmişəlik Sil"
                                  className="rounded border border-[#E7E2DA] p-1.5 text-red-700 hover:border-red-600 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. İNSANLAR (USER & ROLE MANAGEMENT) */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                    İstifadəçilər və Rollar ({data.users.length})
                  </h2>

                  <div className="overflow-x-auto rounded-xl border border-[#E7E2DA] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E7E2DA] bg-[#E7E2DA]/35 text-[#3A3A3A]/75">
                        <tr>
                          <th className="px-4 py-3 font-semibold">İstifadəçi</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Son Giriş</th>
                          <th className="px-4 py-3 font-semibold">Rol</th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Əməliyyatlar
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E2DA]">
                        {data.users.map((u) => (
                          <tr key={u.id} className="hover:bg-[#FAF7F2]">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#3A3A3A]">
                                {u.firstName} {u.lastName}{' '}
                                {u.banned && (
                                  <span className="text-red-700">(Bloklanıb)</span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#3A3A3A]/60">
                                {u.companyName} · {u.email}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    u.isOnline ? 'bg-green-600' : 'bg-neutral-400'
                                  }`}
                                />
                                {u.isOnline ? 'Onlayn' : 'Oflayn'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#3A3A3A]/70 whitespace-nowrap tabular-nums">
                              {new Date(u.lastLoginAt).toLocaleString('az-AZ')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  updateUser(
                                    u.id,
                                    { role: e.target.value as UserRole },
                                    `İstifadəçi rolu ${e.target.value} olaraq dəyişdirildi.`
                                  )
                                }
                                className="rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-2.5 py-1 text-xs font-semibold text-[#3A3A3A]"
                              >
                                <option value="User">User</option>
                                <option value="Creator">Creator</option>
                                <option value="Moderator">Moderator</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateUser(
                                      u.id,
                                      { verified: !u.verified },
                                      u.verified
                                        ? 'Təsdiq nişanı götürüldü.'
                                        : 'İstifadəçi təsdiqləndi (Verified).'
                                    )
                                  }
                                  title="Verified statusunu dəyiş"
                                  className={`rounded border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                                    u.verified
                                      ? 'border-[#6B7A3F] text-[#6B7A3F]'
                                      : 'border-[#E7E2DA] text-[#3A3A3A]/70'
                                  }`}
                                >
                                  {u.verified ? 'Verified ✓' : 'Təsdiqlə'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUser({ ...u })}
                                  title="Profili redaktə et"
                                  className="rounded border border-[#E7E2DA] p-1.5 hover:border-[#6B7A3F] cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateUser(
                                      u.id,
                                      { banned: !u.banned },
                                      u.banned
                                        ? 'İstifadəçi bloku açıldı.'
                                        : 'İstifadəçi hesabı bloklandı (Ban).'
                                    )
                                  }
                                  title={u.banned ? 'Bloku aç' : 'Hesabı blokla'}
                                  className={`rounded border p-1.5 cursor-pointer ${
                                    u.banned
                                      ? 'border-green-600 text-green-700'
                                      : 'border-[#E7E2DA] text-red-700 hover:border-red-600'
                                  }`}
                                >
                                  <Ban size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. RƏYLƏR (COMMENTS MANAGEMENT) */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                    Rəylərin Mərkəzləşdirilmiş İdarəetməsi ({data.comments.length})
                  </h2>

                  <div className="space-y-3">
                    {data.comments.map((c) => {
                      const relatedListing = data.listings.find(
                        (l) => l.id === c.listingId
                      );
                      return (
                        <div
                          key={c.id}
                          className="rounded-xl border border-[#E7E2DA] bg-white p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-bold text-[#3A3A3A]">
                                {c.authorName}
                              </span>{' '}
                              <span className="text-[#3A3A3A]/60">
                                · {c.authorRole} · Elan:{' '}
                                <span className="font-medium text-[#6B7A3F]">
                                  {relatedListing?.title || c.listingId}
                                </span>
                              </span>
                            </div>
                            <span className="text-[11px] text-[#3A3A3A]/55">
                              {formatRelativeDateAz(c.createdAt)}
                            </span>
                          </div>

                          <p className="text-sm text-[#3A3A3A]">{c.text}</p>

                          {c.adminReply && (
                            <div className="rounded-lg border border-[#6B7A3F]/30 bg-[#6B7A3F]/8 p-3 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-[#6B7A3F]">
                                <ShieldCheck size={13} /> Admin Cavabı
                              </div>
                              <p className="mt-1 text-sm text-[#3A3A3A]">
                                {c.adminReply.text}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTarget(c);
                                setReplyText(c.adminReply?.text || '');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#6B7A3F] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] cursor-pointer"
                            >
                              <Reply size={13} />
                              <span>
                                {c.adminReply ? 'Cavabı yenilə' : 'Admin kimi cavab ver'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingComment(c);
                                setEditingCommentText(c.text);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2DA] px-3 py-1.5 text-xs font-medium text-[#3A3A3A] cursor-pointer"
                            >
                              <Edit3 size={13} />
                              <span>Redaktə et</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2DA] px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-600 cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Sil</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. ANALİTİKA (REAL-TIME ANALYTICS) */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                      Real-Time Analitika (Canlı yenilənir)
                    </h2>
                    <span className="font-mono text-xs text-[#6B7A3F]">
                      5 saniyəlik canlı sinxronizasiya
                    </span>
                  </div>

                  {/* Hourly Visitor Flow Bar Chart */}
                  <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-4">
                    <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                      Saatlıq Ziyarətçi Axını
                    </h3>
                    <div className="flex h-44 items-end gap-2 pt-4">
                      {(() => {
                        const maxV = Math.max(
                          ...data.analytics.hourlyVisits.map((v) => v.visits),
                          1
                        );
                        return data.analytics.hourlyVisits.map((item) => {
                          const hPct = Math.max(
                            8,
                            Math.round((item.visits / maxV) * 100)
                          );
                          return (
                            <div
                              key={item.hour}
                              className="flex flex-1 flex-col items-center gap-1.5"
                            >
                              <span className="font-mono text-[10px] text-[#3A3A3A]/70 tabular-nums">
                                {item.visits}
                              </span>
                              <div className="flex h-28 w-full items-end rounded-md bg-[#E7E2DA]/35 p-0.5">
                                <div
                                  style={{ height: `${hPct}%` }}
                                  className="w-full rounded-sm bg-[#6B7A3F] transition-all duration-300"
                                />
                              </div>
                              <span className="font-mono text-[10px] text-[#3A3A3A]/60 tabular-nums">
                                {item.hour}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Most Searched Tags */}
                    <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-3">
                      <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                        Ən Çox Axtarılan Taqlar
                      </h3>
                      <div className="space-y-2.5">
                        {Object.entries(data.analytics.tagSearches)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 7)
                          .map(([tag, count], _idx, arr) => {
                            const maxC = arr[0]?.[1] || 1;
                            const pct = Math.round((count / maxC) * 100);
                            return (
                              <div key={tag} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-[#3A3A3A]">
                                    #{tag}
                                  </span>
                                  <span className="font-mono text-[#3A3A3A]/70 tabular-nums">
                                    {count}
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E7E2DA]">
                                  <div
                                    style={{ width: `${pct}%` }}
                                    className="h-full bg-[#6B7A3F]"
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Device Breakdown & Regional Activity */}
                    <div className="space-y-6">
                      <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-3">
                        <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                          Cihaz Bölgüsü (Mobil / Kompüter)
                        </h3>
                        {(() => {
                          const total =
                            data.analytics.deviceCounts.mobile +
                              data.analytics.deviceCounts.desktop || 1;
                          const mobPct = Math.round(
                            (data.analytics.deviceCounts.mobile / total) * 100
                          );
                          const deskPct = 100 - mobPct;
                          return (
                            <div className="space-y-2">
                              <div className="flex h-4 w-full overflow-hidden rounded-lg bg-[#E7E2DA]">
                                <div
                                  style={{ width: `${mobPct}%` }}
                                  className="bg-[#6B7A3F]"
                                />
                                <div
                                  style={{ width: `${deskPct}%` }}
                                  className="bg-[#3A3A3A]"
                                />
                              </div>
                              <div className="flex justify-between text-xs tabular-nums">
                                <span className="font-medium text-[#6B7A3F]">
                                  Mobil: {data.analytics.deviceCounts.mobile} ({mobPct}%)
                                </span>
                                <span className="font-medium text-[#3A3A3A]">
                                  Kompüter: {data.analytics.deviceCounts.desktop} (
                                  {deskPct}%)
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-3">
                        <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                          Regional Aktivlik Bölgüsü
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {Object.entries(data.analytics.regionCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([reg, count]) => (
                              <div
                                key={reg}
                                className="rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2"
                              >
                                <div className="text-xs text-[#3A3A3A]/70">{reg}</div>
                                <div className="font-mono text-sm font-bold text-[#3A3A3A] tabular-nums">
                                  {count}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Viewed Listings */}
                  <div className="rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-3">
                    <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                      Ən Çox Baxılan Elanlar
                    </h3>
                    <div className="divide-y divide-[#E7E2DA]">
                      {[...data.listings]
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 5)
                        .map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between py-2.5 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-[#3A3A3A]">
                                {l.title}
                              </div>
                              <div className="text-[#3A3A3A]/60">
                                {l.companyName} · {l.category}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-[#6B7A3F] tabular-nums">
                              {l.views} baxış
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. AUDIT LOGS (MİLLİSANİYƏ DƏQİQLİKLİ JURNAL) */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                        Audit Logs — Dəyişdirilməz Təhlükəsizlik Jurnalı
                      </h2>
                      <p className="text-xs text-[#3A3A3A]/65">
                        Bütün sistem hərəkətləri il, ay, gün, saat, dəqiqə, saniyə və salisə (HH:MM:SS.ms) dəqiqliyi ilə qeydə alınır.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="search"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        placeholder="IP, şəxs, əməliyyat axtar..."
                        className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs focus:border-[#6B7A3F] focus:outline-none"
                      />
                      <select
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-1.5 text-xs"
                      >
                        <option value="all">Hamısı</option>
                        <option value="info">Məlumat</option>
                        <option value="warning">Xəbərdarlıq</option>
                        <option value="critical">Kritik</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-[#E7E2DA] bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#E7E2DA] bg-[#E7E2DA]/35 text-[#3A3A3A]/75">
                        <tr>
                          <th className="px-4 py-3 font-semibold">
                            Tarix və Salisə (HH:MM:SS.ms)
                          </th>
                          <th className="px-4 py-3 font-semibold">IP Ünvanı</th>
                          <th className="px-4 py-3 font-semibold">İcraçı / Rol</th>
                          <th className="px-4 py-3 font-semibold">Əməliyyat</th>
                          <th className="px-4 py-3 font-semibold">Detallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E2DA]">
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            className={
                              log.severity === 'critical'
                                ? 'bg-red-50/70'
                                : log.severity === 'warning'
                                ? 'bg-amber-50/50'
                                : ''
                            }
                          >
                            <td className="px-4 py-3 font-mono text-[11px] font-semibold text-[#3A3A3A] whitespace-nowrap tabular-nums">
                              {log.timestampMs}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#3A3A3A]/75 whitespace-nowrap tabular-nums">
                              {log.ip}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-semibold text-[#3A3A3A]">
                                {log.actorName}
                              </span>
                              <span className="text-[#3A3A3A]/60">
                                {' '}
                                · {log.actorRole}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] font-bold whitespace-nowrap">
                              <span
                                className={
                                  log.severity === 'critical'
                                    ? 'text-red-700'
                                    : log.severity === 'warning'
                                    ? 'text-amber-700'
                                    : 'text-[#6B7A3F]'
                                }
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#3A3A3A]/85">
                              {log.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. SETTINGS (SİSTEM TƏNZİMLƏMƏLƏRİ) */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-[#3A3A3A]">
                    Sistem Tənzimləmələri
                  </h2>

                  <div className="divide-y divide-[#E7E2DA] rounded-xl border border-[#E7E2DA] bg-white">
                    {/* Maintenance Mode */}
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                          Maintenance Mode (Texniki Baxım Rejimi)
                        </h3>
                        <p className="mt-1 text-xs text-[#3A3A3A]/70">
                          Aktivləşdirildikdə sayt adi istifadəçilər üçün bağlanır və ekranda &ldquo;Saytda texniki yenilənmə işləri aparılır, tezliklə xidmətinizdəyik&rdquo; bildirişi görünür. Yalnız Admin daxil ola bilər.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={data.settings.maintenanceMode}
                        onClick={() =>
                          updateSettings({
                            maintenanceMode: !data.settings.maintenanceMode,
                          })
                        }
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                          data.settings.maintenanceMode
                            ? 'bg-[#6B7A3F]'
                            : 'bg-[#E7E2DA]'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            data.settings.maintenanceMode
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Registration Toggle */}
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                          Yeni İstifadəçi Qeydiyyatları
                        </h3>
                        <p className="mt-1 text-xs text-[#3A3A3A]/70">
                          Yeni ustaların və sifarişçilərin platformada qeydiyyatdan keçməsinə icazə verin və ya müvəqqəti bağlayın.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={data.settings.registrationEnabled}
                        onClick={() =>
                          updateSettings({
                            registrationEnabled: !data.settings.registrationEnabled,
                          })
                        }
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                          data.settings.registrationEnabled
                            ? 'bg-[#6B7A3F]'
                            : 'bg-[#E7E2DA]'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            data.settings.registrationEnabled
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Listing Approval Mechanism */}
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                          Elan Təsdiq Mexanizmi (Moderasiya)
                        </h3>
                        <p className="mt-1 text-xs text-[#3A3A3A]/70">
                          Açıq olduqda yeni elanlar Admin/Moderator təsdiqindən sonra dərc olunur. Bağlı olduqda elanlar birbaşa yayımlanır.
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={data.settings.requireApproval}
                        onClick={() =>
                          updateSettings({
                            requireApproval: !data.settings.requireApproval,
                          })
                        }
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                          data.settings.requireApproval
                            ? 'bg-[#6B7A3F]'
                            : 'bg-[#E7E2DA]'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            data.settings.requireApproval
                              ? 'translate-x-6'
                              : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Preview Listing Modal */}
      {previewListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#3A3A3A]">
                Elan Önizləməsi
              </h3>
              <button
                type="button"
                onClick={() => setPreviewListing(null)}
                className="p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {previewListing.media[0] && (
              <img
                src={previewListing.media[0].url}
                alt=""
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            )}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#6B7A3F]">
                {previewListing.category} · {previewListing.regions.join(', ')}
              </div>
              <h4 className="font-display text-lg font-bold text-[#3A3A3A]">
                {previewListing.title}
              </h4>
              <p className="text-xs text-[#3A3A3A]/75">
                {previewListing.companyName} ({previewListing.firstName}{' '}
                {previewListing.lastName}) · {previewListing.phone}
              </p>
              <p className="pt-2 text-sm text-[#3A3A3A]/85">
                {previewListing.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateListing(
                editingListing.id,
                editingListing,
                'Elan məlumatları yeniləndi.'
              );
              setEditingListing(null);
            }}
            className="w-full max-w-lg rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#3A3A3A]">
                Elanı Redaktə Et
              </h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={editingListing.title}
                onChange={(e) =>
                  setEditingListing({ ...editingListing, title: e.target.value })
                }
                placeholder="Başlıq"
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editingListing.category}
                  onChange={(e) =>
                    setEditingListing({
                      ...editingListing,
                      category: e.target.value,
                    })
                  }
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'Hamısı').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editingListing.phone}
                  onChange={(e) =>
                    setEditingListing({ ...editingListing, phone: e.target.value })
                  }
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editingListing.companyName}
                  onChange={(e) =>
                    setEditingListing({
                      ...editingListing,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="Şirkət"
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                />
                <select
                  value={editingListing.cardTheme}
                  onChange={(e) =>
                    setEditingListing({
                      ...editingListing,
                      cardTheme: e.target.value as CardTheme,
                    })
                  }
                  className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
                >
                  <option value="standard">Standart Krem</option>
                  <option value="concrete">Açıq Beton</option>
                  <option value="olive">Zeytun Vurğulu</option>
                  <option value="vip">VIP Qızılı-Zeytun</option>
                </select>
              </div>
              <select
                value={editingListing.tier || 'standard'}
                onChange={(e) =>
                  setEditingListing({
                    ...editingListing,
                    tier: e.target.value as ListingTier,
                  })
                }
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              >
                <option value="standard">Paket: Standart</option>
                <option value="pro">Paket: PRO</option>
                <option value="vip">Paket: VIP</option>
              </select>
              <textarea
                rows={3}
                value={editingListing.description}
                onChange={(e) =>
                  setEditingListing({
                    ...editingListing,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
              >
                Yadda saxla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateUser(
                editingUser.id,
                editingUser,
                'İstifadəçi profili yeniləndi.'
              );
              setEditingUser(null);
            }}
            className="w-full max-w-md rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#3A3A3A]">
                İstifadəçini Redaktə Et
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={editingUser.firstName}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, firstName: e.target.value })
                }
                placeholder="Ad"
                className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={editingUser.lastName}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, lastName: e.target.value })
                }
                placeholder="Soyad"
                className="rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
              />
            </div>
            <input
              type="text"
              value={editingUser.companyName}
              onChange={(e) =>
                setEditingUser({ ...editingUser, companyName: e.target.value })
              }
              placeholder="Şirkət"
              className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
            />
            <input
              type="tel"
              value={editingUser.phone}
              onChange={(e) =>
                setEditingUser({ ...editingUser, phone: e.target.value })
              }
              placeholder="Telefon"
              className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
              >
                Yadda saxla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Reply Modal */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4">
          <form
            onSubmit={sendAdminReply}
            className="w-full max-w-md rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-6 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-[#3A3A3A]">
              Rəyə Admin Cavabı Yaz
            </h3>
            <p className="rounded-lg bg-[#E7E2DA]/40 p-3 text-xs text-[#3A3A3A]/80">
              &ldquo;{replyTarget.text}&rdquo;
            </p>
            <textarea
              rows={3}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Rəsmi Admin cavabınız..."
              className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
              >
                Cavabı dərc et
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4">
          <form
            onSubmit={saveCommentEdit}
            className="w-full max-w-md rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] p-6 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-[#3A3A3A]">
              Rəyi Redaktə Et
            </h3>
            <textarea
              rows={3}
              required
              value={editingCommentText}
              onChange={(e) => setEditingCommentText(e.target.value)}
              className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingComment(null)}
                className="rounded-lg border border-[#E7E2DA] px-4 py-2 text-xs font-medium cursor-pointer"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#6B7A3F] px-4 py-2 text-xs font-semibold text-[#FAF7F2] cursor-pointer"
              >
                Yadda saxla
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
