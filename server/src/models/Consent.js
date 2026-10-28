import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema(
  {
    subjectRef: {
      type: String,
      required: true,
      trim: true,
    },
    subjectUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    consumerOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired', 'denied'],
      default: 'active',
    },
    dataCategory: {
      type: String,
      default: 'Academic Credentials',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

consentSchema.index({ subjectRef: 1, status: 1 });
consentSchema.index({ consumerOrgId: 1, serviceId: 1 });

export const Consent = mongoose.model('Consent', consentSchema);
