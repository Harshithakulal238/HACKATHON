
# Léviōsa — Smart Museum Self-Guided Tour

Léviōsa is a QR-enabled, personalized self-guided museum tour platform. It helps visitors explore museum galleries through interest-based routes, interactive maps, multilingual stories, audio narration and exhibit feedback. Curators can manage exhibit content, generate QR codes and view visitor analytics.

## Features

### Curator
- Create and manage curator accounts.
- Upload gallery and exhibit images.
- Add stories, descriptions and audio.
- Categorize exhibits.
- Configure museum layouts and walking paths.
- Generate QR codes for visitor sessions and individual exhibits.
- View visitor analytics through a dashboard.

### Visitor
- Scan the museum's entry QR code.
- Select interests and available visiting time.
- Receive a personalized route.
- View the museum map and route directions.
- Scan exhibit QR codes to confirm arrival and unlock stories.
- Listen to and replay audio stories.
- Provide feedback about exhibits.

## Visitor Workflow

1. Scan the QR code provided at the ticket counter.
2. Start the tour and select interests and available time.
3. Generate a personalized route.
4. View the museum map with the recommended route.
5. Press Next to navigate to the next exhibit.
6. Scan the QR code placed at that exhibit.
7. The backend validates the scanned exhibit against the visitor's route.
8. Unlock the exhibit story and audio.
9. Record story interactions and completion events.
10. Collect visitor feedback after the story.
11. Continue to the next exhibit or finish the tour.

Exhibit QR scans serve as proximity confirmation. They confirm a scan at an exhibit's QR code, not independently verified physical location.

## Route Generation

Léviōsa uses:

- **Dijkstra's Algorithm:** Calculates walking paths and travel costs between museum locations.
- **Greedy Algorithm:** Selects relevant exhibits based on visitor interests and available time.

The route considers exhibit visit durations and estimated walking times to generate a personalized tour.

## QR-Based Proximity Confirmation

Every exhibit has a unique QR code.

When a visitor scans an exhibit QR code, the backend validates:

- Whether the visitor's session is active.
- Whether the exhibit belongs to the generated route.
- Whether the exhibit is the expected next stop.
- Whether the interaction has already been recorded, where applicable.

A valid scan unlocks the exhibit's story and records the event.

## Map and Museum Layout

The museum layout is represented as a graph:

- **Nodes:** Entrance, exit and exhibits.
- **Edges:** Walking connections between locations.
- **Exhibit metadata:** Category, position, estimated visit duration and content.

The visitor map displays the personalized route and highlights the next exhibit.

Curators configure the floorplan, exhibit positions and walking connections.

## Analytics

The curator dashboard may display:

- Tour starts and completions.
- Exhibit QR scans.
- Story and audio completion.
- Exhibit feedback.
- Popular and less-engaged exhibits.
- Visitor language preferences.
- Route completion and skips, where implemented.

Analytics represent recorded digital interactions, not independently verified visitor movement or dwell time.

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Visitor and curator interfaces |
| Node.js + Express | Backend APIs and application logic |
| PostgreSQL | Structured data storage |
| QR Codes | Visitor sessions and exhibit identification |
| QR Scanning Library | Scanning QR codes using a device camera |
| SVG | Interactive museum floorplan and route visualization |
| Recharts | Analytics visualization |
| MinIO / Local Storage | Exhibit images and audio files |
| Dijkstra + Greedy | Personalized route generation |

## Backend development

The Express API is in `backend/`. Copy `backend/.env.example` to `backend/.env`,
set `DATABASE_URL` to your local PostgreSQL connection string and replace
`JWT_SECRET` with a locally generated random secret, then run:

```powershell
cd backend
npm install
npm run db:migrate
npm run dev
```

The Vite development server proxies `/api` to the backend at
`http://127.0.0.1:5000`, so the frontend can call the API without a local
cross-origin request. `frontend/.env.example` sets `VITE_API_URL=/api`.

The health endpoint is available at `http://localhost:5000/api/health`.
It reports API process health and does not require a live database connection.

To apply pending SQL migrations to the database configured by `DATABASE_URL`, run:

```powershell
cd backend
npm run db:migrate
```

Add ordered `.sql` migration files to `database/migrations/`. Applied migration
filenames are recorded in the PostgreSQL `schema_migrations` table.

The initial museum-content migration creates museums, galleries, categories,
exhibits, floorplans, map nodes, and walking paths. Floorplans reference SVG
files under the uploads area; viewBox dimensions and node coordinates are stored
in the database. Curator authentication is added separately by migration
`0002_curator_auth_schema.sql`; visitor sessions, QR data, and analytics remain
out of scope.

Curator accounts can register at `POST /api/auth/register`, log in at
`POST /api/auth/login`, and retrieve their authenticated identity at
`GET /api/auth/me`. Registration creates one museum for that curator. Add a
random `JWT_SECRET` of at least 32 characters to `backend/.env` before using
authentication. To generate one locally with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Protected curator content endpoints use the museum associated with the bearer
token:

- `GET/PATCH /api/museums/me`
- `GET/POST /api/galleries` and `GET/PATCH/DELETE /api/galleries/:id`
- `GET/POST /api/categories` and `GET/PATCH/DELETE /api/categories/:id`
- `GET/POST /api/exhibits` and `GET/PATCH/DELETE /api/exhibits/:id`

Send the token in `Authorization: Bearer <token>`. Museum IDs are not accepted
from request bodies. Delete operations return a conflict if related records
still reference the resource; they do not cascade.

Gallery and category bodies use `name` and optional `description`. Exhibit
bodies use `galleryId`, `categoryId`, `name`, `descriptionEn`, `descriptionKn`,
`estimatedVisitMinutes`, and `isAvailable`; exhibit creation requires the
gallery, category, name, and estimated visit time.

Run backend tests after applying migrations and configuring `JWT_SECRET`:

```powershell
npm test
```

## Architecture

Visitor / Curator (React)
        |
        | HTTP API
        v
Node.js + Express
        |
        +---- Route generation
        +---- QR validation
        +---- Visitor session management
        +---- Analytics event processing
        +---- Curator content management
        |
        v
PostgreSQL

Media files: MinIO / Local Storage
Analytics: React + Recharts

## Database Areas

- Curators
- Museums
- Galleries
- Exhibits
- Categories
- Stories and languages
- Media references
- Floorplans
- Walking paths
- Visitor sessions
- Visitor preferences
- Generated routes
- Route stops
- Visitor events
- Feedback

## Privacy and Security

- Avoid unnecessary personal data collection.
- Use secure, unpredictable QR/session tokens.
- Validate sessions and exhibit scans on the backend.
- Protect curator endpoints with authentication.
- Validate uploaded files.
- Keep analytics anonymous or pseudonymous where possible.
- Provide a fallback when camera access is unavailable.

## Future Enhancements

- Offline tour access.
- Bluetooth proximity triggers.
- Accessibility-aware routes.
- Text-to-speech.
- Additional regional languages.
- Dynamic route adjustment.
- Multi-floor museum support.
- Multi-museum deployment.

## License

Add license and attribution information before public distribution.
