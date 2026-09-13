# CampusOps — Fees, Transport & Assets

## 1. Purpose

This document defines the operational architecture for fees, transport, and asset management.

CampusOps should complement a School ERP rather than replace a full academic/finance ERP. Financial and transport workflows therefore focus on operational visibility, configuration, tracking, approvals, and reporting.

---

## 2. Scope

### Fees
- Fee categories and structures
- Student fee assignments
- Payment status
- Receipts
- Outstanding balances
- Basic fee reports
- Payment/audit history

### Transport
- Routes
- Stops
- Vehicles
- Drivers/transport staff
- Student route assignments
- Transport status and operational records

### Assets
- Asset registration
- QR/barcode identifiers
- Categories
- Locations
- Assignment/transfer
- Maintenance
- Warranty
- Retirement
- Asset history

### Future
- Payment gateway integration
- Full accounting
- Purchase orders
- Inventory
- Vendor management
- GPS fleet tracking
- Automated transport attendance
- Preventive maintenance automation

---

# 3. Fees Boundary

CampusOps should not become a general ledger/accounting system in the MVP.

The fee domain should answer operational questions such as:

- What fees are assigned?
- What has been paid?
- What is outstanding?
- Which student/guardian received a receipt?
- What is the payment history?
- What needs attention?

Complex accounting, taxation, reconciliation, and statutory finance should remain outside the initial scope unless explicitly required.

---

# 4. Fee Structure

A fee structure can contain:

- Organization
- Academic/session period
- Name
- Description
- Active status
- Fee components
- Applicable student/group criteria
- Due dates

Examples:

```text
Tuition Fee
Transport Fee
Library Fee
Laboratory Fee
Activity Fee
Examination Fee
```

The exact fee types should be configurable.

---

# 5. Student Fee Assignment

A fee structure becomes an actual obligation only when assigned to the appropriate student/group.

Conceptually:

```text
Fee Structure
     ↓
Applicable Group / Student
     ↓
Student Fee Assignment
     ↓
Amount Due
```

Do not calculate outstanding amounts only in the frontend.

The backend should derive:

```text
Outstanding = Assigned Amount + Adjustments - Successful Payments
```

with appropriate handling for refunds, waivers, discounts, and cancellations if those features are enabled.

---

# 6. Fee Payment Workflow

Recommended flow:

```text
Fee Due
   ↓
Payment Initiated
   ↓
Payment Confirmed
   ↓
Receipt Generated
   ↓
Student/Guardian Notified
   ↓
Audit Recorded
```

A payment should not be treated as successful merely because the frontend reports success.

Payment-provider callbacks/webhooks must be verified server-side when a gateway is introduced.

---

# 7. Receipts

A receipt should contain:

- Organization
- Receipt number
- Student
- Fee assignment
- Amount
- Payment date
- Payment method
- Reference number
- Status
- Generated document/file reference

Receipt numbers should be unique within the organization.

Generated receipts should be immutable after successful issuance except through explicit correction/refund workflows.

---

# 8. Fee Adjustments

Future-capable adjustment concepts:

- Discount
- Waiver
- Scholarship
- Refund
- Manual adjustment

Every adjustment should record:

- Amount
- Reason
- Actor
- Timestamp
- Related fee/payment
- Approval where required

Financial changes should always be auditable.

---

# 9. Fee Permissions

Example permissions:

```text
fee.view
fee.configure
fee.assign
fee.collect
fee.refund
fee.adjust
fee.receipt.view
fee.report
```

A parent/student-facing user should only see their authorized fee information.

Accountants may have broad fee permissions without automatically receiving unrelated administrative permissions.

---

# 10. Transport Domain

Transport should initially focus on operational assignment rather than real-time fleet tracking.

Core entities:

- Vehicle
- Route
- Stop
- Driver/staff
- Student transport assignment

---

# 11. Routes and Stops

A route may contain ordered stops:

```text
Route
 ├── Stop 1
 ├── Stop 2
 ├── Stop 3
 └── Stop 4
```

Each stop may contain:

- Name
- Address/description
- Sequence
- Pickup/drop timing
- Active status

Route ordering must be explicit.

---

# 12. Vehicle

A vehicle may contain:

- Registration number
- Vehicle type
- Capacity
- Driver/assigned staff
- Route assignment
- Insurance/fitness metadata where required
- Active/inactive status

Vehicle information should not be confused with the Asset module if the product needs both.

A vehicle can be represented as a transport entity while optionally linking to an underlying asset record.

---

# 13. Student Transport Assignment

A student may be assigned to:

```text
Student
   ↓
Route
   ↓
Pickup Stop
   ↓
Vehicle
```

The assignment should include an effective period so route changes remain historically understandable.

Avoid overwriting old assignments without preserving history.

---

# 14. Transport Safety

Operational transport data can be sensitive.

Access should be limited to authorized roles.

Examples:

- Receptionist: operational lookup
- School Admin: management
- Transport administrator: transport operations
- Parent/student: own authorized transport information

Do not expose the complete student transport roster through public APIs.

---

# 15. Transport Future Extensions

Potential future capabilities:

- GPS tracking
- Driver mobile app
- Route optimization
- Live ETA
- Geofencing
- Transport notifications
- Vehicle maintenance integration
- Emergency alerts

These should be added behind clear module boundaries rather than coupling GPS/device logic to basic route assignment.

---

# 16. Asset Management

Asset management is a core CampusOps operational capability.

The requirements identify categories including:

- Computers
- Laptops
- Projectors
- Furniture
- Science Equipment
- Sports Equipment
- Library Assets
- Vehicles

---

# 17. Asset Record

An asset may contain:

- Asset ID
- Asset code
- QR/barcode
- Name
- Category
- Serial number
- Purchase information
- Warranty information
- Location
- Current assignee
- Status
- Condition
- Description
- Created/updated timestamps

Asset codes should be unique within the organization.

---

# 18. Asset Lifecycle

Recommended lifecycle:

```text
REGISTERED
    ↓
AVAILABLE
    ↓
ASSIGNED
    ↓
IN_MAINTENANCE
    ↓
AVAILABLE / ASSIGNED
    ↓
RETIRED
```

Exact statuses can be configured, but transitions should be explicit.

An asset should not be silently moved from one state to another without preserving history.

---

# 19. Asset Assignment & Transfer

Example:

```text
Asset
  ↓
Assigned to Staff / Department / Location
  ↓
Transfer Requested
  ↓
Authorized Transfer
  ↓
New Assignment
  ↓
History Recorded
```

Every transfer should preserve:

- Previous assignee/location
- New assignee/location
- Actor
- Date/time
- Reason where applicable

---

# 20. Asset Maintenance

Maintenance records should capture:

- Asset
- Issue
- Maintenance type
- Vendor/service provider where applicable
- Start/end dates
- Cost where applicable
- Remarks
- Status
- Supporting documents

Maintenance history should remain attached to the asset even after reassignment.

---

# 21. Warranty

Warranty information can include:

- Start date
- End date
- Provider
- Reference number
- Coverage details
- Document attachment

Future automation can notify authorized users before warranty expiry.

---

# 22. Asset Retirement

Retirement should be a controlled operation.

Possible reasons:

- Damaged beyond repair
- Obsolete
- Lost
- Sold/disposed
- End of useful life

The system should preserve the final asset state and retirement reason.

Deleting retired assets should normally be prohibited.

---

# 23. QR / Barcode

The requirements call for QR/barcode support.

The QR/barcode should identify the asset and open an authenticated asset workflow.

Do not encode sensitive information directly into the QR value.

Prefer:

```text
QR
 ↓
Opaque Asset Identifier
 ↓
Authenticated API
 ↓
Asset
```

Future mobile scanning can reuse the same backend authorization.

---

# 24. Asset Permissions

Example:

```text
asset.view
asset.create
asset.update
asset.assign
asset.transfer
asset.maintenance
asset.retire
asset.report
```

Resource-level authorization must still apply.

---

# 25. Asset Reports

Useful reports:

- Assets by category
- Assets by department
- Assets by location
- Assigned/unassigned assets
- Assets under maintenance
- Warranty expiry
- Retired assets
- Asset transfer history
- Maintenance cost summary

Exports may support PDF, Excel, and CSV according to the reporting architecture.

---

# 26. Database Considerations

Conceptual entities include:

```text
FeeStructure
FeeComponent
StudentFeeAssignment
FeePayment
FeeReceipt

TransportRoute
TransportStop
Vehicle
StudentTransportAssignment

Asset
AssetCategory
AssetAssignment/Transfer
AssetMaintenance
AssetHistory
```

Tenant-owned entities should include `organizationId`.

Use organization-scoped unique constraints for human-readable codes and identifiers.

---

# 27. Transactions & Integrity

Important operations should use transactions.

Examples:

### Fee payment

```text
Verify payment
 → Record payment
 → Update financial state
 → Generate receipt
 → Record audit
```

### Asset transfer

```text
Validate current assignment
 → Create transfer/history
 → Update current assignment
 → Audit
```

### Student transport reassignment

```text
Validate route/stop
 → Close previous assignment
 → Create new assignment
 → Audit
```

---

# 28. MVP

Recommended initial implementation:

### Fees
- Configurable fee categories
- Student fee assignment
- Payment recording
- Receipts
- Outstanding report
- Audit

### Transport
- Routes
- Stops
- Vehicles
- Student assignments
- Basic operational reports

### Assets
- Asset CRUD
- QR/barcode
- Assignment
- Transfer
- Maintenance
- Warranty
- Retirement
- History

---

# 29. Future

Defer until validated by actual usage:

- Payment gateway
- Full accounting
- Inventory
- Purchase orders
- Vendor management
- GPS
- Live transport tracking
- Automated preventive maintenance
- Advanced procurement

---

# 30. Key Principles

1. Keep finance operational; do not prematurely build a full accounting system.
2. Keep transport assignment separate from live GPS infrastructure.
3. Preserve fee, transport, and asset history.
4. Make financial and asset state transitions auditable.
5. Enforce tenant isolation on every entity.
6. Keep QR/barcode as an input mechanism, not a separate business domain.
7. Use transactions for state-changing operations.
8. Keep future payment/device integrations behind provider boundaries.
