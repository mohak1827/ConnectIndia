import mongoose from 'mongoose';

const organizationAccessRequestSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    organizationName: {
      type: String,
      required: true,
      trim: true,
    },
    organizationType: {
      type: String,
      required: true,
      enum: [
        'Financial Institution',
        'Insurance Company',
        'Insurance Provider',
        'University or College',
        'Education Board / University',
        'Employer',
        'Enterprise / Employer',
        'Hospital or Healthcare Organization',
        'Healthcare Provider',
        'Government Agency',
        'Business or Professional Organization',
        'Auditing & Compliance Firm',
        'Other',
      ],
    },
    officialEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    registrationNumber: {
      type: String,
      default: '',
      trim: true,
    },
    intendedServices: {
      type: [String],
      default: ['education', 'identity'],
    },
    reasonForAccess: {
      type: String,
      required: true,
      trim: true,
    },
    agreedToTerms: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewNote: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // After approval, the created organization ID
    createdOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    // Permitted services after approval
    permittedServices: {
      type: [String],
      default: ['insurance', 'identity', 'employment', 'business'],
    },
  },
  { timestamps: true }
);

organizationAccessRequestSchema.index({ status: 1, createdAt: -1 });
organizationAccessRequestSchema.index({ officialEmail: 1 });

export const OrganizationAccessRequest = mongoose.model(
  'OrganizationAccessRequest',
  organizationAccessRequestSchema
);
