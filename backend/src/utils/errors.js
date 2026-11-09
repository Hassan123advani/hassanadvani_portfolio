export class HttpError extends Error {
  constructor(status, message, code = 'ERROR', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg, 'UNAUTHENTICATED');
export const forbidden = (msg = 'You do not have permission to do that', code = 'FORBIDDEN') =>
  new HttpError(403, msg, code);
export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'NOT_FOUND');
export const conflict = (msg, code = 'CONFLICT') => new HttpError(409, msg, code);
export const unavailable = (msg, code = 'SERVICE_UNAVAILABLE') => new HttpError(503, msg, code);

/** Wrap async route handlers so rejections reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
