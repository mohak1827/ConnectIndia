import { AcademicRecord } from '../models/AcademicRecord.js';
import { Organization } from '../models/Organization.js';
import { ProviderConfig } from '../models/ProviderConfig.js';

/**
 * Education Adapter for Mock Issuer (CBSE / State Boards)
 * Simulates real provider interface translation and response normalization
 */
export class EducationAdapter {
  /**
   * Verify an academic credential against provider records
   * @param {Object} query - { rollNumber, examYear, candidateName, dob, course, simulateOutage }
   * @returns {Promise<{ status: string, details: Object, latencyMs: number, providerName: string }>}
   */
  async verify({ rollNumber, examYear, candidateName, dob, course, simulateOutage = false }) {
    const startTime = Date.now();

    // Artificial network latency simulation (70-200ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 100) + 70));

    // Simulated provider outage or timeout
    if (simulateOutage || rollNumber?.toUpperCase().startsWith('OUTAGE') || rollNumber?.toUpperCase() === 'TIMEOUT999') {
      const latencyMs = Date.now() - startTime;
      return {
        status: 'unavailable',
        providerName: 'Central Board of Secondary Education (CBSE) - Mock Gateway',
        latencyMs,
        errorCode: 'PROVIDER_TIMEOUT',
        explanation: 'Central Board of Secondary Education API is currently unresponsive or timed out. Please retry later.',
        record: null,
      };
    }

    // Lookup fixture in AcademicRecord collection
    const cleanRoll = rollNumber?.trim().toUpperCase();
    const cleanYear = Number(examYear);
    const cleanName = candidateName?.trim().toLowerCase();

    const record = await AcademicRecord.findOne({
      rollNumber: cleanRoll,
      examYear: cleanYear,
    }).lean();

    const latencyMs = Date.now() - startTime;

    if (!record) {
      return {
        status: 'not_found',
        providerName: 'Central Board of Secondary Education (CBSE) - Mock Gateway',
        latencyMs,
        errorCode: 'RECORD_NOT_FOUND',
        explanation: 'No matching academic record found with the supplied Roll Number and Exam Year.',
        record: null,
      };
    }

    // Determine authoritative issuer organization and check live adapter health
    let owningOrg = null;
    let providerName = record.institution || 'Central Board of Secondary Education (CBSE) - Mock Gateway';

    if (record.organizationId) {
      owningOrg = await Organization.findById(record.organizationId).lean();
      if (owningOrg) {
        providerName = record.institution || owningOrg.name;
      }

      const orgConfig = await ProviderConfig.findOne({
        organizationId: record.organizationId,
        healthState: { $in: ['Unavailable', 'Offline'] },
      }).lean();

      if (orgConfig || owningOrg?.status === 'suspended' || owningOrg?.status === 'inactive') {
        return {
          status: 'unavailable',
          providerName,
          latencyMs,
          errorCode: 'PROVIDER_OFFLINE',
          explanation: `Authoritative provider '${providerName}' is currently Unavailable (Offline). Verification cannot be completed until the provider is restored Online.`,
          record: null,
        };
      }
    }

    // Check candidate details match (case-insensitive name comparison)
    const nameMatches = record.candidateName.toLowerCase() === cleanName;
    const courseMatches = !course || record.course.toLowerCase().includes(course.trim().toLowerCase());

    if (!nameMatches || !courseMatches) {
      return {
        status: 'mismatch',
        providerName,
        latencyMs,
        errorCode: 'FIELD_MISMATCH',
        explanation: 'Record located, but provided candidate name or course differs from issuer database.',
        record: null,
      };
    }

    // Match confirmed
    return {
      status: 'verified',
      providerName,
      latencyMs,
      errorCode: null,
      explanation: `Credential successfully verified and matched with issuer registry (${providerName}).`,
      record: {
        issuer: record.issuerCode,
        course: record.course,
        institution: record.institution,
        cgpa: record.cgpa,
        division: record.division,
        resultStatus: record.status,
      },
    };
  }
}

export const educationAdapter = new EducationAdapter();
