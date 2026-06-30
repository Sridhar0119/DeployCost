import db from './connection';
import { OrgSettings } from '../types';

export function getSettings(orgId: number): OrgSettings {
  const stmt = db.prepare('SELECT * FROM org_settings WHERE org_id = ?');
  const res = stmt.get(orgId) as unknown as OrgSettings | undefined;

  if (res) {
    return res;
  }

  // Create default and return if not existing
  const insert = db.prepare(`
    INSERT INTO org_settings (org_id, cost_alert_threshold_usd, default_cpu, default_ram, default_storage, default_bandwidth)
    VALUES (?, 500.0, 2, 4, 50, 20)
  `);
  insert.run(orgId);

  return {
    org_id: orgId,
    cost_alert_threshold_usd: 500.0,
    default_cpu: 2,
    default_ram: 4,
    default_storage: 50,
    default_bandwidth: 20
  };
}

export function updateThreshold(orgId: number, thresholdUsd: number | null): void {
  const stmt = db.prepare('UPDATE org_settings SET cost_alert_threshold_usd = ? WHERE org_id = ?');
  stmt.run(thresholdUsd, orgId);
}

export function updateDefaults(
  orgId: number,
  cpu: number,
  ram: number,
  storage: number,
  bandwidth: number
): void {
  const stmt = db.prepare(`
    UPDATE org_settings 
    SET default_cpu = ?, default_ram = ?, default_storage = ?, default_bandwidth = ?
    WHERE org_id = ?
  `);
  stmt.run(cpu, ram, storage, bandwidth, orgId);
}
