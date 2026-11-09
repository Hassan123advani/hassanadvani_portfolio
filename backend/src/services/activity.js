import { services } from './context.js';

/**
 * Append an entry to the activity log. Never throws: logging must not break
 * the action that triggered it.
 */
export async function logActivity(req, action, target = {}, meta = {}) {
  try {
    await services.db().collection('activityLogs').add({
      action,
      targetType: target.type || null,
      targetId: target.id || null,
      targetLabel: target.label || null,
      actorUid: req.admin?.uid || null,
      actorEmail: req.admin?.email || null,
      actorName: req.admin?.displayName || null,
      meta,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn('[activity] failed to log', action, err.message);
  }
}
