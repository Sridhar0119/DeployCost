import { Store } from 'express-session';
import db from '../db/connection';

export class SQLiteSessionStore extends Store {
  constructor() {
    super();
    // Setup lazy clean interval every hour
    const interval = setInterval(() => {
      this.clearExpired();
    }, 60 * 60 * 1000);
    // Unref so it doesn't block node shutdown
    if (interval && typeof interval.unref === 'function') {
      interval.unref();
    }
  }

  private clearExpired(): void {
    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
      stmt.run(now);
    } catch (err) {
      console.error('[SessionStore] Error sweeping expired sessions:', err);
    }
  }

  get(sid: string, callback: (err: any, session?: any) => void): void {
    try {
      const stmt = db.prepare('SELECT * FROM sessions WHERE sid = ?');
      const row = stmt.get(sid) as { sid: string; session_json: string; expires_at: number } | undefined;

      if (!row) {
        return callback(null, null);
      }

      const now = Math.floor(Date.now() / 1000);
      if (row.expires_at < now) {
        // Expired - lazy delete
        this.destroy(sid, () => {});
        return callback(null, null);
      }

      const sessionData = JSON.parse(row.session_json);
      callback(null, sessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: any, callback: (err?: any) => void): void {
    try {
      const session_json = JSON.stringify(session);
      
      // Determine expiration
      let expires_at: number;
      if (session && session.cookie && session.cookie.expires) {
        expires_at = Math.floor(new Date(session.cookie.expires).getTime() / 1000);
      } else {
        expires_at = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // Default 7 days
      }

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO sessions (sid, session_json, expires_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(sid, session_json, expires_at);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid: string, callback: (err?: any) => void): void {
    try {
      const stmt = db.prepare('DELETE FROM sessions WHERE sid = ?');
      stmt.run(sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  touch(sid: string, session: any, callback: (err?: any) => void): void {
    try {
      // Determine new expiration
      let expires_at: number;
      if (session && session.cookie && session.cookie.expires) {
        expires_at = Math.floor(new Date(session.cookie.expires).getTime() / 1000);
      } else {
        expires_at = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      }

      const stmt = db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?');
      stmt.run(expires_at, sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}
export default SQLiteSessionStore;
