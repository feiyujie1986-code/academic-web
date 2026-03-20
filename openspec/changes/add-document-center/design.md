# Design: Document Center

## Context

Adding a file management module to the admin dashboard that mirrors common file manager UX (folders, files, operations). The backend API is already designed and documented. This document covers frontend implementation decisions.

## Goals / Non-Goals

### Goals
- Provide intuitive file/folder management interface
- Support large file uploads via existing chunk upload infrastructure
- Enable permission-based sharing with users and classes

### Non-Goals
- File preview/editing (out of scope for initial implementation)
- Drag-and-drop file organization (future enhancement)
- Client-side file compression

## Decisions

### 1. Single-page Architecture
**Decision**: Implement as a single page (`document/list/index.vue`) with dialogs for all operations.

**Rationale**:
- Keeps navigation simple (no separate detail page needed)
- Folder navigation updates current view state
- Consistent with file manager UX patterns

### 2. Reuse Existing Chunk Upload
**Decision**: Integrate `useChunkUpload` composable for large files, use direct upload for small files.

**Rationale**:
- `useChunkUpload` already handles: MD5 hashing, pause/resume, progress tracking
- Two-step flow for chunked uploads: upload file → create document record via `/documents/files/record`
- Small files (<10MB) can use direct `/documents/files` endpoint

### 3. File Type Categorization
**Decision**: Map file extensions to categories locally (media, document, image) for UI display and filtering.

**Rationale**:
- Backend returns generic `type` (1=folder, 2=file)
- Frontend needs finer granularity for icons and filter tabs
- Extension-based detection is sufficient for admin use case

```typescript
// Example mapping
const categoryByExtension = {
  document: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "txt"],
  media: ["mp3", "mp4", "wav", "avi", "mov", "mkv"],
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg"]
}
```

### 4. State Management
**Decision**: Use local component state with `ref/reactive`, no Pinia store.

**Rationale**:
- Document list is page-scoped, not shared globally
- Current folder path and filters are ephemeral
- Simplifies implementation without adding store boilerplate

### 5. Folder Tree for Move Dialog
**Decision**: Fetch folder tree on-demand when opening move dialog.

**Rationale**:
- Uses `/documents/folder-tree` endpoint
- Tree data is not needed until move action
- Keeps initial page load fast

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Large folder trees may load slowly | Add loading state, consider lazy-loading tree nodes in future |
| Upload failures on network issues | Chunk upload already supports resume; show clear error states |
| Permission dialog complexity | Start with simple public/private/custom; iterate based on feedback |

## Open Questions

1. **File preview**: Should clicking a file open a preview modal or download directly?
   - **Proposed**: Download for now, preview as future enhancement

2. **Folder path breadcrumb**: Should we show full path or just parent?
   - **Proposed**: Show full clickable breadcrumb path

3. **Category filter with folders**: Should folder type be shown under all tabs?
   - **Proposed**: Yes, folders appear under all filter tabs (as provided in template)