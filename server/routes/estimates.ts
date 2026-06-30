import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { getEstimatesByOrg, clearEstimatesByOrg } from '../db/estimatesRepo';

const router = Router();

// Get last 10 estimates for organization
router.get('/', requireAuth, (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    const estimates = getEstimatesByOrg(orgId, 10);
    
    // Parse specs and results JSONs for the UI
    const formatted = estimates.map((e) => {
      let specs = {};
      let results = {};
      try {
        specs = JSON.parse(e.specs_json);
        results = JSON.parse(e.results_json);
      } catch {
        // use blank
      }
      return {
        id: e.id,
        orgId: e.org_id,
        userId: e.user_id,
        userName: e.userName || 'Unknown User',
        userEmail: e.userEmail || '',
        specs,
        results,
        cheapestPlatform: e.cheapest_platform,
        monthlyCostUsd: e.monthly_cost_usd,
        createdAt: e.created_at,
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// Clear estimates history for organization
router.delete('/', requireAuth, (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    clearEstimatesByOrg(orgId);
    res.json({ success: true, message: 'Estimation history cleared successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
