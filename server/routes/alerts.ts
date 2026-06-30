import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { getAlertsByOrg, markAlertsAsRead } from '../db/alertsRepo';

const router = Router();

// Retrieve all alerts and unread counts for org
router.get('/', requireAuth, (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    const { alerts, unreadCount } = getAlertsByOrg(orgId);

    const formatted = alerts.map((a) => {
      let metadata = null;
      try {
        if (a.metadata_json) metadata = JSON.parse(a.metadata_json);
      } catch {
        // use raw
      }
      return {
        id: a.id,
        orgId: a.org_id,
        type: a.type,
        message: a.message,
        metadata,
        isRead: a.is_read === 1,
        createdAt: a.created_at,
      };
    });

    res.json({
      alerts: formatted,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

// Mark all alerts in org as read
router.post('/read-all', requireAuth, (req: any, res, next) => {
  try {
    const orgId = req.user.org_id;
    markAlertsAsRead(orgId);
    res.json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    next(err);
  }
});

export default router;
