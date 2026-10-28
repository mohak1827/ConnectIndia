import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      // Exactly 3 roles supported: admin (PLATFORM_ADMIN), operator (PROVIDER_OPERATOR), verifier (ORGANIZATION_VERIFIER)
      enum: [
        'admin',
        'operator',
        'verifier',
        'PLATFORM_ADMIN',
        'PROVIDER_OPERATOR',
        'ORGANIZATION_VERIFIER',
      ],
      default: 'verifier',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ providerId: 1 });

export const User = mongoose.model('User', userSchema);
