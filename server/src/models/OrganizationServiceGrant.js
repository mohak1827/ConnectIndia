import mongoose from 'mongoose';

const organizationServiceGrantSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'],
      default: 'ACTIVE',
    },
    allowedPurposes: {
      type: [String],
      default: [
        'academic_verification',
        'employment_screening',
        'employment_verification',
        'insurance_verification',
        'identity_verification',
        'business_verification',
        'kyc_onboarding',
      ],
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

organizationServiceGrantSchema.index({ organizationId: 1, serviceId: 1 }, { unique: true });
organizationServiceGrantSchema.index({ organizationId: 1, status: 1 });

export const OrganizationServiceGrant = mongoose.model(
  'OrganizationServiceGrant',
  organizationServiceGrantSchema
);
