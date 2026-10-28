import mongoose from 'mongoose';

const identityDocumentSampleSchema = new mongoose.Schema(
  {
    documentRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ['National ID', 'Passport', 'Driving License', 'Voter ID', 'Resident Permit'],
    },
    issuingAuthority: {
      type: String,
      required: true,
      trim: true,
    },
    holderName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['M', 'F', 'O'],
      default: 'M',
    },
    address: {
      type: String,
      default: '',
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['VALID', 'EXPIRED', 'REVOKED', 'SUSPENDED'],
      required: true,
    },
    nationality: {
      type: String,
      default: 'Indian',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

identityDocumentSampleSchema.index({ organizationId: 1 });

identityDocumentSampleSchema.index({ documentType: 1 });

export const IdentityDocumentSample = mongoose.model('IdentityDocumentSample', identityDocumentSampleSchema);
