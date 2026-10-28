import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'admin',
        'operator',
        'verifier',
        'PLATFORM_ADMIN',
        'PROVIDER_OPERATOR',
        'ORGANIZATION_VERIFIER',
      ],
    },
    label: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);
