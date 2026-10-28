import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    memberCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
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
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'active',
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

organizationSchema.index({ category: 1, status: 1 });

export const Organization = mongoose.model('Organization', organizationSchema);
