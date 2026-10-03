# TaskFlow

A task management system built as real microservices with Spring Boot, Spring Cloud Gateway, JWT and React.

TaskFlow lets people register, sign in and manage their own tasks on a three-column board (To Do, In Progress, Completed). Behind the UI are two independent Spring Boot services, each with its own database: **user-service** handles accounts, BCrypt password hashing and issuing JWTs, and **task-service** owns tasks, validates JWTs on every request and calls user-service over HTTP before creating a task. A **Spring Cloud Gateway** is the single entry point for the browser, and a **React + Vite** frontend talks only to that gateway.

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Technology stack](#technology-stack)
4. [Why this is genuinely microservices](#why-this-is-genuinely-microservices)
5. [Authentication flow](#authentication-flow)
6. [Service-to-service communication](#service-to-service-communication)
7. [Database architecture](#database-architecture)
8. [API reference](#api-reference)
9. [Project structure](#project-structure)
10. [Prerequisites](#prerequisites)
11. [Installation](#installation)
12. [Running the project](#running-the-project)
13. [Deployment (Render)](#deployment-render)
14. [Example curl requests](#example-curl-requests)
15. [Screenshots](#screenshots)
16. [Known limitations](#known-limitations)
17. [Future improvements](#future-improvements)
18. [Interview talking points](#interview-talking-points)

---

## Features

**Accounts and security**
- Registration with server-side validation and duplicate-email detection (case-insensitive)
- Passwords stored only as BCrypt hashes and never returned by any API
- Login returns a signed JWT (HMAC-SHA) containing only the user id and email
- Stateless authentication: task-service validates the token on every request, so there are no server sessions
- Per-user authorization enforced on the server: a user can only read, change or delete their own tasks, whatever task id the client sends

**Tasks**
- Create, list, view, edit and delete tasks
- Three statuses (`TODO`, `IN_PROGRESS`, `COMPLETED`), with new tasks defaulting to `TODO`
- `createdAt` / `updatedAt` timestamps maintained automatically

**Architecture**
- Two independently runnable services, each with its own H2 database
- A real HTTP call from task-service to user-service (Spring `RestClient`) with timeouts and failure handling
- An API gateway that does routing and CORS only
- Consistent JSON error responses with correct HTTP status codes and no stack traces

**Frontend**
- Login, Register and Dashboard pages built with React Router
- All HTTP calls live in a small `src/api/` layer; an axios interceptor attaches the JWT and handles expired sessions
- Task board with inline editing, a status dropdown, and an inline confirmation step before deleting
- Client-side validation, loading states, empty state, and clear messages for network errors versus wrong credentials
- Responsive layout down to 375px wide

---

## Architecture

```
                         ┌──────────────────────────────┐
                         │  React frontend (Vite)       │
                         │  http://localhost:5173       │
                         └──────────────┬───────────────┘
                                        │  HTTP + JSON
                                        │  Authorization: Bearer <JWT>
                                        ▼
                         ┌──────────────────────────────┐
                         │  API Gateway                 │
                         │  Spring Cloud Gateway :8080  │
                         │  routing + CORS only         │
                         └───────┬──────────────┬───────┘
          /api/auth/**           │              │          /api/tasks/**
          /api/users/**          │              │
                                 ▼              ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐
          │  user-service  :8081     │   │  task-service  :8082     │
          │  register / login        │◄──│  JWT validation          │
          │  BCrypt, issues JWT      │   │  task CRUD + ownership   │
          │                          │   │                          │
          │                          │   │  GET /api/users/{id}     │
          │                          │   │  (RestClient, before     │
          │                          │   │   creating a task)       │
          └────────────┬─────────────┘   └────────────┬─────────────┘
                       │                              │
                       ▼                              ▼
              ┌─────────────────┐            ┌─────────────────┐
              │  H2: userdb     │            │  H2: taskdb     │
              │  users table    │            │  tasks table    │
              └─────────────────┘            └─────────────────┘
```

| Component    | Port | Responsibility |
|--------------|------|----------------|
| frontend     | 5173 | UI; talks only to the gateway |
| api-gateway  | 8080 | Routes requests by path, applies CORS. No business logic, no auth checks. |
| user-service | 8081 | Users, BCrypt hashing, login, JWT issuing, user lookup |
| task-service | 8082 | Tasks, JWT validation, ownership checks, calls user-service |

---

## Technology stack

| Layer | Technology |
|-------|------------|
| Language | Java 17 |
| Framework | Spring Boot 3.5 (Web, Data JPA, Security, Validation) |
| Gateway | Spring Cloud Gateway 2025.0 (reactive / WebFlux) |
| Auth | JWT via jjwt 0.13 (HMAC-SHA), BCrypt (Spring Security) |
| HTTP client | Spring `RestClient` on the JDK `HttpClient` |
| Database | H2 locally (one file database per service); PostgreSQL when deployed (one schema per service) |
| Build | Maven, via the Maven Wrapper included in each module |
| Frontend | React 19, Vite, React Router 7, Axios |
| Styling | Hand-written CSS with design tokens; Bricolage Grotesque + IBM Plex Sans (self-hosted with Fontsource) |

---

## Why this is genuinely microservices

It's common to see a single Spring Boot app with packages named `user` and `task` described as microservices. TaskFlow is deliberately not that:

- **Separate builds.** `user-service`, `task-service` and `api-gateway` each have their own `pom.xml`, their own Maven Wrapper and their own `application.yml`. There is no parent POM and no shared library, and each one builds, tests and runs on its own.
- **Separate processes and ports.** Each service is its own JVM. You can stop one and the others keep running.
- **Separate databases.** user-service owns `userdb` and task-service owns `taskdb`. Neither service can read the other's tables.
- **No shared entities.** task-service has no `User` class. A task stores `userId` as a plain `Long`, with no `@ManyToOne` and no foreign key across services.
- **Communication only through APIs.** When task-service needs to know whether a user exists, it asks user-service over HTTP, exactly as it would if the two ran on different machines.
- **Failure isolation you can observe.** If user-service goes down, task-service still serves reads and answers task creation with a clean `503`. When user-service comes back, task-service recovers without a restart. Both behaviours were verified during testing.

---

## Authentication flow

```
REGISTER   browser ──POST /api/auth/register──► gateway ──► user-service
                                                            ├─ validate input (Bean Validation)
                                                            ├─ reject duplicate email (409)
                                                            ├─ hash password with BCrypt
                                                            └─ save User → 201 {id, name, email, createdAt}  (no password)

LOGIN      browser ──POST /api/auth/login─────► gateway ──► user-service
                                                            ├─ look up by email, BCrypt-compare password
                                                            ├─ any mismatch → 401 "Invalid email or password"
                                                            └─ sign JWT {sub: userId, email, iat, exp} → 200 {token, user}

REQUEST    browser ──GET /api/tasks───────────► gateway ──► task-service
           Authorization: Bearer <JWT>                      ├─ JwtAuthenticationFilter verifies signature + expiry
                                                            ├─ invalid/expired/missing → 401 JSON
                                                            ├─ userId from `sub` becomes the principal
                                                            └─ controller gets it via @AuthenticationPrincipal Long userId
```

Key points:

- **Only user-service issues tokens and only task-service validates them.** They share one HMAC secret, supplied through the `JWT_SECRET` environment variable.
- **The token contains no sensitive data**: just the user id (as the subject), the email, and the issue and expiry times. Tokens last one hour by default (`JWT_EXPIRATION_MS`).
- **Login doesn't reveal which accounts exist.** A wrong password and an unknown email return the same message, and an unknown email is still checked against a dummy BCrypt hash so both cases take the same time.
- **Passwords are limited to 72 bytes**, which is BCrypt's input limit. The limit is enforced in bytes rather than characters, so emoji and non-Latin passwords get a clear validation error instead of a server error.
- **Frontend handling:** the frontend stores the token in `localStorage`, and an axios interceptor sends it as `Authorization: Bearer <token>`. Any `401` from a protected endpoint clears the session and sends the user to `/login` with a "session expired" notice.

---

## Service-to-service communication

Before a task is saved, task-service confirms the owner exists by calling user-service over HTTP:

```java
// task-service: client/UserServiceClient.java
restClient.get()
        .uri("/api/users/{id}", userId)
        .retrieve()
        .toBodilessEntity();
```

| user-service outcome | task-service response |
|---|---|
| `200 OK` | Task is created → `201` |
| `404 Not Found` | `400` "Cannot create a task for user N because that user does not exist" (task **not** created) |
| Connection refused / timeout | `503` "User service is currently unavailable. Please try again later." (task **not** created) |
| Any other error | `503`, with the details logged on the server only |

Design details:

- **Configurable base URL and timeouts.** The base URL comes from `app.user-service.base-url` (env var `USER_SERVICE_BASE_URL`, default `http://localhost:8081`). Timeouts are 2 s to connect and 3 s to read, so a hung user-service can't hold requests forever.
- **`createTask` is deliberately not `@Transactional`.** Holding a database connection open during a remote HTTP call would use up the connection pool whenever user-service is slow. The save runs in its own short transaction after the check succeeds.

**Why not share a database or entity?** Sharing tables would couple the two services' schemas, deployments and failure modes; neither could change its data model without breaking the other. Going through user-service's API keeps its database private, so its data can only be reached through its API.

---

## Database architecture

Each service owns a separate H2 file database, created on first start (`ddl-auto: update`):

| Service | JDBC URL | Files on disk | Tables |
|---|---|---|---|
| user-service | `jdbc:h2:file:./data/userdb` | `user-service/data/userdb.mv.db` | `users` |
| task-service | `jdbc:h2:file:./data/taskdb` | `task-service/data/taskdb.mv.db` | `tasks` (indexed on `user_id`) |

The paths are relative to the directory the service is started from, so start each service from its own folder (as shown below). Data survives restarts. Delete a service's `data/` folder to reset it.

When deployed, `DB_URL` switches both services to PostgreSQL (see [Deployment](#deployment-render)). Each service then creates and owns its own schema, `users_service` or `tasks_service`, with the same tables.

### Opening the H2 consoles

The consoles are served by each service directly. They aren't routed through the gateway.

| Service | Console URL | JDBC URL | User | Password |
|---|---|---|---|---|
| user-service | http://localhost:8081/h2-console | `jdbc:h2:file:./data/userdb` | `sa` | *(empty)* |
| task-service | http://localhost:8082/h2-console | `jdbc:h2:file:./data/taskdb` | `sa` | *(empty)* |

For example, run `SELECT id, email, password FROM users;` in the user-service console to see that only BCrypt hashes (`$2a$10$...`) are stored.

---

## API reference

All endpoints are called through the gateway at `http://localhost:8080`.

### Error format

Every error from either service uses the same JSON shape. `fieldErrors` appears only for validation failures.

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "timestamp": "2026-09-27T10:09:54.038Z",
  "fieldErrors": { "title": "Title is required" }
}
```

| Status | When |
|---|---|
| 400 | Invalid input, malformed JSON, wrong field type, or a task for a user that no longer exists |
| 401 | Missing, invalid or expired JWT; wrong email or password on login |
| 403 | The task exists but belongs to another user |
| 404 | User or task does not exist; unknown endpoint |
| 409 | Email already registered |
| 503 | task-service cannot reach user-service |
| 500 | Unexpected error; only a generic message is returned and the details are logged on the server |

### Auth: user-service

#### `POST /api/auth/register`: create an account
Auth: none

```json
// Request
{ "name": "Alice Smith", "email": "alice@example.com", "password": "secret123" }

// 201 Created   (Location: /api/users/1)
{ "id": 1, "name": "Alice Smith", "email": "alice@example.com", "createdAt": "2026-09-27T09:31:16.902Z" }

// 409 Conflict
{ "status": 409, "error": "Conflict", "message": "An account with email 'alice@example.com' already exists", "timestamp": "..." }

// 400 Bad Request
{ "status": 400, "error": "Bad Request", "message": "Validation failed", "timestamp": "...",
  "fieldErrors": { "email": "Email must be a valid email address", "password": "Password must be at least 6 characters" } }
```
Rules: `name` is required (max 100 characters). `email` is required, must be valid and is stored lowercased. `password` is required, at least 6 characters and at most 72 bytes.

#### `POST /api/auth/login`: sign in and receive a JWT
Auth: none

```json
// Request
{ "email": "alice@example.com", "password": "secret123" }

// 200 OK
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhbGljZUBleGFtcGxlLmNvbSIs...",
  "user": { "id": 1, "name": "Alice Smith", "email": "alice@example.com", "createdAt": "2026-09-27T09:31:16.902Z" }
}

// 401 Unauthorized  (same response for an unknown email and a wrong password)
{ "status": 401, "error": "Unauthorized", "message": "Invalid email or password", "timestamp": "..." }
```

#### `GET /api/users/{id}`: look up a user
Auth: none. It exists for task-service's existence check and is routed through the gateway for simplicity (see [Known limitations](#known-limitations)).

```json
// 200 OK
{ "id": 1, "name": "Alice Smith", "email": "alice@example.com", "createdAt": "2026-09-27T09:31:16.902Z" }

// 404 Not Found
{ "status": 404, "error": "Not Found", "message": "User with id 999999 not found", "timestamp": "..." }
```

### Tasks: task-service

All task endpoints require `Authorization: Bearer <token>`. The owner is always taken from the token, never from the request.

#### `GET /api/tasks`: list your tasks (newest first)
```json
// 200 OK
[
  { "id": 2, "title": "Set up API gateway", "description": null, "status": "IN_PROGRESS", "userId": 1,
    "createdAt": "2026-09-27T09:35:39.383Z", "updatedAt": "2026-09-27T09:35:39.383Z" },
  { "id": 1, "title": "Write project README", "description": "Architecture + run instructions", "status": "TODO", "userId": 1,
    "createdAt": "2026-09-27T09:35:39.229Z", "updatedAt": "2026-09-27T09:35:39.229Z" }
]
```

#### `POST /api/tasks`: create a task
```json
// Request   (status is optional and defaults to TODO)
{ "title": "Write project README", "description": "Architecture + run instructions", "status": "TODO" }

// 201 Created   (Location: /api/tasks/1)
{ "id": 1, "title": "Write project README", "description": "Architecture + run instructions", "status": "TODO",
  "userId": 1, "createdAt": "2026-09-27T09:35:39.229Z", "updatedAt": "2026-09-27T09:35:39.229Z" }

// 400 Bad Request
{ "status": 400, "error": "Bad Request", "message": "Validation failed", "timestamp": "...",
  "fieldErrors": { "status": "Must be one of [TODO, IN_PROGRESS, COMPLETED]" } }

// 503 Service Unavailable   (user-service unreachable, so nothing is created)
{ "status": 503, "error": "Service Unavailable", "message": "User service is currently unavailable. Please try again later.", "timestamp": "..." }
```
Rules: `title` is required and non-blank (max 200 characters). `description` is optional (max 2000 characters).

#### `GET /api/tasks/{id}`: get one task
`200` with the task · `403` if it belongs to another user · `404` if it doesn't exist
```json
// 403 Forbidden
{ "status": 403, "error": "Forbidden", "message": "You do not have permission to access this task", "timestamp": "..." }
```

#### `PUT /api/tasks/{id}`: update a task
Replaces `title` and `description`. If `status` is omitted, the current status is kept.
```json
// Request
{ "title": "Write project README (final)", "description": "Done", "status": "COMPLETED" }

// 200 OK
{ "id": 1, "title": "Write project README (final)", "description": "Done", "status": "COMPLETED", "userId": 1,
  "createdAt": "2026-09-27T09:35:39.229Z", "updatedAt": "2026-09-27T09:35:39.826Z" }
```
`400` invalid input · `403` another user's task · `404` not found

#### `DELETE /api/tasks/{id}`: delete a task
`204 No Content` · `403` another user's task · `404` not found

#### Authentication errors (every task endpoint)
```json
// No Authorization header
{ "status": 401, "error": "Unauthorized", "message": "Authentication is required to access this resource", "timestamp": "..." }
// Expired token
{ "status": 401, "error": "Unauthorized", "message": "Access token has expired", "timestamp": "..." }
// Malformed, tampered, or signed with the wrong key
{ "status": 401, "error": "Unauthorized", "message": "Access token is invalid", "timestamp": "..." }
```

---

## Project structure

```
TaskFlow/
├── README.md
├── render.yaml                         Render Blueprint: deploys all four components
├── .gitignore  .gitattributes
│
├── user-service/                       Spring Boot app, port 8081, own H2 db
│   ├── pom.xml  Dockerfile  mvnw  mvnw.cmd  .mvn/
│   └── src/
│       ├── main/java/com/taskflow/userservice/
│       │   ├── UserServiceApplication.java
│       │   ├── config/        JwtProperties, SecurityConfig (BCrypt, stateless, public auth routes),
│       │   │                  UserIdSequenceInitializer (ids never reused after a data reset)
│       │   ├── controller/    AuthController, UserController
│       │   ├── dto/           RegisterRequest, LoginRequest, UserResponse, AuthResponse, ErrorResponse
│       │   ├── entity/        User
│       │   ├── exception/     EmailAlreadyExists, InvalidCredentials, UserNotFound, GlobalExceptionHandler
│       │   ├── repository/    UserRepository
│       │   ├── security/      JwtUtil (issues tokens), RestAuthenticationEntryPoint
│       │   ├── service/       UserService
│       │   └── validation/    @MaxBytes (BCrypt's 72-byte limit)
│       ├── main/resources/application.yml
│       └── test/              context test (in-memory H2 profile)
│
├── task-service/                       Spring Boot app, port 8082, own H2 db
│   ├── pom.xml  Dockerfile  mvnw  mvnw.cmd  .mvn/
│   └── src/
│       ├── main/java/com/taskflow/taskservice/
│       │   ├── TaskServiceApplication.java
│       │   ├── client/        UserServiceClient (RestClient → user-service)
│       │   ├── config/        SecurityConfig, RestClientConfig, UserServiceProperties
│       │   ├── controller/    TaskController (@AuthenticationPrincipal Long userId)
│       │   ├── dto/           TaskRequest, TaskResponse, ErrorResponse
│       │   ├── entity/        Task (userId is a plain Long), TaskStatus
│       │   ├── exception/     TaskNotFound, ForbiddenTaskAccess, UserNotFound,
│       │   │                  UserServiceUnavailable, GlobalExceptionHandler
│       │   ├── repository/    TaskRepository (findByUserId, findByIdAndUserId)
│       │   ├── security/      JwtProperties, JwtUtil (validates only),
│       │   │                  JwtAuthenticationFilter, JsonSecurityErrorHandler (401/403 JSON)
│       │   └── service/       TaskService (ownership rules, calls UserServiceClient)
│       ├── main/resources/application.yml
│       └── test/              context test (in-memory H2 profile)
│
├── api-gateway/                        Spring Cloud Gateway, port 8080
│   ├── pom.xml  Dockerfile  mvnw  mvnw.cmd  .mvn/
│   └── src/main/
│       ├── java/com/taskflow/apigateway/ApiGatewayApplication.java   (main class only)
│       └── resources/application.yml                                  (routes + CORS)
│
└── frontend/                           React + Vite, port 5173
    ├── package.json  vite.config.js  index.html  .env.example
    └── src/
        ├── main.jsx  App.jsx  index.css
        ├── api/          axiosClient (interceptors, cold-start retries), authApi, taskApi, systemApi,
        │                 tokenStorage, apiError
        ├── context/      AuthContext (provider), auth-context (context object)
        ├── hooks/        useAuth
        ├── components/   ProtectedRoute, GuestRoute, Navbar, TaskForm, TaskBoard, TaskCard,
        │                 AuthLayout, FormField, FullPageLoader, Logo, ServerWakeBanner
        ├── pages/        LoginPage, RegisterPage, DashboardPage
        ├── constants/    taskStatus
        ├── utils/        validation, formatDate
        └── styles/       auth.css, dashboard.css
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| JDK | 17 or newer | Tested on JDK 17 target / JDK 23 runtime |
| Maven | 3.9+ *(optional)* | Each module includes the Maven Wrapper (`mvnw` / `mvnw.cmd`), which downloads Maven automatically the first time it runs |
| Node.js | 20.19+ or 22.12+ | With npm. Node 18 is **not** supported: Vite 8 and React Router 7 require Node 20.19 or later. |

Free ports needed: **8080, 8081, 8082, 5173**.

---

## Installation

```bash
git clone <your-repo-url> TaskFlow
cd TaskFlow

# Backend: download dependencies and compile each service (each is independent)
cd user-service && ./mvnw -q compile && cd ..
cd task-service && ./mvnw -q compile && cd ..
cd api-gateway  && ./mvnw -q compile && cd ..

# Frontend
cd frontend && npm install && cd ..
```

On Windows (PowerShell or cmd), use `mvnw.cmd` instead of `./mvnw`. If you have Maven installed, plain `mvn` works too.

### Configuration

Every setting has a working local default, so nothing needs configuring to run locally.

| Variable | Used by | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | user-service **and** task-service | dev-only placeholder | HMAC signing key. **Must be identical in both services, at least 32 bytes, and set to your own random value for anything beyond local development.** |
| `JWT_EXPIRATION_MS` | user-service | `3600000` (1 h) | Token lifetime |
| `USER_SERVICE_BASE_URL` | task-service | `http://localhost:8081` | Where task-service calls user-service |
| `USER_SERVICE_URL` | api-gateway | `http://localhost:8081` | Route target for `/api/auth/**`, `/api/users/**` |
| `TASK_SERVICE_URL` | api-gateway | `http://localhost:8082` | Route target for `/api/tasks/**` |
| `FRONTEND_ORIGIN` | api-gateway | `http://localhost:5173` | Allowed CORS origin |
| `DB_URL` | both services | H2 file in `./data/` | JDBC URL. Deployed: a PostgreSQL URL such as `jdbc:postgresql://<host>/<db>?sslmode=require` |
| `DB_USERNAME` / `DB_PASSWORD` | both services | `sa` / *(empty)* | Database credentials |
| `DB_SCHEMA` | both services | `PUBLIC` | The service's own schema, created on startup (Render: `users_service` / `tasks_service`) |
| `DB_POOL_SIZE` | both services | `5` | Maximum database connections per service |
| `H2_CONSOLE_ENABLED` | both services | `true` | Set to `false` in deployments |
| `PORT` | all three Java apps | `8081` / `8082` / `8080` | HTTP port (hosting platforms set this) |
| `USER_SERVICE_CONNECT_TIMEOUT` / `USER_SERVICE_READ_TIMEOUT` | task-service | `2s` / `3s` | Timeouts for the call to user-service |
| `GATEWAY_CONNECT_TIMEOUT_MS` / `GATEWAY_RESPONSE_TIMEOUT` | api-gateway | `2000` / `10s` | Timeouts for calls to the services |
| `VITE_API_BASE_URL` | frontend | `http://localhost:8080` | Gateway URL (see `frontend/.env.example`) |
| `VITE_API_TIMEOUT_MS` | frontend | `15000` | Request timeout in the browser |
| `VITE_WAKE_RETRY_WINDOW_MS` | frontend | `0` (off) | How long to retry safe requests while sleeping services wake (Render: `180000`) |

> ⚠️ The default `JWT_SECRET` in `application.yml` is named `dev-only-...change-me-before-deploying...` on purpose. It is public, so anyone could forge tokens with it. Always set your own `JWT_SECRET` outside local development, for example: `export JWT_SECRET=$(openssl rand -base64 48)`

---

## Running the project

Start the four components in this order, each in its own terminal. Services must be started from their own folder, because the H2 database path is relative to it.

**1. user-service (port 8081)**
```bash
cd user-service
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

**2. task-service (port 8082)**
```bash
cd task-service
./mvnw spring-boot:run
```

**3. api-gateway (port 8080)**
```bash
cd api-gateway
./mvnw spring-boot:run
```

**4. frontend (port 5173)**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. Each Spring service logs `Started ...Application` when it's ready.

> The start order matters only for creating tasks. task-service starts fine without user-service, but task creation returns `503` until user-service is up, and then recovers automatically.

### Tests and builds
```bash
cd user-service && ./mvnw test     # likewise for task-service and api-gateway
cd frontend && npm run lint && npm run build
```

---

## Deployment (Render)

The repository includes a [Render Blueprint](https://render.com/docs/infrastructure-as-code) (`render.yaml`) that deploys all four components on Render's free tier. The three Java apps run as Docker web services (each has a two-stage `Dockerfile`), and the frontend runs as a static site.

| Component | Render service | Public URL |
|---|---|---|
| frontend | `taskflow-ayan` (static site) | `https://taskflow-ayan.onrender.com` |
| api-gateway | `taskflow-ayan-gateway` | `https://taskflow-ayan-gateway.onrender.com` |
| user-service | `taskflow-ayan-users` | `https://taskflow-ayan-users.onrender.com` |
| task-service | `taskflow-ayan-tasks` | `https://taskflow-ayan-tasks.onrender.com` |

**Steps**

1. Push this repository to GitHub.
2. Sign in to [Render](https://dashboard.render.com) with GitHub. On the free tier, no credit card is needed.
3. Click **New → Blueprint**, select the repository, and click **Apply**. Render builds and starts all four services. The first build takes about 5–10 minutes.
4. **Add a permanent database** (free, about 3 minutes). Without it the services run on temporary H2 data that is wiped whenever Render restarts them:
   1. Create a free PostgreSQL database at [neon.tech](https://neon.tech) (no credit card).
   2. In Neon, click **Connect** and note the host, database name, user and password.
   3. In Render, open **Env Groups → taskflow-shared** and add:
      - `DB_URL` = `jdbc:postgresql://<host>/<database>?sslmode=require`
      - `DB_USERNAME` = the user
      - `DB_PASSWORD` = the password
   4. Save. Render redeploys user-service and task-service, and each creates its own schema and tables.
5. Open the frontend URL.

**What the Blueprint sets up**

- **A random `JWT_SECRET`,** generated by Render and shared by user-service and task-service. It is never committed to the repository.
- **H2 consoles turned off,** and longer timeouts so the services survive free-tier cold starts.
- **Services wired together by public URL:** the gateway routes to the two services and allows the frontend's origin for CORS, task-service calls user-service, and the frontend is built with the gateway's URL.
- **Refresh support for the React routes,** so `/dashboard` keeps working after a page reload.

**If a service name is already taken,** Render gives that service a different URL. Update the URLs in `render.yaml`, or in the affected services' **Environment** tabs:

| Variable | Service |
|---|---|
| `USER_SERVICE_BASE_URL` | task-service |
| `USER_SERVICE_URL`, `TASK_SERVICE_URL`, `FRONTEND_ORIGIN` | gateway |
| `VITE_API_BASE_URL` | frontend (rebuild after changing it) |

**Free-tier behaviour to expect**

- **Slow first request.** Services sleep after about 15 minutes idle, and a sleeping Spring Boot service takes roughly 1–2 minutes to start. The frontend is built for this:
  - **Wakes everything at once.** On page load it pings every service through the gateway, so they all start booting in parallel.
  - **Retries safe requests.** While services wake, loading tasks, updates, deletes and login are retried automatically for up to 3 minutes, with a "Waking up the servers…" banner.
  - **Never repeats a create.** Creating a task or an account is never retried, so nothing is saved twice.

  Retries are enabled only in deployed builds (`VITE_WAKE_RETRY_WINDOW_MS`); locally they are off. The Docker images also run the JVM with `-XX:TieredStopAtLevel=1` to cut startup time on small CPUs.
- **Gateway reports a sleeping service as `502`, not `500`.** While a service boots, the gateway's connection to it can be refused or dropped. The gateway answers `502 Bad Gateway` for these network failures, so the frontend recognises them and keeps retrying instead of showing an error.
- **Data is permanent once `DB_URL` points to PostgreSQL** (step 4). Both services share one database, but each owns its own schema (`users_service`, `tasks_service`) and never reads the other's tables. Without `DB_URL`, data lives in H2 on the temporary disk and resets on every restart. Two safeguards keep that fallback harmless:
  - **User ids are never reused.** user-service starts each empty database's id sequence at the current epoch millisecond, so a token from before a reset can never match a new person's account.
  - **Old sessions are detected.** When the dashboard sees that the signed-in account no longer exists, it sends you to the login page with "This demo server was reset…".

The same setup was tested locally before release by running the production jars with these environment variables on different ports, against a production build of the frontend. The Docker images themselves are built by Render.

---

## Example curl requests

All requests go through the gateway on port 8080.

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Smith","email":"alice@example.com","password":"secret123"}'

# 2. Log in and keep the token (needs no extra tools)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

# 3. Create a task (task-service calls user-service to verify you exist)
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Write project README","description":"Architecture + run instructions"}'

# 4. List your tasks
curl http://localhost:8080/api/tasks -H "Authorization: Bearer $TOKEN"

# 5. Move it to In Progress
curl -X PUT http://localhost:8080/api/tasks/1 \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Write project README","description":"Architecture + run instructions","status":"IN_PROGRESS"}'

# 6. Delete it (204 No Content)
curl -i -X DELETE http://localhost:8080/api/tasks/1 -H "Authorization: Bearer $TOKEN"

# 7. No token: 401
curl http://localhost:8080/api/tasks

# 8. Look up a user (what task-service calls internally)
curl http://localhost:8080/api/users/1

# 9. CORS preflight from the frontend origin
curl -i -X OPTIONS http://localhost:8080/api/tasks \
  -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

To see the service-to-service call in action, stop user-service and repeat step 3: you get `503 Service Unavailable` and no task is created. Start user-service again and the same request succeeds, without restarting task-service.

---

## Screenshots

> Screenshots will be added here.

| Screen | Screenshot |
|---|---|
| Login | *coming soon* <!-- ![Login](docs/screenshots/login.png) --> |
| Register (with validation errors) | *coming soon* <!-- ![Register](docs/screenshots/register.png) --> |
| Dashboard: empty state | *coming soon* <!-- ![Empty dashboard](docs/screenshots/dashboard-empty.png) --> |
| Dashboard: task board | *coming soon* <!-- ![Task board](docs/screenshots/dashboard.png) --> |
| Inline edit and delete confirmation | *coming soon* <!-- ![Editing](docs/screenshots/edit-delete.png) --> |
| Mobile (375px) | *coming soon* <!-- ![Mobile](docs/screenshots/mobile.png) --> |

---

## Known limitations

These are deliberate simplifications for a local portfolio project:

- **`GET /api/users/{id}` is public and routed through the gateway**, so anyone who can reach the gateway can look up a user's name and email by id. In production it would be internal-only, either not routed or protected by service-to-service authentication.
- **The gateway's own errors are minimal.** An unreachable downstream service returns `502` with TaskFlow's error JSON (without `fieldErrors`); an unmatched route returns `404` in Spring's default error format.
- **403 vs 404 reveals whether a task id exists.** A caller probing ids can tell "someone else's task" (`403`) from "no such task" (`404`). Returning `404` for both would hide this.
- **H2 consoles are enabled locally** for convenience. The Render Blueprint turns them off (`H2_CONSOLE_ENABLED=false`).
- **One PostgreSQL database, two schemas.** In the deployed setup both services share one free Neon database with a schema each, using the same credentials. Full isolation would give each service its own database and database user.
- **Tokens are stored in `localStorage`**, which is simple but readable by any script on the page. See the improvements below.

---

## Future improvements

- **Refresh tokens:** short-lived access tokens plus a rotating refresh token in an `HttpOnly` cookie, instead of one long-lived token in `localStorage`.
- **Database migrations:** Flyway instead of `ddl-auto: update`, and a separate PostgreSQL database and user per service.
- **Docker Compose:** start all four components with one command, with health checks and the right start order.
- **Authentication at the gateway:** validate JWTs once at the edge and forward trusted identity headers, keeping per-resource authorization in the services.
- **Internal-only user lookup:** remove `/api/users/**` from public routes and secure service-to-service calls (for example, mutual TLS or a service token).
- **Rate limiting:** on login and register at the gateway, to slow down brute-force attempts.
- **Resilience:** a circuit breaker and retries (Resilience4j) around the user-service call, plus a retry filter at the gateway for idempotent requests.
- **Service discovery and config:** Eureka or Consul and Spring Cloud Config, once there are more services or instances.
- **Automated tests in CI:** controller and service tests, Testcontainers integration tests, and Playwright end-to-end tests running on GitHub Actions.
- **Task features:** due dates, priorities, drag-and-drop between columns, search and pagination.

---

## Interview talking points

- **"Each service owns its data."** user-service and task-service have separate databases and no shared entities. A task stores `userId` as a plain `Long`, not a `@ManyToOne`, because a foreign key into another service's database would couple their schemas and deployments. That coupling is exactly what microservices are meant to avoid.

- **"Services talk over HTTP, and I designed for that call failing."** Before creating a task, task-service calls `GET /api/users/{id}` with `RestClient`. It has explicit timeouts, a 404 becomes a 400 for the client, and an outage becomes a clean 503 with nothing saved. I proved the call is real by stopping user-service and watching creation fail, then recover on its own when user-service came back.

- **"I kept the remote call out of the database transaction."** `createTask` is intentionally not `@Transactional`, because holding a database connection open while waiting on the network would use up the connection pool whenever user-service is slow.

- **"The gateway only routes."** It does routing and CORS, nothing else. Business rules and authorization stay in the services that own the data, so the gateway can be replaced or scaled without touching domain logic, and every service still protects itself if someone bypasses the gateway.

- **"Authorization never trusts the client."** The user id comes only from the verified JWT subject, through `@AuthenticationPrincipal`, never from the URL, body or a header. Every lookup is scoped to the owner (`findByIdAndUserId`), so changing a task id in the URL gets a 403, not someone else's data.

- **"Stateless JWT with a split of responsibilities."** Only user-service can issue tokens and task-service only validates them. The secret comes from an environment variable, never from source code, and a weak key makes startup fail. The token holds just the user id and email; the password hash never leaves user-service.

- **"Login is hardened against account enumeration."** Wrong password and unknown email return the same 401 message, and an unknown email is still checked against a dummy BCrypt hash, so response time doesn't reveal which accounts exist. I also found and fixed a subtle bug where a 40-character emoji password passed `@Size` but exceeded BCrypt's 72-byte limit and caused a 500.

- **"Errors are part of the API contract."** Both services return the same JSON error shape with specific messages and correct status codes (400/401/403/404/409/503). Stack traces are logged on the server, never returned. On the frontend, any 401 from a protected endpoint clears the session and sends the user back to the login page, instead of leaving a broken dashboard.
