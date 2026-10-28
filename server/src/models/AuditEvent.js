import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    outcome: {
      type: String,
      enum: ['SUCCESS', 'DENIED', 'FAILURE'],
      required: true,
    },
    requestId: {
      type: String,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    details: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ actorEmail: 1, createdAt: -1 });
auditEventSchema.index({ resourceType: 1, outcome: 1 });

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
