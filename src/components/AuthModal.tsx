import { LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { OAuthProvider, User } from '../types.ts';

interface AuthModalProps {
  registrationEnabled: boolean;
  onClose: () => void;
  onAuthenticated: (user: User, token: string) => void;
}

const PROVIDER_META: Record<
  OAuthProvider,
  { label: string; defaultEmail: string; defaultFirst: string; defaultLast: string }
> = {
  google: {
    label: 'Google',
    defaultEmail: 'orxan.google@betonishleri.az',
    defaultFirst: 'Orxan',
    defaultLast: 'Əliyev',
  },
  github: {
    label: 'GitHub',
    defaultEmail: 'murad.github@betonishleri.az',
    defaultFirst: 'Murad',
    defaultLast: 'Hüseynov',
  },
  facebook: {
    label: 'Facebook',
    defaultEmail: 'nicat.fb@betonishleri.az',
    defaultFirst: 'Nicat',
    defaultLast: 'Qasımov',
  },
};

export function AuthModal({
  registrationEnabled,
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('+994');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OAuth simulator fallback state (used when real OAuth Client IDs are not set in Secrets)
  const [simProvider, setSimProvider] = useState<OAuthProvider | null>(null);
  const [simEmail, setSimEmail] = useState('');
  const [simFirst, setSimFirst] = useState('');
  const [simLast, setSimLast] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.startsWith('http://localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token && event.data?.user) {
        onAuthenticated(event.data.user as User, String(event.data.token));
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(String(event.data.error || 'Sosial şəbəkə girişi uğursuz oldu.'));
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthenticated]);

  async function handleOAuthClick(provider: OAuthProvider) {
    setError('');
    setLoading(true);
    try {
      const originParam = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/oauth/${provider}/url?origin=${originParam}`);
      const data = (await res.json()) as { configured?: boolean; url?: string; error?: string };

      if (data.configured && data.url) {
        const popup = window.open(data.url, 'oauth_popup', 'width=600,height=700');
        if (!popup) {
          setError('Brauzer popup pəncərəni blokladı. Zəhmət olmasa icazə verin.');
        }
        setLoading(false);
        return;
      }

      // Real client IDs not yet configured -> show sleek in-modal OAuth account confirm simulator
      const meta = PROVIDER_META[provider];
      setSimProvider(provider);
      setSimEmail(meta.defaultEmail);
      setSimFirst(meta.defaultFirst);
      setSimLast(meta.defaultLast);
      setLoading(false);
    } catch {
      setError('OAuth bağlantısı zamanı xəta baş verdi.');
      setLoading(false);
    }
  }

  async function handleSimulateOAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!simProvider) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/oauth/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: simProvider,
          email: simEmail,
          firstName: simFirst,
          lastName: simLast,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Giriş tamamlanmadı.');
      } else {
        onAuthenticated(data.user, data.token);
      }
    } catch {
      setError('Server xətası.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, firstName, lastName, companyName, phone };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Əməliyyat uğursuz oldu.');
      } else {
        onAuthenticated(data.user, data.token);
      }
    } catch {
      setError('Serverlə əlaqə xətası.');
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('demo1234');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'demo1234' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Giriş alınmadı.');
      } else {
        onAuthenticated(data.user, data.token);
      }
    } catch {
      setError('Bağlantı xətası.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A3A3A]/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2]">
        <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#E7E2DA]/40 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[#3A3A3A]">
            {simProvider
              ? `${PROVIDER_META[simProvider].label} ilə Giriş`
              : mode === 'login'
              ? 'Hesaba Giriş'
              : 'Yeni Qeydiyyat'}
          </h2>
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
          {simProvider ? (
            <form onSubmit={handleSimulateOAuthSubmit} className="space-y-4">
              <div className="rounded-xl border border-[#6B7A3F]/30 bg-[#6B7A3F]/8 p-3.5 text-xs text-[#3A3A3A] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#6B7A3F]">
                  <ShieldCheck size={15} />
                  <span>{PROVIDER_META[simProvider].label} OAuth Təsdiq Simulyatoru</span>
                </div>
                <p className="text-[#3A3A3A]/75">
                  İstədiyiniz hesab məlumatlarını təsdiqləyib {PROVIDER_META[simProvider].label} ilə birbaşa daxil olun və ya qeydiyyatdan keçin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Ad *
                  </label>
                  <input
                    type="text"
                    required
                    value={simFirst}
                    onChange={(e) => setSimFirst(e.target.value)}
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={simLast}
                    onChange={(e) => setSimLast(e.target.value)}
                    className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                  {PROVIDER_META[simProvider].label} E-poçt *
                </label>
                <input
                  type="email"
                  required
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </p>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSimProvider(null);
                    setError('');
                  }}
                  className="rounded-lg border border-[#E7E2DA] px-4 py-2.5 text-xs font-semibold text-[#3A3A3A] cursor-pointer"
                >
                  Geri
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#6B7A3F] py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 cursor-pointer"
                >
                  {loading
                    ? 'Təsdiqlənir...'
                    : `${PROVIDER_META[simProvider].label} ilə Davam Et`}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Segmented Mode Switch */}
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#E7E2DA]/60 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-[#FAF7F2] text-[#3A3A3A] shadow-xs'
                      : 'text-[#3A3A3A]/70 hover:text-[#3A3A3A]'
                  }`}
                >
                  Daxil ol
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-[#FAF7F2] text-[#3A3A3A] shadow-xs'
                      : 'text-[#3A3A3A]/70 hover:text-[#3A3A3A]'
                  }`}
                >
                  Qeydiyyat
                </button>
              </div>

              {/* Social OAuth Buttons (Google, GitHub, Facebook) */}
              {(mode === 'login' || registrationEnabled) && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-medium text-[#3A3A3A]/65 text-center">
                    {mode === 'login'
                      ? 'Sosial hesabla sürətli giriş'
                      : 'Sosial hesabla sürətli qeydiyyat'}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthClick('google')}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2.5 text-xs font-semibold text-[#3A3A3A] hover:border-[#6B7A3F] transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.04 21.18 7.21 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.03 14.04A7.18 7.18 0 0 1 4.65 12c0-.71.13-1.4.38-2.04V6.82H1.03A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.03 5.18l4-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.04 2.82 1.03 6.82l4 3.14c.98-2.94 3.73-5.21 6.97-5.21Z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthClick('github')}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2.5 text-xs font-semibold text-[#3A3A3A] hover:border-[#6B7A3F] transition-colors cursor-pointer"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 fill-[#3A3A3A]"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.295 24 17.795 24 12.5 24 5.87 18.627.5 12 .5Z" />
                      </svg>
                      <span>GitHub</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleOAuthClick('facebook')}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7E2DA] bg-white px-3 py-2.5 text-xs font-semibold text-[#3A3A3A] hover:border-[#6B7A3F] transition-colors cursor-pointer"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#1877F2"
                          d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
                        />
                      </svg>
                      <span>Facebook</span>
                    </button>
                  </div>

                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-[#E7E2DA]" />
                    <span className="mx-3 shrink text-[11px] text-[#3A3A3A]/50">və ya e-poçt ilə</span>
                    <div className="flex-grow border-t border-[#E7E2DA]" />
                  </div>
                </div>
              )}

              {mode === 'register' && !registrationEnabled ? (
                <div className="rounded-xl border border-[#E7E2DA] bg-[#E7E2DA]/40 p-4 text-sm text-[#3A3A3A]">
                  Yeni istifadəçi qeydiyyatı hazırda administrator tərəfindən müvəqqəti dayandırılıb.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                            Ad *
                          </label>
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
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
                            className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                          Şirkət / Briqada adı
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 font-mono text-sm focus:border-[#6B7A3F] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                      E-poçt ünvanı *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ad@betonishleri.az"
                      className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                      Şifrə *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-sm focus:border-[#6B7A3F] focus:outline-none"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6B7A3F] py-2.5 text-sm font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                    <span>
                      {loading
                        ? 'Gözləyin...'
                        : mode === 'login'
                        ? 'Daxil ol'
                        : 'Hesab yarat'}
                    </span>
                  </button>
                </form>
              )}

              {mode === 'login' && (
                <div className="border-t border-[#E7E2DA] pt-4">
                  <p className="mb-2 text-xs text-[#3A3A3A]/65">
                    Hazır usta hesabları ilə sürətli giriş:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => quickLogin('rashad@betonishleri.az')}
                      className="rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-2 text-left text-xs hover:border-[#6B7A3F] cursor-pointer"
                    >
                      <div className="font-semibold text-[#3A3A3A]">Rəşad M.</div>
                      <div className="text-[11px] text-[#3A3A3A]/60">Creator · Monolit</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => quickLogin('elvin@pompaxidmeti.az')}
                      className="rounded-lg border border-[#E7E2DA] bg-white px-2.5 py-2 text-left text-xs hover:border-[#6B7A3F] cursor-pointer"
                    >
                      <div className="font-semibold text-[#3A3A3A]">Elvin H.</div>
                      <div className="text-[11px] text-[#3A3A3A]/60">Creator · Pompa</div>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
