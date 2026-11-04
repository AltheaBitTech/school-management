# Phase 7 — Visitor webcam photo
# Implement this phase only. Spec: `docs/23-REMAINING-WORK-PLAN.md`.

## Goal

On visitor check-in, let the receptionist capture a photo from the laptop camera. The photo is stored as a File and linked with the existing `photoFileId`.

## Current behavior to keep

`apps/web/src/app/(app)/visitors/new/page.tsx` already uploads a file and sends `photoFileId`. Badge and pass pages already render that file. Repeat lookup by mobile already returns a previous photo. Do not replace that path.

## UI

On the visitor register form, next to the existing upload:

- **Use camera** opens a preview using `navigator.mediaDevices.getUserMedia({ video: true })`.
- **Capture** draws the frame to a canvas and uploads it through the existing file upload client as `image/jpeg`.
- **Retake** clears the preview and the selected `photoFileId`.
- If the browser denies the camera, or `getUserMedia` is missing, show a short message and leave the file picker usable.
- Stop the camera track when the dialog closes or the page unmounts.

## API

No new visitor endpoint. Reuse file upload rules already enforced for visitor photos (image MIME, max size, same organization). The create/update visitor DTO already accepts `photoFileId`.

Confirm the uploaded file belongs to the caller’s organization before saving it on the visitor. Reject a file id from another organization.

## Tests

- API: creating a visitor with another organization’s `photoFileId` is rejected.
- Web: if a visitors form test exists, cover the fallback when the camera is unavailable. Do not require a real camera in CI.

## Out of scope

Native mobile camera apps, face detection, storing the image outside the Files module.

## Done when

- Check-in can save a captured photo, and the badge/pass shows it.
- File upload still works when the camera is blocked.
- API typecheck and the visitors tests pass.
