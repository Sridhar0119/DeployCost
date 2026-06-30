import db from './connection';
import { Alert } from '../types';

export function createAlert(
  orgId: number,
  type: 'cost_threshold' | 'estimate_run' | 'upload_failed',
  message: string,
  metadataJson: string | null = null
): number {
  const stmt = db.prepare(`
    INSERT INTO alerts (org_id, type, message, metadata_json, is_read)
    VALUES (?, ?, ?, ?, 0)
  `);
  const info = stmt.run(orgId, type, message, metadataJson);
  return Number(info.lastInsertRowid);
}

export function getAlertsByOrg(orgId: number): { alerts: Alert[]; unreadCount: number } {
  const listStmt = db.prepare(`
    SELECT * FROM alerts 
    WHERE org_id = ? 
    ORDER BY created_at DESC
  `);
  const alerts = (listStmt.all(orgId) as unknown as Alert[]) || [];

  const countStmt = db.prepare(`
    SELECT COUNT(*) as cnt FROM alerts 
    WHERE org_id = ? AND is_read = 0
  `);
  const countRes = countStmt.get(orgId) as { cnt: number } | undefined;
  const unreadCount = countRes ? countRes.cnt : 0;

  return { alerts, unreadCount };
}

export function markAlertsAsRead(orgId: number): void {
  const stmt = db.prepare('UPDATE alerts SET is_read = 1 WHERE org_id = ?');
  stmt.run(orgId);
}
