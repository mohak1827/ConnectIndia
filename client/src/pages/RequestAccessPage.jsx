import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { accessRequestApi } from '../api/accessRequest.api';
import {
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  Lock,
  FileCheck2,
  HelpCircle,
  Copy,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export function RequestAccessPage() {
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'status'
  const [applicantType, setApplicantType] = useState('ORGANIZATION'); // 'ORGANIZATION' | 'PROVIDER'

  // Organization Form State
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: 'Financial Institution',
    registrationNumber: '',
    officialEmail: '',
    contactPerson: '',
    contactPhone: '',
    intendedServices: ['education', 'identity'],
    justification: '',
    agreedToTerms: false,
  });

  // Provider Form State
  const [providerData, setProviderData] = useState({
    providerName: '',
    providerCategory: 'Education',
    officialEmail: '',
    contactPersonName: '',
    designation: 'Registrar / Nodal Officer',
    contactPhone: '',
    website: '',
    serviceOfferings: 'Academic Credential & Degree Verification Adapter',
    technicalContactEmail: '',
    agreedToTerms: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Status Check State
  const [referenceCodeInput, setReferenceCodeInput] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const orgTypes = [
    'Financial Institution',
    'Government Agency',
    'Education Board / University',
    'Healthcare Provider',
    'Insurance Provider',
    'Enterprise / Employer',
    'Auditing & Compliance Firm',
  ];

  const providerCategories = [
    'Education',
    'Identity',
    'Insurance',
    'Employment',
    'Business',
    'Healthcare',
    'Transport',
    'Governance',
  ];

  const availableServices = [
    { id: 'education', label: 'Academic & Degree Verification' },
    { id: 'insurance', label: 'Insurance Policy Verification' },
    { id: 'identity', label: 'Identity & KYC Verification' },
    { id: 'employment', label: 'Employment History Screening' },
    { id: 'business', label: 'Business & MCA Registration Check' },
  ];

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => {
      const exists = prev.intendedServices.includes(serviceId);
      return {
        ...prev,
        intendedServices: exists
          ? prev.intendedServices.filter((s) => s !== serviceId)
          : [...prev.intendedServices, serviceId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (applicantType === 'PROVIDER') {
      if (!providerData.agreedToTerms) {
        setSubmitError('You must agree to the Authoritative Provider Charter to submit.');
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        const res = await accessRequestApi.submitProvider(providerData);
        setSubmissionSuccess({
          ...res.data,
          type: 'PROVIDER',
        });
      } catch (err) {
        setSubmitError(err.message || 'Failed to submit provider application.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!formData.agreedToTerms) {
      setSubmitError('You must agree to the Data Protection & Consent Charter to submit.');
      return;
    }
    if (formData.intendedServices.length === 0) {
      setSubmitError('Please select at least one verification service.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await accessRequestApi.submit(formData);
      setSubmissionSuccess({
        ...res.data,
        type: 'ORGANIZATION',
      });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit access request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (e) => {
    e?.preventDefault();
    if (!referenceCodeInput.trim()) {
      setStatusError('Please enter your Reference Code or Official Email.');
      return;
    }

    setCheckingStatus(true);
    setStatusError(null);
    setStatusResult(null);

    try {
      const isEmail = referenceCodeInput.includes('@');
      const query = isEmail ? { email: referenceCodeInput.trim() } : { referenceCode: referenceCodeInput.trim() };
      const res = await accessRequestApi.checkStatus(query);
      setStatusResult(res.data);
    } catch (err) {
      setStatusError(err.message || 'No matching application found.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen d-flex flex-column justify-content-between" style={{ backgroundColor: 'var(--ci-bg-page)', color: 'var(--ci-text-main)' }}>
      {/* Header */}
      <header className="bg-white border-bottom sticky-top z-3 py-2 px-4 shadow-xs">
        <div className="container d-flex align-items-center justify-content-between" style={{ maxWidth: '960px' }}>
          <Link to="/home" className="d-flex align-items-center gap-2 text-decoration-none">
            <img
              src="/logo.png"
              alt="ConnectIndia Logo"
              className="img-fluid"
              style={{ maxHeight: '46px', width: 'auto' }}
            />
            <span className="badge bg-light text-secondary border small">Onboarding Portal</span>
          </Link>

          <div className="d-flex align-items-center gap-3">
            <Link to="/home" className="small text-secondary text-decoration-none d-none d-sm-inline">
              Platform Overview
            </Link>
            <Link
              to="/login"
              className="ci-btn-primary d-flex align-items-center gap-1.5 text-decoration-none py-1.5 px-3"
              style={{ fontSize: '0.8125rem' }}
            >
              <span>Portal Sign In</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container flex-grow-1 py-5" style={{ maxWidth: '860px' }}>
        {/* Notice Banner */}
        <div className="alert alert-info d-flex align-items-start gap-2.5 small rounded-3 mb-4" role="alert">
          <HelpCircle size={18} className="shrink-0 mt-0.5 text-primary" />
          <div className="small leading-relaxed">
            <strong className="d-block mb-1 text-dark">Institutional Access Application Process:</strong>
            Organizations and data providers undergo administrative review before verification service grants and gateway credentials are activated.
            Existing applicants can check status using reference numbers like <code className="bg-white px-1 py-0.5 rounded border text-dark font-monospace">CI-REQ-2026-DEMO01</code>.
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="ci-card p-2 mb-4">
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('request')}
              className={`btn btn-sm px-4 py-2 rounded-3 fw-semibold ${
                activeTab === 'request' ? 'btn-primary text-white' : 'btn-light text-secondary border'
              }`}
              style={activeTab === 'request' ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' } : {}}
            >
              1. Apply for Institutional Access
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              className={`btn btn-sm px-4 py-2 rounded-3 fw-semibold ${
                activeTab === 'status' ? 'btn-primary text-white' : 'btn-light text-secondary border'
              }`}
              style={activeTab === 'status' ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' } : {}}
            >
              2. Check Application Status
            </button>
          </div>
        </div>

        {/* TAB 1: SUBMIT APPLICATION */}
        {activeTab === 'request' && (
          <div>
            {submissionSuccess ? (
              <div className="ci-card p-5 text-center shadow-xs">
                <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 56, height: 56 }}>
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="h5 fw-bold mb-2" style={{ color: 'var(--ci-navy-800)' }}>
                  {submissionSuccess.type === 'PROVIDER' ? 'Provider Application Submitted' : 'Application Submitted Successfully'}
                </h2>
                <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '480px' }}>
                  {submissionSuccess.type === 'PROVIDER'
                    ? 'Your authoritative data provider registration has been recorded and submitted for administrative approval.'
                    : 'Your institutional access request has been recorded in the platform registry and queued for administrative review.'}
                </p>

                <div className="p-3 bg-light rounded-3 border d-inline-block text-start mb-4 font-monospace small" style={{ minWidth: '320px' }}>
                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <span className="text-muted">Tracking Code:</span>
                    <strong className="text-primary">{submissionSuccess.referenceNumber}</strong>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(submissionSuccess.referenceNumber)}
                      className="btn btn-xs btn-outline-secondary"
                      style={{ fontSize: '11px' }}
                    >
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted">Type:</span>
                    <span className="badge bg-light text-dark border">{submissionSuccess.type || 'ORGANIZATION'}</span>
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                    <span className="text-muted">Status:</span>
                    <span className="ci-badge ci-badge-warning">{submissionSuccess.status || 'PENDING'}</span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionSuccess(null);
                      setFormData({
                        organizationName: '',
                        organizationType: 'Financial Institution',
                        registrationNumber: '',
                        officialEmail: '',
                        contactPerson: '',
                        contactPhone: '',
                        intendedServices: ['education', 'identity'],
                        justification: '',
                        agreedToTerms: false,
                      });
                      setProviderData({
                        providerName: '',
                        providerCategory: 'Education',
                        officialEmail: '',
                        contactPersonName: '',
                        designation: 'Registrar / Nodal Officer',
                        contactPhone: '',
                        website: '',
                        serviceOfferings: 'Academic Credential & Degree Verification Adapter',
                        technicalContactEmail: '',
                        agreedToTerms: false,
                      });
                    }}
                    className="ci-btn-secondary"
                  >
                    Submit Another Application
                  </button>
                </div>
              </div>
            ) : (
              <div className="ci-card p-4 p-sm-5 shadow-xs">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                  <div>
                    <h2 className="h6 fw-bold mb-1" style={{ color: 'var(--ci-navy-800)' }}>
                      Institutional Gateway Onboarding Request
                    </h2>
                    <p className="small text-muted mb-0">
                      Select your entity type and provide verified details to connect to ConnectIndia.
                    </p>
                  </div>
                </div>

                {/* Application Category Switcher */}
                <div className="d-flex align-items-center justify-content-between mb-4 p-2.5 bg-light rounded-3 border">
                  <div className="small fw-semibold text-secondary">Entity Track:</div>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      onClick={() => { setApplicantType('ORGANIZATION'); setSubmitError(null); }}
                      className={`btn px-3 py-1.5 fw-semibold ${applicantType === 'ORGANIZATION' ? 'btn-primary text-white' : 'btn-light text-secondary border'}`}
                      style={applicantType === 'ORGANIZATION' ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' } : {}}
                    >
                      Verifier Organization
                    </button>
                    <button
                      type="button"
                      onClick={() => { setApplicantType('PROVIDER'); setSubmitError(null); }}
                      className={`btn px-3 py-1.5 fw-semibold ${applicantType === 'PROVIDER' ? 'btn-primary text-white' : 'btn-light text-secondary border'}`}
                      style={applicantType === 'PROVIDER' ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' } : {}}
                    >
                      Authoritative Data Provider
                    </button>
                  </div>
                </div>

                {submitError && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 small rounded-3 mb-4">
                    <AlertCircle size={16} />
                    <div>{submitError}</div>
                  </div>
                )}

                {/* Form A: Verifier Organization */}
                {applicantType === 'ORGANIZATION' ? (
                  <form onSubmit={handleSubmit} className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold text-secondary">Organization Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.organizationName}
                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                        placeholder="e.g. HDFC Securities Ltd"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-5">
                      <label className="form-label small fw-semibold text-secondary">Organization Type *</label>
                      <select
                        value={formData.organizationType}
                        onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        {orgTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Corporate / Domain Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.officialEmail}
                        onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                        placeholder="compliance@organization.in"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">CIN / Registration Ref</label>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        placeholder="e.g. L65920MH1994PLC080618"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Authorized Contact Person *</label>
                      <input
                        type="text"
                        required
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="Full Name"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Official Phone Number</label>
                      <input
                        type="text"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="+91 22 5544 3322"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary mb-2">Requested Verification Services *</label>
                      <div className="row g-2">
                        {availableServices.map((svc) => (
                          <div key={svc.id} className="col-md-6">
                            <label className="d-flex align-items-center gap-2 p-2 border rounded-3 small cursor-pointer bg-light">
                              <input
                                type="checkbox"
                                checked={formData.intendedServices.includes(svc.id)}
                                onChange={() => handleServiceToggle(svc.id)}
                                className="form-check-input mt-0"
                              />
                              <span>{svc.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Business Justification & Verification Use Case *</label>
                      <textarea
                        rows={3}
                        required
                        value={formData.justification}
                        onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                        placeholder="Describe why your organization requires access to these datasets..."
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="termsCheck"
                          required
                          checked={formData.agreedToTerms}
                          onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                          className="form-check-input"
                        />
                        <label htmlFor="termsCheck" className="form-check-label small text-muted">
                          I confirm our organization will verify records strictly for authorized purposes with explicit subject consent.
                        </label>
                      </div>
                    </div>

                    <div className="col-12 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="ci-btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                      >
                        {submitting ? (
                          <div className="spinner-border spinner-border-sm text-light" role="status" />
                        ) : (
                          <>
                            <span>Submit Official Application</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Form B: Authoritative Data Provider */
                  <form onSubmit={handleSubmit} className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold text-secondary">Provider / Authority Name *</label>
                      <input
                        type="text"
                        required
                        value={providerData.providerName}
                        onChange={(e) => setProviderData({ ...providerData, providerName: e.target.value })}
                        placeholder="e.g. Central Board of Secondary Education (CBSE)"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-5">
                      <label className="form-label small fw-semibold text-secondary">Provider Domain Category *</label>
                      <select
                        value={providerData.providerCategory}
                        onChange={(e) => setProviderData({ ...providerData, providerCategory: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        {providerCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Official Domain Email *</label>
                      <input
                        type="email"
                        required
                        value={providerData.officialEmail}
                        onChange={(e) => setProviderData({ ...providerData, officialEmail: e.target.value })}
                        placeholder="registrar@cbse.gov.in"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Technical / API Contact Email</label>
                      <input
                        type="email"
                        value={providerData.technicalContactEmail}
                        onChange={(e) => setProviderData({ ...providerData, technicalContactEmail: e.target.value })}
                        placeholder="api-team@cbse.gov.in"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Authorized Contact Person *</label>
                      <input
                        type="text"
                        required
                        value={providerData.contactPersonName}
                        onChange={(e) => setProviderData({ ...providerData, contactPersonName: e.target.value })}
                        placeholder="Full Name of Nodal Officer"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Designation</label>
                      <input
                        type="text"
                        value={providerData.designation}
                        onChange={(e) => setProviderData({ ...providerData, designation: e.target.value })}
                        placeholder="e.g. Joint Secretary / Director IT"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Contact Phone</label>
                      <input
                        type="text"
                        value={providerData.contactPhone}
                        onChange={(e) => setProviderData({ ...providerData, contactPhone: e.target.value })}
                        placeholder="+91 11 2250 9256"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-secondary">Official Website URL</label>
                      <input
                        type="url"
                        value={providerData.website}
                        onChange={(e) => setProviderData({ ...providerData, website: e.target.value })}
                        placeholder="https://www.cbse.gov.in"
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-secondary">Authoritative Dataset & Service Offerings *</label>
                      <textarea
                        rows={3}
                        required
                        value={providerData.serviceOfferings}
                        onChange={(e) => setProviderData({ ...providerData, serviceOfferings: e.target.value })}
                        placeholder="Describe the datasets maintained (e.g. Class X & XII examination certificates 2010-present)..."
                        className="form-control form-control-sm"
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id="providerTermsCheck"
                          required
                          checked={providerData.agreedToTerms}
                          onChange={(e) => setProviderData({ ...providerData, agreedToTerms: e.target.checked })}
                          className="form-check-input"
                        />
                        <label htmlFor="providerTermsCheck" className="form-check-label small text-muted">
                          I confirm that our institution is the authoritative source for these records and agrees to provide verification data under the ConnectIndia interoperability guidelines.
                        </label>
                      </div>
                    </div>

                    <div className="col-12 pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="ci-btn-primary w-100 py-2.5 d-flex align-items-center justify-content-center gap-2"
                      >
                        {submitting ? (
                          <div className="spinner-border spinner-border-sm text-light" role="status" />
                        ) : (
                          <>
                            <span>Submit Provider Onboarding Application</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHECK APPLICATION STATUS */}
        {activeTab === 'status' && (
          <div className="ci-card p-4 p-sm-5 shadow-xs">
            <h2 className="h6 fw-bold mb-1" style={{ color: 'var(--ci-navy-800)' }}>
              Check Application Status
            </h2>
            <p className="small text-muted mb-4">
              Enter your tracking reference code (e.g., CI-REQ-2026-DEMO01 or CI-PRV-...) or your official corporate email.
            </p>

            {statusError && (
              <div className="alert alert-danger d-flex align-items-center gap-2 small rounded-3 mb-4">
                <AlertCircle size={16} />
                <div>{statusError}</div>
              </div>
            )}

            <form onSubmit={handleCheckStatus} className="mb-4">
              <div className="input-group">
                <input
                  type="text"
                  required
                  value={referenceCodeInput}
                  onChange={(e) => setReferenceCodeInput(e.target.value)}
                  placeholder="e.g. CI-REQ-2026-DEMO01 or compliance@organization.in"
                  className="form-control form-control-sm ps-3"
                  style={{ height: '42px', fontSize: '0.875rem' }}
                />
                <button
                  type="submit"
                  disabled={checkingStatus}
                  className="ci-btn-primary px-4 d-flex align-items-center gap-2"
                >
                  {checkingStatus ? (
                    <div className="spinner-border spinner-border-sm text-light" role="status" />
                  ) : (
                    <>
                      <Search size={16} />
                      <span>Search Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {statusResult && (
              <div className="p-4 bg-light rounded-3 border">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small fw-bold text-muted">APPLICATION RECORD</span>
                    <span className="badge bg-white text-secondary border font-monospace" style={{ fontSize: '11px' }}>
                      {statusResult.type === 'PROVIDER' ? 'Data Provider' : 'Verifier Organization'}
                    </span>
                  </div>
                  <span className={`ci-badge ${
                    statusResult.status === 'APPROVED' ? 'ci-badge-success' : statusResult.status === 'PENDING' ? 'ci-badge-warning' : 'ci-badge-danger'
                  }`}>
                    {statusResult.status}
                  </span>
                </div>

                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Reference Code:</span>
                    <strong className="font-monospace text-primary">{statusResult.referenceNumber}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Entity Name:</span>
                    <strong>{statusResult.organizationName || statusResult.providerName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Official Email:</span>
                    <span>{statusResult.officialEmail}</span>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Submitted At:</span>
                    <span>
                      {statusResult.createdAt
                        ? new Date(statusResult.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Domain / Type:</span>
                    <span>{statusResult.type === 'PROVIDER' ? statusResult.providerCategory : statusResult.organizationType}</span>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted d-block">Contact Person:</span>
                    <span>{statusResult.contactPersonName || 'N/A'}</span>
                  </div>
                  <div className="col-12 mt-1">
                    <span className="text-muted d-block">Services / Scope:</span>
                    <span className="text-dark">
                      {statusResult.intendedServices?.length
                        ? statusResult.intendedServices.join(', ')
                        : (statusResult.serviceOfferings || 'Standard Verification')}
                    </span>
                  </div>
                  {statusResult.reviewNote && (
                    <div className="col-12 mt-2 pt-2 border-top">
                      <span className="text-muted d-block">Reviewer Note:</span>
                      <span className="text-dark fst-italic">"{statusResult.reviewNote}"</span>
                    </div>
                  )}
                </div>

                {statusResult.status === 'APPROVED' && (
                  <div className="mt-3 pt-3 border-top d-flex align-items-center justify-content-between">
                    <span className="small text-success fw-semibold">
                      {statusResult.type === 'PROVIDER'
                        ? 'Application approved. Your provider operator account has been provisioned.'
                        : 'Application approved. You can sign in using your activated credentials.'}
                    </span>
                    <Link to="/login" className="ci-btn-primary text-decoration-none py-1 px-3 small">
                      Sign In Now
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-top py-3 text-center small text-muted">
        ConnectIndia Decentralized Multi-Sector Verification Gateway · Prototype Evaluation v2.0
      </footer>
    </div>
  );
}
