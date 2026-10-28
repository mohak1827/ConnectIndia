import mongoose from 'mongoose';

const insurancePolicySampleSchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    insurerCode: {
      type: String,
      required: true,
      trim: true,
    },
    insurerName: {
      type: String,
      required: true,
      trim: true,
    },
    policyType: {
      type: String,
      required: true,
      enum: ['Health', 'Life', 'Motor', 'Property', 'Travel', 'Commercial'],
    },
    policyHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    policyHolderRef: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'LAPSED', 'SUSPENDED'],
      required: true,
    },
    coverageStartDate: {
      type: Date,
      required: true,
    },
    coverageEndDate: {
      type: Date,
      required: true,
    },
    sumInsured: {
      type: String,
      default: '',
    },
    premiumStatus: {
      type: String,
      enum: ['PAID', 'OVERDUE', 'WAIVED'],
      default: 'PAID',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

insurancePolicySampleSchema.index({ organizationId: 1 });

insurancePolicySampleSchema.index({ insurerCode: 1 });

export const InsurancePolicySample = mongoose.model('InsurancePolicySample', insurancePolicySampleSchema);
