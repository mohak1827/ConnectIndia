import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../app/AuthContext';
import { providerApi } from '../api/provider.api';

export function ProviderRegistryPage() {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const isAdmin = role === 'admin' || role === 'platform_admin';
  const providerCategory = user?.organization?.category || 'Education';

  const allCategories = [
    { key: 'Education', label: 'Academic Registry (Education)', defaultId: 'rollNumber' },
    { key: 'Insurance', label: 'Insurance Policy Registry', defaultId: 'policyNumber' },
    { key: 'Identity', label: 'Identity Document Registry', defaultId: 'documentRef' },
    { key: 'Employment', label: 'Employment Record Registry', defaultId: 'employeeRef' },
    { key: 'Business', label: 'Business Registration Registry', defaultId: 'registrationNumber' },
  ];

  // Operator is strictly restricted to their authoritative domain
  const categories = isAdmin
    ? allCategories
    : allCategories.filter((c) => c.key.toLowerCase() === providerCategory.toLowerCase());

  const [category, setCategory] = useState(
    isAdmin ? (user?.organization?.category || 'Education') : (categories[0]?.key || providerCategory)
  );

  useEffect(() => {
    if (!isAdmin && user?.organization?.category) {
      setCategory(user.organization.category);
    }
  }, [isAdmin, user?.organization?.category]);

  const [records, setRecords] = useState([]);
  const [idField, setIdField] = useState('rollNumber');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({});
  const [importCsvText, setImportCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const getAuthToken = () =>
    localStorage.getItem('connectindia_token') ||
    localStorage.getItem('ci_token') ||
    '';

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await providerApi.getRecords({
        category,
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
      });

      setRecords(data.data?.records || []);
      setTotal(data.data?.pagination?.total || 0);
      setIdField(data.data?.idField || 'rollNumber');
    } catch (err) {
      setError(err.message || 'Failed to fetch registry records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [category, page, limit, statusFilter]);

  useEffect(() => {
    if (searchParams.get('import') === 'true') {
      setShowImportModal(true);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  // Reset Form for Create
  const openCreateModal = () => {
    const defaults = {
      Education: {
        rollNumber: '',
        examYear: 2024,
        candidateName: '',
        dob: '2005-01-01',
        course: 'Class XII Senior Secondary Examination',
        institution: 'Central Public School',
        issuerCode: 'CBSE',
        cgpa: '9.0',
        division: 'First Class',
        status: 'PASS',
      },
      Insurance: {
        policyNumber: '',
        insurerCode: 'DEMO-INS-01',
        insurerName: 'National General Insurance [DEMO]',
        policyType: 'Health',
        policyHolderName: '',
        policyHolderRef: 'HOLDER-001',
        status: 'ACTIVE',
        coverageStartDate: '2024-01-01',
        coverageEndDate: '2028-12-31',
        sumInsured: '₹5,00,000',
        premiumStatus: 'PAID',
      },
      Identity: {
        documentRef: '',
        documentType: 'National ID',
        issuingAuthority: 'Unique Identity Division [DEMO]',
        holderName: '',
        dateOfBirth: '2000-01-01',
        gender: 'M',
        address: 'New Delhi, India',
        issueDate: '2020-01-01',
        expiryDate: '2030-01-01',
        status: 'VALID',
        nationality: 'Indian',
      },
      Employment: {
        employeeRef: '',
        employerName: 'TechSolutions Corp [DEMO]',
        employerCode: 'EMP-CORP-01',
        employeeName: '',
        designation: 'Senior Software Engineer',
        department: 'Engineering',
        employmentType: 'Full-Time',
        joiningDate: '2021-06-01',
        status: 'CURRENTLY_EMPLOYED',
      },
      Business: {
        registrationNumber: '',
        gstinNumber: '',
        businessName: '',
        legalName: '',
        registrationType: 'Private Limited',
        registrationDate: '2019-01-01',
        status: 'ACTIVE',
        state: 'Maharashtra',
        cin: '',
      },
    };

    setFormData(defaults[category] || {});
    setShowCreateModal(true);
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await providerApi.createRecord({ ...formData, category });
      setSuccessMsg(`Record ${formData[idField]} created successfully.`);
      setShowCreateModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.message || 'Failed to create record');
    }
  };

  const openEditModal = (rec) => {
    setSelectedRecord(rec);
    setFormData({ ...rec });
    setShowEditModal(true);
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await providerApi.updateRecord(selectedRecord._id, { ...formData, category });
      setSuccessMsg(`Record updated successfully.`);
      setShowEditModal(false);
      fetchRecords();
    } catch (err) {
      setError(err.message || 'Failed to update record');
    }
  };

  const handleDeleteRecord = async (id, idVal) => {
    if (!window.confirm(`Are you sure you want to delete authoritative record ${idVal}? Verification requests will no longer verify this record.`)) {
      return;
    }

    try {
      await providerApi.deleteRecord(id, category);
      setSuccessMsg(`Record ${idVal} deleted.`);
      fetchRecords();
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const handleExportCsv = async () => {
    setError(null);
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Session has expired or token is invalid. Please sign in again.');
      }
      const res = await fetch(`/api/v1/provider/registry/export?category=${encodeURIComponent(category)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category.toLowerCase()}_registry_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMsg(`Exported ${category} registry records to CSV successfully.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importCsvText.trim()) return;

    setImporting(true);
    setImportResult(null);

    try {
      // Parse CSV text into array of objects
      const lines = importCsvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      const res = await providerApi.importCsv({
        category,
        rows,
        fileName: `manual_import_${Date.now()}.csv`,
      });

      setImportResult(res.data);
      fetchRecords();
    } catch (err) {
      setError(err.message || 'Import processing failed');
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="container-fluid p-4">
      {/* Top Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1" style={{ color: 'var(--ci-navy-800)', fontWeight: 700 }}>
            Provider Registry & Authoritative Data Management
          </h1>
          <p className="small text-muted mb-0">
            Maintain authoritative records searched by the verification gateway. Edits immediately reflect in live verification calls.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="ci-btn-secondary d-flex align-items-center gap-1.5"
            style={{ whiteSpace: 'nowrap', height: '38px' }}
            title="Download CSV export"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="ci-btn-secondary d-flex align-items-center gap-1.5"
            style={{ whiteSpace: 'nowrap', height: '38px' }}
            title="Print or Save as PDF"
          >
            <FileSpreadsheet size={15} />
            <span>Print / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="ci-btn-secondary d-flex align-items-center gap-1.5"
            style={{ whiteSpace: 'nowrap', height: '38px' }}
            title="Bulk import CSV data"
          >
            <Upload size={15} />
            <span>Bulk CSV Import</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="ci-btn-primary d-flex align-items-center gap-1.5"
            style={{ whiteSpace: 'nowrap', height: '38px' }}
          >
            <Plus size={16} />
            <span>Add Authoritative Record</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="ci-card p-2 mb-4">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setCategory(c.key);
                  setPage(1);
                }}
                className={`btn btn-sm px-3 py-1.5 rounded-3 fw-semibold ${
                  category === c.key
                    ? 'btn-primary text-white'
                    : 'btn-light text-secondary border'
                }`}
                style={
                  category === c.key
                    ? { backgroundColor: 'var(--ci-navy-700)', borderColor: 'var(--ci-navy-700)' }
                    : {}
                }
              >
                {c.label}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <span className="badge bg-light text-secondary border px-2.5 py-1.5 small font-monospace">
              Authoritative Registry: {user?.organization?.name || 'Provider'} ({category})
            </span>
          )}
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 small mb-3" role="alert">
          <AlertCircle size={16} className="shrink-0" />
          <div className="flex-grow-1">{error}</div>
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2 small mb-3" role="alert">
          <CheckCircle2 size={16} className="shrink-0" />
          <div className="flex-grow-1">{successMsg}</div>
          <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} />
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="ci-card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light text-muted">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search by ${idField}, name, or keyword...`}
                className="form-control"
              />
            </div>
          </div>

          <div className="col-6 col-md-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="form-select form-select-sm"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE / VALID / PASS</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="FAIL">FAIL / LAPSED / CANCELLED</option>
              <option value="SUSPENDED">SUSPENDED / WITHHELD</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <button type="submit" className="ci-btn-secondary w-100 py-1.5">
              Filter Records
            </button>
          </div>

          <div className="col-12 col-md-2 text-md-end text-muted small">
            <span>Total Records: </span>
            <strong className="text-dark">{total}</strong>
          </div>
        </form>
      </div>

      {/* Main Records Table */}
      <div className="ci-card overflow-hidden mb-4">
        <div className="table-responsive">
          <table className="table ci-table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Primary Identifier</th>
                <th>Subject Name / Title</th>
                <th>Category Details</th>
                <th>Status</th>
                <th>Last Modified</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    Loading authoritative database records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    No registry records found matching the query in {category} registry.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const identifier = rec[idField] || 'N/A';
                  const title =
                    rec.candidateName ||
                    rec.policyHolderName ||
                    rec.holderName ||
                    rec.employeeName ||
                    rec.businessName ||
                    'N/A';
                  const subDetail =
                    rec.course ||
                    `${rec.policyType || ''} (${rec.insurerName || ''})` ||
                    rec.documentType ||
                    rec.designation ||
                    rec.registrationType ||
                    '';
                  const status = rec.status || 'ACTIVE';

                  const badgeClass =
                    ['PASS', 'ACTIVE', 'VALID', 'CURRENTLY_EMPLOYED'].includes(status)
                      ? 'ci-badge-success'
                      : ['EXPIRED', 'RESIGNED', 'RETIRED'].includes(status)
                      ? 'ci-badge-warning'
                      : 'ci-badge-danger';

                  return (
                    <tr key={rec._id}>
                      <td className="fw-semibold font-monospace text-primary">
                        {identifier}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{title}</div>
                        <div className="small text-muted">{subDetail}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">
                          {rec.issuerCode || rec.insurerCode || rec.issuingAuthority || rec.employerCode || rec.state || 'Authoritative Source'}
                        </span>
                      </td>
                      <td>
                        <span className={`ci-badge ${badgeClass}`}>{status}</span>
                      </td>
                      <td className="text-muted small">
                        {new Date(rec.updatedAt || rec.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(rec);
                              setShowViewModal(true);
                            }}
                            className="btn btn-outline-secondary"
                            title="Inspect authoritative details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            className="btn btn-outline-primary"
                            title="Edit record"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(rec._id, identifier)}
                            className="btn btn-outline-danger"
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between p-3 border-top">
            <span className="small text-muted">
              Showing page {page} of {totalPages} ({total} items)
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-outline-secondary"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="btn btn-outline-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold" style={{ color: 'var(--ci-navy-800)' }}>
                  Add Authoritative {category} Record
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)} />
              </div>
              <form onSubmit={handleSaveRecord}>
                <div className="modal-body p-4 row g-3">
                  {category === 'Education' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Roll Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.rollNumber || ''}
                          onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                          placeholder="e.g. CBSE-2024-99881"
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Examination Year *</label>
                        <input
                          type="number"
                          required
                          value={formData.examYear || 2024}
                          onChange={(e) => setFormData({ ...formData, examYear: Number(e.target.value) })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Candidate Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.candidateName || ''}
                          onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Date of Birth (YYYY-MM-DD)</label>
                        <input
                          type="text"
                          value={formData.dob || ''}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small fw-semibold">Examination / Course *</label>
                        <input
                          type="text"
                          required
                          value={formData.course || ''}
                          onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">CGPA / Grade *</label>
                        <input
                          type="text"
                          required
                          value={formData.cgpa || ''}
                          onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Institution Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.institution || ''}
                          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Result Status *</label>
                        <select
                          value={formData.status || 'PASS'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                          <option value="WITHHELD">WITHHELD</option>
                        </select>
                      </div>
                    </>
                  )}

                  {category === 'Insurance' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Policy Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.policyNumber || ''}
                          onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                          placeholder="e.g. INS-HLTH-2024-998811"
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Policy Type *</label>
                        <select
                          value={formData.policyType || 'Health'}
                          onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="Health">Health</option>
                          <option value="Life">Life</option>
                          <option value="Motor">Motor</option>
                          <option value="Property">Property</option>
                          <option value="Travel">Travel</option>
                          <option value="Commercial">Commercial</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Policyholder Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.policyHolderName || ''}
                          onChange={(e) => setFormData({ ...formData, policyHolderName: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Insurer Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.insurerName || ''}
                          onChange={(e) => setFormData({ ...formData, insurerName: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Coverage Start Date</label>
                        <input
                          type="date"
                          value={formData.coverageStartDate ? formData.coverageStartDate.slice(0, 10) : ''}
                          onChange={(e) => setFormData({ ...formData, coverageStartDate: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Coverage End Date</label>
                        <input
                          type="date"
                          value={formData.coverageEndDate ? formData.coverageEndDate.slice(0, 10) : ''}
                          onChange={(e) => setFormData({ ...formData, coverageEndDate: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Sum Insured</label>
                        <input
                          type="text"
                          value={formData.sumInsured || ''}
                          onChange={(e) => setFormData({ ...formData, sumInsured: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Policy Status *</label>
                        <select
                          value={formData.status || 'ACTIVE'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="LAPSED">LAPSED</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Fallback general inputs for other categories */}
                  {['Identity', 'Employment', 'Business'].includes(category) && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Primary Reference *</label>
                        <input
                          type="text"
                          required
                          value={formData[idField] || ''}
                          onChange={(e) => setFormData({ ...formData, [idField]: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Subject / Entity Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.holderName || formData.employeeName || formData.businessName || ''}
                          onChange={(e) => {
                            const field = category === 'Identity' ? 'holderName' : category === 'Employment' ? 'employeeName' : 'businessName';
                            setFormData({ ...formData, [field]: e.target.value });
                          }}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Status *</label>
                        <select
                          value={formData.status || 'ACTIVE'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="ACTIVE">ACTIVE / VALID</option>
                          <option value="INACTIVE">INACTIVE / EXPIRED</option>
                          <option value="SUSPENDED">SUSPENDED / REVOKED</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="ci-btn-primary">
                    Save to Authoritative Registry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedRecord && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">
                  Edit Record: {selectedRecord[idField]}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)} />
              </div>
              <form onSubmit={handleUpdateRecord}>
                <div className="modal-body p-4 row g-3">
                  {category === 'Education' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Candidate Name</label>
                        <input
                          type="text"
                          required
                          value={formData.candidateName || ''}
                          onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Course / Exam</label>
                        <input
                          type="text"
                          required
                          value={formData.course || ''}
                          onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">CGPA</label>
                        <input
                          type="text"
                          required
                          value={formData.cgpa || ''}
                          onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Status</label>
                        <select
                          value={formData.status || 'PASS'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                          <option value="WITHHELD">WITHHELD</option>
                        </select>
                      </div>
                    </>
                  )}

                  {category === 'Insurance' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Policyholder Name</label>
                        <input
                          type="text"
                          required
                          value={formData.policyHolderName || ''}
                          onChange={(e) => setFormData({ ...formData, policyHolderName: e.target.value })}
                          className="form-control form-control-sm"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Status</label>
                        <select
                          value={formData.status || 'ACTIVE'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="form-select form-select-sm"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="EXPIRED">EXPIRED</option>
                          <option value="CANCELLED">CANCELLED</option>
                          <option value="LAPSED">LAPSED</option>
                        </select>
                      </div>
                    </>
                  )}

                  {['Identity', 'Employment', 'Business'].includes(category) && (
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Status</label>
                      <select
                        value={formData.status || 'ACTIVE'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="form-select form-select-sm"
                      >
                        <option value="ACTIVE">ACTIVE / VALID</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="ci-btn-primary">
                    Update Registry Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedRecord && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">Authoritative Record Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowViewModal(false)} />
              </div>
              <div className="modal-body p-4">
                <div className="table-responsive">
                  <table className="table table-sm table-bordered">
                    <tbody>
                      {Object.entries(selectedRecord).map(([k, v]) => {
                        if (['_id', '__v'].includes(k)) return null;
                        return (
                          <tr key={k}>
                            <td className="fw-semibold text-secondary small" style={{ width: '35%' }}>{k}</td>
                            <td className="font-monospace small text-dark">{String(v)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="ci-btn-secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content ci-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold">
                  Bulk CSV Import for {category} Registry
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowImportModal(false)} />
              </div>
              <form onSubmit={handleImportSubmit}>
                <div className="modal-body p-4">
                  <p className="small text-muted mb-2">
                    Paste raw CSV content below including headers. The gateway will validate each row, detect duplicates, and record an immutable audit job.
                  </p>

                  <div className="mb-3">
                    <textarea
                      rows={7}
                      required
                      value={importCsvText}
                      onChange={(e) => setImportCsvText(e.target.value)}
                      placeholder={`rollNumber,examYear,candidateName,dob,course,institution,cgpa,division,status\nCBSE-2024-88001,2024,Vandana Rao,2006-04-12,Class XII,DPS Delhi,9.2,First Class,PASS`}
                      className="form-control font-monospace small"
                    />
                  </div>

                  {importResult && (
                    <div className="p-3 bg-light rounded-3 border mb-3">
                      <h6 className="fw-bold small mb-2 text-dark">
                        Import Job Result: {importResult.jobId} ({importResult.status})
                      </h6>
                      <div className="row text-center g-2 small">
                        <div className="col-3">
                          <div className="p-2 bg-white rounded border">
                            <span className="d-block text-muted">Total</span>
                            <strong>{importResult.totalRows}</strong>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="p-2 bg-success text-white rounded">
                            <span className="d-block opacity-75">Inserted</span>
                            <strong>{importResult.insertedCount}</strong>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="p-2 bg-info text-white rounded">
                            <span className="d-block opacity-75">Updated</span>
                            <strong>{importResult.updatedCount}</strong>
                          </div>
                        </div>
                        <div className="col-3">
                          <div className="p-2 bg-danger text-white rounded">
                            <span className="d-block opacity-75">Failed</span>
                            <strong>{importResult.failedCount}</strong>
                          </div>
                        </div>
                      </div>

                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-3">
                          <span className="small fw-semibold text-danger d-block mb-1">
                            Row Validation Failures:
                          </span>
                          <ul className="small text-danger mb-0 ps-3">
                            {importResult.errors.map((err, i) => (
                              <li key={i}>
                                Row {err.row} ({err.identifier}): {err.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="ci-btn-secondary" onClick={() => setShowImportModal(false)}>
                    Close
                  </button>
                  <button type="submit" disabled={importing} className="ci-btn-primary">
                    {importing ? 'Processing Rows...' : 'Process & Ingest CSV'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
