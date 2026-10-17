# QuickNotes Online Service

QuickNotes is a full-stack note-taking platform designed to scale from a single-page frontend application to an enterprise-level online service capable of serving over 1 million users. This repository contains both the live API practice client built with vanilla JavaScript and the complete technical design specifications for the backend infrastructure.

---

## Project Structure

```text
web-foundations-days/
├── index.html          # Web application user interface
├── api.js              # REST API client logic (GET, POST, DELETE with error handling)
├── style.css           # Styling rules and responsive layouts
├── README.md           # Project documentation and guide
└── docs/               # Production architecture & backend specifications
    ├── api-design.md   # RESTful API endpoints, payloads, and error contracts
    ├── data-model.md   # Relational schema, DDL, indices, and SQL queries
    └── architecture.md # System architecture, load calculations, and fault tolerance
```

## How to Run the API Client Locally

Clone or download this repository to your local machine:

Bash
git clone [https://github.com/SammyOtis/-quicknotes-system-design-.git]
Navigate to the project root directory:

Bash
cd -quicknotes-system-design-
Open index.html in any modern web browser, or launch it with the Live Server extension in VS Code/antigravity

Test the API client functionality:

Click Load notes to fetch notes from the remote REST endpoint (GET).

Fill out the form and submit to create a new note (POST).

Click Delete on any note card to remove it (DELETE).

## Technical Documentation Links

REST API Design Specification ('docs/api-design.md'): Endpoint tables, JSON request/response structures, and HTTP error handling rules.

Data Model & Database Schema ('docs/data-model.md'): Entity relationships, PostgreSQL DDL statements, indexing strategies, and database engine selection rationale.

System Architecture & Scaling Plan ('docs/architecture.md'): High-level component diagram, 1M user load estimates, step-by-step request flows, and HA/SPOF analysis.

### What I Learned

Asynchronous API Integration & Resilience: Implemented async/await request wrappers with standard state handling (loading, success, error, empty) and explicit UI button disabling to prevent double submissions.

Relational Database Design & Performance: Formulated normalized PostgreSQL schema models (users, notes, tags, note_tags) and engineered composite B-tree indexes ((user_id, created_at DESC)) to optimize high-frequency query performance.

Scalable System Architecture & Load Estimation: Designed multi-tier cloud infrastructure incorporating CDNs, Load Balancers, Redis caches, Database Read Replicas, and asynchronous Message Queue workers to comfortably handle peak throughputs of 100 reads/sec and 10 writes/sec.
