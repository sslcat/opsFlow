# ADR-0003: Business RBAC and Permissions

## Status

Accepted

## Date

2026-09-18

## Context

Clerk provides authentication and organization membership, but OpsFlow requires business-specific authorization.

Financial authority must remain separate from identity-provider administration.

For example, a Clerk organization administrator should not automatically be authorized to approve invoices or resolve financial exceptions.

## Decision

OpsFlow will own its business Role-Based Access Control model.

Clerk remains responsible for:

- Authentication
- User identity
- Organization identity
- Organization membership

OpsFlow remains responsible for:

- Business roles
- Permissions
- Workflow authorization
- Assignments
- Approval policies
- Audit attribution

## Initial Roles

The initial business roles are:

- Organization Administrator
- Controller
- AP Manager
- AP Specialist
- Procurement
- Auditor

Future roles may include:

- Receiver
- Approver
- Platform Support

## Permission Model

Authorization will be enforced using stable resource/action permission keys rather than hard-coded role-name checks.

Initial permission families include:

- `organization.read`
- `organization.manage`
- `membership.read`
- `membership.manage`
- `role.read`
- `role.manage`
- `order.read`
- `order.create`
- `order.update`
- `document.read`
- `document.upload`
- `document.process`
- `invoice.read`
- `invoice.create`
- `invoice.update`
- `invoice.process`
- `exception.read`
- `exception.triage`
- `exception.assign`
- `exception.resolve`
- `audit.read`

Future permissions may include:

- `receipt.read`
- `receipt.create`
- `approval.read`
- `approval.act`
- `analytics.read`
- `ai.execute`
- `ai.review`
- `ai.configure`

## Enforcement

Authorization must be enforced on the server.

The frontend may hide or disable unauthorized actions for usability, but the UI is never a security boundary.

Each protected business operation must resolve an authorization context containing:

- Clerk user ID
- Active Clerk organization ID
- Internal user ID
- Internal organization ID
- Membership ID
- Effective permissions

An operation may proceed only if the required permission exists.

## Conditional Policies

RBAC answers whether a user may perform a category of action.

Future conditional policies may further restrict specific records.

Examples:

- A specialist may only resolve an exception assigned to them.
- A user may not approve an invoice they created.
- Approval authority may depend on invoice amount.
- Procurement may update Purchase Orders but not payment status.

Conditional policies must be centralized rather than scattered throughout UI components.

## Role Assignment

The data model may support multiple roles per membership.

The first product version should normally assign one primary role to keep administration understandable.

Explicit deny rules will not be implemented initially.

Permissions will be additive.

## HTTP Behavior

Protected APIs should use consistent authorization responses:

- `401` — no valid authenticated session
- `403` — authenticated but missing organization, membership, or permission
- `404` — tenant-scoped resource does not exist or belongs to another tenant
- `409` — business or workflow state conflicts with the requested action

## Consequences

### Positive

- Business authorization remains independent of Clerk pricing and role limitations
- Supports custom financial workflows
- Supports future segregation of duties
- Supports auditability
- Supports enterprise approval policies

### Negative

- Requires additional database models
- Requires permission seeding
- Requires authorization tests
- Requires synchronization between Clerk membership and OpsFlow membership

## Future Work

Future releases may add:

- Custom organization-specific roles
- Segregation-of-duties policies
- Amount-based approval authority
- Temporary privileged access
- Service identities for ERP integrations