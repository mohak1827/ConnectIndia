import { AuditEvent } from '../models/AuditEvent.js';

export async function logAuditEvent({
  actorId = null,
  actorEmail = 'system@connectindia.local',
  action,
  resourceType,
  resourceId = null,
  outcome = 'SUCCESS',
  requestId = null,
  ipAddress = '127.0.0.1',
  details = '',
}) {
  try {
    const event = new AuditEvent({
      actorId,
      actorEmail,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : null,
      outcome,
      requestId,
      ipAddress,
      details,
    });
    await event.save();
    return event;
  } catch (error) {
    // Audit failures should not crash the main thread, but must be logged
    console.error('[AuditService] Failed to record audit event:', error.message);
    return null;
  }
}
