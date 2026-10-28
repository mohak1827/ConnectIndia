# ConnectIndia 🇮🇳
### Federated, Multi-Sector Verification Gateway & Interoperability Platform

**Demonstrable College Evaluation Prototype · Version 3.0**

ConnectIndia is a role-based, database-driven verification platform inspired by federated interoperability architectures (such as Estonia's X-Road). It connects authorized organizations with trusted data providers through standardized provider adapters.

---

## 1. Project Purpose & Scope

ConnectIndia enables approved consuming organizations (e.g., universities, financial institutions, employers) to verify candidate credentials and authoritative records maintained across multiple sectors (Academic, Insurance, Identity, Employment, and Business Registration).

### Key Architectural Tenets:
- **Decentralized Data Custody**: Authoritative records are maintained within provider registries. ConnectIndia orchestrates authentication, RBAC, access policies, adapter routing, response normalization, and tamper-resistant audit logs.
- **Dynamic Service & Access Model**: All services and access grants are persisted in MongoDB. An organization can only query services explicitly assigned to it by the Platform Administrator.
- **Active Data Reflection**: When a Provider Operator creates, updates, or deletes records in the registry, subsequent verification requests immediately reflect those database modifications.
- **Realistic Mock Integrations**: External integrations are implemented using realistic fictional data and mock adapters. ConnectIndia is **not** connected to live government databases.

---

## 2. Three Primary Application Roles

The platform strictly enforces role-based access control (RBAC) across three primary roles:

| Role | Primary Functions | Access Scope & Constraints |
| :--- | :--- | :--- |
| **`PLATFORM_ADMIN`**<br>(Platform Administrator) | System overview, organization & provider approvals, service registration, organization access grants, audit logs, API telemetry. | **Admin-only**. The admin does **not** see the ordinary organization Verification Portal, ensuring strict separation of administrative oversight from consumer verification. |
| **`PROVIDER_OPERATOR`**<br>(Provider Data Operator) | Registry data management (CRUD), bulk CSV import with row-level validation, CSV export, provider-scoped transaction monitoring, adapter health status. | **Strictly scoped to own provider**. Operators cannot view or modify other providers' records, approve their own platform access, or grant organization permissions. |
| **`ORGANIZATION_VERIFIER`**<br>(Consuming Organization) | Browse granted services, execute verification queries, inspect normalized outcomes, review own verification history and usage. | **Consumer-only**. Verifiers cannot modify authoritative registry data, approve their own organizations, or inspect other organizations' transactions. |

> **Note**: In compliance with enterprise gateway design, the Citizen/Student role and public self-registration have been completely removed.

---

## 3. Technology Stack & Design System

- **Frontend**: React 19 + Vite.
- **Styling**: Bootstrap 5.3 + custom enterprise light dashboard theme (regular CSS). **No Tailwind CSS**.
- **Backend**: Node.js + Express.js.
- **Database**: MongoDB Atlas + Mongoose.
- **Authentication**: JWT Bearer tokens with server-side role and tenant validation.
- **UI Aesthetics**: Professional light dashboard theme (Navy `#1e3a5f` headings/primary buttons, light gray `#f8fafc` background, subtle borders, high contrast, clean tables, green for verified, amber for warning/mismatch, red for rejected/outage).

---

## 4. Quick Start & Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24)
- **MongoDB**: MongoDB Atlas URI (or local `mongodb://127.0.0.1:27017/connectindia`)

### 1. Configure Environment Variables

**Server (`server/.env`)**:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=<your-mongodb-atlas-or-local-connection-string>
JWT_SECRET=connectindia_evaluation_jwt_secret_key_2026
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
```

**Client (`client/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Seed Database
Run the seed script from the project root (or inside `server`):
```bash
npm run seed
# or: cd server && node src/db/seed.js
```
The seed script initializes:
- System roles (`PLATFORM_ADMIN`, `PROVIDER_OPERATOR`, `ORGANIZATION_VERIFIER`)
- Test provider registrations (CBSE, Insurance, National ID, Employment, Business)
- Test organizations (University of Delhi, Reliance Life, TechCorp)
- Active services with input schemas and purpose requirements
- Organization Service Grants
- Authoritative sample records linked directly to provider IDs
- Initial subject consent records and audit events

### 3. Run Backend Server
```bash
npm run dev:server
# Server listens on http://localhost:5000
# Health check: http://localhost:5000/health
```

### 4. Run Frontend Client
In a separate terminal:
```bash
npm run dev:client
# Vite client starts on http://localhost:5173
```

---

## 5. Private Evaluation Accounts & Test Scenarios

> **Important**: Public demo credential cards have been removed from the login screen. Use the following private evaluation credentials:

**Common Password for All Test Accounts**: `DemoPassword123!`

| Role | Account Email | Scoped Entity | Default Landing |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@connectindia.gov.in` | ConnectIndia Center | `/app/overview` |
| **Provider Operator** | `operator@cbse.gov.in` | CBSE Registry (`IN-CBSE-01`) | `/app/provider/registry` |
| **Provider Operator** | `operator@insurance.mock` | Insurance Registry (`IN-IRDAI-01`) | `/app/provider/registry` |
| **Organization Verifier** | `verifier@delhiuniv.ac.in` | University of Delhi (`IN-DU-01`) | `/app/verification` |
| **Organization Verifier** | `verifier@reliance.mock` | Reliance Life (`IN-REL-01`) | `/app/verification` |

---

## 6. End-to-End Evaluation Workflow

### Scenario A: Platform Administration & Access Approval
1. Log in as `admin@connectindia.gov.in`.
2. Notice the navigation sidebar:
   - **System Overview** (Database-backed metrics)
   - **Organization Management** (Approve/Suspend consumer organizations)
   - **Provider Management** (Approve/Suspend provider adapters)
   - **Service & Access Management** (Create services, assign grants)
   - **Transaction Monitoring** (Global audit ledger)
   - **API Monitoring & Health**
   - **Audit Logs** (Append-only security events)
   - Note: The normal consumer **Verification Portal is hidden** from Admin.
3. Review pending onboarding requests submitted via `/request-access`. Approve or reject with recorded reasons.

### Scenario B: Provider Data Management & Active Reflection
1. Log in as `operator@cbse.gov.in`.
2. Navigate to **Registry / Data Management**:
   - Filter, search, and paginate existing CBSE records.
   - Click **Create Record** and add a new fictional record:
     - Roll: `CBSE-2025-EVAL99`
     - Exam Year: `2025`
     - Candidate: `Simran Kaur`
     - Course: `Class XII (Science)`
     - Result: `Passed (Distinction)`
   - Or click **Bulk Import (CSV)** to ingest records with row-level validation.
   - Click **Export CSV** to download authorized records.
3. Log out and log in as `verifier@delhiuniv.ac.in`.
4. Go to **Verification Portal** and execute a query for:
   - Roll: `CBSE-2025-EVAL99`
   - Year: `2025`
   - Name: `Simran Kaur`
5. **Outcome**: Returns `VERIFIED` with candidate details fetched directly from MongoDB!
6. If the CBSE operator modifies Simran's record or deletes it, subsequent queries immediately return `MISMATCH` or `NOT_FOUND`.

### Scenario C: Multi-Sector Verification & Preset Scenarios
On the Verification Portal, verifiers can test 5 standardized sector adapters:
- **Academic**: Roll `CBSE-2023-90812` (Aarav Sharma) → `VERIFIED`
- **Insurance**: Policy `INS-HLTH-2024-001234` → `VERIFIED` | `INS-MOTR-2022-556677` → `EXPIRED`
- **Identity**: Ref `NID-DEMO-2020-AA1234` → `VERIFIED`
- **Employment**: Ref `EMP-TCS-2019-00441` → `VERIFIED`
- **Business**: Reg `BIZ-MCA-2018-PVT-77441` → `VERIFIED`
- **Missing Record**: Non-existent ID → `NOT_FOUND` (never fabricated mismatch)
- **Simulated Provider Timeout**: Reports `UNAVAILABLE` (503) distinctly from data discrepancies.
- **Revoked Consent**: Blocked by policy engine before adapter invocation (`403 Forbidden`).

---

## 7. Automated Test Suite

A comprehensive 20-test integration suite validates authentication, RBAC, tenant isolation, dynamic CRUD, and adapter workflows:

```bash
cd server
npm test
```

### Verified Test Suite (100% Passing):
```
▶ ConnectIndia Interoperability Platform Integration Tests
  ✔ 1. Authentication: Login fails safely for invalid credentials
  ✔ 2. RBAC Enforcement: Provider Operator cannot access platform admin endpoints (403)
  ✔ 3. RBAC Enforcement: Platform Admin can access admin endpoints
  ✔ 4. Verification: Matching fixture returns "verified" status and request ID
  ✔ 5. Verification: Altered details return "mismatch" without declaring fraud
  ✔ 6. Resilience: Simulated provider outage returns "unavailable" (503), not mismatch
  ✔ 7. Policy & Consent: Revoked consent record denies verification (403)
  ✔ 8. Monitoring: Transactions endpoint returns role-scoped activity
  ✔ 9. CSV Export: Generates safe operational metadata without secrets
  ✔ 10. Multi-Sector Verification: Insurance policy returns verified status
  ✔ 11. Multi-Sector Verification: Identity document returns verified status
  ✔ 12. Multi-Sector Verification: Employment record returns verified status
  ✔ 13. Multi-Sector Verification: Business registration returns verified status
  ✔ 14. Access Request Workflow: Public submission generates reference code
  ✔ 15. Access Request Workflow: Admin can review and approve application
  ✔ 16. Provider Registry CRUD: Operator creates new academic record in database
  ✔ 17. Active Verification Binding: Verifier immediately verifies newly added record
  ✔ 18. Dynamic Outcome: Updating registry record immediately alters subsequent verification
  ✔ 19. Accuracy: Non-existent record returns "not_found", not fabricated mismatch
  ✔ 20. Tenant Isolation: Organization cannot view another org transaction by ID
ℹ tests 20 | pass 20 | fail 0
```

---

## 8. Client Production Build

To verify production bundle compilation:
```bash
cd client
npm run build
```
Builds cleanly with zero errors using Vite and Bootstrap 5.3.

---

## 9. Security & Compliance Highlights

- **Tenant Isolation**: Organizations and providers cannot access other tenants' data by tampering with request payloads or URL parameters. Identity is strictly derived from verified server-side JWT session tokens.
- **Append-Only Auditing**: Every verification event, grant modification, and CRUD mutation produces an append-only audit log entry.
- **No Hardcoded Telemetry**: System metrics and transaction statistics reflect live database state.
- **Safe Error Handling**: Stack traces and internal database schemas are never exposed to clients.
