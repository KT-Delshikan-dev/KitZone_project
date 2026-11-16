export class AppError extends Error { constructor(message, statusCode = 500, errors) { super(message); this.statusCode = statusCode; this.errors = errors; this.isOperational = true; } }
export function ok(res, data, message = 'OK', meta) { return res.json({ success: true, data, message, ...(meta ? { meta } : {}) }); }
export function asyncHandler(handler) { return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next); }
export function pageInfo(page, limit, total) { return { page, limit, total, pages: Math.ceil(total / limit) }; }
