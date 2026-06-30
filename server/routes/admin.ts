import { Router } from 'express';
import { requireSuperAdmin } from '../middleware/requireAuth';
import { getAllOrganizations, getUsersByOrg, getAllUsers, deleteUser } from '../db/usersRepo';

const router = Router();

// Enforce super_admin middleware for all routes in this router
router.use(requireSuperAdmin);

// Get all organizations with member counts
router.get('/organizations', (req, res, next) => {
  try {
    const orgs = getAllOrganizations();
    res.json(orgs);
  } catch (err) {
    next(err);
  }
});

// Get users in specific organization
router.get('/organizations/:orgId/users', (req, res, next) => {
  try {
    const orgId = parseInt(req.params.orgId, 10);
    if (isNaN(orgId)) {
      return res.status(400).json({ error: 'Invalid organization ID.' });
    }
    const users = getUsersByOrg(orgId);
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Get all users in database across all organizations
router.get('/users', (req, res, next) => {
  try {
    const users = getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// Remove user from system
router.delete('/users/:userId', (req: any, res, next) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    const selfId = req.user.id;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    if (targetUserId === selfId) {
      return res.status(400).json({ error: 'You cannot remove your own account from the admin panel.' });
    }

    deleteUser(targetUserId);
    res.json({ success: true, message: 'User removed successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
