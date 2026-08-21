# Design: Document Authorization Workspace

## Context

Document access can be direct, inherited from a class/group, or blocked by an explicit personal deny. Therefore, `effectiveAuthorized` alone is insufficient to derive the available action. The backend supplies `canGrant`, `canRevoke`, `revokeMode`, and an optional disabled reason as the source of truth.

The backend provides two mutation paths:

1. Synchronous actions for explicitly selected users, up to 500 users.
2. Preview-token and asynchronous tasks for all filtered users or large selections.

## Goals

- Let administrators find a person without knowing their identity category.
- Make effective access and inherited sources understandable before revocation.
- Provide safe explicit, batch, and filter-based operations.
- Keep list state consistent with server-side authorization revisions.
- Keep the large page component maintainable by isolating the workspace.

## Non-Goals

- Search by phone number; the backend contract supports nickname and account only.
- Redesign document upload, folder navigation, or document CRUD.
- Infer operation permissions in the client.
- Load every matching user ID for cross-page operations.

## Decisions

### 1. Extract a Dedicated Workspace Component

Create a document-scoped authorization workspace component instead of expanding `src/pages/document/list/index.vue`. The parent passes the document ID/name and controls visibility; the component owns filters, pagination, selection, previews, operations, and polling.

### 2. Unified Person Views

The workspace exposes `all`, `authorized`, and `unauthorized` views backed by the list endpoint and `facets`. Identity categories, classes, groups, and account status are filters rather than primary navigation tabs.

The keyword placeholder is “搜索昵称或账号”. No phone-number claim is shown.

### 3. Server-Derived Authorization Semantics

Rows display:

- `effectiveAuthorized`
- `directAuthorized`
- `explicitlyDenied`
- `authorizationSources`
- `authorizedAt` and `authorizedByName`

Buttons are enabled from `canGrant` and `canRevoke`. The revoke request uses `revokeMode` when supplied, defaulting only to the documented `revoke_effective_access` action for the product-level “取消授权” operation. The UI explains that inherited access may be blocked by a personal deny.

### 4. Selection State Machine

Selection uses a discriminated state:

```ts
type SelectionState
  = | { mode: "explicit", userIds: number[] }
    | {
      mode: "filter"
      filter: AuthorizationFilter
      excludedUserIds: number[]
      matchedCount: number
    }
```

Changing any filter clears selection. Selecting the table header initially selects the current page. The user may then promote the selection to all filtered results without loading IDs. In filter mode, unchecking a visible row adds it to `excludedUserIds`.

### 5. Mutation Routing

- Explicit selection of at most 500 users calls `POST authorization-actions`.
- Filter selection calls `POST authorization-operation-previews`, then uses its token and revision to create an asynchronous operation.
- An explicit selection larger than 500 is not submitted synchronously; the UI directs the user to use “select all filtered results” or narrow the selection.

Every first submission generates `crypto.randomUUID()`. Network retry reuses the same key for that submission. A newly initiated retry task gets a new key.

### 6. Revision and Preview Handling

The latest list response stores `authorizationRevision`. Preview confirmation shows server-provided `matchedCount` and `effectiveCount`. Tokens expire after ten minutes based on `expiresAt`.

If the token expires or the backend reports a revision conflict, the client:

1. Closes the stale confirmation.
2. Reloads the current list and revision.
3. Recreates the preview from the unchanged filter selection when safe.
4. Requires confirmation using the new server counts.

### 7. Async Task Polling

Polling intervals:

- `queued`: 2.5 seconds.
- `processing`: 1.5 seconds.
- hidden browser tab: 7.5 seconds.
- `completed`, `failed`, or `conflict`: stop polling and refresh the list.

Polling timers are cleared when the workspace closes or unmounts. The task panel remains visible during processing and shows processed, succeeded, skipped, and failed counts.

### 8. Results and Retry

Synchronous actions show requested/succeeded/skipped/failed summaries and allow failed details to be reviewed. Async failures are fetched from the items endpoint. Skipped `ALREADY_AUTHORIZED` and `ALREADY_UNAUTHORIZED` items are not presented as errors.

Retry first refreshes the list to obtain the latest revision, then creates a new task through the retry endpoint. Non-retryable conditions such as disabled or missing users remain visible with localized guidance.

### 9. Refresh Instead of Optimistic Mutation

After synchronous completion or async terminal status, the current list is requested again. The client does not infer resulting access locally because effective authorization may depend on inherited sources and explicit denies.

## API Mapping

| Client action            | Endpoint                                                                   |
| ------------------------ | -------------------------------------------------------------------------- |
| Load people              | `GET /v2/admin/documents/:id/authorization-users`                          |
| Explicit grant/revoke    | `POST /v2/admin/documents/:id/authorization-actions`                       |
| Preview filter operation | `POST /v2/admin/documents/:id/authorization-operation-previews`            |
| Start async operation    | `POST /v2/admin/documents/:id/authorization-operations`                    |
| Poll operation           | `GET /v2/admin/documents/:id/authorization-operations/:operationId`        |
| Load operation items     | `GET /v2/admin/documents/:id/authorization-operations/:operationId/items`  |
| Retry failures           | `POST /v2/admin/documents/:id/authorization-operations/:operationId/retry` |

Array query parameters use repeated keys through the existing Axios serializer behavior or an explicit serializer if required.

## Risks and Mitigations

| Risk                                             | Mitigation                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Revoking inherited access surprises the operator | Show authorization sources and explicit-deny explanation in confirmation      |
| Stale preview changes the affected population    | Submit expected revision and require a new preview on conflict                |
| Duplicate network submission                     | Generate and reuse an idempotency key per submission                          |
| Polling leaks after dialog close                 | Centralize and clear timers on close/unmount                                  |
| Existing page becomes harder to maintain         | Extract the workspace and isolate API/state logic                             |
| Backend omits optional disabled reason           | Provide safe generic disabled text while respecting boolean capability fields |
