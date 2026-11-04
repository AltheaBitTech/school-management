# Phase 9 — QR staff attendance
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md`.

## Goal

A staff member shows a QR code. A user with `attendance.mark` scans it and checks that staff member in or out for today. Use the existing `StaffAttendance` model. Do not add student attendance.

## Token

`GET /staff/me/attendance-qr` requires `staff.self.attendance.view`.

`GET /staff/:staffId/attendance-qr` requires `attendance.view` and resolves the staff row in the caller’s organization.

Both return `{ qrCodeDataUrl, expiresAt }`. The QR payload is a short-lived signed token (staff id, organization id, expiry), signed with the existing JWT secret or `JWT_ACCESS_SECRET`. Expiry: 12 hours. Do not put a raw staff UUID in the QR as the only check.

Library: `qrcode` is already used for visitor passes. Reuse it on the server. Return a data URL.

## Scan

`POST /attendance/scan` body `{ token: string }` requires `attendance.mark`.

- Verify the signature and expiry. Invalid or expired token → 400.
- The token’s organization must match the caller’s organization. A token from another org → 404.
- Load the staff member in that organization. Inactive staff → 400.
- Today is the organization’s attendance date (use the org timezone from `OrganizationSettings`, falling back to UTC).
- If there is no row for that staff and date, create one with `checkInAt = now` and status `PRESENT` (use the existing `AttendanceStatus` values already written by `saveAttendanceForStaff`).
- If the row has `checkInAt` and no `checkOutAt`, set `checkOutAt = now`.
- If both are set, return 400 with a clear message. Do not open a second row.
- Response: staff display name, employee code, action `CHECK_IN` or `CHECK_OUT`, and the times.

Also accept `{ employeeCode: string }` on the same endpoint for cameras that fail. Resolve the code inside the organization. Same check-in/out rules.

## UI

- Staff self-service (`/staff/attendance` or the staff dashboard): “My QR” card showing the image and expiry. Regenerate when expired.
- New page `/attendance/scan` for `attendance.mark`: camera scan plus an employee-code field. Show the result (name and in/out) after a successful post. Use `BarcodeDetector` when present; otherwise the code field is enough. Add `html5-qrcode` only if `BarcodeDetector` cannot be used and the page stays client-only.
- Sidebar: one item, “Scan attendance”, permission `attendance.mark`. Do not restore the full attendance register to the admin nav. `/attendance` and `/reports/attendance` stay as they are.

## Tests

- Expired or tampered token → 400.
- Token from org A used by org B → 404.
- First scan creates check-in; second scan sets check-out; third → 400.
- Caller without `attendance.mark` → 403.
- Employee code from another organization is not found.

## Out of scope

Student QR, biometric devices, kiosk mode without login, GPS.

## Done when

- Staff can open their QR, and a marker can check them in and out.
- API typecheck and the attendance tests pass.
