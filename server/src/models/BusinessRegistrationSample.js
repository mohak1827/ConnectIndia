import mongoose from 'mongoose';

const businessRegistrationSampleSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    gstinNumber: {
      type: String,
      trim: true,
      default: '',
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
      default: '',
    },
    registrationType: {
      type: String,
      required: true,
      enum: ['Sole Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited', 'Public Limited', 'OPC', 'Trust', 'Society', 'NGO'],
    },
    registrationDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'STRUCK_OFF', 'DISSOLVED', 'AMALGAMATED'],
      required: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    natureOfBusiness: {
      type: String,
      default: '',
    },
    directorNames: {
      type: [String],
      default: [],
    },
    cin: {
      type: String,
      default: '',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

businessRegistrationSampleSchema.index({ organizationId: 1 });

businessRegistrationSampleSchema.index({ gstinNumber: 1 });
businessRegistrationSampleSchema.index({ state: 1 });

export const BusinessRegistrationSample = mongoose.model('BusinessRegistrationSample', businessRegistrationSampleSchema);
