/**
 * VideoHub - Database Service
 * Uses sql.js (WebAssembly SQLite) with IndexedDB persistence
 * Supports separate users.db and videos.db logical databases
 */

const DB_CONFIG = {
  IDB_NAME: 'VideoHub_IDB',
  IDB_STORE: 'sqlite_stores',
  IDB_VERSION: 1,
  SQL_WASM_PATH: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm'
};

class DatabaseService {
  constructor() {
    this.SQL = null;
    this.usersDb = null;
    this.videosDb = null;
    this.isInitialized = false;
  }

  // Open IndexedDB instance
  async openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.IDB_NAME, DB_CONFIG.IDB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(DB_CONFIG.IDB_STORE)) {
          db.createObjectStore(DB_CONFIG.IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Read binary SQLite bytes from IndexedDB
  async getBytesFromIDB(key) {
    try {
      const idb = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(DB_CONFIG.IDB_STORE, 'readonly');
        const store = tx.objectStore(DB_CONFIG.IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IDB] Failed to get ${key}:`, err);
      return null;
    }
  }

  // Save binary SQLite bytes to IndexedDB
  async saveBytesToIDB(key, uint8Array) {
    try {
      const idb = await this.openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(DB_CONFIG.IDB_STORE, 'readwrite');
        const store = tx.objectStore(DB_CONFIG.IDB_STORE);
        const req = store.put(uint8Array, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`[IDB] Failed to persist ${key}:`, err);
    }
  }

  // Persist current memory database to IndexedDB
  async persistUsersDb() {
    if (this.usersDb) {
      const data = this.usersDb.export();
      await this.saveBytesToIDB('users_db', data);
    }
  }

  async persistVideosDb() {
    if (this.videosDb) {
      const data = this.videosDb.export();
      await this.saveBytesToIDB('videos_db', data);
    }
  }

  // Initialize SQL.js and both databases
  async init() {
    if (this.isInitialized) return;

    if (typeof initSqlJs !== 'function') {
      throw new Error('sql.js is not loaded. Please ensure sql-wasm.js is included.');
    }

    this.SQL = await initSqlJs({
      locateFile: file => DB_CONFIG.SQL_WASM_PATH
    });

    // 1. Initialize users.db
    const usersBytes = await this.getBytesFromIDB('users_db');
    if (usersBytes && usersBytes.length > 0) {
      this.usersDb = new this.SQL.Database(usersBytes);
      this.ensureUsersRoleMigration();
      await this.persistUsersDb();
    } else {
      this.usersDb = new this.SQL.Database();
      this.createUsersSchema();
      this.seedUsersData();
      await this.persistUsersDb();
    }

    // 2. Initialize videos.db
    const videosBytes = await this.getBytesFromIDB('videos_db');
    if (videosBytes && videosBytes.length > 0) {
      this.videosDb = new this.SQL.Database(videosBytes);
    } else {
      this.videosDb = new this.SQL.Database();
      this.createVideosSchema();
      this.seedVideosData();
      await this.persistVideosDb();
    }

    this.isInitialized = true;
  }

  // Users Schema
  createUsersSchema() {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;
    this.usersDb.run(sql);
  }

  // Ensure role column and demo users exist even on upgraded database
  ensureUsersRoleMigration() {
    try {
      const cols = this.query(this.usersDb, "PRAGMA table_info(users)");
      const hasRole = cols.some(c => c.name === 'role');
      if (!hasRole) {
        this.usersDb.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'");
        this.usersDb.run("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@videohub.com'");
      }

      // Ensure demo users exist
      const existingDemo = this.query(this.usersDb, "SELECT id FROM users WHERE email = 'user1@demo.com'");
      if (!existingDemo || existingDemo.length === 0) {
        this.seedDemoUsers();
      }
    } catch (err) {
      console.warn('[Users Migration] Non-critical warning:', err);
    }
  }

  // Seed default admin and 10 demo users
  seedUsersData() {
    // 1. Admin user
    const stmt = this.usersDb.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(['Admin User', 'admin@videohub.com', 'admin123', 'ADMIN']);
    stmt.free();

    // 2. 10 Demo USER accounts
    this.seedDemoUsers();
  }

  // Helper: Seed 10 USER accounts
  seedDemoUsers() {
    const demoUsers = [
      { name: 'Alex Morgan', email: 'user1@demo.com' },
      { name: 'Brian Smith', email: 'user2@demo.com' },
      { name: 'Catherine Davis', email: 'user3@demo.com' },
      { name: 'David Miller', email: 'user4@demo.com' },
      { name: 'Emma Watson', email: 'user5@demo.com' },
      { name: 'Frank Wilson', email: 'user6@demo.com' },
      { name: 'Grace Taylor', email: 'user7@demo.com' },
      { name: 'Henry Anderson', email: 'user8@demo.com' },
      { name: 'Isabella Thomas', email: 'user9@demo.com' },
      { name: 'Jack White', email: 'user10@demo.com' }
    ];

    const stmt = this.usersDb.prepare(`
      INSERT INTO users (full_name, email, password_hash, role, created_at)
      VALUES (?, ?, ?, 'USER', datetime('now', '-' || ? || ' days'))
    `);

    demoUsers.forEach((u, i) => {
      // Check if user already exists
      const exists = this.query(this.usersDb, "SELECT id FROM users WHERE LOWER(email) = ?", [u.email.toLowerCase()]);
      if (!exists.length) {
        stmt.run([u.name, u.email, 'user123', (i + 1) * 3]);
      }
    });
    stmt.free();
  }

  // Update a user's role (ADMIN or USER) and persist
  async updateUserRole(userId, newRole) {
    if (!['ADMIN', 'USER'].includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}. Must be ADMIN or USER.`);
    }

    const checkUser = this.query(this.usersDb, "SELECT id, email, role FROM users WHERE id = ?", [userId]);
    if (!checkUser.length) {
      throw new Error('User not found.');
    }

    // Safety check: Prevent demoting the last active ADMIN
    if (newRole === 'USER' && checkUser[0].role === 'ADMIN') {
      const adminCount = this.query(this.usersDb, "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'")[0].count;
      if (adminCount <= 1) {
        throw new Error('Cannot demote this user: The system must have at least one ADMIN account.');
      }
    }

    const sql = `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`;
    await this.runUsers(sql, [newRole, userId]);
    return checkUser[0];
  }

  // Videos Schema
  createVideosSchema() {
    const sql = `
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
        view_date TEXT NOT NULL,
        views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(video_id, view_date)
      );

      CREATE INDEX IF NOT EXISTS idx_video_view_stats_date ON video_view_stats(view_date);
    `;
    this.videosDb.run(sql);
  }

  // Seed sample videos, categories & 30-day stats
  seedVideosData() {
    // Categories
    const categories = [
      { name: 'Tutorial', desc: 'Step-by-step guides, code alongs and tech tutorials' },
      { name: 'Entertainment', desc: 'Music videos, gaming streams, cinematic reels' },
      { name: 'Marketing', desc: 'Product previews, customer stories and promos' },
      { name: 'Education', desc: 'Lectures, deep dives and academic masterclasses' }
    ];

    const catStmt = this.videosDb.prepare(`INSERT INTO video_categories (name, description) VALUES (?, ?)`);
    categories.forEach(cat => catStmt.run([cat.name, cat.desc]));
    catStmt.free();

    // 14 High-Quality Demo Videos with realistic stats
    const sampleVideos = [
      {
        title: 'Mastering Machine Learning & Neural Networks in 2026',
        desc: 'A comprehensive visual exploration of modern AI architectures, Transformers and deep neural representations.',
        thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 4,
        views: 1420500,
        bytes: 420 * 1024 * 1024,
        duration: 2150
      },
      {
        title: 'Top 10 Modern Frontend Engineering Trends',
        desc: 'Micro-frontends, edge-native compute, WASM runtimes and zero-bundle web technologies shaping web applications.',
        thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 1,
        views: 985000,
        bytes: 280 * 1024 * 1024,
        duration: 1240
      },
      {
        title: 'Building Modern Light-Mode UI Dashboards with Pure CSS',
        desc: 'Learn how to craft accessible, highly responsive admin panels with clean cards, soft shadows and semantic markup.',
        thumb: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 1,
        views: 845300,
        bytes: 340 * 1024 * 1024,
        duration: 1540
      },
      {
        title: 'Epic 4K Cinematic Drone Travel Footage - Highlands',
        desc: 'Breathtaking 60fps aerial cinematography through misty mountain ranges, glacial lakes and evergreen fjords.',
        thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 2,
        views: 720000,
        bytes: 1250 * 1024 * 1024,
        duration: 620
      },
      {
        title: 'SaaS Go-To-Market Growth Playbook for Founders',
        desc: 'Proven customer acquisition channels, product-led viral loops and retention benchmarking for 2026.',
        thumb: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 3,
        views: 610200,
        bytes: 195 * 1024 * 1024,
        duration: 980
      },
      {
        title: 'Complete Python Masterclass for Data Analysis',
        desc: 'From zero syntax to advanced Pandas, NumPy arrays, Polars workflows and automated ETL pipelines.',
        thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 4,
        views: 540100,
        bytes: 890 * 1024 * 1024,
        duration: 3600
      },
      {
        title: 'Cinematic Color Grading in DaVinci Resolve',
        desc: 'Mastering color management nodes, film emulation curves and skin tone balance for high-end digital film.',
        thumb: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 1,
        views: 489000,
        bytes: 510 * 1024 * 1024,
        duration: 1420
      },
      {
        title: 'NextGen Spatial Audio Device Reveal Event',
        desc: 'Official launch reveal for the new immersive spatial acoustic headphones with real-time room resonance tracking.',
        thumb: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 3,
        views: 395000,
        bytes: 155 * 1024 * 1024,
        duration: 190
      },
      {
        title: 'Lo-Fi Chill Beats & Ambient Coding Session',
        desc: 'Relaxing instrumental lo-fi beats, rain soundscape and ambient background audio for deep focus work.',
        thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 2,
        views: 340000,
        bytes: 650 * 1024 * 1024,
        duration: 7200
      },
      {
        title: 'Cybersecurity Fundamentals & Threat Modeling',
        desc: 'Zero-trust architecture, cryptographic handshakes, TLS 1.3 analysis and defending against modern web attack vectors.',
        thumb: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 4,
        views: 290000,
        bytes: 220 * 1024 * 1024,
        duration: 1120
      },
      {
        title: 'Modern CSS Grid & Subgrid Layout Architecture',
        desc: 'Creating bulletproof responsive layouts without complex media query chains using modern CSS specifications.',
        thumb: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 1,
        views: 215000,
        bytes: 310 * 1024 * 1024,
        duration: 1340
      },
      {
        title: 'Visual Identity & Design Systems for Global Brands',
        desc: 'How leading design agencies structure design tokens, typography scales and dynamic brand assets.',
        thumb: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 3,
        views: 175000,
        bytes: 180 * 1024 * 1024,
        duration: 950
      },
      {
        title: 'Behind the Scenes: Indie Sci-Fi Short Production',
        desc: 'Lighting setups, practical miniatures, green screen compositing and sound design on an indie budget.',
        thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 2,
        views: 142000,
        bytes: 780 * 1024 * 1024,
        duration: 1620
      },
      {
        title: 'Data Structures & Algorithms Animated Guide',
        desc: 'Interactive visual walk-throughs of Red-Black Trees, Dijkstra Pathfinding, B-Trees and Trie lookups.',
        thumb: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&auto=format&fit=crop&q=80',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        catId: 4,
        views: 98000,
        bytes: 260 * 1024 * 1024,
        duration: 2100
      }
    ];

    const vidStmt = this.videosDb.prepare(`
      INSERT INTO videos (title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, duration_seconds, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
    `);

    sampleVideos.forEach((v, idx) => {
      vidStmt.run([
        v.title,
        v.desc,
        v.thumb,
        v.videoUrl,
        v.catId,
        v.views,
        v.bytes,
        v.duration,
        idx * 2 // spread creation dates over past 28 days
      ]);
    });
    vidStmt.free();

    // 30 Days of realistic Daily View Stats
    const statStmt = this.videosDb.prepare(`
      INSERT INTO video_view_stats (video_id, view_date, views)
      VALUES (?, ?, ?)
    `);

    const now = new Date();
    // For each video, generate daily view statistics for the last 30 days
    for (let vidId = 1; vidId <= sampleVideos.length; vidId++) {
      const baseDailyViews = Math.round(sampleVideos[vidId - 1].views / 45);
      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const d = new Date(now);
        d.setDate(d.getDate() - dayOffset);
        const isoDate = d.toISOString().split('T')[0];
        
        // Realistic variation with weekend curve
        const dayOfWeek = d.getDay();
        const factor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 0.9;
        const jitter = 0.8 + Math.random() * 0.4;
        const dayViews = Math.max(10, Math.round(baseDailyViews * factor * jitter));

        try {
          statStmt.run([vidId, isoDate, dayViews]);
        } catch (e) {
          // ignore potential duplicate
        }
      }
    }
    statStmt.free();
  }

  // Helper: Execute a SELECT query and return array of objects
  query(db, sql, params = []) {
    const stmt = db.prepare(sql);
    if (params && params.length) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // Helper: Execute an INSERT, UPDATE, or DELETE and persist
  async runVideos(sql, params = []) {
    const stmt = this.videosDb.prepare(sql);
    stmt.run(params);
    stmt.free();
    await this.persistVideosDb();
  }

  async runUsers(sql, params = []) {
    const stmt = this.usersDb.prepare(sql);
    stmt.run(params);
    stmt.free();
    await this.persistUsersDb();
  }

  // Export a SQLite database to file download
  exportDatabase(type = 'videos') {
    const db = type === 'users' ? this.usersDb : this.videosDb;
    if (!db) return;
    const data = db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = type === 'users' ? 'users.db' : 'videos.db';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import a SQLite database file
  async importDatabase(type = 'videos', file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const uInt8Array = new Uint8Array(reader.result);
          const newDb = new this.SQL.Database(uInt8Array);

          // Verify tables
          if (type === 'videos') {
            const tables = this.query(newDb, "SELECT name FROM sqlite_master WHERE type='table' AND name='videos'");
            if (!tables.length) {
              throw new Error('Invalid SQLite file: table "videos" not found.');
            }
            this.videosDb = newDb;
            await this.saveBytesToIDB('videos_db', uInt8Array);
          } else {
            const tables = this.query(newDb, "SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
            if (!tables.length) {
              throw new Error('Invalid SQLite file: table "users" not found.');
            }
            this.usersDb = newDb;
            await this.saveBytesToIDB('users_db', uInt8Array);
          }
          resolve(true);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Reset entire database to default sample state
  async resetToDefaults() {
    this.usersDb = new this.SQL.Database();
    this.createUsersSchema();
    this.seedUsersData();
    await this.persistUsersDb();

    this.videosDb = new this.SQL.Database();
    this.createVideosSchema();
    this.seedVideosData();
    await this.persistVideosDb();
  }
}

// Global Singleton Instance
window.dbService = new DatabaseService();
