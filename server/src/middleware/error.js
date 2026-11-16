import { AppError } from '../utils/api.js';
export function notFound(req, _res, next) { next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404)); }
export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500; let message = error.message || 'Unexpected server error';
  let errors = error.errors;
  if (error.name === 'ValidationError') { status = 400; message = 'Please check the submitted information'; errors = Object.values(error.errors).map((entry) => ({ field: entry.path, message: entry.message })); }
  if (error.name === 'MulterError') { status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400; message = error.code === 'LIMIT_FILE_SIZE' ? 'Image file is too large (5 MB maximum)' : 'Image upload limits were exceeded'; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid identifier'; }
  if (error.code === 11000) { status = 409; message = 'A record with that value already exists'; }
  if (error.name === 'JsonWebTokenError' || error.name === 'JWTExpired') { status = 401; message = 'Please sign in again'; }
  if (status >= 500) console.error(error);
  return res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Unexpected server error' : message, ...(errors ? { errors } : {}) });
}
