# QuickNotes System Architecture & Scaling Plan

This document outlines the system architecture, capacity planning, request lifecycles, and high-availability design for scaling QuickNotes to support 1 million users.

---

## 1. Functional & Non-Functional Requirements

### Functional Requirements

- Users can register, authenticate (JWT), and manage their profiles.
- Users can create, read, update, and delete notes with text bodies and assigned categories.
- Users can filter and search their saved notes by keyword in real time.
- Background workers generate asynchronous summary reports and clean up expired user tokens.

### Non-Functional Requirements

- **Availability:** $99.9\%$ uptime (~8.76 hours downtime per year).
- **Latency:** Sub-100ms response time for $95\%$ of read and write API requests.
- **Scalability:** System architecture handles horizontal scaling up to 1 million registered users.
- **Security:** End-to-end TLS encryption, secure password hashing (bcrypt), and rate-limiting per account.

---

## 2. Capacity & Load Estimates (1 Million Users)

### Baseline Assumptions

- **Total Registered Users:** 1,000,000
- **Daily Active Users (DAU):** $10\%$ of total users = **100,000 DAU**
- **User Usage Patterns:**
  - Average user views/refreshes notes **20 times per day** (Reads).
  - Average user creates or updates **2 notes per day** (Writes).
- **Storage Pattern:** Average note size is **2 KB** (title, body, tags, metadata).
- **Time Conversion:** $1\text{ day} \approx 100,000\text{ seconds}$ (exact: 86,400 seconds).

### Throughput Calculations

- **Reads per Second:**
  $$\text{Total Daily Reads} = 100,000\text{ DAU} \times 20\text{ reads} = 2,000,000\text{ reads/day}$$
  $$\text{Average Read Throughput} = \frac{2,000,000}{100,000\text{ sec}} = \mathbf{20\text{ reads/sec}}$$
  $$\text{Peak Read Throughput (5\times multiplier)} = 20 \times 5 = \mathbf{100\text{ reads/sec}}$$

- **Writes per Second:**
  $$\text{Total Daily Writes} = 100,000\text{ DAU} \times 2\text{ writes} = 200,000\text{ writes/day}$$
  $$\text{Average Write Throughput} = \frac{200,000}{100,000\text{ sec}} = \mathbf{2\text{ writes/sec}}$$
  $$\text{Peak Write Throughput (5\times multiplier)} = 2 \times 5 = \mathbf{10\text{ writes/sec}}$$

### Storage Calculations

- **Daily Storage Added:**
  $$200,000\text{ notes/day} \times 2\text{ KB} = 400,000\text{ KB/day} = \mathbf{0.4\text{ GB/day}}$$
- **Yearly Storage Added:**
  $$0.4\text{ GB/day} \times 365\text{ days} = \mathbf{146\text{ GB/year}}$$

---

## 3. High-Level Architecture Diagram

```text
                               +-------------------+
                               |    Client App     |
                               +---------+---------+
                                         |
                                         v
                               +-------------------+
                               |    DNS (Route53)  |
                               +---------+---------+
                                         |
                                         v
                               +-------------------+
                               |    CDN (Cloudfront)|
                               +---------+---------+
                                         |
                                         v
                               +-------------------+
                               |   Load Balancer   |
                               +---------+---------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             +-------------------+               +-------------------+
             |   App Server 1    |               |   App Server 2    |
             +----+----+---------+               +----+----+---------+
                  |    |                              |    |
       +----------+    +--------------+    +----------+    +--------------+
       |                              |    |                              |
       v                              v    v                              v
+--------------+              +------------------+             +------------------+
| Redis Cache  |              | PostgreSQL Primary|             |  Message Queue   |
+--------------+              |    (Writes)      |             |   (RabbitMQ)     |
       |                      +--------+---------+             +--------+---------+
       v                               |                                |
+--------------+                       v                                v
| PostgreSQL   |              +------------------+             +------------------+
| Read Replica |              | PostgreSQL       |             |  Worker Service  |
+--------------+              | Read Replica     |             |   (Background)   |
                              +------------------+             +------------------+
```

---

## 4. Component Explanations

Client App: Provides the user-facing web interface built with HTML, CSS, and JS to capture user interactions and display data.

DNS (Route 53): Resolves human-readable domain names to the IP address of the edge network or load balancer.

CDN (CloudFront): Delivers cached static assets (HTML, CSS, JS, icons) from geographically distributed edge locations to minimize user latency.

Load Balancer (Nginx/ALB): Distributes incoming HTTP API requests evenly across healthy application instances to optimize resource usage and prevent bottlenecks.

App Servers (Node.js/Express): Executes RESTful application logic, enforces input validation, performs authentication checks, and interfaces with storage tiers.

Redis Cache: Keeps hot data (such as frequent user note listings and session tokens) in memory for low-latency read operations.

PostgreSQL Primary Database: Processes transactional write queries (INSERT, UPDATE, DELETE) and acts as the source of truth for the system.

PostgreSQL Read Replica: Synchronizes asynchronously with the primary database to serve read-heavy queries without overloading the primary node.

Message Queue (RabbitMQ): Buffers non-blocking background tasks (e.g., sending email notifications or processing analytics logs) to keep core API calls responsive.

Worker Service: Consumes background jobs from the message queue asynchronously to execute long-running tasks.

## 5. End-to-End Request Flows

**Flow 1: GET /api/v1/notes (Fetching Notes)**
Request Ingress: The client issues an HTTP GET /api/v1/notes request with a JWT token. The request hits the Load Balancer, which forwards it to an App Server.

Cache Lookup: The App Server validates the user's JWT and queries Redis using key user:{id}:notes.

Cache Hit: If notes exist in Redis, the server returns a 200 OK response with cached JSON data immediately.

Cache Miss & DB Read: If the key is missing from Redis, the App Server queries the PostgreSQL Read Replica.

Cache Hydration & Response: The server writes the query results back to Redis with a 5-minute TTL and returns 200 OK with the data to the client.

**Flow 2: POST /api/v1/notes (Creating a Note)**
Request Ingress: The client submits a POST /api/v1/notes request with JSON payload (title, body, category).

Validation: The App Server validates title length and required fields.

Database Write: The App Server executes an INSERT query against the PostgreSQL Primary Database.

Cache Invalidation: Upon successful write, the server deletes or updates the user's cache key (user:{id}:notes) in Redis to ensure stale data is not served on subsequent reads.

Asynchronous Job Dispatch: The App Server pushes an audit/analytics task to the Message Queue.

Response: The server responds with 201 Created and returns the newly generated note object.

---

## 6. Trade-offs & Single Point of Failure (SPOF) Analysis

**Architectural Trade-offs**
Eventual Consistency vs. Strict Consistency on Reads:

Trade-off: Offloading note listings to Redis and Read Replicas provides high read performance, but introduces a minor window where a user might read slightly outdated state if replica synchronization experiences lag.

**Synchronous Writes vs. Asynchronous Caching:**

Trade-off: Direct cache invalidation on write ensures data freshness for users, but adds slight latency to write requests compared to fire-and-forget background cache updates.

**Eliminating Single Points of Failure (SPOF)**
Application Layer: Deployed across multiple App Servers in separate Availability Zones behind an Auto-Scaling Load Balancer. If one server fails, the load balancer automatically redirects traffic to healthy nodes.

Database Layer: The Primary PostgreSQL instance utilizes multi-AZ replication with automatic failover to a standby instance. Read Replicas are decoupled so database read traffic remains functional even during primary node maintenance.

Cache & Infrastructure Layer: Redis runs in Cluster Mode with multi-node failover.
