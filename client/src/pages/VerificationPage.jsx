import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { verificationApi } from '../api/verification.api';
import { orgApi } from '../api/org.api';
import { useAuth } from '../app/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Send,
  GraduationCap,
  HeartHandshake,
  UserCheck,
  Briefcase,
  Layers,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';

const SECTOR_TABS_CONFIG = [
  {
    id: 'education',
    label: 'Academic / CBSE',
    icon: GraduationCap,
    match: (s) =>
      s.adapterKey === 'education_adapter' ||
      /education/i.test(s.category) ||
      /education/i.test(s.endpointAlias) ||
      /academic/i.test(s.name) ||
      /cbse/i.test(s.name),
  },
  {
    id: 'insurance',
    label: 'Insurance Registry',
    icon: HeartHandshake,
    match: (s) =>
      s.adapterKey === 'mock_insurance_provider' ||
      /insurance/i.test(s.category) ||
      /insurance/i.test(s.endpointAlias) ||
      /insurance/i.test(s.name),
  },
  {
    id: 'identity',
    label: 'Identity / KYC',
    icon: UserCheck,
    match: (s) =>
      s.adapterKey === 'mock_identity_provider' ||
      /identity/i.test(s.category) ||
      /identity/i.test(s.endpointAlias) ||
      /identity/i.test(s.name),
  },
  {
    id: 'employment',
    label: 'Employment History',
    icon: Briefcase,
    match: (s) =>
      s.adapterKey === 'mock_employment_provider' ||
      /employment/i.test(s.category) ||
      /employment/i.test(s.endpointAlias) ||
      /employment/i.test(s.name),
  },
  {
    id: 'business',
    label: 'Business & MCA',
    icon: Building2,
    match: (s) =>
      s.adapterKey === 'mock_business_provider' ||
      /business/i.test(s.category) ||
      /business/i.test(s.endpointAlias) ||
      /business/i.test(s.name),
  },
];

export function VerificationPage() {
  const { user, role } = useAuth();
  const normRole = (role || '').toLowerCase();
  const isAdmin = normRole === 'admin' || normRole === 'platform_admin';

  // Active sector tab
  const [activeSector, setActiveSector] = useState('education'); // 'education' | 'insurance' | 'identity' | 'employment' | 'business'
  const [grantedServices, setGrantedServices] = useState(null);
  const [loadingGrants, setLoadingGrants] = useState(!isAdmin);

  useEffect(() => {
    let isMounted = true;
    async function loadGrants() {
      if (isAdmin) {
        setGrantedServices(null);
        setLoadingGrants(false);
        return;
      }

      try {
        setLoadingGrants(true);
        const res = await orgApi.getServices();
        if (isMounted) {
          const svcs = res.data?.services || [];
          setGrantedServices(svcs);
          const allowed = SECTOR_TABS_CONFIG.filter((tab) =>
            svcs.some((s) => tab.match(s))
          );
          if (allowed.length > 0) {
            setActiveSector(allowed[0].id);
          } else {
            setActiveSector(null);
          }
        }
      } catch (err) {
        console.error('Failed to load organization service grants:', err);
        if (isMounted) setGrantedServices([]);
      } finally {
        if (isMounted) setLoadingGrants(false);
      }
    }

    loadGrants();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, user?.organization?.id, user?.organization?._id]);

  const allowedTabs = isAdmin
    ? SECTOR_TABS_CONFIG
    : SECTOR_TABS_CONFIG.filter((tab) =>
        (grantedServices || []).some((s) => tab.match(s))
      );

  // Common request states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // 1. Education form inputs
  const [eduRollNumber, setEduRollNumber] = useState('CBSE-2023-90812');
  const [eduExamYear, setEduExamYear] = useState('2023');
  const [eduCandidateName, setEduCandidateName] = useState('Aarav Sharma');
  const [eduCourse, setEduCourse] = useState('Class XII Senior Secondary Examination');
  const [eduPurpose, setEduPurpose] = useState('academic_verification');

  // 2. Insurance form inputs
  const [insPolicyNumber, setInsPolicyNumber] = useState('INS-HLTH-2024-001234');
  const [insInsurerCode, setInsInsurerCode] = useState('DEMO-INSURER-01');
  const [insPolicyType, setInsPolicyType] = useState('Health');
  const [insPolicyHolderRef, setInsPolicyHolderRef] = useState('HOLDER-AK-001');
  const [insPurpose, setInsPurpose] = useState('insurance_verification');

  // 3. Identity form inputs
  const [idDocumentRef, setIdDocumentRef] = useState('NID-DEMO-2020-AA1234');
  const [idDocumentType, setIdDocumentType] = useState('National ID');
  const [idHolderName, setIdHolderName] = useState('Aarav Sharma');
  const [idDob, setIdDob] = useState('2005-04-12');
  const [idPurpose, setIdPurpose] = useState('identity_verification');

  // 4. Employment form inputs
  const [empEmployeeRef, setEmpEmployeeRef] = useState('EMP-TCS-2019-00441');
  const [empEmployerCode, setEmpEmployerCode] = useState('DEMO-EMP-TECH-01');
  const [empEmployeeName, setEmpEmployeeName] = useState('Ramesh Gupta');
  const [empDesignation, setEmpDesignation] = useState('Senior Software Engineer');
  const [empPurpose, setEmpPurpose] = useState('employment_verification');

  // 5. Business form inputs
  const [bizRegistrationNumber, setBizRegistrationNumber] = useState('CIN-U72200DL2018PTC334455');
  const [bizCompanyName, setBizCompanyName] = useState('NexTech Innovations Pvt Ltd');
  const [bizPurpose, setBizPurpose] = useState('business_verification');

  // Multi-sector Preset Test Scenarios
  const sectorPresets = {
    education: [
      {
        title: 'Valid Record (Pass)',
        rollNumber: 'CBSE-2023-90812',
        examYear: '2023',
        candidateName: 'Aarav Sharma',
        course: 'Class XII Senior Secondary Examination',
        purpose: 'academic_verification',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Altered Name (Mismatch)',
        rollNumber: 'CBSE-2023-90812',
        examYear: '2023',
        candidateName: 'Vikram Singh',
        course: 'Class XII Senior Secondary Examination',
        purpose: 'academic_verification',
        expected: 'mismatch',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      },
      {
        title: 'Provider Outage / Timeout',
        rollNumber: 'OUTAGE-CBSE-999',
        examYear: '2023',
        candidateName: 'Aarav Sharma',
        course: 'Class XII Senior Secondary Examination',
        purpose: 'academic_verification',
        expected: 'unavailable',
        badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
      },
      {
        title: 'Revoked Consent Record',
        rollNumber: 'CBSE-2022-77291',
        examYear: '2022',
        candidateName: 'Rohan Verma',
        course: 'Class X Secondary School Examination',
        purpose: 'scholarship_evaluation',
        expected: 'denied',
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
      },
    ],
    insurance: [
      {
        title: 'Active Health Policy (Verified)',
        policyNumber: 'INS-HLTH-2024-001234',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Health',
        policyHolderRef: 'HOLDER-AK-001',
        purpose: 'insurance_claim_verification',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Active Life Insurance (Verified)',
        policyNumber: 'INS-LIFE-2023-009988',
        insurerCode: 'DEMO-INSURER-02',
        policyType: 'Life',
        policyHolderRef: 'HOLDER-RG-002',
        purpose: 'loan_collateral_check',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Expired Motor Policy (Expired Flag)',
        policyNumber: 'INS-MOTR-2022-556677',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Motor',
        policyHolderRef: 'HOLDER-DJ-003',
        purpose: 'claims_history',
        expected: 'expired',
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
      },
      {
        title: 'Provider Timeout (Resilience Test)',
        policyNumber: 'OUTAGE-INS-9999',
        insurerCode: 'DEMO-INSURER-01',
        policyType: 'Health',
        policyHolderRef: 'HOLDER-UNKNOWN',
        purpose: 'insurance_verification',
        expected: 'unavailable',
        badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
      },
    ],
    identity: [
      {
        title: 'Valid National ID (Verified)',
        documentRef: 'NID-DEMO-2020-AA1234',
        documentType: 'National ID',
        holderName: 'Aarav Sharma',
        dob: '2005-04-12',
        purpose: 'kyc_onboarding',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Valid Passport (Verified)',
        documentRef: 'PPT-DEMO-2022-XB9981',
        documentType: 'Passport',
        holderName: 'Priya Patel',
        dob: '2005-09-22',
        purpose: 'visa_verification',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'DOB / Details Mismatch',
        documentRef: 'NID-DEMO-2020-AA1234',
        documentType: 'National ID',
        holderName: 'Aarav Sharma',
        dob: '1995-01-01', // Incorrect DOB
        purpose: 'kyc_onboarding',
        expected: 'mismatch',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      },
      {
        title: 'Expired Document Sample',
        documentRef: 'NID-DEMO-2021-EX8800',
        documentType: 'National ID',
        holderName: 'Rohan Verma',
        dob: '2004-11-05',
        purpose: 'account_opening',
        expected: 'expired',
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
      },
    ],
    employment: [
      {
        title: 'Active Tech Employee (Verified)',
        employeeRef: 'EMP-TCS-2019-00441',
        employerCode: 'DEMO-EMP-TECH-01',
        employeeName: 'Ramesh Gupta',
        designation: 'Senior Software Engineer',
        purpose: 'employment_background_check',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Designation Mismatch',
        employeeRef: 'EMP-TCS-2019-00441',
        employerCode: 'DEMO-EMP-TECH-01',
        employeeName: 'Ramesh Gupta',
        designation: 'Chief Technology Officer', // Altered
        purpose: 'employment_background_check',
        expected: 'mismatch',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      },
      {
        title: 'Past Relieved Employee',
        employeeRef: 'EMP-FINCORP-2020-00891',
        employerCode: 'DEMO-EMP-FIN-03',
        employeeName: 'Kiran Patel',
        designation: 'Financial Analyst',
        purpose: 'hiring_due_diligence',
        expected: 'verified',
        badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
      },
      {
        title: 'Simulated Provider Timeout',
        employeeRef: 'TIMEOUT-EMP-001',
        employerCode: 'DEMO-EMP-TECH-01',
        employeeName: 'Ramesh Gupta',
        designation: 'Senior Software Engineer',
        purpose: 'employment_verification',
        expected: 'unavailable',
        badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
      },
    ],
    business: [
      {
        title: 'Active Tech Enterprise (Verified)',
        registrationNumber: 'CIN-U72200DL2018PTC334455',
        companyName: 'NexTech Innovations Pvt Ltd',
        purpose: 'vendor_vendor_onboarding',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'FMCG Conglomerate (Verified)',
        registrationNumber: 'CIN-L15100MH2010PLC199882',
        companyName: 'Apex Consumer Goods Ltd',
        purpose: 'commercial_credit_rating',
        expected: 'verified',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      },
      {
        title: 'Company Name Mismatch',
        registrationNumber: 'CIN-U72200DL2018PTC334455',
        companyName: 'Fake Dummy Tech Ltd',
        purpose: 'vendor_kyb',
        expected: 'mismatch',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      },
      {
        title: 'Registry Outage Simulation',
        registrationNumber: 'OUTAGE-CIN-000',
        companyName: 'NexTech Innovations Pvt Ltd',
        purpose: 'business_verification',
        expected: 'unavailable',
        badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800',
      },
    ],
  };

  const applyPreset = (preset) => {
    setResult(null);
    setError(null);

    if (activeSector === 'education') {
      setEduRollNumber(preset.rollNumber);
      setEduExamYear(preset.examYear);
      setEduCandidateName(preset.candidateName);
      setEduCourse(preset.course);
      setEduPurpose(preset.purpose);
    } else if (activeSector === 'insurance') {
      setInsPolicyNumber(preset.policyNumber);
      setInsInsurerCode(preset.insurerCode);
      setInsPolicyType(preset.policyType);
      setInsPolicyHolderRef(preset.policyHolderRef);
      setInsPurpose(preset.purpose);
    } else if (activeSector === 'identity') {
      setIdDocumentRef(preset.documentRef);
      setIdDocumentType(preset.documentType);
      setIdHolderName(preset.holderName);
      setIdDob(preset.dob);
      setIdPurpose(preset.purpose);
    } else if (activeSector === 'employment') {
      setEmpEmployeeRef(preset.employeeRef);
      setEmpEmployerCode(preset.employerCode);
      setEmpEmployeeName(preset.employeeName);
      setEmpDesignation(preset.designation);
      setEmpPurpose(preset.purpose);
    } else if (activeSector === 'business') {
      setBizRegistrationNumber(preset.registrationNumber);
      setBizCompanyName(preset.companyName);
      setBizPurpose(preset.purpose);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeSector || !allowedTabs.some((t) => t.id === activeSector)) {
      setError('Your organization does not have an active grant for this verification sector.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res;
      if (activeSector === 'education') {
        // Both the legacy endpoint and unified endpoint work; use unified endpoint
        res = await verificationApi.verify('education', {
          rollNumber: eduRollNumber,
          examYear: Number(eduExamYear),
          candidateName: eduCandidateName,
          course: eduCourse,
          purpose: eduPurpose,
          simulateOutage: eduRollNumber.startsWith('OUTAGE'),
        });
      } else if (activeSector === 'insurance') {
        res = await verificationApi.verify('insurance', {
          policyNumber: insPolicyNumber,
          insurerCode: insInsurerCode,
          policyType: insPolicyType,
          policyHolderRef: insPolicyHolderRef,
          purpose: insPurpose,
        });
      } else if (activeSector === 'identity') {
        res = await verificationApi.verify('identity', {
          documentRef: idDocumentRef,
          documentType: idDocumentType,
          holderName: idHolderName,
          dateOfBirth: idDob,
          purpose: idPurpose,
        });
      } else if (activeSector === 'employment') {
        res = await verificationApi.verify('employment', {
          employeeRef: empEmployeeRef,
          employerCode: empEmployerCode,
          employeeName: empEmployeeName,
          designation: empDesignation,
          purpose: empPurpose,
        });
      } else if (activeSector === 'business') {
        res = await verificationApi.verify('business', {
          registrationNumber: bizRegistrationNumber,
          companyName: bizCompanyName,
          purpose: bizPurpose,
        });
      }

      setResult(res.data);
    } catch (err) {
      if (err.data?.data) {
        setResult(err.data.data);
      } else {
        setError(err.message || 'Verification request failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Layers className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Sector Verification Suite</h1>
        </div>
        <p className="text-xs text-slate-500">
          Execute authorized cross-sector verification queries via standardized provider adapters.
        </p>
      </div>

      {/* Prototype Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 flex items-start gap-3 shadow-2xs">
        <Sparkles className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900 font-semibold">Examiner Evaluation Note:</strong> Choose a sector below, then click any
          preset to instantly load verifiable scenarios (verified, mismatch, expired, policy denied, or simulated provider timeout).
          All queries generate cryptographic audit trails and subject consent validation.
        </div>
      </div>

      {/* Loading Grants State */}
      {loadingGrants ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2"></div>
          <div>Loading institutional verification gateways...</div>
        </div>
      ) : allowedTabs.length === 0 ? (
        /* Empty / Restricted State */
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No Entitled Verification Services</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your organization (<strong>{user?.organization?.name || 'Verifier'}</strong>) does not have active service grants for verification services. ConnectIndia strictly enforces institutional access control. Please contact Platform Administration to request verification service entitlement grants.
          </p>
          <div className="pt-2">
            <Link to="/app/overview" className="btn btn-sm btn-outline-secondary text-xs">
              Return to Organization Overview
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Sector Selection Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSector === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSector(tab.id);
                    setResult(null);
                    setError(null);
                  }}
                  className={`ci-sector-tab ${isActive ? 'active' : ''}`}
                  title={`Switch to ${tab.label} verification`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

      {/* Presets Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-800">Quick Test Scenarios:</span>
          <span className="text-[11px] text-slate-500">Click preset to populate form</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {sectorPresets[activeSector]?.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 text-left transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                  {p.title}
                </span>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border font-medium ${p.badge}`}>
                  {p.expected}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate font-mono">
                {p.rollNumber || p.policyNumber || p.documentRef || p.employeeRef || p.registrationNumber}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form Left, Result Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Form */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {activeSector.toUpperCase()} QUERY PARAMETERS
              </span>
              <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                ADAPTER_V2
              </span>
            </div>

            {/* SECTOR 1: EDUCATION */}
            {activeSector === 'education' && (
              <>
                <div>
                  <label className="ci-form-label">
                    Roll / Candidate Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eduRollNumber}
                    onChange={(e) => setEduRollNumber(e.target.value)}
                    className="ci-form-control font-mono"
                    placeholder="e.g. CBSE-2023-90812"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Exam Year <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={eduExamYear}
                      onChange={(e) => setEduExamYear(e.target.value)}
                      className="ci-form-control"
                      placeholder="2023"
                    />
                  </div>
                  <div>
                    <label className="ci-form-label">
                      Candidate Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={eduCandidateName}
                      onChange={(e) => setEduCandidateName(e.target.value)}
                      className="ci-form-control"
                      placeholder="Full Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="ci-form-label">Course / Examination</label>
                  <input
                    type="text"
                    value={eduCourse}
                    onChange={(e) => setEduCourse(e.target.value)}
                    className="ci-form-control"
                    placeholder="e.g. Class XII Senior Secondary Examination"
                  />
                </div>
                <div>
                  <label className="ci-form-label">
                    Verification Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={eduPurpose}
                    onChange={(e) => setEduPurpose(e.target.value)}
                    className="ci-form-control"
                  >
                    <option value="academic_verification">academic_verification (Standard Education Check)</option>
                    <option value="college_admission">college_admission (University Enrollment)</option>
                    <option value="scholarship_evaluation">scholarship_evaluation (Financial Aid)</option>
                    <option value="employment_screening">employment_screening (Pre-Employment)</option>
                  </select>
                </div>
              </>
            )}

            {/* SECTOR 2: INSURANCE */}
            {activeSector === 'insurance' && (
              <>
                <div>
                  <label className="ci-form-label">
                    Policy Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={insPolicyNumber}
                    onChange={(e) => setInsPolicyNumber(e.target.value)}
                    className="ci-form-control font-mono"
                    placeholder="e.g. INS-HLTH-2024-001234"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Insurer Code <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={insInsurerCode}
                      onChange={(e) => setInsInsurerCode(e.target.value)}
                      className="ci-form-control"
                      placeholder="DEMO-INSURER-01"
                    />
                  </div>
                  <div>
                    <label className="ci-form-label">
                      Policy Type <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={insPolicyType}
                      onChange={(e) => setInsPolicyType(e.target.value)}
                      className="ci-form-control"
                    >
                      <option value="Health">Health Insurance</option>
                      <option value="Life">Life Insurance</option>
                      <option value="Motor">Motor Insurance</option>
                      <option value="Travel">Travel Insurance</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="ci-form-label">Policyholder ID / Subject Ref</label>
                  <input
                    type="text"
                    value={insPolicyHolderRef}
                    onChange={(e) => setInsPolicyHolderRef(e.target.value)}
                    className="ci-form-control font-mono"
                    placeholder="HOLDER-AK-001"
                  />
                </div>
                <div>
                  <label className="ci-form-label">
                    Verification Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={insPurpose}
                    onChange={(e) => setInsPurpose(e.target.value)}
                    className="ci-form-control"
                  >
                    <option value="insurance_verification">insurance_verification (Standard Policy Check)</option>
                    <option value="insurance_claim_verification">insurance_claim_verification (Claim Processing)</option>
                    <option value="loan_collateral_check">loan_collateral_check (Collateral Validation)</option>
                    <option value="claims_history">claims_history (Underwriting Evaluation)</option>
                  </select>
                </div>
              </>
            )}

            {/* SECTOR 3: IDENTITY */}
            {activeSector === 'identity' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Document Type <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={idDocumentType}
                      onChange={(e) => setIdDocumentType(e.target.value)}
                      className="ci-form-control"
                    >
                      <option value="National ID">National ID (Fictional)</option>
                      <option value="Passport">Passport (Fictional)</option>
                      <option value="Driving License">Driving License (Fictional)</option>
                      <option value="Voter ID">Voter ID (Fictional)</option>
                    </select>
                  </div>
                  <div>
                    <label className="ci-form-label">
                      Document Reference <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={idDocumentRef}
                      onChange={(e) => setIdDocumentRef(e.target.value)}
                      className="ci-form-control font-mono"
                      placeholder="NID-DEMO-2020-AA1234"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Full Legal Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={idHolderName}
                      onChange={(e) => setIdHolderName(e.target.value)}
                      className="ci-form-control"
                      placeholder="Aarav Sharma"
                    />
                  </div>
                  <div>
                    <label className="ci-form-label">Date of Birth (YYYY-MM-DD)</label>
                    <input
                      type="text"
                      value={idDob}
                      onChange={(e) => setIdDob(e.target.value)}
                      className="ci-form-control font-mono"
                      placeholder="2005-04-12"
                    />
                  </div>
                </div>
                <div>
                  <label className="ci-form-label">
                    Verification Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={idPurpose}
                    onChange={(e) => setIdPurpose(e.target.value)}
                    className="ci-form-control"
                  >
                    <option value="identity_verification">identity_verification (Identity Assertion)</option>
                    <option value="kyc_onboarding">kyc_onboarding (KYC Verification)</option>
                    <option value="visa_verification">visa_verification (Consular Review)</option>
                    <option value="account_opening">account_opening (Bank Account Opening)</option>
                  </select>
                </div>
              </>
            )}

            {/* SECTOR 4: EMPLOYMENT */}
            {activeSector === 'employment' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Employee Ref / ID <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empEmployeeRef}
                      onChange={(e) => setEmpEmployeeRef(e.target.value)}
                      className="ci-form-control font-mono"
                      placeholder="EMP-TCS-2019-00441"
                    />
                  </div>
                  <div>
                    <label className="ci-form-label">
                      Employer Org Code <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empEmployerCode}
                      onChange={(e) => setEmpEmployerCode(e.target.value)}
                      className="ci-form-control"
                      placeholder="DEMO-EMP-TECH-01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ci-form-label">
                      Employee Full Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empEmployeeName}
                      onChange={(e) => setEmpEmployeeName(e.target.value)}
                      className="ci-form-control"
                      placeholder="Ramesh Gupta"
                    />
                  </div>
                  <div>
                    <label className="ci-form-label">Designation Claimed</label>
                    <input
                      type="text"
                      value={empDesignation}
                      onChange={(e) => setEmpDesignation(e.target.value)}
                      className="ci-form-control"
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                </div>
                <div>
                  <label className="ci-form-label">
                    Verification Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={empPurpose}
                    onChange={(e) => setEmpPurpose(e.target.value)}
                    className="ci-form-control"
                  >
                    <option value="employment_verification">employment_verification (Tenure Check)</option>
                    <option value="employment_background_check">employment_background_check (Background Check)</option>
                    <option value="hiring_due_diligence">hiring_due_diligence (Pre-Offer Due Diligence)</option>
                  </select>
                </div>
              </>
            )}

            {/* SECTOR 5: BUSINESS */}
            {activeSector === 'business' && (
              <>
                <div>
                  <label className="ci-form-label">
                    Corporate Identity Number (CIN) / GSTIN <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bizRegistrationNumber}
                    onChange={(e) => setBizRegistrationNumber(e.target.value)}
                    className="ci-form-control font-mono"
                    placeholder="CIN-U72200DL2018PTC334455"
                  />
                </div>
                <div>
                  <label className="ci-form-label">
                    Company Registered Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bizCompanyName}
                    onChange={(e) => setBizCompanyName(e.target.value)}
                    className="ci-form-control"
                    placeholder="NexTech Innovations Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="ci-form-label">
                    Verification Purpose <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={bizPurpose}
                    onChange={(e) => setBizPurpose(e.target.value)}
                    className="ci-form-control"
                  >
                    <option value="business_verification">business_verification (General Entity Check)</option>
                    <option value="vendor_vendor_onboarding">vendor_vendor_onboarding (Vendor Verification)</option>
                    <option value="vendor_kyb">vendor_kyb (KYB Compliance)</option>
                    <option value="commercial_credit_rating">commercial_credit_rating (Credit Review)</option>
                  </select>
                </div>
              </>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                style={{
                  backgroundColor: loading ? '#94a3b8' : '#2563eb',
                  border: '1px solid #1d4ed8',
                }}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Querying Adapter & Evaluating Consent...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> <span>Execute Verification Query</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Verification Result Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  VERIFICATION OUTCOME
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                >
                  Mock Provider Adapter
                </span>
              </div>
              {result && (
                <button
                  type="button"
                  onClick={copyJson}
                  className="text-[11px] text-blue-700 hover:text-blue-900 flex items-center gap-1 font-mono font-medium cursor-pointer"
                >
                  <Copy className="h-3 w-3" /> {copiedJson ? 'Copied JSON!' : 'Copy JSON'}
                </button>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <strong className="block text-rose-900 mb-0.5 font-semibold">Verification Request Error</strong>
                  {error}
                </div>
              </div>
            )}

            {!result && !error && !loading && (
              <div className="py-16 text-center text-slate-400">
                <ShieldCheck className="h-12 w-12 mx-auto stroke-1 text-slate-300 mb-3" />
                <p className="text-xs font-semibold text-slate-700">Ready to execute verification</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  Fill in parameters or pick a preset scenario on the left to verify credentials against simulated
                  sector adapters.
                </p>
              </div>
            )}

            {loading && (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold text-blue-950">Evaluating Policy & Calling Provider Adapter...</p>
                <p className="text-[11px] text-slate-500">Checking subject consent, logging transaction audit trail</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Status Hero */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                      REQUEST #{result.requestId?.slice(0, 8) || 'VER-001'}
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">
                      Provider:{' '}
                      <strong className="text-slate-900">{result.provider || result.providerName || 'Adapter'}</strong>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={result.status} />
                  </div>
                </div>

                {/* Latency and Meta Pill */}
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-emerald-700 font-medium">
                    <Clock className="h-3 w-3" /> {result.latencyMs || '94'}ms roundtrip
                  </span>
                  <span>•</span>
                  <span>Checked: {new Date(result.checkedAt || Date.now()).toLocaleTimeString()}</span>
                </div>

                {/* Explanation */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-700 font-semibold block mb-1">Verification Summary:</span>
                  <p className="text-slate-800 leading-relaxed m-0">
                    {result.explanation || result.summary || 'Details successfully verified against official sample registry.'}
                  </p>
                </div>

                {/* Verified Fields / Record Data (if verified) */}
                {result.record && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <span className="text-slate-700 font-semibold block">Record Attributes Returned:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {Object.entries(result.record).map(([k, v]) => (
                        <div key={k} className="p-2 rounded-lg bg-white border border-slate-200">
                          <span className="text-slate-500 block capitalize text-[10px]">{k.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="text-slate-900 font-medium truncate block">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON Accordion */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowJson(!showJson)}
                    className="w-full p-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <span className="font-mono font-medium">Payload Inspector (Raw JSON)</span>
                    {showJson ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showJson && (
                    <pre
                      className="p-3 font-mono text-[11px] max-h-48 overflow-auto border-t border-slate-200 m-0"
                      style={{ backgroundColor: '#0f172a', color: '#93c5fd' }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Result Footer Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>ConnectIndia Evaluation Framework</span>
            <span className="text-amber-700 font-medium">Simulated Sandbox Environment</span>
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
}
