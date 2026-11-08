# SQLite Database Schema

## 1. Database files
Logical database files:
- `users.db`: users and demo authentication.
- `videos.db`: video metadata, categories, and view statistics.

Browser limitation: frontend cannot silently create or write arbitrary `.db` files on disk. Use `sql.js` in-memory SQLite + IndexedDB persistence; implement import/export to produce actual `.db` files.

## 2. users.db

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

For a browser-only demo, password handling is not secure. Do not store real passwords. Use mock/demo credentials or clearly mark authentication as demonstration-only. A production app needs server-side authentication and password hashing.

## 3. videos.db

```sql
CREATE TABLE IF NOT EXISTS video_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    category_id INTEGER,
    views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    file_size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT,
    FOREIGN KEY (category_id) REFERENCES video_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);

CREATE TABLE IF NOT EXISTS video_view_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    view_date TEXT NOT NULL, -- ISO date: YYYY-MM-DD
    views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(video_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_video_view_stats_date
    ON video_view_stats(view_date);
```

## 4. Dashboard SQL examples

### Total videos
```sql
SELECT COUNT(*) AS total_videos FROM videos;
```

### Total views
```sql
SELECT COALESCE(SUM(views), 0) AS total_views FROM videos;
```

### Storage used
```sql
SELECT COALESCE(SUM(file_size_bytes), 0) AS storage_bytes FROM videos;
```

### Top 10 videos by views
```sql
SELECT id, title, views
FROM videos
ORDER BY views DESC
LIMIT 10;
```

### Daily views
```sql
SELECT view_date, SUM(views) AS total_views
FROM video_view_stats
GROUP BY view_date
ORDER BY view_date;
```

### Monthly views
```sql
SELECT substr(view_date, 1, 7) AS month, SUM(views) AS total_views
FROM video_view_stats
GROUP BY substr(view_date, 1, 7)
ORDER BY month;
```

## 5. Seed data
Create a few categories (Tutorial, Entertainment, Marketing, Education) and 10–15 demo videos with:
- varied views
- thumbnail URLs
- different file sizes
- daily view statistics over the last 30 days

Use deterministic sample data so dashboard charts are stable during development.
