import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken & { role?: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch role from Firestore
    let role = 'Staff'; // Default role
    try {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        role = userDoc.data()?.role || 'Staff';
      } else {
        // If first user, make them Administrator, else Staff
        const usersSnapshot = await adminDb.collection('users').limit(1).get();
        if (usersSnapshot.empty) {
          role = 'Administrator';
        }
        await adminDb.collection('users').doc(decodedToken.uid).set({
          email: decodedToken.email,
          role: role,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error fetching user role:', e);
    }
    
    req.user = { ...decodedToken, role };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
};
