import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { runBetonAIChat, transcribeAudioWithGemini } from './server/ai.ts';
import type {
  AIChatMode,
  CardTheme,
  CommentItem,
  Listing,
  ListingTier,
  OAuthProvider,
  QuoteRequest,
  SocialLink,
  User,
  UserReview,
  UserRole,
} from './src/types.ts';

const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || '111981emin';
const PORT = 3000;

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60 MB max for video/image uploads
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Yalnız şəkil və video faylları yüklənə bilər.'));
    }
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Session stores (in-memory tokens backed by persistent DB users)
const adminSessions = new Set<string>();
const userSessions = new Map<string, string>(); // token -> userId

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function sanitizeUser(u: User) {
  const { passwordHash: _pw, ...safe } = u;
  const lastSeenMs = new Date(u.lastSeenAt).getTime();
  const isOnline = Date.now() - lastSeenMs < 2 * 60 * 1000;
  return { ...safe, isOnline };
}

function getAuthenticatedUser(req: Request): User | null {
  const token = req.headers['x-user-token'];
  if (typeof token !== 'string') return null;
  const userId = userSessions.get(token);
  if (!userId) return null;
  return db.getState().users.find((u) => u.id === userId) || null;
}

function isAdminAuthenticated(req: Request): boolean {
  const adminToken = req.headers['x-admin-token'];
  if (typeof adminToken === 'string' && adminSessions.has(adminToken)) {
    return true;
  }
  const user = getAuthenticatedUser(req);
  if (user && user.role === 'Admin' && !user.banned) {
    return true;
  }
  return false;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: 'Admin icazəsi tələb olunur.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '15mb' }));

  // Serve uploaded media directly from internal server directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Public platform status / settings
  app.get('/api/bootstrap', (req, res) => {
    const state = db.getState();
    const currentUser = getAuthenticatedUser(req);
    const adminAccess = isAdminAuthenticated(req);

    const visibleListings = state.listings.filter((l) => l.status === 'active');

    res.json({
      settings: state.settings,
      currentUser: currentUser ? sanitizeUser(currentUser) : null,
      isAdmin: adminAccess,
      mapsApiKey:
        process.env.VITE_GOOGLE_MAPS_API_KEY ||
        process.env.GOOGLE_MAPS_API_KEY ||
        '',
      listings:
        state.settings.maintenanceMode && !adminAccess ? [] : visibleListings,
      comments: state.comments,
      quotes:
        state.settings.maintenanceMode && !adminAccess ? [] : state.quotes || [],
      usersPublic: state.users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        companyName: u.companyName,
        role: u.role,
        verified: u.verified,
        avatarUrl: u.avatarUrl,
      })),
    });
  });

  // Upload image or video file from device (no external URLs)
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Fayl seçilməyib.' });
      return;
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const url = `/uploads/${req.file.filename}`;
    res.json({
      url,
      type: isVideo ? 'video' : 'image',
      name: req.file.originalname,
      size: req.file.size,
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'E-poçt və şifrə daxil edin.' });
      return;
    }
    const state = db.getState();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!user || user.passwordHash !== password) {
      db.addAuditLog({
        ip: getClientIp(req),
        actorName: email,
        actorRole: 'Qonaq',
        action: 'GIRIS_UGURSUZ',
        details: `Yanlış şifrə və ya tapılmayan hesab: ${email}`,
        severity: 'warning',
      });
      res.status(401).json({ error: 'E-poçt və ya şifrə yanlışdır.' });
      return;
    }
    if (user.banned) {
      db.addAuditLog({
        ip: getClientIp(req),
        actorName: `${user.firstName} ${user.lastName}`,
        actorRole: user.role,
        action: 'BLOKLANMIS_GIRIS_CEHDI',
        details: `Bloklanmış istifadəçi girişə cəhd etdi (${user.email})`,
        severity: 'warning',
      });
      res.status(403).json({ error: 'Bu hesab administrator tərəfindən bloklanıb.' });
      return;
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;
    user.lastSeenAt = now;
    const token = `ut-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    userSessions.set(token, user.id);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: `${user.firstName} ${user.lastName}`,
      actorRole: user.role,
      action: 'ISTIFADECI_GIRIS',
      details: `Sistemə daxil oldu (${user.email})`,
      severity: 'info',
    });

    res.json({ token, user: sanitizeUser(user) });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const state = db.getState();
    if (!state.settings.registrationEnabled) {
      res.status(403).json({ error: 'Yeni qeydiyyatlar hazırda administrator tərəfindən bağlanıb.' });
      return;
    }
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      phone,
    } = req.body as Record<string, string>;

    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'Ad, soyad, e-poçt və şifrə mütləqdir.' });
      return;
    }

    if (
      state.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    ) {
      res.status(409).json({ error: 'Bu e-poçt ünvanı ilə hesab artıq mövcuddur.' });
      return;
    }

    const now = new Date().toISOString();
    const newUser: User = {
      id: `u-${Date.now().toString(36)}`,
      email: email.trim().toLowerCase(),
      passwordHash: password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: (companyName || `${firstName} Briqadası`).trim(),
      phone: (phone || '+994500000000').trim(),
      role: 'User',
      verified: false,
      banned: false,
      bio: 'Beton işləri üzrə platforma üzvü.',
      avatarUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
      coverMediaUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
      coverMediaType: 'image',
      socialLinks: [],
      portfolioGallery: [],
      lastSeenAt: now,
      lastLoginAt: now,
      createdAt: now,
    };

    state.users.push(newUser);
    const token = `ut-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    userSessions.set(token, newUser.id);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: `${newUser.firstName} ${newUser.lastName}`,
      actorRole: newUser.role,
      action: 'YENI_QEYDIYYAT',
      details: `Yeni hesab yaradıldı (${newUser.email})`,
      severity: 'info',
    });

    res.status(201).json({ token, user: sanitizeUser(newUser) });
  });

  // Helper: Resolve base APP_URL safely for OAuth redirect URIs
  function resolveAppBaseUrl(req: Request): string {
    const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    if (envUrl && !envUrl.includes('MY_APP_URL')) {
      return envUrl;
    }
    const queryOrigin =
      typeof req.query.origin === 'string' ? req.query.origin.trim().replace(/\/+$/, '') : '';
    if (queryOrigin) return queryOrigin;
    return `https://${req.get('host') || 'localhost:3000'}`;
  }

  function upsertOAuthUser(
    provider: OAuthProvider,
    profile: { email: string; firstName: string; lastName: string; avatarUrl?: string },
    req: Request,
    isSimulated: boolean
  ): { user?: User; token?: string; error?: string; status?: number } {
    const state = db.getState();
    const cleanEmail = profile.email.trim().toLowerCase();
    let user = state.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const now = new Date().toISOString();

    if (user) {
      if (user.banned) {
        return { error: 'Bu hesab administrator tərəfindən bloklanıb.', status: 403 };
      }
      user.lastLoginAt = now;
      user.lastSeenAt = now;
      user.authProvider = provider;
      if (profile.avatarUrl && user.avatarUrl.startsWith('/src/')) {
        user.avatarUrl = profile.avatarUrl;
      }
    } else {
      if (!state.settings.registrationEnabled) {
        return {
          error: 'Yeni qeydiyyatlar hazırda administrator tərəfindən bağlanıb.',
          status: 403,
        };
      }
      user = {
        id: `u-${Date.now().toString(36)}`,
        email: cleanEmail,
        authProvider: provider,
        firstName: profile.firstName.trim() || 'İstifadəçi',
        lastName: profile.lastName.trim() || '',
        companyName: `${profile.firstName.trim() || 'Yeni'} Briqadası`,
        phone: '+994500000000',
        role: 'User',
        verified: false,
        banned: false,
        bio: `${provider.toUpperCase()} hesabı ilə qoşulmuş platforma üzvü.`,
        avatarUrl:
          profile.avatarUrl || '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
        coverMediaUrl: '/src/assets/images/hero_concrete_architecture_1795097617543.jpg',
        coverMediaType: 'image',
        socialLinks: [],
        portfolioGallery: [],
        lastSeenAt: now,
        lastLoginAt: now,
        createdAt: now,
      };
      state.users.push(user);
    }

    const token = `ut-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    userSessions.set(token, user.id);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      actorRole: user.role,
      action: isSimulated ? 'OAUTH_SIMULATOR_GIRIS' : 'OAUTH_GIRIS',
      details: `${provider.toUpperCase()} ilə giriş (${user.email})`,
      severity: 'info',
    });

    return { user, token };
  }

  // OAuth: Check which providers have real credentials configured
  app.get('/api/auth/oauth/providers', (_req, res) => {
    res.json({
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      github: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    });
  });

  // OAuth: Get direct provider authorization URL
  app.get('/api/auth/oauth/:provider/url', (req, res) => {
    const provider = req.params.provider as OAuthProvider;
    const baseUrl = resolveAppBaseUrl(req);
    const redirectUri = `${baseUrl}/auth/callback/${provider}`;

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
        res.json({ configured: false, redirectUri });
        return;
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
      });
      res.json({
        configured: true,
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        redirectUri,
      });
      return;
    }

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
        res.json({ configured: false, redirectUri });
        return;
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
      });
      res.json({
        configured: true,
        url: `https://github.com/login/oauth/authorize?${params.toString()}`,
        redirectUri,
      });
      return;
    }

    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      if (!appId || !process.env.FACEBOOK_APP_SECRET) {
        res.json({ configured: false, redirectUri });
        return;
      }
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: 'email,public_profile',
        response_type: 'code',
      });
      res.json({
        configured: true,
        url: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`,
        redirectUri,
      });
      return;
    }

    res.status(400).json({ error: 'Naməlum OAuth provayderi.' });
  });

  // OAuth: Popup Callback Handler (supports optional trailing slash)
  app.get(['/auth/callback/:provider', '/auth/callback/:provider/'], async (req, res) => {
    const provider = req.params.provider as OAuthProvider;
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const errParam = typeof req.query.error === 'string' ? req.query.error : '';

    const renderCallbackHtml = (payload: Record<string, unknown>) => {
      const jsonStr = JSON.stringify(payload).replace(/</g, '\\u003c');
      return `<!DOCTYPE html>
<html lang="az">
<head><meta charset="utf-8"><title>Beton İşləri — Giriş Təsdiqi</title></head>
<body style="font-family:sans-serif;background:#FAF7F2;color:#3A3A3A;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Giriş tamamlanır, bu pəncərə avtomatik bağlanacaq...</p>
  <script>
    (function () {
      var data = ${jsonStr};
      if (window.opener) {
        window.opener.postMessage(data, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;
    };

    if (errParam || !code) {
      res.send(
        renderCallbackHtml({
          type: 'OAUTH_AUTH_ERROR',
          error: 'Giriş ləğv edildi və ya təsdiq kodu alınmadı.',
        })
      );
      return;
    }

    try {
      const baseUrl = resolveAppBaseUrl(req);
      const redirectUri = `${baseUrl}/auth/callback/${provider}`;
      let email = '';
      let firstName = '';
      let lastName = '';
      let avatarUrl = '';

      if (provider === 'google') {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
        const tokenJson = (await tokenRes.json()) as { access_token?: string };
        if (!tokenJson.access_token) throw new Error('Google token alınmadı.');
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        const prof = (await profileRes.json()) as {
          email?: string;
          given_name?: string;
          family_name?: string;
          name?: string;
          picture?: string;
        };
        email = prof.email || '';
        firstName = prof.given_name || (prof.name || 'Google').split(' ')[0];
        lastName = prof.family_name || (prof.name || '').split(' ').slice(1).join(' ');
        avatarUrl = prof.picture || '';
      } else if (provider === 'github') {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID || '',
            client_secret: process.env.GITHUB_CLIENT_SECRET || '',
            code,
            redirect_uri: redirectUri,
          }),
        });
        const tokenJson = (await tokenRes.json()) as { access_token?: string };
        if (!tokenJson.access_token) throw new Error('GitHub token alınmadı.');
        const headers = {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'User-Agent': 'Beton-Isleri-App',
        };
        const userRes = await fetch('https://api.github.com/user', { headers });
        const ghUser = (await userRes.json()) as {
          email?: string;
          name?: string;
          login?: string;
          avatar_url?: string;
        };
        email = ghUser.email || '';
        if (!email) {
          const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
          const emails = (await emailsRes.json()) as { email: string; primary: boolean }[];
          const primary = emails.find((e) => e.primary) || emails[0];
          email = primary?.email || `${ghUser.login || 'github'}@users.noreply.github.com`;
        }
        const parts = (ghUser.name || ghUser.login || 'GitHub İstifadəçisi').split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
        avatarUrl = ghUser.avatar_url || '';
      } else if (provider === 'facebook') {
        const tokenParams = new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID || '',
          client_secret: process.env.FACEBOOK_APP_SECRET || '',
          redirect_uri: redirectUri,
          code,
        });
        const tokenRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`
        );
        const tokenJson = (await tokenRes.json()) as { access_token?: string };
        if (!tokenJson.access_token) throw new Error('Facebook token alınmadı.');
        const meRes = await fetch(
          `https://graph.facebook.com/me?fields=id,name,first_name,last_name,email,picture.type(large)&access_token=${encodeURIComponent(
            tokenJson.access_token
          )}`
        );
        const fb = (await meRes.json()) as {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          name?: string;
          picture?: { data?: { url?: string } };
        };
        email = fb.email || `fb_${fb.id || Date.now()}@facebook-user.local`;
        firstName = fb.first_name || (fb.name || 'Facebook').split(' ')[0];
        lastName = fb.last_name || '';
        avatarUrl = fb.picture?.data?.url || '';
      }

      if (!email) throw new Error('Hesab e-poçtu əldə edilə bilmədi.');
      const result = upsertOAuthUser(
        provider,
        { email, firstName, lastName, avatarUrl },
        req,
        false
      );
      if (result.error || !result.user || !result.token) {
        res.send(renderCallbackHtml({ type: 'OAUTH_AUTH_ERROR', error: result.error }));
        return;
      }

      res.send(
        renderCallbackHtml({
          type: 'OAUTH_AUTH_SUCCESS',
          provider,
          token: result.token,
          user: sanitizeUser(result.user),
        })
      );
    } catch (err: unknown) {
      res.send(
        renderCallbackHtml({
          type: 'OAUTH_AUTH_ERROR',
          error: err instanceof Error ? err.message : 'OAuth giriş xətası.',
        })
      );
    }
  });

  // OAuth: Simulator fallback when Client ID/Secret env vars aren't configured yet
  app.post('/api/auth/oauth/simulate', (req, res) => {
    const { provider, email, firstName, lastName } = req.body as {
      provider?: OAuthProvider;
      email?: string;
      firstName?: string;
      lastName?: string;
    };
    if (!provider || !['google', 'github', 'facebook'].includes(provider)) {
      res.status(400).json({ error: 'Düzgün OAuth provayderi seçin.' });
      return;
    }

    const defaults: Record<OAuthProvider, { email: string; firstName: string; lastName: string }> = {
      google: { email: 'orxan.google@betonishleri.az', firstName: 'Orxan', lastName: 'Əliyev' },
      github: { email: 'murad.github@betonishleri.az', firstName: 'Murad', lastName: 'Hüseynov' },
      facebook: { email: 'nicat.fb@betonishleri.az', firstName: 'Nicat', lastName: 'Qasımov' },
    };
    const chosen = defaults[provider];

    const result = upsertOAuthUser(
      provider,
      {
        email: email?.trim() || chosen.email,
        firstName: firstName?.trim() || chosen.firstName,
        lastName: lastName?.trim() || chosen.lastName,
      },
      req,
      true
    );

    if (result.error || !result.user || !result.token) {
      res.status(result.status || 400).json({ error: result.error });
      return;
    }

    res.json({ token: result.token, user: sanitizeUser(result.user) });
  });

  // Heartbeat for live online/offline status & analytics
  app.post('/api/auth/heartbeat', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (user) {
      user.lastSeenAt = new Date().toISOString();
      db.save();
    }
    res.json({ ok: true });
  });

  // Analytics tracking event (device, tag searches, regions, hourly visits)
  app.post('/api/analytics/event', (req, res) => {
    const { type, value, device } = req.body as {
      type: 'visit' | 'tag_search' | 'region';
      value?: string;
      device?: 'mobile' | 'desktop';
    };
    const state = db.getState();
    if (type === 'visit') {
      const hourLabel = `${String(new Date().getHours()).padStart(2, '0')}:00`;
      const bucket = state.analytics.hourlyVisits.find((h) => h.hour === hourLabel);
      if (bucket) {
        bucket.visits += 1;
      } else {
        state.analytics.hourlyVisits.push({ hour: hourLabel, visits: 1 });
        if (state.analytics.hourlyVisits.length > 12) {
          state.analytics.hourlyVisits.shift();
        }
      }
      if (device === 'mobile') {
        state.analytics.deviceCounts.mobile += 1;
      } else if (device === 'desktop') {
        state.analytics.deviceCounts.desktop += 1;
      }
    } else if (type === 'tag_search' && value) {
      const tag = value.replace(/^#/, '').trim().toLowerCase();
      if (tag) {
        state.analytics.tagSearches[tag] = (state.analytics.tagSearches[tag] || 0) + 1;
      }
    } else if (type === 'region' && value) {
      state.analytics.regionCounts[value] =
        (state.analytics.regionCounts[value] || 0) + 1;
    }
    db.save();
    res.json({ ok: true });
  });

  // Listings: Create
  app.post('/api/listings', (req, res) => {
    const state = db.getState();
    const user = getAuthenticatedUser(req);
    if (user && user.banned) {
      res.status(403).json({ error: 'Hesabınız bloklanıb.' });
      return;
    }

    const body = req.body as Partial<Listing>;
    if (!body.title || !body.category || !body.phone || !body.firstName || !body.lastName) {
      res.status(400).json({ error: 'Başlıq, kateqoriya, ad, soyad və əlaqə nömrəsi tələb olunur.' });
      return;
    }

    const now = new Date().toISOString();
    const status = state.settings.requireApproval ? 'pending' : 'active';
    const tier: ListingTier =
      body.tier === 'vip' ? 'vip' : body.tier === 'pro' ? 'pro' : 'standard';

    const newListing: Listing = {
      id: `l-${Date.now().toString(36)}`,
      userId: user ? user.id : 'u-orxan',
      title: body.title.trim(),
      description: (body.description || '').trim(),
      category: body.category,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      companyName: (body.companyName || `${body.firstName} Briqadası`).trim(),
      phone: body.phone.trim(),
      socialLinks: Array.isArray(body.socialLinks) ? body.socialLinks : [],
      tags: Array.isArray(body.tags)
        ? body.tags.map((t) => t.replace(/^#/, '').trim().toLowerCase()).filter(Boolean)
        : [],
      media: Array.isArray(body.media) ? body.media : [],
      cardTheme:
        tier === 'vip'
          ? 'vip'
          : (body.cardTheme as CardTheme) || (tier === 'pro' ? 'olive' : 'standard'),
      tier,
      proConfig: tier === 'pro' && body.proConfig ? body.proConfig : undefined,
      vipConfig: tier === 'vip' && body.vipConfig ? body.vipConfig : undefined,
      paymentSim:
        (tier === 'pro' || tier === 'vip') && body.paymentSim
          ? body.paymentSim
          : undefined,
      experienceYears: Number(body.experienceYears) || 1,
      regions: Array.isArray(body.regions) && body.regions.length > 0 ? body.regions : ['Bakı'],
      minVolumeM3: Number(body.minVolumeM3) || 5,
      priceType: body.priceType === 'per_m3' ? 'per_m3' : 'negotiable',
      pricePerM3: body.priceType === 'per_m3' ? Number(body.pricePerM3) || 100 : undefined,
      concreteGrades: Array.isArray(body.concreteGrades) ? body.concreteGrades : ['M300'],
      equipmentTypes: Array.isArray(body.equipmentTypes) ? body.equipmentTypes : [],
      verified: user ? user.verified : false,
      status,
      views: 1,
      likes: 0,
      likedBy: [],
      createdAt: now,
      updatedAt: now,
    };

    state.listings.unshift(newListing);

    // Update regional analytics
    for (const reg of newListing.regions) {
      state.analytics.regionCounts[reg] = (state.analytics.regionCounts[reg] || 0) + 1;
    }

    const tierLabel =
      tier === 'vip'
        ? `VIP (${newListing.paymentSim?.amountAzn || 49} AZN Simulyator)`
        : tier === 'pro'
        ? `PRO (${newListing.paymentSim?.amountAzn || 19} AZN Simulyator)`
        : 'Standart';

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: user ? `${user.firstName} ${user.lastName}` : `${newListing.firstName} ${newListing.lastName}`,
      actorRole: user ? user.role : 'Qonaq',
      action: tier !== 'standard' ? 'ODENISLI_ELAN_SIMULATOR' : 'ELAN_YARADILDI',
      details: `"${newListing.title}" (${newListing.id}) · Paket: ${tierLabel} — Status: ${status}`,
      severity: 'info',
    });

    res.status(201).json({ listing: newListing });
  });

  // Tender / Quote Requests (Sifarişçi elanları)
  app.get('/api/quotes', (_req, res) => {
    res.json({ quotes: db.getState().quotes || [] });
  });

  app.post('/api/quotes', (req, res) => {
    const state = db.getState();
    const {
      customerName,
      phone,
      region,
      category,
      concreteGrade,
      volumeM3,
      needsPump,
      targetDate,
      notes,
    } = req.body as Partial<QuoteRequest>;

    if (!customerName?.trim() || !phone?.trim() || !volumeM3) {
      res.status(400).json({ error: 'Ad, əlaqə nömrəsi və təxmini həcm (m³) vacibdir.' });
      return;
    }

    const quote: QuoteRequest = {
      id: `q-${Date.now().toString(36)}`,
      customerName: customerName.trim(),
      phone: phone.trim(),
      region: region || 'Bakı',
      category: category || 'Bünövrə betonu',
      concreteGrade: concreteGrade || 'M300',
      volumeM3: Number(volumeM3) || 10,
      needsPump: Boolean(needsPump),
      targetDate: targetDate?.trim() || 'Tezliklə',
      notes: (notes || '').trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(state.quotes)) state.quotes = [];
    state.quotes.unshift(quote);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: quote.customerName,
      actorRole: 'Sifarişçi',
      action: 'TENDER_SORGU_YARADILDI',
      details: `${quote.region} · ${quote.volumeM3} m³ ${quote.concreteGrade} (${quote.category})`,
      severity: 'info',
    });

    res.status(201).json({ quote });
  });

  // Increment view
  app.post('/api/listings/:id/view', (req, res) => {
    const listing = db.getState().listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Elan tapılmadı.' });
      return;
    }
    listing.views += 1;
    db.save();
    res.json({ views: listing.views });
  });

  // Toggle like
  app.post('/api/listings/:id/like', (req, res) => {
    const listing = db.getState().listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Elan tapılmadı.' });
      return;
    }
    const user = getAuthenticatedUser(req);
    const visitorId = user ? user.id : (req.body?.visitorId as string) || getClientIp(req);
    const idx = listing.likedBy.indexOf(visitorId);
    let liked = false;
    if (idx >= 0) {
      listing.likedBy.splice(idx, 1);
      listing.likes = Math.max(0, listing.likes - 1);
    } else {
      listing.likedBy.push(visitorId);
      listing.likes += 1;
      liked = true;
    }
    db.save();
    res.json({ likes: listing.likes, liked });
  });

  // Add comment to listing
  app.post('/api/listings/:id/comments', (req, res) => {
    const state = db.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Elan tapılmadı.' });
      return;
    }
    const user = getAuthenticatedUser(req);
    const { authorName, text, rating } = req.body as {
      authorName?: string;
      text?: string;
      rating?: number;
    };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Rəy mətni boş ola bilməz.' });
      return;
    }

    const displayName = user
      ? `${user.firstName} ${user.lastName}`
      : (authorName || 'Qonaq İstifadəçi').trim();

    const comment: CommentItem = {
      id: `c-${Date.now().toString(36)}`,
      listingId: listing.id,
      userId: user?.id,
      authorName: displayName,
      authorRole: user ? user.role : 'Qonaq',
      text: text.trim(),
      rating: rating ? Math.min(5, Math.max(1, Number(rating))) : 5,
      createdAt: new Date().toISOString(),
    };

    state.comments.unshift(comment);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: displayName,
      actorRole: user ? user.role : 'Qonaq',
      action: 'REY_ELAVE_EDILDI',
      details: `"${listing.title}" elanına rəy yazıldı`,
      severity: 'info',
    });

    res.status(201).json({ comment });
  });

  // Profile: Get user profile + listings + reviews + stats
  app.get('/api/users/:id', (req, res) => {
    const state = db.getState();
    const user = state.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
      return;
    }
    const userListings = state.listings.filter(
      (l) => l.userId === user.id && l.status === 'active'
    );
    const userReviews = state.reviews.filter((r) => r.targetUserId === user.id);
    const totalViews = userListings.reduce((acc, l) => acc + l.views, 0);
    const totalLikes = userListings.reduce((acc, l) => acc + l.likes, 0);
    const avgRating =
      userReviews.length > 0
        ? Number(
            (
              userReviews.reduce((acc, r) => acc + r.rating, 0) /
              userReviews.length
            ).toFixed(1)
          )
        : 5.0;

    res.json({
      user: sanitizeUser(user),
      listings: userListings,
      reviews: userReviews,
      stats: {
        totalViews,
        totalLikes,
        avgRating,
        reviewCount: userReviews.length,
      },
    });
  });

  // Profile: Update own profile
  app.patch('/api/users/:id', (req, res) => {
    const currentUser = getAuthenticatedUser(req);
    const admin = isAdminAuthenticated(req);
    if (!admin && (!currentUser || currentUser.id !== req.params.id)) {
      res.status(403).json({ error: 'Profili redaktə etmək icazəniz yoxdur.' });
      return;
    }
    const state = db.getState();
    const target = state.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
      return;
    }

    const patch = req.body as Partial<User>;
    if (patch.firstName) target.firstName = patch.firstName.trim();
    if (patch.lastName) target.lastName = patch.lastName.trim();
    if (patch.companyName !== undefined) target.companyName = patch.companyName.trim();
    if (patch.phone !== undefined) target.phone = patch.phone.trim();
    if (patch.bio !== undefined) target.bio = patch.bio.trim();
    if (patch.avatarUrl) target.avatarUrl = patch.avatarUrl;
    if (patch.coverMediaUrl) target.coverMediaUrl = patch.coverMediaUrl;
    if (patch.coverMediaType) target.coverMediaType = patch.coverMediaType;
    if (Array.isArray(patch.socialLinks)) target.socialLinks = patch.socialLinks as SocialLink[];
    if (Array.isArray(patch.portfolioGallery)) target.portfolioGallery = patch.portfolioGallery;

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : 'Admin',
      actorRole: currentUser ? currentUser.role : 'Admin',
      action: 'PROFIL_REDAKTE',
      details: `${target.firstName} ${target.lastName} profili yeniləndi`,
      severity: 'info',
    });

    res.json({ user: sanitizeUser(target) });
  });

  // Add review to user profile
  app.post('/api/users/:id/reviews', (req, res) => {
    const state = db.getState();
    const target = state.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
      return;
    }
    const user = getAuthenticatedUser(req);
    const { authorName, rating, text } = req.body as {
      authorName?: string;
      rating?: number;
      text?: string;
    };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Rəy mətni daxil edin.' });
      return;
    }

    const review: UserReview = {
      id: `rev-${Date.now().toString(36)}`,
      targetUserId: target.id,
      authorName: user
        ? `${user.firstName} ${user.lastName}`
        : (authorName || 'Sifarişçi').trim(),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    state.reviews.unshift(review);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: review.authorName,
      actorRole: user ? user.role : 'Qonaq',
      action: 'USTA_REYI',
      details: `${target.firstName} ${target.lastName} profilinə ${review.rating} ulduzlu rəy yazıldı`,
      severity: 'info',
    });

    res.status(201).json({ review });
  });

  // Audio Transcription Endpoint (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe', audioUpload.single('audio'), async (req, res) => {
    try {
      let base64Data = '';
      let mimeType = 'audio/webm';

      if (req.file) {
        base64Data = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype || 'audio/webm';
      } else if (req.body?.audioBase64) {
        base64Data = String(req.body.audioBase64);
        mimeType = String(req.body.mimeType || 'audio/webm');
      }

      if (!base64Data) {
        res.status(400).json({ error: 'Audio fayl göndərilməyib.' });
        return;
      }

      const text = await transcribeAudioWithGemini(base64Data, mimeType);
      res.json({ text });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Səs yazısı mətnə çevrilə bilmədi.';
      console.error('Audio Transcribe Error:', err);
      res.status(500).json({ error: errorMsg });
    }
  });

  // Beton AI Chat Endpoint (Server-side @google/genai + Search/Maps Grounding)
  app.post('/api/ai/chat', async (req, res) => {
    const { message, history, mode, userLocation } = req.body as {
      message?: string;
      history?: { role: 'user' | 'model'; text: string }[];
      mode?: AIChatMode;
      userLocation?: { lat: number; lng: number };
    };
    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Sual mətni boş ola bilməz.' });
      return;
    }
    try {
      const activeListings = db
        .getState()
        .listings.filter((l) => l.status === 'active');
      const result = await runBetonAIChat(
        message.trim(),
        Array.isArray(history) ? history : [],
        activeListings,
        mode || 'general',
        userLocation
      );
      const matchedListings = activeListings.filter((l) =>
        result.matchedListingIds.includes(l.id)
      );
      res.json({
        reply: result.reply,
        matchedListings,
        groundingSources: result.groundingSources,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'AI xətası baş verdi.';
      console.error('Beton AI Error:', err);
      res.status(500).json({ error: `Beton AI cavab verə bilmədi: ${errorMsg}` });
    }
  });

  // ==================== ADMIN PANEL API ====================

  app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body as { password?: string };
    const ip = getClientIp(req);

    if (password !== ADMIN_PASSWORD) {
      db.addAuditLog({
        ip,
        actorName: 'Naməlum Giriş Cəhdi',
        actorRole: 'Təhlükəsizlik',
        action: 'ADMIN_SIFRE_SEHV',
        details: `Admin panelə səhv şifrə cəhdi ("${String(password || '').slice(0, 12)}") — Giriş bloklandı`,
        severity: 'critical',
      });
      res.status(401).json({
        error: 'Şifrə yanlışdır. Cəhd təhlükəsizlik jurnalına (Audit Log) qeyd edildi.',
      });
      return;
    }

    const token = `adm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    adminSessions.add(token);

    db.addAuditLog({
      ip,
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'ADMIN_GIRIS_UGURLU',
      details: '/admin_panel üzərindən təhlükəsiz giriş təsdiqləndi',
      severity: 'info',
    });

    res.json({ token });
  });

  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const state = db.getState();
    const totalListings = state.listings.length;
    const totalUsers = state.users.length;
    const totalViews = state.listings.reduce((s, l) => s + l.views, 0);
    const totalLikes = state.listings.reduce((s, l) => s + l.likes, 0);
    const totalComments = state.comments.length + state.reviews.length;

    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recent24hLogs = state.auditLogs.filter(
      (log) => nowMs - log.epochMs <= oneDayMs
    );

    const vipCount = state.listings.filter((l) => l.tier === 'vip').length;
    const proCount = state.listings.filter((l) => l.tier === 'pro').length;
    const simRevenueAzn = state.listings.reduce((sum, l) => {
      if (l.paymentSim?.amountAzn) return sum + l.paymentSim.amountAzn;
      if (l.tier === 'vip') return sum + 49;
      if (l.tier === 'pro') return sum + 19;
      return sum;
    }, 0);

    res.json({
      stats: {
        totalListings,
        totalUsers,
        totalViews,
        totalLikes,
        totalComments,
        vipCount,
        proCount,
        simRevenueAzn,
      },
      recent24hSummary: {
        eventsCount: recent24hLogs.length,
        newListings: state.listings.filter(
          (l) => nowMs - new Date(l.createdAt).getTime() <= oneDayMs
        ).length,
        newComments: state.comments.filter(
          (c) => nowMs - new Date(c.createdAt).getTime() <= oneDayMs
        ).length,
        failedAdminAttempts: recent24hLogs.filter(
          (l) => l.action === 'ADMIN_SIFRE_SEHV'
        ).length,
      },
      listings: state.listings,
      users: state.users.map(sanitizeUser),
      comments: state.comments,
      reviews: state.reviews,
      auditLogs: state.auditLogs,
      settings: state.settings,
      analytics: state.analytics,
    });
  });

  // Admin: Update / Block / Approve / Edit Listing
  app.patch('/api/admin/listings/:id', requireAdmin, (req, res) => {
    const state = db.getState();
    const listing = state.listings.find((l) => l.id === req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Elan tapılmadı.' });
      return;
    }

    const patch = req.body as Partial<Listing>;
    const changes: string[] = [];

    if (patch.title !== undefined && patch.title !== listing.title) {
      listing.title = patch.title.trim();
      changes.push('başlıq');
    }
    if (patch.description !== undefined) {
      listing.description = patch.description.trim();
      changes.push('təsvir');
    }
    if (patch.category !== undefined) {
      listing.category = patch.category;
      changes.push('kateqoriya');
    }
    if (patch.phone !== undefined) {
      listing.phone = patch.phone.trim();
      changes.push('telefon');
    }
    if (patch.companyName !== undefined) {
      listing.companyName = patch.companyName.trim();
      changes.push('şirkət');
    }
    if (patch.priceType !== undefined) listing.priceType = patch.priceType;
    if (patch.pricePerM3 !== undefined) listing.pricePerM3 = Number(patch.pricePerM3);
    if (patch.minVolumeM3 !== undefined) listing.minVolumeM3 = Number(patch.minVolumeM3);
    if (patch.cardTheme !== undefined) listing.cardTheme = patch.cardTheme;
    if (patch.tier !== undefined && patch.tier !== listing.tier) {
      listing.tier = patch.tier;
      changes.push(`paket:${patch.tier}`);
    }
    if (patch.proConfig !== undefined) listing.proConfig = patch.proConfig;
    if (patch.vipConfig !== undefined) listing.vipConfig = patch.vipConfig;
    if (patch.verified !== undefined) {
      listing.verified = Boolean(patch.verified);
      changes.push(`təsdiq:${listing.verified}`);
    }
    if (patch.status !== undefined && patch.status !== listing.status) {
      listing.status = patch.status;
      changes.push(`status:${patch.status}`);
    }
    if (Array.isArray(patch.regions)) listing.regions = patch.regions;
    if (Array.isArray(patch.tags)) listing.tags = patch.tags;

    listing.updatedAt = new Date().toISOString();

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action:
        patch.status === 'blocked'
          ? 'ELAN_BLOKLANDI'
          : patch.status === 'active'
          ? 'ELAN_AKTIVLESDIRILDI'
          : 'ELAN_REDAKTE_EDILDI',
      details: `"${listing.title}" (${listing.id}) üzərində dəyişiklik: ${changes.join(', ') || 'məlumat yeniləndi'}`,
      severity: patch.status === 'blocked' ? 'warning' : 'info',
    });

    res.json({ listing });
  });

  // Admin: Permanently Delete Listing
  app.delete('/api/admin/listings/:id', requireAdmin, (req, res) => {
    const state = db.getState();
    const idx = state.listings.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Elan tapılmadı.' });
      return;
    }
    const removed = state.listings[idx];
    state.listings.splice(idx, 1);
    state.comments = state.comments.filter((c) => c.listingId !== removed.id);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'ELAN_SILINDI',
      details: `"${removed.title}" (${removed.id}) həmişəlik silindi`,
      severity: 'warning',
    });

    res.json({ ok: true });
  });

  // Admin: Manage User (Role, Ban, Edit)
  app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
    const state = db.getState();
    const user = state.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
      return;
    }
    const patch = req.body as Partial<User>;
    const detailNotes: string[] = [];

    if (patch.role && patch.role !== user.role) {
      detailNotes.push(`Rol: ${user.role} -> ${patch.role}`);
      user.role = patch.role as UserRole;
    }
    if (patch.banned !== undefined && patch.banned !== user.banned) {
      user.banned = Boolean(patch.banned);
      detailNotes.push(user.banned ? 'Hesab bloklandı (Ban)' : 'Blok götürüldü');
    }
    if (patch.verified !== undefined) {
      user.verified = Boolean(patch.verified);
      detailNotes.push(`Verified: ${user.verified}`);
    }
    if (patch.firstName) user.firstName = patch.firstName.trim();
    if (patch.lastName) user.lastName = patch.lastName.trim();
    if (patch.companyName !== undefined) user.companyName = patch.companyName.trim();
    if (patch.phone !== undefined) user.phone = patch.phone.trim();

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: patch.banned ? 'ISTIFADECI_BAN' : 'ISTIFADECI_YENILENDI',
      details: `${user.firstName} ${user.lastName} (${user.email}): ${detailNotes.join(' | ') || 'profil yeniləndi'}`,
      severity: patch.banned ? 'critical' : 'info',
    });

    res.json({ user: sanitizeUser(user) });
  });

  // Admin: Reply to comment with Admin badge
  app.post('/api/admin/comments/:id/reply', requireAdmin, (req, res) => {
    const state = db.getState();
    const comment = state.comments.find((c) => c.id === req.params.id);
    if (!comment) {
      res.status(404).json({ error: 'Rəy tapılmadı.' });
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Cavab mətni boş ola bilməz.' });
      return;
    }

    comment.adminReply = {
      text: text.trim(),
      repliedBy: 'Admin',
      repliedAt: new Date().toISOString(),
    };

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'REYE_ADMIN_CAVABI',
      details: `${comment.authorName} rəyinə Admin cavabı yazıldı (${comment.id})`,
      severity: 'info',
    });

    res.json({ comment });
  });

  // Admin: Edit comment
  app.patch('/api/admin/comments/:id', requireAdmin, (req, res) => {
    const state = db.getState();
    const comment = state.comments.find((c) => c.id === req.params.id);
    if (!comment) {
      res.status(404).json({ error: 'Rəy tapılmadı.' });
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Rəy mətni boş ola bilməz.' });
      return;
    }
    comment.text = text.trim();

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'REY_REDAKTE_EDILDI',
      details: `Rəy redaktə edildi (${comment.id})`,
      severity: 'info',
    });

    res.json({ comment });
  });

  // Admin: Delete comment
  app.delete('/api/admin/comments/:id', requireAdmin, (req, res) => {
    const state = db.getState();
    const idx = state.comments.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Rəy tapılmadı.' });
      return;
    }
    const removed = state.comments[idx];
    state.comments.splice(idx, 1);

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'REY_SILINDI',
      details: `${removed.authorName} tərəfindən yazılmış rəy silindi (${removed.id})`,
      severity: 'warning',
    });

    res.json({ ok: true });
  });

  // Admin: Update System Settings
  app.patch('/api/admin/settings', requireAdmin, (req, res) => {
    const state = db.getState();
    const patch = req.body as Partial<typeof state.settings>;
    const changes: string[] = [];

    if (patch.maintenanceMode !== undefined) {
      state.settings.maintenanceMode = Boolean(patch.maintenanceMode);
      changes.push(`Texniki Baxım Rejimi: ${state.settings.maintenanceMode ? 'AKTİV' : 'DEAKTİV'}`);
    }
    if (patch.registrationEnabled !== undefined) {
      state.settings.registrationEnabled = Boolean(patch.registrationEnabled);
      changes.push(`Qeydiyyat: ${state.settings.registrationEnabled ? 'AÇIQ' : 'BAĞLI'}`);
    }
    if (patch.requireApproval !== undefined) {
      state.settings.requireApproval = Boolean(patch.requireApproval);
      changes.push(`Elan Təsdiqi: ${state.settings.requireApproval ? 'Admin Təsdiqli' : 'Avtomatik'}`);
    }

    db.addAuditLog({
      ip: getClientIp(req),
      actorName: 'Baş Administrator',
      actorRole: 'Admin',
      action: 'SISTEM_TENZIMLEMELERI',
      details: changes.join(' | '),
      severity: patch.maintenanceMode ? 'warning' : 'info',
    });

    res.json({ settings: state.settings });
  });

  // Vite integration in dev / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Beton İşləri serveri http://0.0.0.0:${PORT} ünvanında işləyir`);
  });
}

startServer();
