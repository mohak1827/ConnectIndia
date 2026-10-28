import mongoose from 'mongoose';

const providerAccessRequestSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    providerCategory: {
      type: String,
      required: true,
      enum: [
        'Education',
        'Identity',
        'Transport',
        'Healthcare',
        'Governance',
        'Insurance',
        'Employment',
        'Business',
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
    serviceOfferings: {
      type: String,
      required: true,
      trim: true,
    },
    technicalContactEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
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
    createdOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

providerAccessRequestSchema.index({ status: 1, createdAt: -1 });
providerAccessRequestSchema.index({ officialEmail: 1 });

export const ProviderAccessRequest = mongoose.model(
  'ProviderAccessRequest',
  providerAccessRequestSchema
);
