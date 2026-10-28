import mongoose from 'mongoose';

const academicRecordSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    examYear: {
      type: Number,
      required: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: String,
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    institution: {
      type: String,
      required: true,
    },
    issuerCode: {
      type: String,
      required: true,
      default: 'CBSE',
    },
    cgpa: {
      type: String,
      required: true,
    },
    division: {
      type: String,
      default: 'First Class',
    },
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'WITHHELD'],
      default: 'PASS',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

academicRecordSchema.index({ organizationId: 1 });

academicRecordSchema.index({ rollNumber: 1, examYear: 1 });

export const AcademicRecord = mongoose.model('AcademicRecord', academicRecordSchema);
