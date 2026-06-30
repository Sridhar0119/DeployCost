import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateInput';
import { estimateAWS } from '../services/awsPricing';
import { estimateAzure } from '../services/azurePricing';
import { estimateGCP } from '../services/gcpPricing';
import { estimateDO } from '../services/doPricing';
import { createEstimate } from '../db/estimatesRepo';
import { createAlert } from '../db/alertsRepo';
import { getSettings } from '../db/orgSettingsRepo';

const router = Router();

const estimateSchema = Joi.object({
  cpu: Joi.number().integer().min(1).max(128).required(),
  ram: Joi.number().integer().min(1).max(512).required(),
  storage: Joi.number().integer().min(10).max(10000).required(),
  bandwidth: Joi.number().integer().min(1).max(10000).required(),
});

router.post('/', requireAuth, validateBody(estimateSchema), async (req: any, res, next) => {
  try {
    const specs = req.body;
    const orgId = req.user.org_id;
    const userId = req.user.id;

    // Run all 4 estimators in parallel
    const [awsRes, azureRes, gcpRes, doRes] = await Promise.all([
      estimateAWS(specs),
      estimateAzure(specs),
      estimateGCP(specs),
      estimateDO(specs),
    ]);

    const platforms = [
      { name: 'AWS', cost: awsRes.totalCost },
      { name: 'Azure', cost: azureRes.totalCost },
      { name: 'GCP', cost: gcpRes.totalCost },
      { name: 'DigitalOcean', cost: doRes.totalCost },
    ];

    // Find cheapest platform
    platforms.sort((a, b) => a.cost - b.cost);
    const cheapest = platforms[0];

    const monthlyCostUsd = cheapest.cost;
    const annual = parseFloat((monthlyCostUsd * 12).toFixed(2));

    // Save estimate to DB
    const resultsJson = JSON.stringify({
      aws: awsRes,
      azure: azureRes,
      gcp: gcpRes,
      do: doRes,
    });

    createEstimate({
      org_id: orgId,
      user_id: userId,
      specs_json: JSON.stringify(specs),
      results_json: resultsJson,
      cheapest_platform: cheapest.name,
      monthly_cost_usd: monthlyCostUsd,
    });

    // Create automatic alert log: estimate_run
    createAlert(
      orgId,
      'estimate_run',
      `New estimate run completed. Best rate is on ${cheapest.name} ($${monthlyCostUsd}/mo).`,
      JSON.stringify({ specs, cheapestPlatform: cheapest.name, monthlyCostUsd })
    );

    // Verify against budget alerts
    const orgSettings = getSettings(orgId);
    if (orgSettings.cost_alert_threshold_usd !== null && monthlyCostUsd > orgSettings.cost_alert_threshold_usd) {
      createAlert(
        orgId,
        'cost_threshold',
        `⚠️ COST THRESHOLD EXCEEDED: Estimating $${monthlyCostUsd}/mo, which exceeds organization alert limit of $${orgSettings.cost_alert_threshold_usd}/mo.`,
        JSON.stringify({ specs, threshold: orgSettings.cost_alert_threshold_usd, monthlyCostUsd })
      );
    }

    res.json({
      aws: awsRes,
      azure: azureRes,
      gcp: gcpRes,
      do: doRes,
      cheapest: {
        name: cheapest.name,
        cost: cheapest.cost,
      },
      annual,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
