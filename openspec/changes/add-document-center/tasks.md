# Tasks

## 1. API Layer

- [x] 1.1 Create `src/api/document/document.ts` with types and functions for documents CRUD
- [x] 1.2 Create `src/api/document/category.ts` for document categories API
- [x] 1.3 Create `src/api/document/authorization.ts` for authorization management API

## 2. Page Structure

- [x] 2.1 Create `src/pages/document/list/index.vue` main page component
- [x] 2.2 Implement file type filter tabs (all/media/document/image)
- [x] 2.3 Implement search bar with keyword input and reset
- [x] 2.4 Implement action buttons (upload, new folder, batch permission, batch delete)
- [x] 2.5 Implement file/folder table with selection, icons, and inline actions

## 3. Dialog Components

- [x] 3.1 Create upload file dialog with drag-and-drop support
- [x] 3.2 Integrate chunk upload for large files using existing `useChunkUpload`
- [x] 3.3 Create new folder dialog
- [x] 3.4 Create rename dialog
- [x] 3.5 Create move dialog with folder tree selection
- [x] 3.6 Create permission management dialog (visibility: public/private/custom, user/class selection)

## 4. Core Features

- [x] 4.1 Implement folder navigation (click to enter, breadcrumb support)
- [x] 4.2 Implement pagination with page size options
- [x] 4.3 Implement batch selection and batch operations
- [x] 4.4 Implement file type icon mapping based on extension/type

## 5. Integration

- [x] 5.1 Configure router entry (backend dynamic route) - Note: Routes are dynamically loaded from backend
- [ ] 5.2 Test all CRUD operations with backend API
- [ ] 5.3 Test chunk upload flow for large files

## Dependencies

- Backend API endpoints for `/v2/admin/documents/*` must be available
- Backend menu configuration for route generation

## Notes

- Tasks 5.2 and 5.3 require running backend server for testing
- User/Class selection in permission dialog needs integration with member/class APIs when available
