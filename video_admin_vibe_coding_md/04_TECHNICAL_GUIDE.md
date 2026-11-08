# Technical Guide — Frontend-only SQLite

## 1. Suggested project structure

```text
video-admin/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── videos.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── database.js
│   │   ├── dashboard.js
│   │   └── videos.js
│   └── images/
└── README.md
```

## 2. Libraries
- `sql.js`: SQLite compiled to WebAssembly.
- `Chart.js`: charts.
- No React, Vue, Angular, Node.js, Express, or backend APIs.

CDN may be used for initial learning/demo. Pin library versions where possible.

## 3. Database initialization
1. Load `sql.js`.
2. Initialize WASM.
3. Open database bytes from IndexedDB if present.
4. If not found, create database and execute schema.
5. Seed sample data only on first initialization.
6. Save database export bytes into IndexedDB after each mutation.

Recommended browser storage:
- IndexedDB for SQLite byte persistence.
- `localStorage` only for simple demo session flags, not sensitive credentials.

## 4. Separate logical databases
To keep `users.db` and `videos.db` separate:
- Initialize one SQL.js database instance for users.
- Initialize another SQL.js database instance for videos.
- Persist each exported database byte array under separate IndexedDB keys, e.g. `users_db` and `videos_db`.
- Optionally create `categories.db` separately, but simpler and safer for the demo is to keep `video_categories` inside `videos.db` because categories are relationally linked to videos.

## 5. Auth demo
- Register validates input and adds user to users database.
- Login checks the registered demo user.
- Session state may be stored in `sessionStorage`.
- Logout clears the demo session.
- Forgot Password shows a confirmation message only.

**Security limitation:** frontend-only auth is not secure. Anyone can inspect or modify browser storage and JavaScript. Do not use real passwords or claim secure authentication.

## 6. Storage size calculation
Use `file_size_bytes` metadata to calculate aggregate storage:
- bytes → KB: `bytes / 1024`
- bytes → MB: `bytes / (1024 * 1024)`
- bytes → GB: `bytes / (1024 * 1024 * 1024)`

Label this metric **Estimated video storage** or **Storage metadata**, because video files themselves are not uploaded/stored by the browser-only app.

## 7. Charts
Chart.js:
- Bar chart: top 10 videos by `views`.
- Line chart: daily or monthly views.
- Re-render/update charts when data or filter changes.
- Destroy old Chart instance before creating a replacement to avoid duplicate canvases/listeners.

## 8. Import/export
Implement optional controls:
- Export database: `db.export()` and trigger browser download with MIME `application/x-sqlite3`.
- Import database: file input, read bytes, open with SQL.js, validate required tables, then persist in IndexedDB.
- Provide separate export buttons for users and videos DB if both are supported.

## 9. Running locally
Because browser module/WASM loading may be restricted when opening `file://`, run using a simple static file server (e.g. VS Code Live Server). This is only static hosting; it does not implement a backend or API.

## 10. Error handling
- Handle SQL initialization failure.
- Handle empty DB.
- Handle invalid import.
- Handle duplicate email.
- Handle missing video title.
- Handle failed thumbnail URL with fallback image.
- Confirm destructive actions.
