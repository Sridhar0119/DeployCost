import { Router, Request, Response } from 'express';
import passport from 'passport';
import { findOrCreateUserFromOAuthProfile } from '../db/usersRepo';

const router = Router();

const OAUTH_SUCCESS_HTML = `
  <html>
    <body>
      <script>
        try {
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        } catch (err) {
          window.location.href = '/';
        }
      </script>
      <p>Authentication successful. Redirecting...</p>
    </body>
  </html>
`;

// Helper to check if a provider is configured
function isConfigured(clientId: string | undefined, clientSecret: string | undefined): boolean {
  if (!clientId || !clientSecret) return false;
  const c = clientId.trim().toLowerCase();
  const s = clientSecret.trim().toLowerCase();
  if (
    c === '' ||
    s === '' ||
    c.length < 10 ||
    s.length < 10 ||
    c.startsWith('your_') ||
    c.includes('replace_this') ||
    s.startsWith('your_') ||
    s.includes('replace_this')
  ) {
    return false;
  }
  return true;
}

// Check configured providers
router.get('/providers', (req, res) => {
  const google = isConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  const github = isConfigured(process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET);
  res.json({ google, github });
});

// Current User State
router.get('/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: req.user, sessionID: req.sessionID });
  }
  return res.json({ user: null });
});

// Logout User
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  });
});

// 1. Google OAuth Routes
router.get('/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(['/google/callback', '/google/callback/'], (req, res, next) => {
  passport.authenticate('google', (err: any, user: any) => {
    if (err || !user) {
      console.error('[Auth] Google OAuth callback error:', err);
      return res.redirect('/login?error=google_auth_failed');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) return res.redirect('/login?error=google_auth_failed');
      return res.send(OAUTH_SUCCESS_HTML);
    });
  })(req, res, next);
});

// 2. GitHub OAuth Routes
router.get('/github', (req, res, next) => {
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get(['/github/callback', '/github/callback/'], (req, res, next) => {
  passport.authenticate('github', (err: any, user: any) => {
    if (err || !user) {
      console.error('[Auth] GitHub OAuth callback error:', err);
      return res.redirect('/login?error=github_auth_failed');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) return res.redirect('/login?error=github_auth_failed');
      return res.send(OAUTH_SUCCESS_HTML);
    });
  })(req, res, next);
});

// 3. Dev Login Route
const allowDevLogin = process.env.ALLOW_DEV_LOGIN !== 'false';

if (allowDevLogin) {
  console.warn('⚠️ [Auth] ALLOW_DEV_LOGIN is enabled! Do not use this in production environments.');
  
  router.post('/dev-login', (req, res, next) => {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required.' });
    }

    try {
      const user = findOrCreateUserFromOAuthProfile({
        email,
        name,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        provider: 'dev',
        id: `dev-${Buffer.from(email).toString('hex')}`,
      });

      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({ user, sessionID: req.sessionID });
      });
    } catch (err) {
      next(err);
    }
  });
}

export default router;
