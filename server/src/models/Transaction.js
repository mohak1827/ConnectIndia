import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    // The organization that MADE the request (for data isolation)
    consumerOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },
    // Which verification service type (education, insurance, identity, employment, business)
    serviceType: {
      type: String,
      enum: ['education', 'insurance', 'identity', 'employment', 'business'],
      default: 'education',
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    providerName: {
      type: String,
      required: true,
    },
    consumerOrgName: {
      type: String,
      default: 'Authorized Consumer',
    },
    status: {
      type: String,
      enum: ['verified', 'mismatch', 'unavailable', 'denied', 'invalid_input', 'not_found', 'expired'],
      required: true,
    },
    latencyMs: {
      type: Number,
      required: true,
      default: 0,
    },
    errorCode: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ actorId: 1, createdAt: -1 });
transactionSchema.index({ consumerOrgId: 1, createdAt: -1 });
transactionSchema.index({ providerId: 1, createdAt: -1 });
transactionSchema.index({ serviceId: 1, createdAt: -1 });
transactionSchema.index({ serviceType: 1, createdAt: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
