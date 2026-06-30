import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { findUserById, findOrCreateUserFromOAuthProfile } from '../db/usersRepo';

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  const lower = val.trim().toLowerCase();
  return (
    lower.startsWith('your_') ||
    lower.includes('replace_this') ||
    lower === '' ||
    lower.length < 10
  );
}

export function configurePassport(): void {
  // Serialize user ID into the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session ID
  passport.deserializeUser((id: number, done) => {
    try {
      const user = findUserById(id);
      if (!user) {
        // Correctly return false to indicate session user no longer exists
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  const callbackBase = process.env.APP_URL || process.env.OAUTH_CALLBACK_BASE_URL || 'http://localhost:3000';

  // 1. Google Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (isPlaceholder(googleClientId) || isPlaceholder(googleClientSecret)) {
    console.warn('[Auth] Google OAuth credentials are empty or placeholders. Skipping Google Strategy setup.');
  } else {
    console.log('[Auth] Google OAuth Strategy configured.');
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId!,
          clientSecret: googleClientSecret!,
          callbackURL: `${callbackBase}/api/auth/google/callback`,
          passReqToCallback: true,
        },
        async (_req, _accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email returned from Google.'));
            }
            const user = findOrCreateUserFromOAuthProfile({
              email,
              name: profile.displayName || profile.username || 'Google User',
              avatarUrl: profile.photos?.[0]?.value,
              provider: 'google',
              id: profile.id,
            });
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  }

  // 2. GitHub Strategy
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (isPlaceholder(githubClientId) || isPlaceholder(githubClientSecret)) {
    console.warn('[Auth] GitHub OAuth credentials are empty or placeholders. Skipping GitHub Strategy setup.');
  } else {
    console.log('[Auth] GitHub OAuth Strategy configured.');
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId!,
          clientSecret: githubClientSecret!,
          callbackURL: `${callbackBase}/api/auth/github/callback`,
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            // GitHub doesn't always expose email if private, but Passport tries to fetch it or we fall back.
            // In a production app, profile.emails is a list or we can fall back to username@github.com
            const email = profile.emails?.[0]?.value || `${profile.username || profile.id}@github.com`;
            const user = findOrCreateUserFromOAuthProfile({
              email,
              name: profile.displayName || profile.username || 'GitHub User',
              avatarUrl: profile.photos?.[0]?.value || profile._json?.avatar_url,
              provider: 'github',
              id: profile.id.toString(),
            });
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  }
}

export default passport;
