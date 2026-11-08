/**
 * VideoHub - Dashboard Controller
 * Calculates KPIs, renders Chart.js charts, and handles time filters
 */

class DashboardController {
  constructor() {
    this.topVideosChart = null;
    this.viewsOverTimeChart = null;
    this.activeTimeFilter = 'daily'; // 'daily' or 'monthly'
  }

  async init() {
    // 1. Guard route (requires login)
    if (!window.authService.guardRoute(true)) return;

    // 2. Ensure DB is initialized & probe Supabase
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
      if (window.supabaseService) {
        await window.supabaseService.checkConnection();
      }
      if (!window.dbService.isInitialized) {
        await window.dbService.init();
      }
    } catch (err) {
      console.error('Database initialization failed:', err);
      showToast('error', 'Database Error', 'Could not initialize SQLite: ' + err.message);
      return;
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    // 3. Setup event listeners
    this.setupEventListeners();

    // 4. Render Dashboard data
    await this.renderDashboard();
  }

  setupEventListeners() {
    // Sync to Supabase button
    const syncSupaBtn = document.getElementById('btn-sync-supabase');
    if (syncSupaBtn) {
      syncSupaBtn.addEventListener('click', async () => {
        try {
          syncSupaBtn.disabled = true;
          syncSupaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
          const res = await window.supabaseService.syncLocalToSupabase();
          showToast('success', 'Đồng bộ Supabase thành công!', `Đã đưa ${res.videosCount} video và ${res.usersCount} tài khoản lên Supabase Cloud.`);
          await this.renderDashboard();
        } catch (err) {
          showToast('error', 'Đồng bộ thất bại', err.message);
        } finally {
          syncSupaBtn.disabled = false;
          syncSupaBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đẩy dữ liệu lên Supabase';
        }
      });
    }

    // Daily / Monthly Filter toggle buttons
    const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.getAttribute('data-filter');
        if (filter === this.activeTimeFilter) return;

        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        this.activeTimeFilter = filter;
        this.renderViewsOverTimeChart();
      });
    });

    // Database tools export/import bindings
    const exportVideosBtn = document.getElementById('btn-export-videos');
    if (exportVideosBtn) {
      exportVideosBtn.addEventListener('click', () => {
        window.dbService.exportDatabase('videos');
        showToast('success', 'Database Exported', 'Downloaded videos.db successfully.');
      });
    }

    const exportUsersBtn = document.getElementById('btn-export-users');
    if (exportUsersBtn) {
      exportUsersBtn.addEventListener('click', () => {
        window.dbService.exportDatabase('users');
        showToast('success', 'Database Exported', 'Downloaded users.db successfully.');
      });
    }

    const importVideosInput = document.getElementById('input-import-videos');
    if (importVideosInput) {
      importVideosInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await window.dbService.importDatabase('videos', file);
          showToast('success', 'Import Successful', 'videos.db imported and synced to IndexedDB.');
          closeModal('modal-db-tools');
          this.renderDashboard();
        } catch (err) {
          showToast('error', 'Import Failed', err.message);
        } finally {
          e.target.value = '';
        }
      });
    }

    const resetDbBtn = document.getElementById('btn-reset-db');
    if (resetDbBtn) {
      resetDbBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset all data to default demo state? All custom videos will be replaced.')) {
          await window.dbService.resetToDefaults();
          showToast('info', 'Database Reset', 'Sample data restored successfully.');
          closeModal('modal-db-tools');
          this.renderDashboard();
        }
      });
    }
  }

  async renderDashboard() {
    await this.renderKPIs();
    await this.renderTopVideosChart();
    await this.renderViewsOverTimeChart();
    await this.renderRecentVideosTable();
  }

  // 1. Calculate and update KPI Cards
  async renderKPIs() {
    let totalVideos = 0;
    let totalViews = 0;
    let totalBytes = 0;

    // Try Supabase first
    if (window.supabaseService && window.supabaseService.isAvailable) {
      const metrics = await window.supabaseService.getDashboardMetrics();
      if (metrics) {
        totalVideos = metrics.totalVideos;
        totalViews = metrics.totalViews;
        totalBytes = metrics.totalBytes;
      }
    }

    // Fallback to SQLite if 0 or unavailable
    if (totalVideos === 0 && window.dbService.videosDb) {
      const db = window.dbService.videosDb;
      const totalVideosRes = window.dbService.query(db, 'SELECT COUNT(*) AS total FROM videos');
      totalVideos = totalVideosRes[0]?.total || 0;

      const totalViewsRes = window.dbService.query(db, 'SELECT COALESCE(SUM(views), 0) AS total FROM videos');
      totalViews = totalViewsRes[0]?.total || 0;

      const totalStorageRes = window.dbService.query(db, 'SELECT COALESCE(SUM(file_size_bytes), 0) AS total FROM videos');
      totalBytes = totalStorageRes[0]?.total || 0;
    }

    // Update elements
    const kpiVideosEl = document.getElementById('kpi-total-videos');
    const kpiViewsEl = document.getElementById('kpi-total-views');
    const kpiStorageEl = document.getElementById('kpi-total-storage');

    if (kpiVideosEl) kpiVideosEl.textContent = totalVideos.toLocaleString();
    if (kpiViewsEl) kpiViewsEl.textContent = formatViews(totalViews);
    if (kpiStorageEl) kpiStorageEl.textContent = formatStorage(totalBytes);
  }

  // 2. Top 10 Videos Bar Chart
  async renderTopVideosChart() {
    let data = [];

    // Try Supabase first
    if (window.supabaseService && window.supabaseService.isAvailable) {
      const metrics = await window.supabaseService.getDashboardMetrics();
      if (metrics && metrics.topVideos && metrics.topVideos.length) {
        data = metrics.topVideos;
      }
    }

    // Fallback to SQLite
    if (!data.length && window.dbService.videosDb) {
      data = window.dbService.query(window.dbService.videosDb, `
        SELECT id, title, views
        FROM videos
        ORDER BY views DESC
        LIMIT 10
      `);
    }

    const canvas = document.getElementById('topVideosChart');
    if (!canvas) return;

    // Clean up previous chart instance
    if (this.topVideosChart) {
      this.topVideosChart.destroy();
      this.topVideosChart = null;
    }

    const emptyContainer = document.getElementById('top-videos-empty');
    if (!data.length) {
      canvas.style.display = 'none';
      if (emptyContainer) emptyContainer.style.display = 'block';
      return;
    }

    canvas.style.display = 'block';
    if (emptyContainer) emptyContainer.style.display = 'none';

    // Truncate long titles for neat chart labels
    const labels = data.map(item => {
      return item.title.length > 22 ? item.title.substring(0, 20) + '...' : item.title;
    });
    const values = data.map(item => item.views);

    const ctx = canvas.getContext('2d');
    this.topVideosChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Views',
          data: values,
          backgroundColor: '#4F46E5',
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return data[idx].title;
              },
              label: (item) => `Views: ${item.raw.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { size: 11 }
            }
          },
          y: {
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (val) => formatViews(val)
            }
          }
        }
      }
    });
  }

  // 3. Views Over Time Line Chart (Daily or Monthly)
  async renderViewsOverTimeChart() {
    let data = [];

    // Try Supabase first
    if (window.supabaseService && window.supabaseService.isAvailable) {
      const stats = await window.supabaseService.getViewStats(this.activeTimeFilter);
      if (stats && stats.length) {
        data = stats;
      }
    }

    // Fallback to SQLite
    if (!data.length && window.dbService.videosDb) {
      let query = '';
      if (this.activeTimeFilter === 'daily') {
        query = `
          SELECT view_date AS period, SUM(views) AS total_views
          FROM video_view_stats
          GROUP BY view_date
          ORDER BY view_date ASC
        `;
      } else {
        query = `
          SELECT substr(view_date, 1, 7) AS period, SUM(views) AS total_views
          FROM video_view_stats
          GROUP BY substr(view_date, 1, 7)
          ORDER BY period ASC
        `;
      }
      data = window.dbService.query(window.dbService.videosDb, query);
    }

    if (this.viewsOverTimeChart) {
      this.viewsOverTimeChart.destroy();
      this.viewsOverTimeChart = null;
    }

    const emptyContainer = document.getElementById('views-time-empty');
    if (!data.length) {
      canvas.style.display = 'none';
      if (emptyContainer) emptyContainer.style.display = 'block';
      return;
    }

    canvas.style.display = 'block';
    if (emptyContainer) emptyContainer.style.display = 'none';

    // Format labels nicely
    const labels = data.map(row => {
      if (this.activeTimeFilter === 'daily') {
        const parts = row.period.split('-');
        if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
      }
      return row.period;
    });

    const values = data.map(row => row.total_views);

    const ctx = canvas.getContext('2d');
    // Create gradient fill under line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.28)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.00)');

    this.viewsOverTimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Views',
          data: values,
          borderColor: '#4F46E5',
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#4F46E5',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return `Date/Period: ${data[idx].period}`;
              },
              label: (item) => `Views: ${item.raw.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              maxTicksLimit: 15
            }
          },
          y: {
            grid: { color: '#F3F4F6' },
            ticks: {
              color: '#6B7280',
              font: { size: 11 },
              callback: (val) => formatViews(val)
            }
          }
        }
      }
    });
  }

  // 4. Recent Videos Table
  renderRecentVideosTable() {
    const tbody = document.getElementById('recent-videos-tbody');
    if (!tbody) return;

    const db = window.dbService.videosDb;
    if (!db) return;

    const sql = `
      SELECT v.id, v.title, v.thumbnail_url, v.views, v.file_size_bytes, v.duration_seconds, v.created_at,
             c.name AS category_name
      FROM videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      ORDER BY v.id DESC
      LIMIT 5
    `;

    const recent = window.dbService.query(db, sql);
    if (!recent.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 32px; color: var(--text-muted);">
            No videos in database yet. Click "Add Video" in Videos page to get started.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = recent.map(v => {
      const catClass = (v.category_name || 'tutorial').toLowerCase();
      const thumb = v.thumbnail_url || 'assets/images/placeholder.svg';
      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-muted); width: 60px;">#${v.id}</td>
          <td>
            <div class="video-cell">
              <div class="video-thumb-wrap">
                <img src="${thumb}" alt="${v.title}" class="video-thumb" onerror="this.src='assets/images/placeholder.svg'">
                <span class="duration-tag">${formatDuration(v.duration_seconds)}</span>
              </div>
              <div class="video-meta">
                <h4>${v.title}</h4>
                <p>Created: ${formatDate(v.created_at)}</p>
              </div>
            </div>
          </td>
          <td>
            <span class="category-badge ${catClass}">${v.category_name || 'Uncategorized'}</span>
          </td>
          <td style="font-weight: 600;">${formatViews(v.views)}</td>
          <td style="color: var(--text-secondary);">${formatStorage(v.file_size_bytes)}</td>
          <td>
            <a href="videos.html" class="btn btn-secondary btn-sm" title="Manage in Videos">
              <i class="fa-solid fa-arrow-right"></i>
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Global Dashboard Instance
window.dashboardCtrl = new DashboardController();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('topVideosChart')) {
    window.dashboardCtrl.init();
  }
});
