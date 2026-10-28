import mongoose from 'mongoose';

const importJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    serviceCategory: {
      type: String,
      required: true,
      enum: ['Education', 'Insurance', 'Identity', 'Employment', 'Business'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    insertedCount: {
      type: Number,
      default: 0,
    },
    updatedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['COMPLETED', 'PARTIALLY_FAILED', 'FAILED'],
      default: 'COMPLETED',
    },
    errors: [
      {
        row: { type: Number },
        identifier: { type: String, default: '' },
        reason: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

importJobSchema.index({ providerId: 1, createdAt: -1 });

export const ImportJob = mongoose.model('ImportJob', importJobSchema);
