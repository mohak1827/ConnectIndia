import { Transaction } from '../models/Transaction.js';

export async function logTransaction({
  requestId,
  actorId,
  actorEmail,
  consumerOrgId = null,
  serviceId,
  serviceName,
  serviceType = 'education',
  providerId,
  providerName,
  consumerOrgName = 'Authorized Verifier',
  status,
  latencyMs = 0,
  errorCode = null,
  summary = '',
}) {
  try {
    const transaction = new Transaction({
      requestId,
      actorId,
      actorEmail,
      consumerOrgId,
      serviceId,
      serviceName,
      serviceType,
      providerId,
      providerName,
      consumerOrgName,
      status,
      latencyMs,
      errorCode,
      summary,
    });
    await transaction.save();
    return transaction;
  } catch (error) {
    console.error('[TransactionService] Failed to record transaction:', error.message);
    return null;
  }
}

