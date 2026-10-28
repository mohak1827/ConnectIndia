import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId && typeof incomingId === 'string' ? incomingId : `REQ-${uuidv4().substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
