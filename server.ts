import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import * as fs from 'fs';
import { createServer as createViteServer } from 'vite';

import { SQLiteSessionStore } from './server/auth/sqliteSessionStore';
import { configurePassport } from './server/auth/passportConfig';

// Import Routers
import authRouter from './server/routes/auth';
import estimateRouter from './server/routes/estimate';
import estimatesRouter from './server/routes/estimates';
import alertsRouter from './server/routes/alerts';
import orgSettingsRouter from './server/routes/orgSettings';
import adminRouter from './server/routes/admin';
import analyzeRouter from './server/routes/analyze';
import uploadRouter from './server/routes/upload';

// Import cleanup helpers
import { getExpiredSessions, updateUploadSessionStatus } from './server/db/uploadSessionsRepo';
import { deleteChunksDir } from './server/services/chunkStorage';

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

  // 1. Trust proxy (essential for Cloud Run & rate limiting under nginx)
  app.set('trust proxy', 1);

  // 2. Helmet Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP in dev to allow Vite overlay and scripts in preview iframe
      crossOriginEmbedderPolicy: false,
    })
  );

  // 3. CORS configuration matching user's FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || '';
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin and requests from FRONTEND_URL or AI Studio/GCP domains
        if (
          !origin ||
          origin.endsWith('.run.app') ||
          origin.endsWith('.google.com') ||
          origin === frontendUrl ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          callback(null, true);
        } else {
          // Cleanly deny without throwing an Express server error
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  // 4. Request Parse Parsers with ample limits for config uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 5. Setup SQLite Session Store
  console.log('[Server] Configuring SQLite session store...');
  const sessionStore = new SQLiteSessionStore();
  
  // Support Header-based session IDs for cross-origin iframe contexts (when cookies are blocked)
  app.use((req: any, res, next) => {
    const sessionId = req.headers['x-session-id'] || req.query.session_id;
    if (sessionId && typeof sessionId === 'string') {
      req.signedCookies = req.signedCookies || {};
      req.signedCookies['connect.sid'] = sessionId;
    }
    next();
  });

  // Setup cookie attributes based on iframe context
  // AI Studio runs in iframe, SameSite: 'none' and Secure: true are MANDATORY
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'deploycost-dashboard-super-secure-secret-key-99',
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        httpOnly: true,
        secure: true, // required for SameSite=None
        sameSite: 'none', // required for iframe cross-origin setting
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // 6. Initialize Passport Auth
  app.use(passport.initialize());
  app.use(passport.session());
  configurePassport();

  // 7. Register Backend API Router Routes
  app.use('/api/auth', authRouter);
  app.use('/api/estimate', estimateRouter);
  app.use('/api/estimates', estimatesRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/org-settings', orgSettingsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/analyze', analyzeRouter);
  app.use('/api/upload', uploadRouter);

  // 8. Background Cleanup Sweep for expired upload sessions (runs hourly)
  const cleanupInterval = setInterval(() => {
    try {
      console.log('[CleanupWorker] Checking for expired chunked upload sessions (> 2 hours)...');
      const expired = getExpiredSessions(2);
      if (expired.length > 0) {
        console.log(`[CleanupWorker] Found ${expired.length} expired upload sessions. Evicting...`);
        for (const session of expired) {
          updateUploadSessionStatus(session.id, 'expired', 'Upload session expired due to inactivity.');
          deleteChunksDir(session.id);
          console.log(`[CleanupWorker] Successfully purged session dir for expired session: ${session.id}`);
        }
      }
    } catch (err) {
      console.error('[CleanupWorker] Error during automatic cleanup sweep:', err);
    }
  }, 60 * 60 * 1000); // 1 Hour

  // Unref the timer so the node server can exit cleanly
  if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  // 9. Standard Global Error Handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Global Error Handler]:', err);
    res.status(err.status || 500).json({
      error: isProd ? 'An internal server error occurred.' : err.message || 'Unknown Server Error',
    });
  });

  // 10. Vite Middleware or Production Static Handler
  if (!isProd) {
    console.log('[Server] Starting in DEVELOPMENT mode. Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Starting in PRODUCTION mode. Serving compiled static assets...');
    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      console.warn(`⚠️ Warning: Static assets directory "${distPath}" does not exist. Remember to build before starting.`);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind and listen
  app.listen(PORT, HOST, () => {
    console.log(`🚀 DeployCost Dashboard is live and running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Failure]:', err);
});
