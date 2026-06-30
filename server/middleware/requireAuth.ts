import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please log in first.' });
}

export function requireOrgAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as any;
    if (user && (user.role === 'org_admin' || user.role === 'super_admin')) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden. Organization admin role required.' });
    return;
  }
  res.status(401).json({ error: 'Unauthorized.' });
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as any;
    if (user && user.role === 'super_admin') {
      return next();
    }
    res.status(403).json({ error: 'Forbidden. Super Admin role required.' });
    return;
  }
  res.status(401).json({ error: 'Unauthorized.' });
}
