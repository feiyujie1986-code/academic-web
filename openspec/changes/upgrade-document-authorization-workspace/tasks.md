# Tasks

## 1. API Layer

- [x] 1.1 Add typed list/filter/facet/effective-authorization models.
- [x] 1.2 Add synchronous authorization action API and result models.
- [x] 1.3 Add preview, async operation, polling, items, and retry APIs.
- [x] 1.4 Verify repeated query serialization for category/class/group arrays.

## 2. Authorization Workspace

- [x] 2.1 Extract a document authorization workspace component from the document page.
- [x] 2.2 Implement all/authorized/unauthorized views with facet counts.
- [x] 2.3 Implement nickname/account search, filters, sorting, pagination, and reset.
- [x] 2.4 Render identities, organizations, effective state, direct/inherited source, deny state, and operator metadata.
- [x] 2.5 Respect server `canGrant`, `canRevoke`, `revokeMode`, and disabled-reason fields.

## 3. Selection and Synchronous Actions

- [x] 3.1 Implement explicit current-page selection and mixed-state batch summary.
- [x] 3.2 Clear selection whenever the filter snapshot changes.
- [x] 3.3 Implement single and explicit batch grant up to 500 users.
- [x] 3.4 Implement single and explicit batch effective-access revocation with confirmation.
- [x] 3.5 Display succeeded, skipped, and failed item summaries and refresh the list from the server.

## 4. Cross-Page Async Actions

- [x] 4.1 Implement filter selection and excluded user IDs without loading all IDs.
- [x] 4.2 Create operation previews and confirm using server matched/effective counts.
- [x] 4.3 Create async operations with revision and reusable idempotency key.
- [x] 4.4 Poll queued/processing tasks with background-tab throttling and lifecycle cleanup.
- [x] 4.5 Handle terminal states, token expiry, and revision conflicts.
- [x] 4.6 Implement failed-item detail pagination and retry using the latest revision.

## 5. Integration and UX

- [x] 5.1 Replace the legacy person-category tabs in the existing resource authorization dialog.
- [x] 5.2 Preserve supported class/group authorization entry points until unified organization APIs are available.
- [x] 5.3 Add loading, empty, error, disabled-action, task-progress, and responsive states.
- [x] 5.4 Update the client integration document to match final behavior if implementation differs.

## 6. Verification

- [ ] 6.1 Run `pnpm build` and resolve type/build errors.
- [x] 6.2 Run `pnpm lint` and review automatic fixes for unrelated changes.
- [ ] 6.3 Manually verify explicit grant/revoke, inherited-access revoke, search/filter reset, pagination, and disabled users.
- [ ] 6.4 Manually verify cross-page preview, async progress, conflict recovery, failed details, retry, and dialog cleanup against the backend.
