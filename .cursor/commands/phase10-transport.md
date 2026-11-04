# Phase 10 — Transport assignment
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md` and `docs/09-FEES-TRANSPORT-ASSETS.md` sections 10–14.

## Goal

Schools can define routes, stops, and vehicles, and assign a student to a pickup stop for a date range. Parents and students can see that assignment. No live tracking.

## Data

All tables include `organizationId`. Follow the style of `Student` and `FeeStructure`.

- `TransportRoute`: `name`, `code` unique per org, `active`.
- `TransportStop`: `routeId`, `name`, `sequence` (int), optional `address`, optional `pickupTime` (string `HH:mm`). Unique `(routeId, sequence)`.
- `TransportVehicle`: `registrationNumber` unique per org, `vehicleType`, `capacity` (int > 0), optional `driverStaffId` (staff in the same org), `active`.
- `StudentTransportAssignment`: `studentId`, `routeId`, `stopId`, optional `vehicleId`, `effectiveFrom` (date), optional `effectiveTo`. The stop’s route must match `routeId`. Vehicle, when set, is in the same org.

Do not delete history. Ending an assignment sets `effectiveTo`. A student may have only one assignment whose range covers a given date. Overlap → 400.

Vehicle capacity: count assignments active today on that vehicle. Over capacity → 400.

## Permissions

Add and seed:

- `transport.view`, `transport.manage`, `transport.assign`
- `student.self.transport.view`

Grant `transport.view`, `transport.manage`, and `transport.assign` to `SCHOOL_ADMIN` and `PRINCIPAL`. Grant `transport.view` to `RECEPTIONIST`. Grant `student.self.transport.view` to `STUDENT` and `PARENT`.

## API

Org id from the session on every call.

- `GET/POST /transport/routes`, `PATCH /transport/routes/:id` — manage for writes, view for reads.
- `PUT /transport/routes/:id/stops` — replace the ordered stop list in one transaction.
- `GET/POST /transport/vehicles`, `PATCH /transport/vehicles/:id`.
- `GET /transport/assignments?studentId=&routeId=` — `transport.view`.
- `POST /transport/assignments` and `PATCH /transport/assignments/:id` — `transport.assign`.
- `GET /student-self/transport` — current assignment for the logged-in student (`effectiveFrom <= today` and `effectiveTo` null or `>= today`).
- `GET /parent-self/children/:studentId/transport` — same, and the parent must already be linked to that student (reuse the parent-self link check).

Return route name, ordered stop name, vehicle registration, driver name. Do not return the full roster on the self-service endpoints.

## UI

- `/transport` list of routes (`ListPageShell`, permission `transport.view`).
- `/transport/routes/new` and `/transport/routes/[id]` to edit stops in sequence (`FormPageShell`).
- `/transport/vehicles` and a vehicle form.
- On the student detail page, a Transport section to assign or end an assignment (`transport.assign`).
- Student profile and parent home: show the current route and stop when the self permission is present.
- Sidebar item “Transport” gated by `transport.view`. Students see it only as a line on the existing portal home, not a new staff module.

## Report

`GET /reports/transport` with `report` export permission pattern used by the other six reports. CSV of active assignments: student code, name, class, route, stop, vehicle. Reuse `csv-export.util.ts`. Empty export stays disabled in the UI.

## Tests

- Overlapping assignment → 400.
- Stop from another route → 400.
- Org A cannot read Org B’s route or assignment.
- Parent of student A cannot read student B’s transport.
- Student self returns only their own row.
- Capacity exceeded → 400.

## Out of scope

GPS, fees for transport (fee structures already exist), driver mobile app, vehicle maintenance.

## Done when

- Admin can create a route with stops, a vehicle, and a student assignment.
- Student and linked parent see that assignment.
- API typecheck, web typecheck, and the tests above pass.
