# Contributions Backend API

This document describes the backend API for managing user contributions in the Ambiguity application.

## Data Model

### DefinitionCandidate Interface

```typescript
interface DefinitionCandidate {
  id: string;
  text: string;
  source: string;
  weight: number;
  userId?: string;
  status: "draft" | "pending" | "published" | "rejected";
  createdAt: string;
  updatedAt: string;
}
```

### Contribution Statuses

- **draft**: User is still working on the contribution
- **pending**: Submitted for review
- **published**: Approved and publicly visible
- **rejected**: Rejected during review process

## API Endpoints

### 1. Get User Contributions

**GET** `/api/contributions?userId={userId}`

Retrieves all contributions for a specific user, organized by status.

**Query Parameters:**

- `userId` (required): The user's unique identifier

**Response:**

```json
{
  "success": true,
  "data": {
    "drafts": [DefinitionCandidate[]],
    "pending": [DefinitionCandidate[]],
    "published": [DefinitionCandidate[]],
    "rejected": [DefinitionCandidate[]]
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/contributions?userId=demo-user-1"
```

### 2. Get Single Contribution

**GET** `/api/contributions/{id}`

Retrieves a specific contribution by its ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "term": TermEntry,
    "candidate": DefinitionCandidate
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/contributions/sc-1"
```

### 3. Update Contribution Status

**PATCH** `/api/contributions/{id}`

Updates the status of a specific contribution.

**Request Body:**

```json
{
  "status": "published" // "draft" | "pending" | "published" | "rejected"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contribution status updated successfully"
}
```

**Example:**

```bash
curl -X PATCH "http://localhost:3000/api/contributions/sc-1" \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

### 4. Delete Contribution

**DELETE** `/api/contributions/{id}`

Permanently deletes a contribution.

**Response:**

```json
{
  "success": true,
  "message": "Contribution deleted successfully"
}
```

**Example:**

```bash
curl -X DELETE "http://localhost:3000/api/contributions/sc-1"
```

## Updated Upload API

The existing upload API has been enhanced to track user information:

### File Upload

**POST** `/api/upload` (multipart/form-data)

**Form Fields:**

- `file` (required): The file to upload
- `term` (required): The term being defined
- `source` (optional): Source description
- `userId` (optional): User identifier (defaults to "anonymous")

### Text Upload

**POST** `/api/upload` (application/json)

**Request Body:**

```json
{
  "term": "string",
  "definition": "string",
  "source": "string (optional)",
  "userId": "string (optional)"
}
```

Both upload methods now create contributions with:

- `status: "pending"` (awaiting review)
- `userId` from the request or "anonymous"
- `createdAt` and `updatedAt` timestamps

## Helper Functions

The following helper functions are available in `lib/mock-data.ts`:

### `getUserContributions(userId: string)`

Returns all contributions for a user, organized by status.

### `updateContributionStatus(candidateId: string, newStatus: string)`

Updates the status of a contribution and its `updatedAt` timestamp.

### `deleteContribution(candidateId: string)`

Removes a contribution from the system.

### `findContributionById(candidateId: string)`

Finds a contribution by ID and returns both the term and candidate data.

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found (contribution doesn't exist)
- `500`: Internal Server Error

Error responses include a descriptive message:

```json
{
  "error": "User ID is required"
}
```

## Usage Examples

### Frontend Integration

```typescript
// Fetch user contributions
const response = await fetch(`/api/contributions?userId=${userId}`);
const { data } = await response.json();
const { drafts, pending, published, rejected } = data;

// Update contribution status
await fetch(`/api/contributions/${candidateId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "published" }),
});

// Upload with user tracking
const formData = new FormData();
formData.append("file", file);
formData.append("term", term);
formData.append("userId", userId);
await fetch("/api/upload", { method: "POST", body: formData });
```

## Notes

- All timestamps are in ISO 8601 format
- User IDs are optional and default to "anonymous" if not provided
- The system uses in-memory storage (TERMS array) for demo purposes
- In production, you would replace this with a proper database
- All contributions start with "pending" status and require manual review
