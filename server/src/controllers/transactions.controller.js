import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

/**
 * Build a role-scoped + org-isolated query.
 * CRITICAL: Organization A must never see Organization B's transactions.
 * - admin: platform-wide read
 * - operator: sees transactions where their org is the PROVIDER
 * - verifier / citizen: sees only their own org's consumer transactions (by consumerOrgId)
 *   and falls back to actorId scoping when no org is set
 */
function buildScopedQuery(user) {
  const query = {};
  const { role, _id: userId, organizationId: orgId } = user;

  if (role === 'admin') {
    // Admin sees everything — no restriction
    return query;
  }

  if (role === 'operator' && orgId) {
    // Operators see transactions for their provider org
    query.providerId = orgId;
    return query;
  }

  if (role === 'verifier' && orgId) {
    // Verifiers see transactions from their consumer org
    query.consumerOrgId = new mongoose.Types.ObjectId(orgId);
    return query;
  }

  // Citizen or verifier without org — only their own transactions
  query.actorId = userId;
  return query;
}

export async function listTransactions(req, res, next) {
  try {
    const { status, serviceType, startDate, endDate, page = 1, limit = 15 } = req.query;

    const query = buildScopedQuery(req.user);

    if (status && status !== 'all') {
      query.status = status;
    }

    if (serviceType && serviceType !== 'all') {
      query.serviceType = serviceType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select(
          'requestId actorEmail serviceName serviceType providerName consumerOrgName status latencyMs errorCode summary createdAt'
        )
        .lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactionSummary(req, res, next) {
  try {
    const query = buildScopedQuery(req.user);

    const statuses = ['verified', 'mismatch', 'unavailable', 'denied', 'not_found', 'expired', 'invalid_input'];

    const [total, ...statusCounts] = await Promise.all([
      Transaction.countDocuments(query),
      ...statuses.map((s) => Transaction.countDocuments({ ...query, status: s })),
    ]);

    const [, avgLatencyAgg] = await Promise.all([
      Promise.resolve(),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: null, avgLatency: { $avg: '$latencyMs' } } },
      ]),
    ]);

    const counts = {};
    statuses.forEach((s, i) => {
      counts[s] = statusCounts[i];
    });

    const avgLatency =
      avgLatencyAgg.length > 0 && avgLatencyAgg[0].avgLatency
        ? Math.round(avgLatencyAgg[0].avgLatency)
        : 0;

    res.json({
      success: true,
      data: {
        total,
        verified: counts.verified,
        mismatch: counts.mismatch,
        unavailable: counts.unavailable,
        denied: counts.denied,
        notFound: counts.not_found,
        expired: counts.expired,
        invalidInput: counts.invalid_input,
        avgLatencyMs: avgLatency,
        successRate: total > 0 ? Math.round((counts.verified / total) * 100) : 0,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const query = buildScopedQuery(req.user);
    const { status, serviceType } = req.query;

    if (status && status !== 'all') query.status = status;
    if (serviceType && serviceType !== 'all') query.serviceType = serviceType;

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(1000)
      .select(
        'requestId actorEmail serviceName serviceType providerName consumerOrgName status latencyMs errorCode summary createdAt'
      )
      .lean();

    const headers = [
      'Request ID',
      'Timestamp (UTC)',
      'Service Name',
      'Service Type',
      'Provider',
      'Consumer Organization',
      'Actor Email',
      'Status',
      'Latency (ms)',
      'Error Code',
      'Summary',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = transactions.map((t) => [
      escapeCsv(t.requestId),
      escapeCsv(new Date(t.createdAt).toISOString()),
      escapeCsv(t.serviceName),
      escapeCsv(t.serviceType),
      escapeCsv(t.providerName),
      escapeCsv(t.consumerOrgName),
      escapeCsv(t.actorEmail),
      escapeCsv(t.status),
      t.latencyMs,
      escapeCsv(t.errorCode || 'NONE'),
      escapeCsv(t.summary),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="connectindia-transactions-${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}
