# Change: Add Document Center (资料中心)

## Why

The educational management system needs a centralized resource management module where administrators can upload, organize, and share course materials (documents, media, images) with students and classes. Currently there is no dedicated interface for managing learning resources with folder hierarchy and permission-based access control.

## What Changes

- **NEW** `src/pages/document/list/index.vue` - Main document center page with file/folder list, filtering, search, and CRUD operations
- **NEW** `src/api/document/` - API layer for document management endpoints (`/v2/admin/documents/*`)
- **NEW** `src/api/document/category.ts` - API for document categories (`/v2/admin/document-categories/*`)
- **NEW** Dialogs for: upload file, create folder, rename, move, permission management
- **REUSE** Existing `useChunkUpload` composable for large file uploads
- **INTEGRATE** Folder tree navigation and breadcrumb path

### Key Features

1. File type filtering (all/media/document/image)
2. Keyword search with pagination
3. Folder hierarchy navigation
4. Small file upload (direct) and large file upload (chunked)
5. Batch operations: delete, permission management
6. Single item operations: rename, move, delete, permission
7. User/Class-based authorization

## Impact

- **Affected specs**: NEW `document-center` capability
- **Affected code**:
  - `src/pages/document/` (new directory)
  - `src/api/document/` (new directory)
  - Router configuration (backend dynamic routes)
- **Dependencies**: Backend API V2 document endpoints must be available
