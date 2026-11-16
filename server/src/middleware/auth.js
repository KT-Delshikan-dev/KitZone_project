import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/api.js';
const key = new TextEncoder().encode(env.JWT_SECRET);
export async function signSession(user) { return new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(key); }
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) throw new AppError('Please sign in to continue', 401);
  const { payload } = await jwtVerify(token, key);
  req.user = { id: payload.sub, role: payload.role };
  next();
});
export function requireAdmin(req, _res, next) { if (req.user?.role !== 'admin') return next(new AppError('Admin access required', 403)); next(); }
export function originGuard(req, _res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !env.origins.includes(origin)) return next(new AppError('Request origin is not allowed', 403));
  next();
}
