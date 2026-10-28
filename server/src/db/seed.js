import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Role } from '../models/Role.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { ProviderConfig } from '../models/ProviderConfig.js';
import { Consent } from '../models/Consent.js';
import { Transaction } from '../models/Transaction.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { AcademicRecord } from '../models/AcademicRecord.js';
import { InsurancePolicySample } from '../models/InsurancePolicySample.js';
import { IdentityDocumentSample } from '../models/IdentityDocumentSample.js';
import { EmploymentRecordSample } from '../models/EmploymentRecordSample.js';
import { BusinessRegistrationSample } from '../models/BusinessRegistrationSample.js';
import { OrganizationAccessRequest } from '../models/OrganizationAccessRequest.js';
import { ProviderAccessRequest } from '../models/ProviderAccessRequest.js';
import { OrganizationServiceGrant } from '../models/OrganizationServiceGrant.js';
import { ImportJob } from '../models/ImportJob.js';

export async function seedDatabase() {
  console.log('[Seed] Connecting to database...');
  await mongoose.connect(env.MONGO_URI);
  console.log('[Seed] Clearing existing collections...');

  await Promise.all([
    Role.deleteMany({}),
    Organization.deleteMany({}),
    User.deleteMany({}),
    Service.deleteMany({}),
    ProviderConfig.deleteMany({}),
    Consent.deleteMany({}),
    Transaction.deleteMany({}),
    AuditEvent.deleteMany({}),
    AcademicRecord.deleteMany({}),
    InsurancePolicySample.deleteMany({}),
    IdentityDocumentSample.deleteMany({}),
    EmploymentRecordSample.deleteMany({}),
    BusinessRegistrationSample.deleteMany({}),
    OrganizationAccessRequest.deleteMany({}),
    ProviderAccessRequest.deleteMany({}),
    OrganizationServiceGrant.deleteMany({}),
    ImportJob.deleteMany({}),
  ]);

  console.log('[Seed] Seeding Roles...');
  const roles = await Role.insertMany([
    {
      key: 'admin',
      label: 'Platform Administrator',
      permissions: [
        'system.overview',
        'services.manage_all',
        'organizations.manage',
        'provider.manage_all',
        'audit.read',
        'transactions.read_all',
        'education.verify',
        'insurance.verify',
        'identity.verify',
        'employment.verify',
        'business.verify',
      ],
    },
    {
      key: 'verifier',
      label: 'Authorized Verifier',
      permissions: [
        'education.verify',
        'insurance.verify',
        'identity.verify',
        'employment.verify',
        'business.verify',
        'services.read',
        'transactions.read_own',
        'consent.request',
      ],
    },
    {
      key: 'operator',
      label: 'Provider Operator',
      permissions: [
        'services.manage_own',
        'provider.manage_own',
        'transactions.read_provider',
        'services.read',
        'registry.manage',
      ],
    },
  ]);

  console.log('[Seed] Seeding Organizations...');
  const orgs = await Organization.insertMany([
    {
      name: 'Central Board of Secondary Education (CBSE)',
      memberCode: 'IN-CBSE-01',
      category: 'Education',
      contactEmail: 'contact@cbse.gov.in',
      description: 'National secondary school board of India issuing Grade 10 & 12 certifications.',
      status: 'active',
    },
    {
      name: 'University of Delhi (DU)',
      memberCode: 'IN-DU-01',
      category: 'Verifier',
      contactEmail: 'admissions@delhiuniv.ac.in',
      description: 'Premier collegiate public central university conducting applicant document verification.',
      status: 'active',
    },
    {
      name: 'ConnectIndia Mock Insurance Registry',
      memberCode: 'IN-INS-01',
      category: 'Insurance',
      contactEmail: 'registry@connectindia-insurance.mock',
      description: '[DEMO] Fictional insurance policy registry for prototype verification testing.',
      status: 'active',
    },
    {
      name: 'ConnectIndia Mock Identity Authority',
      memberCode: 'IN-ID-01',
      category: 'Identity',
      contactEmail: 'identity@connectindia-id.mock',
      description: '[DEMO] Fictional identity document registry. Not affiliated with any government body.',
      status: 'active',
    },
    {
      name: 'ConnectIndia Mock Employment Registry',
      memberCode: 'IN-EMP-01',
      category: 'Employment',
      contactEmail: 'employment@connectindia-emp.mock',
      description: '[DEMO] Fictional HR and employment record registry for prototype testing.',
      status: 'active',
    },
    {
      name: 'ConnectIndia Mock Business Registry',
      memberCode: 'IN-BIZ-01',
      category: 'Business',
      contactEmail: 'business@connectindia-biz.mock',
      description: '[DEMO] Fictional business registration registry. Not MCA21 or GST portal.',
      status: 'active',
    },
    {
      name: 'Reliance Life Insurance Co. Ltd. [DEMO]',
      memberCode: 'IN-DEMO-ORG-01',
      category: 'Verifier',
      contactEmail: 'demo-insurer@connectindia.mock',
      description: '[DEMO ACCOUNT] Sample verifier organization account for evaluation purposes.',
      status: 'active',
    },
    {
      name: 'Chitkara University',
      memberCode: 'IN-CHIT-01',
      category: 'Verifier',
      contactEmail: 'madhav@chitkara.edu.in',
      description: 'Collegiate university conducting applicant academic & identity verification checks.',
      status: 'active',
    },
  ]);

  const cbseOrg = orgs.find((o) => o.memberCode === 'IN-CBSE-01');
  const duOrg = orgs.find((o) => o.memberCode === 'IN-DU-01');
  const insOrg = orgs.find((o) => o.memberCode === 'IN-INS-01');
  const idOrg = orgs.find((o) => o.memberCode === 'IN-ID-01');
  const empOrg = orgs.find((o) => o.memberCode === 'IN-EMP-01');
  const bizOrg = orgs.find((o) => o.memberCode === 'IN-BIZ-01');
  const demoOrg = orgs.find((o) => o.memberCode === 'IN-DEMO-ORG-01');
  const chitkaraOrg = orgs.find((o) => o.memberCode === 'IN-CHIT-01');

  console.log('[Seed] Seeding Users...');
  const demoPasswordHash = await bcrypt.hash('DemoPassword123!', 10);

  const users = await User.insertMany([
    {
      email: 'admin@connectindia.gov.in',
      passwordHash: demoPasswordHash,
      displayName: 'Rajesh Kumar (Platform Admin)',
      role: 'admin',
      organizationId: null,
      providerId: null,
      status: 'active',
    },
    {
      email: 'verifier@delhiuniv.ac.in',
      passwordHash: demoPasswordHash,
      displayName: 'Dr. Sunita Rao (Admissions Dean)',
      role: 'verifier',
      organizationId: duOrg._id,
      providerId: null,
      status: 'active',
    },
    {
      email: 'verifier@delhiuniversity.ac.in',
      passwordHash: demoPasswordHash,
      displayName: 'Dr. Sunita Rao (University of Delhi Dean)',
      role: 'verifier',
      organizationId: duOrg._id,
      providerId: null,
      status: 'active',
    },
    {
      email: 'madhav@chitkara.edu.in',
      passwordHash: demoPasswordHash,
      displayName: 'Madhav Sakhuja (Chitkara University)',
      role: 'verifier',
      organizationId: chitkaraOrg._id,
      providerId: null,
      status: 'active',
    },
    {
      email: 'operator@cbse.gov.in',
      passwordHash: demoPasswordHash,
      displayName: 'Vikram Joshi (CBSE IT Operator)',
      role: 'operator',
      organizationId: cbseOrg._id,
      providerId: cbseOrg._id,
      status: 'active',
    },
    {
      email: 'operator@insurance.mock',
      passwordHash: demoPasswordHash,
      displayName: 'Alok Gupta (Insurance Provider Operator)',
      role: 'operator',
      organizationId: insOrg._id,
      providerId: insOrg._id,
      status: 'active',
    },
    {
      email: 'verifier@reliance.mock',
      passwordHash: demoPasswordHash,
      displayName: 'Priya Mehra (Reliance Verification Officer)',
      role: 'verifier',
      organizationId: demoOrg._id,
      providerId: null,
      status: 'active',
    },
  ]);

  const adminUser = users.find((u) => u.email === 'admin@connectindia.gov.in');
  const verifierUser = users.find((u) => u.email === 'verifier@delhiuniv.ac.in');
  const operatorUser = users.find((u) => u.email === 'operator@cbse.gov.in');

  console.log('[Seed] Seeding Services...');
  const services = await Service.insertMany([
    {
      name: 'Academic Record Verification',
      organizationId: cbseOrg._id,
      category: 'Education',
      description: 'Verification of Grade 10 & 12 secondary marksheet transcripts issued by CBSE with deterministic fixture responses.',
      endpointAlias: '/api/v1/verify/education',
      httpMethod: 'POST',
      version: 'v1.2',
      status: 'active',
      adapterKey: 'education_adapter',
      authRequirement: 'JWT_BEARER',
      isMock: true,
      inputSchemaSummary: '{ rollNumber: string, examYear: number, candidateName: string, dob: string, course: string }',
      requiredFields: ['rollNumber', 'examYear', 'candidateName'],
    },
    {
      name: 'Insurance Policy Verification',
      organizationId: insOrg._id,
      category: 'Insurance',
      description: '[DEMO] Fictional insurance policy verification. Not connected to any real insurer or IRDAI registry.',
      endpointAlias: '/api/v1/verify/insurance',
      httpMethod: 'POST',
      version: 'v1.0',
      status: 'active',
      adapterKey: 'mock_insurance_provider',
      authRequirement: 'JWT_BEARER',
      isMock: true,
      inputSchemaSummary: '{ policyNumber: string, insurerCode: string, policyType: string }',
      requiredFields: ['policyNumber'],
    },
    {
      name: 'Identity Document Verification',
      organizationId: idOrg._id,
      category: 'Identity',
      description: '[DEMO] Fictional identity document verification. NOT Aadhaar, PAN, or any official government ID verification.',
      endpointAlias: '/api/v1/verify/identity',
      httpMethod: 'POST',
      version: 'v1.0',
      status: 'active',
      adapterKey: 'mock_identity_provider',
      authRequirement: 'JWT_BEARER',
      isMock: true,
      inputSchemaSummary: '{ documentRef: string, documentType: string, holderName: string, dateOfBirth: string }',
      requiredFields: ['documentRef'],
    },
    {
      name: 'Employment Record Verification',
      organizationId: empOrg._id,
      category: 'Employment',
      description: '[DEMO] Fictional employment record verification against a mock HR registry.',
      endpointAlias: '/api/v1/verify/employment',
      httpMethod: 'POST',
      version: 'v1.0',
      status: 'active',
      adapterKey: 'mock_employment_provider',
      authRequirement: 'JWT_BEARER',
      isMock: true,
      inputSchemaSummary: '{ employeeRef: string, employerName: string }',
      requiredFields: ['employeeRef'],
    },
    {
      name: 'Business Registration Verification',
      organizationId: bizOrg._id,
      category: 'Business',
      description: '[DEMO] Fictional business registration verification. Not MCA21, GST Portal, or any real government registry.',
      endpointAlias: '/api/v1/verify/business',
      httpMethod: 'POST',
      version: 'v1.0',
      status: 'active',
      adapterKey: 'mock_business_provider',
      authRequirement: 'JWT_BEARER',
      isMock: true,
      inputSchemaSummary: '{ registrationNumber: string, businessName: string, registrationType: string, state: string }',
      requiredFields: ['registrationNumber'],
    },
  ]);

  const educationService = services.find((s) => s.adapterKey === 'education_adapter');
  const insuranceService = services.find((s) => s.adapterKey === 'mock_insurance_provider');
  const identityService = services.find((s) => s.adapterKey === 'mock_identity_provider');
  const employmentService = services.find((s) => s.adapterKey === 'mock_employment_provider');
  const businessService = services.find((s) => s.adapterKey === 'mock_business_provider');

  console.log('[Seed] Seeding Provider Configs...');
  await ProviderConfig.insertMany([
    {
      serviceId: educationService._id,
      organizationId: cbseOrg._id,
      adapterType: 'CBSE_MOCK_ADAPTER',
      environment: 'mock',
      healthState: 'Online',
      latencyAvgMs: 82,
      lastCheckedAt: new Date(),
    },
    {
      serviceId: insuranceService._id,
      organizationId: insOrg._id,
      adapterType: 'MOCK_INSURANCE_ADAPTER',
      environment: 'mock',
      healthState: 'Online',
      latencyAvgMs: 95,
      lastCheckedAt: new Date(),
    },
    {
      serviceId: identityService._id,
      organizationId: idOrg._id,
      adapterType: 'MOCK_IDENTITY_ADAPTER',
      environment: 'mock',
      healthState: 'Online',
      latencyAvgMs: 110,
      lastCheckedAt: new Date(),
    },
    {
      serviceId: employmentService._id,
      organizationId: empOrg._id,
      adapterType: 'MOCK_EMPLOYMENT_ADAPTER',
      environment: 'mock',
      healthState: 'Online',
      latencyAvgMs: 120,
      lastCheckedAt: new Date(),
    },
    {
      serviceId: businessService._id,
      organizationId: bizOrg._id,
      adapterType: 'MOCK_BUSINESS_ADAPTER',
      environment: 'mock',
      healthState: 'Online',
      latencyAvgMs: 105,
      lastCheckedAt: new Date(),
    },
  ]);

  // ─── FICTIONAL ACADEMIC RECORDS ───────────────────────────────────────────
  console.log('[Seed] Seeding Academic Records...');
  await AcademicRecord.insertMany([
    {
      rollNumber: 'CBSE-2023-90812',
      examYear: 2023,
      candidateName: 'Aarav Sharma',
      dob: '2005-04-12',
      course: 'Class XII Senior Secondary Examination',
      institution: 'Delhi Public School, R.K. Puram',
      issuerCode: 'CBSE',
      cgpa: '9.4',
      division: 'First Class with Distinction',
      status: 'PASS',
    },
    {
      rollNumber: 'CBSE-2023-88104',
      examYear: 2023,
      candidateName: 'Priya Patel',
      dob: '2005-09-22',
      course: 'Class XII Senior Secondary Examination',
      institution: 'Kendriya Vidyalaya No. 1, Delhi Cantt',
      issuerCode: 'CBSE',
      cgpa: '9.1',
      division: 'First Class',
      status: 'PASS',
    },
    {
      rollNumber: 'CBSE-2022-77291',
      examYear: 2022,
      candidateName: 'Rohan Verma',
      dob: '2004-11-05',
      course: 'Class X Secondary School Examination',
      institution: 'St. Xavier Senior Secondary School',
      issuerCode: 'CBSE',
      cgpa: '8.8',
      division: 'First Class',
      status: 'PASS',
    },
    {
      rollNumber: 'CBSE-2023-11002',
      examYear: 2023,
      candidateName: 'Kavita Nair',
      dob: '2005-01-30',
      course: 'Class XII Senior Secondary Examination',
      institution: 'Modern School, Barakhamba Road',
      issuerCode: 'CBSE',
      cgpa: '4.2',
      division: 'Compartment',
      status: 'FAIL',
    },
  ]);

  // ─── FICTIONAL INSURANCE POLICIES ─────────────────────────────────────────
  console.log('[Seed] Seeding Insurance Policy Samples...');
  await InsurancePolicySample.insertMany([
    {
      policyNumber: 'INS-HLTH-2024-001234',
      insurerCode: 'DEMO-INSURER-01',
      insurerName: 'SampleShield Health Insurance [DEMO]',
      policyType: 'Health',
      policyHolderName: 'Anita Krishnamurthy',
      policyHolderRef: 'HOLDER-AK-001',
      status: 'ACTIVE',
      coverageStartDate: new Date('2024-01-01'),
      coverageEndDate: new Date('2028-12-31'),
      sumInsured: '₹5,00,000',
      premiumStatus: 'PAID',
    },
    {
      policyNumber: 'INS-LIFE-2023-009988',
      insurerCode: 'DEMO-INSURER-02',
      insurerName: 'ProtectLife Corp [DEMO]',
      policyType: 'Life',
      policyHolderName: 'Ramesh Gupta',
      policyHolderRef: 'HOLDER-RG-002',
      status: 'ACTIVE',
      coverageStartDate: new Date('2023-06-01'),
      coverageEndDate: new Date('2033-05-31'),
      sumInsured: '₹50,00,000',
      premiumStatus: 'PAID',
    },
    {
      policyNumber: 'INS-MOTR-2022-556677',
      insurerCode: 'DEMO-INSURER-01',
      insurerName: 'SampleShield Health Insurance [DEMO]',
      policyType: 'Motor',
      policyHolderName: 'Deepak Joshi',
      policyHolderRef: 'HOLDER-DJ-003',
      status: 'EXPIRED',
      coverageStartDate: new Date('2022-03-15'),
      coverageEndDate: new Date('2023-03-14'),
      sumInsured: '₹3,00,000',
      premiumStatus: 'PAID',
    },
    {
      policyNumber: 'INS-HLTH-2024-007711',
      insurerCode: 'DEMO-INSURER-03',
      insurerName: 'FutureGuard Insurance [DEMO]',
      policyType: 'Health',
      policyHolderName: 'Sunita Mehra',
      policyHolderRef: 'HOLDER-SM-004',
      status: 'CANCELLED',
      coverageStartDate: new Date('2024-02-01'),
      coverageEndDate: new Date('2025-01-31'),
      sumInsured: '₹10,00,000',
      premiumStatus: 'OVERDUE',
    },
    {
      policyNumber: 'INS-TRVL-2024-998811',
      insurerCode: 'DEMO-INSURER-02',
      insurerName: 'ProtectLife Corp [DEMO]',
      policyType: 'Travel',
      policyHolderName: 'Kiran Patel',
      policyHolderRef: 'HOLDER-KP-005',
      status: 'ACTIVE',
      coverageStartDate: new Date('2024-08-01'),
      coverageEndDate: new Date('2024-12-31'),
      sumInsured: '₹25,00,000',
      premiumStatus: 'PAID',
    },
  ]);

  // ─── FICTIONAL IDENTITY DOCUMENTS ─────────────────────────────────────────
  console.log('[Seed] Seeding Identity Document Samples...');
  await IdentityDocumentSample.insertMany([
    {
      documentRef: 'NID-DEMO-2020-AA1234',
      documentType: 'National ID',
      issuingAuthority: 'ConnectIndia Demo Identity Authority',
      holderName: 'Aarav Sharma',
      dateOfBirth: '2005-04-12',
      gender: 'M',
      address: '42, Lajpat Nagar, New Delhi - 110024',
      issueDate: new Date('2020-08-01'),
      expiryDate: new Date('2030-07-31'),
      status: 'VALID',
      nationality: 'Indian',
    },
    {
      documentRef: 'PPT-DEMO-2022-XB9981',
      documentType: 'Passport',
      issuingAuthority: 'Regional Passport Office [DEMO]',
      holderName: 'Priya Patel',
      dateOfBirth: '2005-09-22',
      gender: 'F',
      address: '15, Sector 21, Noida - 201301',
      issueDate: new Date('2022-03-10'),
      expiryDate: new Date('2032-03-09'),
      status: 'VALID',
      nationality: 'Indian',
    },
    {
      documentRef: 'DL-DEMO-2019-MH7734',
      documentType: 'Driving License',
      issuingAuthority: 'Regional Transport Office, Mumbai [DEMO]',
      holderName: 'Deepak Joshi',
      dateOfBirth: '1990-07-15',
      gender: 'M',
      address: '7, Shivaji Nagar, Pune - 411005',
      issueDate: new Date('2019-05-20'),
      expiryDate: new Date('2029-05-19'),
      status: 'VALID',
      nationality: 'Indian',
    },
    {
      documentRef: 'NID-DEMO-2021-EX8800',
      documentType: 'National ID',
      issuingAuthority: 'ConnectIndia Demo Identity Authority',
      holderName: 'Rohan Verma',
      dateOfBirth: '2004-11-05',
      gender: 'M',
      address: '88, Rajouri Garden, New Delhi - 110027',
      issueDate: new Date('2021-01-15'),
      expiryDate: new Date('2022-01-14'), // Expired
      status: 'EXPIRED',
      nationality: 'Indian',
    },
    {
      documentRef: 'VOTER-DEMO-2018-UP3344',
      documentType: 'Voter ID',
      issuingAuthority: 'Election Commission [DEMO]',
      holderName: 'Sunita Mehra',
      dateOfBirth: '1985-03-20',
      gender: 'F',
      address: '23, Civil Lines, Allahabad - 211001',
      issueDate: new Date('2018-02-01'),
      expiryDate: new Date('2028-01-31'),
      status: 'VALID',
      nationality: 'Indian',
    },
  ]);

  // ─── FICTIONAL EMPLOYMENT RECORDS ─────────────────────────────────────────
  console.log('[Seed] Seeding Employment Record Samples...');
  await EmploymentRecordSample.insertMany([
    {
      employeeRef: 'EMP-TCS-2019-00441',
      employerName: 'TechSolutions Corp [DEMO]',
      employerCode: 'DEMO-EMP-TECH-01',
      employeeName: 'Ramesh Gupta',
      designation: 'Senior Software Engineer',
      department: 'Platform Engineering',
      employmentType: 'Full-Time',
      joiningDate: new Date('2019-07-15'),
      relievingDate: null,
      status: 'CURRENTLY_EMPLOYED',
    },
    {
      employeeRef: 'EMP-INFOSYS-2017-02211',
      employerName: 'InfoSystems Pvt Ltd [DEMO]',
      employerCode: 'DEMO-EMP-INFO-02',
      employeeName: 'Anita Krishnamurthy',
      designation: 'Project Manager',
      department: 'Delivery',
      employmentType: 'Full-Time',
      joiningDate: new Date('2017-04-01'),
      relievingDate: new Date('2022-08-31'),
      status: 'RESIGNED',
      lastWorkingDay: new Date('2022-08-31'),
      reasonForLeaving: 'Career advancement',
    },
    {
      employeeRef: 'EMP-WIPRO-2020-08877',
      employerName: 'WaveLogic Technologies [DEMO]',
      employerCode: 'DEMO-EMP-WAVE-03',
      employeeName: 'Kiran Patel',
      designation: 'Data Analyst',
      department: 'Analytics',
      employmentType: 'Contract',
      joiningDate: new Date('2020-01-05'),
      relievingDate: new Date('2021-12-31'),
      status: 'CONTRACT_ENDED',
      lastWorkingDay: new Date('2021-12-31'),
    },
    {
      employeeRef: 'EMP-GOV-2015-00120',
      employerName: 'Ministry of Commerce [DEMO]',
      employerCode: 'DEMO-EMP-GOV-04',
      employeeName: 'Sunita Mehra',
      designation: 'Deputy Director',
      department: 'Trade Policy',
      employmentType: 'Full-Time',
      joiningDate: new Date('2015-03-01'),
      relievingDate: null,
      status: 'CURRENTLY_EMPLOYED',
    },
    {
      employeeRef: 'EMP-HDFC-2021-33400',
      employerName: 'Heritage Financial Services [DEMO]',
      employerCode: 'DEMO-EMP-FIN-05',
      employeeName: 'Deepak Joshi',
      designation: 'Branch Operations Manager',
      department: 'Retail Banking',
      employmentType: 'Full-Time',
      joiningDate: new Date('2021-09-15'),
      relievingDate: new Date('2023-06-30'),
      status: 'TERMINATED',
      lastWorkingDay: new Date('2023-06-30'),
    },
  ]);

  // ─── FICTIONAL BUSINESS REGISTRATIONS ─────────────────────────────────────
  console.log('[Seed] Seeding Business Registration Samples...');
  await BusinessRegistrationSample.insertMany([
    {
      registrationNumber: 'BIZ-MCA-2018-PVT-77441',
      gstinNumber: 'GSTIN-DEMO-07AABCT1234A1Z5',
      businessName: 'TechSolutions Corp Private Limited [DEMO]',
      legalName: 'TECHSOLUTIONS CORP PRIVATE LIMITED',
      registrationType: 'Private Limited',
      registrationDate: new Date('2018-05-10'),
      status: 'ACTIVE',
      state: 'Delhi',
      address: 'Plot 5, Cyber City, Gurugram, Haryana - 122002',
      natureOfBusiness: 'Information Technology Services',
      directorNames: ['Arjun Mehta', 'Shalini Kapoor'],
      cin: 'U72900DL2018PTC077441',
    },
    {
      registrationNumber: 'BIZ-MCA-2012-LLP-09981',
      gstinNumber: 'GSTIN-DEMO-27AABCF5678B2Z6',
      businessName: 'InfoSystems Partners LLP [DEMO]',
      legalName: 'INFOSYSTEMS PARTNERS LLP',
      registrationType: 'LLP',
      registrationDate: new Date('2012-11-20'),
      status: 'ACTIVE',
      state: 'Maharashtra',
      address: 'Unit 12, Bandra Kurla Complex, Mumbai - 400051',
      natureOfBusiness: 'Software Development and Consulting',
      directorNames: ['Nikhil Shah', 'Pooja Reddy'],
      cin: 'AAB-0009981',
    },
    {
      registrationNumber: 'BIZ-PROP-2015-SP-44332',
      gstinNumber: '',
      businessName: 'Kiran Enterprises [DEMO]',
      legalName: 'KIRAN ENTERPRISES',
      registrationType: 'Sole Proprietorship',
      registrationDate: new Date('2015-02-14'),
      status: 'INACTIVE',
      state: 'Gujarat',
      address: '22, Ring Road, Ahmedabad - 380007',
      natureOfBusiness: 'Wholesale Trade',
      directorNames: ['Kiran Patel'],
    },
    {
      registrationNumber: 'BIZ-MCA-2020-OPC-11200',
      gstinNumber: 'GSTIN-DEMO-33AABCO9101C1Z4',
      businessName: 'Heritage Financial Services OPC [DEMO]',
      legalName: 'HERITAGE FINANCIAL SERVICES ONE PERSON COMPANY PRIVATE LIMITED',
      registrationType: 'OPC',
      registrationDate: new Date('2020-08-01'),
      status: 'ACTIVE',
      state: 'Tamil Nadu',
      address: '5, Anna Salai, Chennai - 600002',
      natureOfBusiness: 'Financial Advisory and Services',
      directorNames: ['Suresh Rajan'],
      cin: 'U65929TN2020OPC011200',
    },
    {
      registrationNumber: 'BIZ-MCA-2008-PUB-00555',
      gstinNumber: 'GSTIN-DEMO-09AABCW0012D1Z9',
      businessName: 'WaveLogic Technologies Limited [DEMO]',
      legalName: 'WAVELOGIC TECHNOLOGIES LIMITED',
      registrationType: 'Public Limited',
      registrationDate: new Date('2008-03-25'),
      status: 'ACTIVE',
      state: 'Uttar Pradesh',
      address: 'Tower A, Noida Special Economic Zone, Noida - 201305',
      natureOfBusiness: 'Telecommunications and IT Infrastructure',
      directorNames: ['Vikram Nair', 'Geeta Sharma', 'Arvind Pillai'],
      cin: 'L64200UP2008PLC000555',
    },
  ]);

  // ─── CONSENTS ─────────────────────────────────────────────────────────────
  console.log('[Seed] Seeding Initial Consents...');
  await Consent.insertMany([
    {
      subjectRef: 'CBSE-2023-90812',
      subjectUserId: null,
      consumerOrgId: duOrg._id,
      serviceId: educationService._id,
      purpose: 'academic_verification',
      status: 'active',
      dataCategory: 'Academic Credentials',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      subjectRef: 'CBSE-2022-77291',
      subjectUserId: null,
      consumerOrgId: duOrg._id,
      serviceId: educationService._id,
      purpose: 'scholarship_evaluation',
      status: 'revoked',
      dataCategory: 'Academic Credentials',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  // ─── DEMO TRANSACTIONS ────────────────────────────────────────────────────
  console.log('[Seed] Seeding Demo Transactions...');
  const insurerUser = users.find((u) => u.email.includes('reliance'));

  await Transaction.insertMany([
    {
      requestId: 'REQ-DEMO-001',
      actorId: verifierUser._id,
      actorEmail: verifierUser.email,
      consumerOrgId: duOrg._id,
      serviceId: educationService._id,
      serviceName: educationService.name,
      serviceType: 'education',
      providerId: cbseOrg._id,
      providerName: cbseOrg.name,
      consumerOrgName: duOrg.name,
      status: 'verified',
      latencyMs: 110,
      summary: 'Credential successfully verified and matched with issuer registry.',
      createdAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      requestId: 'REQ-DEMO-002',
      actorId: verifierUser._id,
      actorEmail: verifierUser.email,
      consumerOrgId: duOrg._id,
      serviceId: educationService._id,
      serviceName: educationService.name,
      serviceType: 'education',
      providerId: cbseOrg._id,
      providerName: cbseOrg.name,
      consumerOrgName: duOrg.name,
      status: 'mismatch',
      latencyMs: 95,
      errorCode: 'FIELD_MISMATCH',
      summary: 'Record located, but provided candidate name differs from issuer database.',
      createdAt: new Date(Date.now() - 3600000 * 2),
    },
    {
      requestId: 'REQ-DEMO-003',
      actorId: verifierUser._id,
      actorEmail: verifierUser.email,
      consumerOrgId: duOrg._id,
      serviceId: educationService._id,
      serviceName: educationService.name,
      serviceType: 'education',
      providerId: cbseOrg._id,
      providerName: cbseOrg.name,
      consumerOrgName: duOrg.name,
      status: 'unavailable',
      latencyMs: 180,
      errorCode: 'PROVIDER_TIMEOUT',
      summary: 'CBSE API is currently unresponsive or timed out.',
      createdAt: new Date(Date.now() - 3600000 * 1),
    },
    {
      requestId: 'REQ-DEMO-004',
      actorId: insurerUser._id,
      actorEmail: insurerUser.email,
      consumerOrgId: demoOrg._id,
      serviceId: insuranceService._id,
      serviceName: insuranceService.name,
      serviceType: 'insurance',
      providerId: insOrg._id,
      providerName: insOrg.name,
      consumerOrgName: demoOrg.name,
      status: 'verified',
      latencyMs: 92,
      summary: 'Insurance policy verified. Active coverage confirmed.',
      createdAt: new Date(Date.now() - 3600000 * 6),
    },
  ]);

  // ─── DEMO ACCESS REQUESTS ─────────────────────────────────────────────────
  console.log('[Seed] Seeding Demo Access Requests...');
  await OrganizationAccessRequest.insertMany([
    {
      referenceNumber: 'CI-REQ-2026-DEMO01',
      organizationName: 'National Insurance Council [DEMO]',
      organizationType: 'Government Agency',
      officialEmail: 'access@nic-demo.gov.in',
      contactPersonName: 'Ravi Shankar',
      designation: 'Director, Digital Services',
      contactPhone: '+91-11-2345-6789',
      website: 'https://nic-demo.gov.in',
      reasonForAccess: 'Policy verification for claims processing and fraud detection.',
      agreedToTerms: true,
      status: 'PENDING',
    },
    {
      referenceNumber: 'CI-REQ-2026-DEMO02',
      organizationName: 'Greenfield University [DEMO]',
      organizationType: 'University or College',
      officialEmail: 'admissions@greenfield-demo.ac.in',
      contactPersonName: 'Prof. Meena Iyer',
      designation: 'Registrar',
      contactPhone: '+91-80-9876-5432',
      website: 'https://greenfield-demo.ac.in',
      reasonForAccess: 'Academic credential verification for postgraduate admissions.',
      agreedToTerms: true,
      status: 'UNDER_REVIEW',
      reviewNote: 'Documents verified, awaiting final committee sign-off.',
      reviewedAt: new Date(Date.now() - 86400000),
    },
    {
      referenceNumber: 'CI-REQ-2026-DEMO03',
      organizationName: 'MediTrust Hospitals [DEMO]',
      organizationType: 'Hospital or Healthcare Organization',
      officialEmail: 'it@meditrust-demo.in',
      contactPersonName: 'Dr. Anil Varma',
      designation: 'Chief Medical Information Officer',
      contactPhone: '+91-22-5566-7788',
      reasonForAccess: 'Identity verification for patient onboarding compliance.',
      agreedToTerms: true,
      status: 'APPROVED',
      reviewNote: 'Approved for identity and employment verification services.',
      reviewedAt: new Date(Date.now() - 172800000),
    },
  ]);

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────
  console.log('[Seed] Seeding Initial Audit Events...');
  await AuditEvent.insertMany([
    {
      actorId: adminUser._id,
      actorEmail: adminUser.email,
      action: 'PLATFORM_INITIALIZATION',
      resourceType: 'SYSTEM',
      outcome: 'SUCCESS',
      requestId: 'REQ-INIT-001',
      details: 'ConnectIndia v2.0 initialized with 5 provider adapters, roles, and sample datasets.',
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      actorId: verifierUser._id,
      actorEmail: verifierUser.email,
      action: 'EDUCATION_VERIFY_REQUEST',
      resourceType: 'VERIFICATION',
      resourceId: 'REQ-DEMO-001',
      outcome: 'SUCCESS',
      requestId: 'REQ-DEMO-001',
      details: "Verification returned 'verified' in 110ms",
      createdAt: new Date(Date.now() - 3600000 * 4),
    },
    {
      actorId: verifierUser._id,
      actorEmail: verifierUser.email,
      action: 'POLICY_EVALUATED',
      resourceType: 'SERVICE_ACCESS',
      resourceId: educationService._id.toString(),
      outcome: 'DENIED',
      requestId: 'REQ-DEMO-REVOKED',
      details: 'Consent explicitly revoked for subject: CBSE-2022-77291',
      createdAt: new Date(Date.now() - 3600000 * 3),
    },
  ]);

  // ─── ASSOCIATE RECORDS WITH PROVIDER ORGANIZATIONS ─────────────────────────
  console.log('[Seed] Linking registry records to authorized providers...');
  await Promise.all([
    AcademicRecord.updateMany({}, { organizationId: cbseOrg._id }),
    InsurancePolicySample.updateMany({}, { organizationId: insOrg._id }),
    IdentityDocumentSample.updateMany({}, { organizationId: idOrg._id }),
    EmploymentRecordSample.updateMany({}, { organizationId: empOrg._id }),
    BusinessRegistrationSample.updateMany({}, { organizationId: bizOrg._id }),
  ]);

  // ─── ORGANIZATION SERVICE GRANTS ───────────────────────────────────────────
  console.log('[Seed] Seeding Organization Service Grants...');
  await OrganizationServiceGrant.insertMany([
    {
      organizationId: duOrg._id,
      serviceId: educationService._id,
      status: 'ACTIVE',
      allowedPurposes: ['academic_verification', 'college_admission'],
      grantedBy: adminUser._id,
      notes: 'Delhi University primary admission verification grant.',
    },
    {
      organizationId: duOrg._id,
      serviceId: identityService._id,
      status: 'ACTIVE',
      allowedPurposes: ['identity_verification', 'kyc_onboarding'],
      grantedBy: adminUser._id,
      notes: 'Candidate identity verification grant.',
    },
    {
      organizationId: chitkaraOrg._id,
      serviceId: educationService._id,
      status: 'ACTIVE',
      allowedPurposes: ['academic_verification', 'college_admission'],
      grantedBy: adminUser._id,
      notes: 'Chitkara University academic marksheet credential verification grant.',
    },
    {
      organizationId: chitkaraOrg._id,
      serviceId: identityService._id,
      status: 'ACTIVE',
      allowedPurposes: ['identity_verification', 'kyc_onboarding'],
      grantedBy: adminUser._id,
      notes: 'Chitkara University candidate identity verification grant.',
    },
    {
      organizationId: demoOrg._id,
      serviceId: insuranceService._id,
      status: 'ACTIVE',
      allowedPurposes: ['insurance_verification', 'insurance_claim_verification'],
      grantedBy: adminUser._id,
      notes: 'Reliance cross-insurer policy verification grant.',
    },
    {
      organizationId: demoOrg._id,
      serviceId: identityService._id,
      status: 'ACTIVE',
      allowedPurposes: ['identity_verification'],
      grantedBy: adminUser._id,
      notes: 'Policyholder KYC validation grant.',
    },
  ]);

  // ─── PROVIDER ONBOARDING REQUESTS ──────────────────────────────────────────
  console.log('[Seed] Seeding Initial Provider Onboarding Application...');
  await ProviderAccessRequest.create({
    referenceNumber: 'CI-PRV-DEMO-001',
    providerName: 'National Skill Registry [DEMO]',
    providerCategory: 'Employment',
    officialEmail: 'onboarding@nsr-demo.org',
    contactPersonName: 'Manish Verma',
    designation: 'Director of Registries',
    contactPhone: '+91 98765 43210',
    website: 'https://nsr-demo.org',
    serviceOfferings: 'Verified technician certifications and vocational credentials',
    technicalContactEmail: 'tech@nsr-demo.org',
    agreedToTerms: true,
    status: 'PENDING',
  });

  console.log('[Seed] ✅ Database seeded successfully!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('THREE PRIMARY ROLES CONFIGURED:');
  console.log('  1. PLATFORM_ADMIN:       admin@connectindia.gov.in');
  console.log('  2. PROVIDER_OPERATOR:    operator@cbse.gov.in       (CBSE Registry)');
  console.log('     PROVIDER_OPERATOR:    operator@insurance.mock    (Insurance Registry)');
  console.log('  3. ORGANIZATION_VERIFIER: verifier@delhiuniv.ac.in  (University of Delhi)');
  console.log('     ORGANIZATION_VERIFIER: verifier@reliance.mock    (Reliance Life)');
  console.log('  (All test accounts initialized with: DemoPassword123!)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('VERIFICATION TEST DATA:');
  console.log('  Education  → Roll: CBSE-2023-90812, Year: 2023, Name: Aarav Sharma');
  console.log('  Insurance  → Policy: INS-HLTH-2024-001234 (Active Health)');
  console.log('  Insurance  → Policy: INS-MOTR-2022-556677 (Expired Motor)');
  console.log('  Identity   → Ref: NID-DEMO-2020-AA1234, Name: Aarav Sharma');
  console.log('  Employment → Ref: EMP-TCS-2019-00441, Employer: TechSolutions Corp');
  console.log('  Business   → Reg: BIZ-MCA-2018-PVT-77441 (TechSolutions Corp)');
  console.log('═══════════════════════════════════════════════════════════');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
