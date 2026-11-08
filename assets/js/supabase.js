/**
 * VideoHub - Supabase Cloud Database Integration Module
 * Connected to project: https://pmxvshdtcwxbqjdmfyll.supabase.co
 */

const SUPABASE_CONFIG = {
  URL: 'https://pmxvshdtcwxbqjdmfyll.supabase.co',
  KEY: 'sb_publishable_Z2AIZpEI4dStNKVf6Plbrg_z38v_s6I'
};

class SupabaseService {
  constructor() {
    this.client = null;
    this.status = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'TABLES_MISSING' | 'OFFLINE'
    this.isAvailable = false;
    this.initClient();
  }

  initClient() {
    try {
      if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        this.client = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
      } else {
        console.warn('[Supabase] @supabase/supabase-js library is not yet loaded on window.');
      }
    } catch (err) {
      console.error('[Supabase] Initialization error:', err);
    }
  }

  // Health check: probe connection and verify tables exist
  async checkConnection() {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        this.setStatus('OFFLINE', 'Chưa nạp thư viện Supabase');
        return false;
      }
    }

    try {
      this.setStatus('CONNECTING', 'Đang kết nối Supabase...');
      // Try to query videos table
      const { data, error, status } = await this.client
        .from('videos')
        .select('id', { count: 'exact', head: true });

      if (error) {
        // Table does not exist (PostgreSQL error 42P01)
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          this.setStatus('TABLES_MISSING', 'Supabase đã kết nối (Cần chạy supabase_schema.sql)');
          this.isAvailable = false;
          return false;
        }
        // Authentication or permissions error
        console.warn('[Supabase] Query error:', error);
        this.setStatus('OFFLINE', 'Supabase: ' + (error.message || 'Lỗi truy vấn'));
        this.isAvailable = false;
        return false;
      }

      this.setStatus('CONNECTED', 'Supabase Cloud: Đã kết nối');
      this.isAvailable = true;
      return true;
    } catch (err) {
      console.warn('[Supabase] Network or fetch error:', err);
      this.setStatus('OFFLINE', 'Supabase Offline (Dùng SQLite)');
      this.isAvailable = false;
      return false;
    }
  }

  setStatus(status, message) {
    this.status = status;
    this.updateUIStatus(status, message);
  }

  // Update visual indicators in sidebar and topbar
  updateUIStatus(status, message) {
    const statusTextEl = document.getElementById('supabase-status-text');
    const statusDotEl = document.getElementById('supabase-status-dot');
    const badgeTextEl = document.getElementById('backend-status-text');

    if (statusTextEl) statusTextEl.textContent = message || status;

    if (statusDotEl) {
      statusDotEl.className = 'dot';
      if (status === 'CONNECTED') {
        statusDotEl.style.backgroundColor = '#16A34A';
        statusDotEl.style.boxShadow = '0 0 0 2px rgba(22, 163, 74, 0.2)';
      } else if (status === 'TABLES_MISSING') {
        statusDotEl.style.backgroundColor = '#F59E0B';
        statusDotEl.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.2)';
      } else if (status === 'CONNECTING') {
        statusDotEl.style.backgroundColor = '#6366F1';
      } else {
        statusDotEl.style.backgroundColor = '#9CA3AF';
      }
    }

    if (badgeTextEl) {
      if (status === 'CONNECTED') {
        badgeTextEl.textContent = 'Supabase Cloud';
      } else if (status === 'TABLES_MISSING') {
        badgeTextEl.textContent = 'Supabase (Chưa tạo bảng)';
      } else {
        badgeTextEl.textContent = 'SQLite (Local)';
      }
    }
  }

  // ==========================================
  // USERS & AUTH WITH SUPABASE
  // ==========================================

  async getUserByEmail(email) {
    if (!this.isAvailable) return null;
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] getUserByEmail error:', error);
      return null;
    }
    return data;
  }

  async getAllUsers() {
    if (!this.isAvailable) return [];
    const { data, error } = await this.client
      .from('users')
      .select('id, full_name, email, role, created_at, updated_at')
      .order('id', { ascending: true });

    if (error) {
      console.error('[Supabase] getAllUsers error:', error);
      return [];
    }
    return data || [];
  }

  async updateUserRole(userId, newRole) {
    if (!this.isAvailable) return false;
    const { data, error } = await this.client
      .from('users')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) {
      throw new Error(error.message);
    }
    return data && data[0];
  }

  async registerUser(userData) {
    if (!this.isAvailable) return null;
    const { data, error } = await this.client
      .from('users')
      .insert([{
        full_name: userData.full_name,
        email: userData.email.toLowerCase(),
        password_hash: userData.password_hash,
        role: userData.role || 'USER'
      }])
      .select();

    if (error) {
      throw new Error(error.message);
    }
    return data && data[0];
  }

  // Supabase Auth Password Reset
  async sendPasswordResetEmail(email, redirectTo) {
    if (!this.client) throw new Error('Supabase client chưa khởi tạo');
    const { data, error } = await this.client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectTo
    });
    if (error) throw new Error(error.message);
    return data;
  }

  // Supabase Auth Update User Password
  async updateUserPassword(newPassword) {
    if (!this.client) throw new Error('Supabase client chưa khởi tạo');
    const { data, error } = await this.client.auth.updateUser({
      password: newPassword
    });
    if (error) throw new Error(error.message);
    return data;
  }

  // ==========================================
  // CATEGORIES & VIDEOS WITH SUPABASE
  // ==========================================

  async getCategories() {
    if (!this.isAvailable) return [];
    const { data, error } = await this.client
      .from('video_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) return [];
    return data || [];
  }

  async getVideos(options = {}) {
    if (!this.isAvailable) return null;

    let query = this.client
      .from('videos')
      .select('*, video_categories(name)', { count: 'exact' });

    if (options.searchTerm) {
      query = query.ilike('title', `%${options.searchTerm}%`);
    }

    if (options.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', parseInt(options.categoryId, 10));
    }

    // Sorting
    switch (options.sortBy) {
      case 'views_desc':
        query = query.order('views', { ascending: false });
        break;
      case 'views_asc':
        query = query.order('views', { ascending: true });
        break;
      case 'title_asc':
        query = query.order('title', { ascending: true });
        break;
      case 'id_asc':
        query = query.order('id', { ascending: true });
        break;
      case 'id_desc':
      default:
        query = query.order('id', { ascending: false });
        break;
    }

    const { data, error, count } = await query;
    if (error) {
      console.warn('[Supabase] getVideos error:', error);
      return null;
    }

    // Map video_categories.name to category_name for frontend compatibility
    const formattedData = (data || []).map(v => ({
      ...v,
      category_name: v.video_categories ? v.video_categories.name : 'Uncategorized'
    }));

    return { data: formattedData, totalCount: count || formattedData.length };
  }

  async createVideo(video) {
    if (!this.isAvailable) return null;
    const { data, error } = await this.client
      .from('videos')
      .insert([video])
      .select();

    if (error) throw new Error(error.message);
    return data && data[0];
  }

  async updateVideo(id, fields) {
    if (!this.isAvailable) return null;
    const { data, error } = await this.client
      .from('videos')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data && data[0];
  }

  async deleteVideo(id) {
    if (!this.isAvailable) return false;
    const { error } = await this.client
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }

  // ==========================================
  // DASHBOARD METRICS WITH SUPABASE
  // ==========================================

  async getDashboardMetrics() {
    if (!this.isAvailable) return null;

    try {
      // 1. Total Videos & Aggregates
      const { data: videos, error } = await this.client
        .from('videos')
        .select('id, views, file_size_bytes');

      if (error) return null;

      const totalVideos = videos.length;
      const totalViews = videos.reduce((acc, v) => acc + (Number(v.views) || 0), 0);
      const totalBytes = videos.reduce((acc, v) => acc + (Number(v.file_size_bytes) || 0), 0);

      // 2. Top 10 Videos
      const { data: topVideos } = await this.client
        .from('videos')
        .select('id, title, views')
        .order('views', { ascending: false })
        .limit(10);

      return {
        totalVideos,
        totalViews,
        totalBytes,
        topVideos: topVideos || []
      };
    } catch (err) {
      console.warn('[Supabase] getDashboardMetrics error:', err);
      return null;
    }
  }

  async getViewStats(filter = 'daily') {
    if (!this.isAvailable) return null;

    try {
      const { data, error } = await this.client
        .from('video_view_stats')
        .select('view_date, views')
        .order('view_date', { ascending: true });

      if (error || !data) return null;

      if (filter === 'daily') {
        const dateMap = {};
        data.forEach(item => {
          const d = item.view_date;
          dateMap[d] = (dateMap[d] || 0) + Number(item.views);
        });
        return Object.keys(dateMap).sort().map(d => ({
          period: d,
          total_views: dateMap[d]
        }));
      } else {
        const monthMap = {};
        data.forEach(item => {
          const m = item.view_date.substring(0, 7);
          monthMap[m] = (monthMap[m] || 0) + Number(item.views);
        });
        return Object.keys(monthMap).sort().map(m => ({
          period: m,
          total_views: monthMap[m]
        }));
      }
    } catch {
      return null;
    }
  }

  // ==========================================
  // SYNC UTILITIES: LOCAL SQLITE <-> SUPABASE
  // ==========================================

  async syncLocalToSupabase() {
    if (!this.client) throw new Error('Supabase client chưa khởi tạo.');
    const isConn = await this.checkConnection();
    if (!isConn) {
      if (this.status === 'TABLES_MISSING') {
        throw new Error('Supabase đã kết nối nhưng chưa có bảng. Vui lòng mở Supabase SQL Editor và chạy file supabase_schema.sql trước!');
      }
      throw new Error('Không thể kết nối tới Supabase. Vui lòng kiểm tra mạng hoặc thông tin API.');
    }

    const db = window.dbService.videosDb;
    const userDb = window.dbService.usersDb;
    if (!db || !userDb) throw new Error('Database nội bộ chưa sẵn sàng.');

    // 1. Sync Categories
    const categories = window.dbService.query(db, 'SELECT id, name, description FROM video_categories');
    if (categories.length) {
      await this.client.from('video_categories').upsert(categories, { onConflict: 'id' });
    }

    // 2. Sync Videos
    const videos = window.dbService.query(db, 'SELECT id, title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, duration_seconds FROM videos');
    if (videos.length) {
      await this.client.from('videos').upsert(videos, { onConflict: 'id' });
    }

    // 3. Sync Users
    const users = window.dbService.query(userDb, 'SELECT full_name, email, password_hash, role FROM users');
    if (users.length) {
      await this.client.from('users').upsert(users, { onConflict: 'email' });
    }

    return {
      categoriesCount: categories.length,
      videosCount: videos.length,
      usersCount: users.length
    };
  }
}

// Global Supabase Service Instance
window.supabaseService = new SupabaseService();
