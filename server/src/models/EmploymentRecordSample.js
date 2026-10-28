import mongoose from 'mongoose';

const employmentRecordSampleSchema = new mongoose.Schema(
  {
    employeeRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    employerName: {
      type: String,
      required: true,
      trim: true,
    },
    employerCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
    },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Consultant'],
      default: 'Full-Time',
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    relievingDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['CURRENTLY_EMPLOYED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'CONTRACT_ENDED'],
      required: true,
    },
    lastWorkingDay: {
      type: Date,
      default: null,
    },
    reasonForLeaving: {
      type: String,
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

employmentRecordSampleSchema.index({ organizationId: 1 });

employmentRecordSampleSchema.index({ employerCode: 1 });

export const EmploymentRecordSample = mongoose.model('EmploymentRecordSample', employmentRecordSampleSchema);
