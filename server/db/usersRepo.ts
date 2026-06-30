import db from './connection';
import { User, Organization } from '../types';

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'aol.com'
]);

export function findUserById(id: number): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const res = stmt.get(id);
  return (res as unknown as User) || null;
}

export function findUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const res = stmt.get(email.toLowerCase());
  return (res as unknown as User) || null;
}

export function findUserByOAuth(provider: string, oauthId: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?');
  const res = stmt.get(provider, oauthId);
  return (res as unknown as User) || null;
}

export function updateUserRole(userId: number, role: 'member' | 'org_admin' | 'super_admin'): void {
  const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
  stmt.run(role, userId);
}

export function deleteUser(userId: number): void {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(userId);
}

export function getUsersByOrg(orgId: number): User[] {
  const stmt = db.prepare('SELECT * FROM users WHERE org_id = ?');
  const res = stmt.all(orgId);
  return (res as unknown as User[]) || [];
}

export function getAllUsers(): (User & { org_name: string })[] {
  const stmt = db.prepare(`
    SELECT u.*, o.name as org_name 
    FROM users u
    LEFT JOIN organizations o ON u.org_id = o.id
  `);
  const res = stmt.all();
  return (res as unknown as (User & { org_name: string })[]) || [];
}

export function getAllOrganizations(): (Organization & { member_count: number })[] {
  const stmt = db.prepare(`
    SELECT o.*, COUNT(u.id) as member_count
    FROM organizations o
    LEFT JOIN users u ON u.org_id = o.id
    GROUP BY o.id
  `);
  const res = stmt.all();
  return (res as unknown as (Organization & { member_count: number })[]) || [];
}

/**
 * Main OAuth user lookup and onboarding transaction
 */
export function findOrCreateUserFromOAuthProfile(profile: {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'github' | 'dev';
  id: string;
}): User {
  const email = profile.email.toLowerCase();
  
  // 1. Check if user already exists
  let user = findUserByEmail(email);
  if (user) {
    // Check if OAuth details need to be linked or updated
    if (user.oauth_provider !== profile.provider || user.oauth_id !== profile.id) {
      const updateStmt = db.prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?');
      updateStmt.run(profile.provider, profile.id, user.id);
      user.oauth_provider = profile.provider;
      user.oauth_id = profile.id;
    }
    // Update avatar if provided
    if (profile.avatarUrl && user.avatar_url !== profile.avatarUrl) {
      const updateStmt = db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?');
      updateStmt.run(profile.avatarUrl, user.id);
      user.avatar_url = profile.avatarUrl;
    }
    return user;
  }

  // 2. User doesn't exist, execute transaction to create Org and User safely
  db.exec('BEGIN TRANSACTION;');
  try {
    const domain = email.split('@')[1] || 'workspace';
    let orgId: number;
    let role: 'member' | 'org_admin' | 'super_admin' = 'member';

    if (PERSONAL_DOMAINS.has(domain)) {
      // Create personal organization
      const orgName = `${profile.name}'s workspace`;
      const insertOrg = db.prepare('INSERT INTO organizations (name) VALUES (?)');
      const info = insertOrg.run(orgName);
      orgId = Number(info.lastInsertRowid);
      role = 'org_admin';
    } else {
      // Business domain: find or create organization
      const findOrg = db.prepare('SELECT id FROM organizations WHERE LOWER(name) = ?');
      const existingOrg = findOrg.get(domain) as { id: number } | undefined;

      if (existingOrg) {
        orgId = existingOrg.id;
        // Check if there are any members in this org yet
        const countMembers = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE org_id = ?');
        const countRes = countMembers.get(orgId) as { cnt: number } | undefined;
        if (!countRes || countRes.cnt === 0) {
          role = 'org_admin';
        } else {
          role = 'member';
        }
      } else {
        const insertOrg = db.prepare('INSERT INTO organizations (name) VALUES (?)');
        const info = insertOrg.run(domain);
        orgId = Number(info.lastInsertRowid);
        role = 'org_admin';
      }
    }

    // Insert new user
    const insertUser = db.prepare(`
      INSERT INTO users (email, name, avatar_url, oauth_provider, oauth_id, org_id, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const userInfo = insertUser.run(
      email,
      profile.name,
      profile.avatarUrl || null,
      profile.provider,
      profile.id,
      orgId,
      role
    );
    const userId = Number(userInfo.lastInsertRowid);

    // Create default org settings if the org was just created
    const checkSettings = db.prepare('SELECT 1 FROM org_settings WHERE org_id = ?');
    const hasSettings = checkSettings.get(orgId);
    if (!hasSettings) {
      const insertSettings = db.prepare(`
        INSERT INTO org_settings (org_id, cost_alert_threshold_usd, default_cpu, default_ram, default_storage, default_bandwidth)
        VALUES (?, ?, 2, 4, 50, 20)
      `);
      insertSettings.run(orgId, 500.0); // Default threshold: $500/mo
    }

    db.exec('COMMIT;');

    const createdUser = findUserById(userId);
    if (!createdUser) {
      throw new Error('Failed to retrieve newly created user.');
    }
    return createdUser;
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('[Database] Transaction error in findOrCreateUserFromOAuthProfile:', error);
    throw error;
  }
}
