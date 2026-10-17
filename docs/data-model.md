# QuickNotes Relational Data Model Specification

This document details the database schema architecture, entity-relationship structure, DDL statements, indexing strategies, and relational database selection for QuickNotes.

## 1. Entities & Data Dictionary

### `users`

- **`id`** (`UUID`, Primary Key): Unique internal identifier for the user.
- **`email`** (`VARCHAR(255)`, Unique, NOT NULL): User's primary authentication email.
- **`password_hash`** (`VARCHAR(255)`, NOT NULL): Securely hashed user password.
- **`name`** (`VARCHAR(100)`, NOT NULL): Display name of the user.
- **`created_at`** (`TIMESTAMPTZ`, NOT NULL): Account creation timestamp.

### `notes`

- **`id`** (`UUID`, Primary Key): Unique identifier for each note.
- **`user_id`** (`UUID`, Foreign Key $\rightarrow$ `users.id`, NOT NULL): Owner of the note.
- **`title`** (`VARCHAR(100)`, NOT NULL): Note heading.
- **`body`** (`TEXT`): Extended text content of the note.
- **`category`** (`VARCHAR(50)`, NOT NULL): Logical grouping (`Personal`, `Work`, `Study`).
- **`created_at`** (`TIMESTAMPTZ`, NOT NULL): Creation timestamp.
- **`updated_at`** (`TIMESTAMPTZ`, NOT NULL): Modification timestamp.

### `tags`

- **`id`** (`UUID`, Primary Key): Unique tag identifier.
- **`name`** (`VARCHAR(50)`, Unique, NOT NULL): Tag label (e.g., `urgent`, `project`, `ideas`).
- **`created_at`** (`TIMESTAMPTZ`, NOT NULL): Tag creation timestamp.

### `note_tags` (Join Table)

- **`note_id`** (`UUID`, Foreign Key $\rightarrow$ `notes.id`, NOT NULL): Reference to note.
- **`tag_id`** (`UUID`, Foreign Key $\rightarrow$ `tags.id`, NOT NULL): Reference to tag.
- **Primary Key:** (`note_id`, `tag_id`) composite primary key.

## 2. Entity Relationships

- **`users` $\rightarrow$ `notes` (One-to-Many):** One user can author many notes. Each note belongs strictly to one user.
- **`notes` $\leftrightarrow$ `tags` (Many-to-Many):** A single note can have multiple tags attached to it, and a single tag can be assigned across multiple notes. The `note_tags` join table maps this relationship safely.

## 3. CREATE TABLE Statements (SQL DDL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Notes Table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'Personal',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tags Table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Note Tags Join Table
CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

## 4. Example SQL Queries

Query 1: Fetch all notes for a user with tag names (JOIN)
SQL
SELECT
    n.id AS note_id,
    n.title,
    n.body,
    n.category,
    n.created_at,
    COALESCE(ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = 'e3b0c442-98fc-11ee-b9d1-0242ac120002'
GROUP BY n.id
ORDER BY n.created_at DESC;

Query 2: Search user notes by keyword
SQL
SELECT id, title, body, category, updated_at
FROM notes
WHERE user_id = 'e3b0c442-98fc-11ee-b9d1-0242ac120002'
  AND (LOWER(title) LIKE '%architecture%' OR LOWER(body) LIKE '%architecture%')
ORDER BY updated_at DESC;

Query 3: Count notes per category for a specific user
SQL
SELECT category, COUNT(id) AS total_notes
FROM notes
WHERE user_id = 'e3b0c442-98fc-11ee-b9d1-0242ac120002'
GROUP BY category;

## 5. Performance Indexing

-- Composite B-Tree Index on user_id and created_at
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);

Reasoning: In QuickNotes, the most frequent query is listing a user's notes sorted by creation time (WHERE user_id = ? ORDER BY created_at DESC). A composite index on (user_id, created_at DESC) allows PostgreSQL to execute index scans directly for user dashboard queries, bypassing costly full-table scans as the database grows to millions of records.

## 6. Database Selection: SQL vs. NoSQL

We chose a relational SQL database (PostgreSQL) over NoSQL for QuickNotes. Relational engines excel at managing structured user account metadata, strict data integrity constraints (such as CASCADE deletions when a user deletes their account), and complex many-to-many tag relationships. SQL provides native transactional guarantees (ACID compliance) and flexible query filtering (joining notes, tags, and category aggregate metrics) without requiring duplicate data structures across documents.
```
