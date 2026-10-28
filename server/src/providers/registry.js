import { educationAdapter } from './education.adapter.js';
import { mockInsuranceProvider } from './insurance.adapter.js';
import { mockIdentityProvider } from './identity.adapter.js';
import { mockEmploymentProvider } from './employment.adapter.js';
import { mockBusinessProvider } from './business.adapter.js';

/**
 * Provider Registry — maps service type keys to configured adapter instances.
 * 
 * This is the central dispatch layer. The verification controller calls
 * registry.getProvider(serviceType) and then calls provider.verify(request, context).
 * 
 * Adding a new provider:
 * 1. Create a new adapter class implementing: verify(), getCapabilities(), getProviderStatus()
 * 2. Import it here
 * 3. Add an entry to REGISTRY below
 * 4. Add the corresponding route and controller handler
 * 
 * Switching from mock to real:
 * - Replace the imported adapter instance with the real adapter instance
 * - The controller, routes, and response normalization remain unchanged
 */
const REGISTRY = {
  education: {
    adapter: educationAdapter,
    serviceType: 'education',
    displayName: 'Academic Record Verification',
    adapterKey: 'education_adapter',
    description: 'Verifies academic credentials against the CBSE mock issuer registry.',
  },
  insurance: {
    adapter: mockInsuranceProvider,
    serviceType: 'insurance',
    displayName: 'Insurance Policy Verification',
    adapterKey: 'mock_insurance_provider',
    description: 'Verifies insurance policies against the mock insurance registry.',
  },
  identity: {
    adapter: mockIdentityProvider,
    serviceType: 'identity',
    displayName: 'Identity Document Verification',
    adapterKey: 'mock_identity_provider',
    description: 'Verifies fictional identity document references (not real government IDs).',
  },
  employment: {
    adapter: mockEmploymentProvider,
    serviceType: 'employment',
    displayName: 'Employment Record Verification',
    adapterKey: 'mock_employment_provider',
    description: 'Verifies employment records against the mock HR registry.',
  },
  business: {
    adapter: mockBusinessProvider,
    serviceType: 'business',
    displayName: 'Business Registration Verification',
    adapterKey: 'mock_business_provider',
    description: 'Verifies fictional business registrations (not real MCA21/GST records).',
  },
};

export function getProvider(serviceType) {
  const entry = REGISTRY[serviceType];
  if (!entry) {
    throw new Error(`No provider registered for service type: ${serviceType}`);
  }
  return entry.adapter;
}

export function getProviderMeta(serviceType) {
  return REGISTRY[serviceType] || null;
}

export function listRegisteredServices() {
  return Object.values(REGISTRY).map((entry) => ({
    serviceType: entry.serviceType,
    displayName: entry.displayName,
    adapterKey: entry.adapterKey,
    description: entry.description,
    capabilities: entry.adapter.getCapabilities(),
  }));
}
