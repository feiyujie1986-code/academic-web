## MODIFIED Requirements

### Requirement: Permission Management

The system SHALL provide a unified document authorization workspace that searches people by nickname or account, displays effective and inherited access, and safely grants or revokes access through server-authorized operations.

#### Scenario: Find a person without knowing their identity category

- **WHEN** an administrator searches by nickname or account without selecting a category
- **THEN** the system queries all matching people
- **AND** displays each person once with all identities and organization memberships

#### Scenario: Filter and paginate authorization users

- **WHEN** an administrator changes authorization status, identity category, class, group, account status, sort, page, or page size
- **THEN** the system requests the corresponding server-filtered page
- **AND** displays server-provided all, authorized, and unauthorized facet counts
- **AND** limits page size to the server maximum of 100

#### Scenario: Display effective authorization

- **WHEN** a person receives access directly, through a class or group, or is explicitly denied
- **THEN** the system displays effective access, direct access, explicit deny, and authorization sources
- **AND** uses server-provided capability fields to enable or disable grant and revoke operations

#### Scenario: Grant explicitly selected people

- **WHEN** an administrator grants access to an explicit selection of no more than 500 people
- **THEN** the system submits a synchronous `grant` action with an idempotency key
- **AND** shows succeeded, skipped, and failed outcomes
- **AND** reloads the current list from the server

#### Scenario: Revoke effective access

- **WHEN** an administrator confirms cancellation for a revocable person
- **THEN** the system submits `revoke_effective_access` or the server-provided revoke mode
- **AND** explains that an explicit deny may be created to block inherited access
- **AND** reloads the current list after completion

#### Scenario: Select all filtered people

- **WHEN** an administrator promotes current-page selection to all filtered results
- **THEN** the system stores the current filter snapshot and excluded user IDs without loading every matching ID
- **AND** clears the selection if any search or filter condition changes

#### Scenario: Preview a cross-page operation

- **WHEN** an administrator starts a grant or revoke operation for all filtered people
- **THEN** the system creates a server preview using the filter snapshot and exclusions
- **AND** confirms the operation using the server-provided matched and effective counts
- **AND** does not submit an expired preview token

#### Scenario: Run and monitor a large operation

- **WHEN** the administrator confirms a valid preview
- **THEN** the system creates an asynchronous operation using the preview revision and an idempotency key
- **AND** polls until the operation is completed, failed, or conflicted
- **AND** shows processed, succeeded, skipped, and failed counts
- **AND** refreshes the authorization list at terminal state

#### Scenario: Authorization revision changes after preview

- **WHEN** the server rejects an operation because authorization state changed after preview
- **THEN** the system reloads the current list and latest authorization revision
- **AND** creates a new preview
- **AND** requires the administrator to confirm the updated counts

#### Scenario: Review and retry failed items

- **WHEN** a completed asynchronous operation contains failed items
- **THEN** the administrator can view paginated failure details and localized reasons
- **AND** can create a new retry task using the latest authorization revision and a new idempotency key

#### Scenario: Close the workspace during an active task

- **WHEN** the authorization workspace closes or unmounts
- **THEN** all local polling timers stop
- **AND** reopening the workspace loads current server state without relying on stale local row mutations
