import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    category: {
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
        'Verifier',
      ],
    },
    description: {
      type: String,
      required: true,
    },
    endpointAlias: {
      type: String,
      required: true,
      trim: true,
    },
    httpMethod: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      default: 'POST',
    },
    version: {
      type: String,
      default: 'v1.0',
    },
    status: {
      type: String,
      enum: ['active', 'beta', 'deprecated', 'offline'],
      default: 'active',
    },
    adapterKey: {
      type: String,
      required: true,
    },
    authRequirement: {
      type: String,
      enum: ['JWT_BEARER', 'MUTUAL_TLS', 'API_KEY', 'CONSENT_TOKEN'],
      default: 'JWT_BEARER',
    },
    isMock: {
      type: Boolean,
      default: true,
    },
    inputSchemaSummary: {
      type: String,
      default: 'JSON object containing request parameters',
    },
    requiredFields: [
      {
        type: String,
      },
    ],
    exampleRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    exampleResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ organizationId: 1 });
serviceSchema.index({ endpointAlias: 1 });

export const Service = mongoose.model('Service', serviceSchema);
