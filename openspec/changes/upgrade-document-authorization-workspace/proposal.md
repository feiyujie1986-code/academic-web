# Change: Upgrade Document Authorization Workspace

## Why

The current document authorization dialog separates people by identity tabs, forcing administrators to know a person's category before searching. It also uses legacy direct authorization APIs and cannot safely manage inherited access, explicit denies, cross-page selection, or large asynchronous operations.

## What Changes

- Replace the category-tab permission dialog with a unified authorization workspace.
- Add global nickname/account search with authorization, identity, organization, and account-status filters.
- Display effective authorization, direct authorization, explicit deny, authorization sources, and server-controlled operation availability.
- Support individual and explicit batch grant/revoke operations for up to 500 users.
- Support filter-based cross-page selection through preview tokens and asynchronous authorization tasks.
- Add task progress polling, partial-result details, conflict recovery, and failed-item retry.
- Preserve the existing class/group authorization features outside the unified person workspace until the backend exposes equivalent unified organization operations.
- Replace legacy person authorization API calls with the `/v2/admin/documents/:id/authorization-*` contract.

## Impact

- **Affected specs**: `document-center`
- **Affected code**:
  - `src/api/document/authorization.ts`
  - `src/pages/document/list/index.vue`
  - New document authorization components/composables under `src/pages/document/list/`
- **Backend dependency**: V2 authorization list, synchronous actions, previews, asynchronous operations, operation items, and retry endpoints.
- **Behavioral impact**: “Cancel authorization” means `revoke_effective_access`, which may create an explicit deny when access is inherited.
