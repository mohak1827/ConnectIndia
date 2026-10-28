import mongoose from 'mongoose';

const providerConfigSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    adapterType: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ['mock', 'sandbox', 'production'],
      default: 'mock',
    },
    healthState: {
      type: String,
      enum: ['Online', 'Degraded', 'Unavailable'],
      default: 'Online',
    },
    latencyAvgMs: {
      type: Number,
      default: 120,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

providerConfigSchema.index({ serviceId: 1 });
providerConfigSchema.index({ organizationId: 1 });

export const ProviderConfig = mongoose.model('ProviderConfig', providerConfigSchema);
