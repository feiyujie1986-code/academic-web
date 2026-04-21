## ADDED Requirements

### Requirement: Document List Display

The system SHALL display a paginated list of documents and folders with filtering and search capabilities.

#### Scenario: View all documents

- **WHEN** user navigates to the document center page
- **THEN** the system displays a table with all documents and folders in the current directory
- **AND** each row shows: name, file size, upload time, and action buttons

#### Scenario: Filter by file type

- **WHEN** user selects a filter tab (media/document/image)
- **THEN** the system filters the list to show only files of that category
- **AND** folders are still visible under all filter tabs

#### Scenario: Search documents

- **WHEN** user enters a keyword in the search input and triggers search
- **THEN** the system calls the API with the keyword parameter
- **AND** displays matching documents and folders

#### Scenario: Navigate pagination

- **WHEN** user changes page or page size
- **THEN** the system fetches the corresponding page of results
- **AND** preserves current folder context and filter settings

### Requirement: Folder Navigation

The system SHALL support hierarchical folder navigation with parent tracking.

#### Scenario: Enter folder

- **WHEN** user clicks on a folder row
- **THEN** the system updates the current parentId and fetches contents of that folder
- **AND** updates the view to show folder contents

#### Scenario: Navigate to parent

- **WHEN** user clicks breadcrumb or back navigation
- **THEN** the system returns to the parent folder and refreshes the list

### Requirement: File Upload

The system SHALL support uploading files with automatic handling of small and large files.

#### Scenario: Upload small file

- **WHEN** user selects a file less than 10MB via the upload dialog
- **THEN** the system uploads the file directly via `/documents/files` endpoint
- **AND** refreshes the document list on success

#### Scenario: Upload large file with chunked upload

- **WHEN** user selects a file larger than 10MB
- **THEN** the system uses chunk upload flow (init → upload chunks → complete → create record)
- **AND** shows upload progress with pause/resume capability
- **AND** creates a document record via `/documents/files/record` after upload completes

### Requirement: Folder Management

The system SHALL support creating, renaming, moving, and deleting folders.

#### Scenario: Create new folder

- **WHEN** user clicks "New Folder" and enters a folder name
- **THEN** the system calls `POST /documents/folders` with the name and current parentId
- **AND** refreshes the list to show the new folder

#### Scenario: Rename document or folder

- **WHEN** user clicks "Rename" on an item and enters a new name
- **THEN** the system calls `PUT /documents/:id` with the new name
- **AND** updates the item in the list

#### Scenario: Move document or folder

- **WHEN** user clicks "Move" and selects a target folder from the tree
- **THEN** the system calls `PUT /documents/:id` with the new parentId
- **AND** removes the item from current view if moved to different folder

#### Scenario: Delete document or folder

- **WHEN** user confirms deletion of an item
- **THEN** the system calls `DELETE /documents/:id`
- **AND** removes the item from the list
- **AND** shows success message

### Requirement: Batch Operations

The system SHALL support batch delete and batch permission management for selected items.

#### Scenario: Batch delete

- **WHEN** user selects multiple items and clicks "Delete"
- **THEN** the system shows confirmation dialog with count
- **AND** deletes all selected items on confirmation
- **AND** refreshes the list

#### Scenario: Batch permission update

- **WHEN** user selects multiple items and clicks "Batch Permission"
- **THEN** the system opens permission dialog
- **AND** applies the same permission settings to all selected items

### Requirement: Permission Management

The system SHALL support configuring access permissions per document with user and class authorization.

#### Scenario: Set public access

- **WHEN** user sets visibility to "public" in permission dialog
- **THEN** the document is accessible to all users

#### Scenario: Set private access

- **WHEN** user sets visibility to "private" in permission dialog
- **THEN** the document is only accessible to the owner

#### Scenario: Authorize specific users

- **WHEN** user sets visibility to "custom" and selects users
- **THEN** the system calls `POST /documents/:id/authorizations` with authType=1 and user IDs
- **AND** only authorized users can access the document

#### Scenario: Authorize class

- **WHEN** user sets visibility to "custom" and selects a class
- **THEN** the system calls `POST /documents/:id/authorizations` with authType=2 and class ID
- **AND** all students in that class can access the document
