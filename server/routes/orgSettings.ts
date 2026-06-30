import { Router } from 'express';
import Joi from 'joi';
import { requireAuth, requireOrgAdmin } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validateInput';
import { getSettings, updateThreshold, updateDefaults } from '../db/orgSettingsRepo';

const router = Router();

const thresholdSchema = Joi.object({
  thresholdUsd: Joi.number().precision(2).min(0).allow(null).required(),
});

const defaultsSchema = Joi.object({
  cpu: Joi.number().integer().min(1).max(128).required(),
  ram: Joi.number().integer().min(1).max(512).required(),
  storage: Joi.number().integer().min(10).max(10000).required(),
  bandwidth: Joi.number().integer().min(1).max(10000).required(),
});

// Retrieve org settings
router.get('/', requireAuth, (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    const s = getSettings(orgId);

    res.json({
      orgId: s.org_id,
      costAlertThresholdUsd: s.cost_alert_threshold_usd,
      defaultSpecs: {
        cpu: s.default_cpu,
        ram: s.default_ram,
        storage: s.default_storage,
        bandwidth: s.default_bandwidth,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update threshold (admin only)
router.put('/cost-alert-threshold', requireOrgAdmin, validateBody(thresholdSchema), (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { thresholdUsd } = req.body;

    updateThreshold(orgId, thresholdUsd);
    res.json({ success: true, message: 'Cost alert threshold updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// Update default specs for organization (optional helper endpoint)
router.put('/defaults', requireOrgAdmin, validateBody(defaultsSchema), (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { cpu, ram, storage, bandwidth } = req.body;

    updateDefaults(orgId, cpu, ram, storage, bandwidth);
    res.json({ success: true, message: 'Default specifications updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
