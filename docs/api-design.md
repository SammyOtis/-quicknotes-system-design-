# QuickNotes REST API Specification

This document defines the RESTful API contract for the QuickNotes backend service.

## 1. Endpoint Overview

| Method   | Path                   | Description                                                    | Success Status   |
| :------- | :--------------------- | :------------------------------------------------------------- | :--------------- |
| `GET`    | `/api/v1/notes`        | Retrieves a paginated list of notes for the authenticated user | `200 OK`         |
| `POST`   | `/api/v1/notes`        | Creates a new note for the authenticated user                  | `201 Created`    |
| `GET`    | `/api/v1/notes/:id`    | Retrieves a single note by its unique ID                       | `200 OK`         |
| `PUT`    | `/api/v1/notes/:id`    | Updates the title, body, or category of an existing note       | `200 OK`         |
| `DELETE` | `/api/v1/notes/:id`    | Deletes a note by its unique ID                                | `204 No Content` |
| `GET`    | `/api/v1/notes/search` | Searches user notes using a query parameter (`?q=keyword`)     | `200 OK`         |

## 2. Request & Response Examples

### Creating a Note (`POST /api/v1/notes`)

**Request Header:**

POST /api/v1/notes HTTP/1.1
Host: api.quicknotes.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

Request Body:

JSON
{
"title": "System Architecture Review",
"body": "Prepare load estimate for 1 million DAU and present architecture diagram.",
"category": "Work"
}

Response Body (201 Created):

JSON
{
"status": "success",
"data": {
"id": "e3b0c442-98fc-11ee-b9d1-0242ac120002",
"userId": "usr_99812",
"title": "System Architecture Review",
"body": "Prepare load estimate for 1 million DAU and present architecture diagram.",
"category": "Work",
"createdAt": "2026-10-17T14:30:00Z",
"updatedAt": "2026-10-17T14:30:00Z"
}
}

### Listing Notes (GET /api/v1/notes)

Request Header:

HTTP
GET /api/v1/notes?page=1&limit=10 HTTP/1.1
Host: api.quicknotes.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Response Body (200 OK):

JSON
{
"status": "success",
"meta": {
"total": 2,
"page": 1,
"limit": 10
},
"data": [
{
"id": "e3b0c442-98fc-11ee-b9d1-0242ac120002",
"userId": "usr_99812",
"title": "System Architecture Review",
"body": "Prepare load estimate for 1 million DAU and present architecture diagram.",
"category": "Work",
"createdAt": "2026-10-17T14:30:00Z",
"updatedAt": "2026-10-17T14:30:00Z"
},
{
"id": "f4c1d553-98fc-11ee-b9d1-0242ac120003",
"userId": "usr_99812",
"title": "Groceries List",
"body": "Buy milk, eggs, bread, and fruits.",
"category": "Personal",
"createdAt": "2026-10-16T09:15:00Z",
"updatedAt": "2026-10-16T09:15:00Z"
}
]
}

## 3. Error Status Codes & Response Format

The API uses standard HTTP response status codes to indicate success or failure. All error responses return a uniform JSON error payload.Error CodeTitleDescription / Trigger Scenario400 Bad RequestInvalid InputMissing required fields (e.g., empty title) or title exceeds 100 characters.401 UnauthorizedAuthentication FailedMissing or invalid JWT access token in the Authorization header.403 ForbiddenPermission DeniedUser attempts to view, update, or delete a note belonging to another user.404 Not FoundResource MissingRequesting a note ID that does not exist in the system.500 Internal Server ErrorServer ExceptionAn unhandled exception occurred on the database or application server.Example Error Response Body (400 Bad Request)JSON{
"status": "error",
"code": 400,
"error": "Bad Request",
"message": "Validation failed: Note title is required and must not exceed 100 characters.",
"timestamp": "2026-10-17T14:32:10Z"
}
