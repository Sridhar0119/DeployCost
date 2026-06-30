import db from './connection';
import { Estimate } from '../types';

export function createEstimate(params: {
  org_id: number;
  user_id: number;
  specs_json: string;
  results_json: string;
  cheapest_platform: string;
  monthly_cost_usd: number;
}): number {
  const stmt = db.prepare(`
    INSERT INTO estimates (org_id, user_id, specs_json, results_json, cheapest_platform, monthly_cost_usd)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    params.org_id,
    params.user_id,
    params.specs_json,
    params.results_json,
    params.cheapest_platform,
    params.monthly_cost_usd
  );
  return Number(info.lastInsertRowid);
}

export function getEstimatesByOrg(orgId: number, limit = 10): Estimate[] {
  const stmt = db.prepare(`
    SELECT e.*, u.name as userName, u.email as userEmail
    FROM estimates e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.org_id = ?
    ORDER BY e.created_at DESC
    LIMIT ?
  `);
  const res = stmt.all(orgId, limit);
  return (res as unknown as Estimate[]) || [];
}

export function clearEstimatesByOrg(orgId: number): void {
  const stmt = db.prepare('DELETE FROM estimates WHERE org_id = ?');
  stmt.run(orgId);
}
