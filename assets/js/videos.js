/**
 * VideoHub - Video Management (CRUD, Search, Filter, Pagination)
 */

class VideosController {
  constructor() {
    this.currentPage = 1;
    this.pageSize = 10;
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.sortBy = 'id_desc';
    this.deleteTargetId = null;
    this.editingVideoId = null;
  }

  async init() {
    // 1. Route guard
    if (!window.authService.guardRoute(true)) return;

    // 2. Initialize database & check Supabase
    const loadingOverlay = document.getElementById('loading-overlay');
    try {
      if (window.supabaseService) {
        await window.supabaseService.checkConnection();
      }
      if (!window.dbService.isInitialized) {
        await window.dbService.init();
      }
    } catch (err) {
      console.error('Database initialization error:', err);
      showToast('error', 'Database Error', err.message);
      return;
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    // 3. Load categories for dropdowns
    await this.populateCategoryOptions();

    // 4. Setup event listeners
    this.setupEventListeners();

    // 5. Render Video Table
    await this.renderVideos();
  }

  async populateCategoryOptions() {
    let categories = [];
    if (window.supabaseService && window.supabaseService.isAvailable) {
      categories = await window.supabaseService.getCategories();
    }

    if (!categories.length && window.dbService.videosDb) {
      categories = window.dbService.query(window.dbService.videosDb, 'SELECT id, name FROM video_categories ORDER BY name ASC');
    }
    
    // Filter dropdown in toolbar
    const filterSelect = document.getElementById('filter-category');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Categories</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // Category dropdown in Add/Edit modal
    const modalCategorySelect = document.getElementById('video-category');
    if (modalCategorySelect) {
      modalCategorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.currentPage = 1;
        this.renderVideos();
      });
    }

    // Category filter
    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) {
      filterCategory.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.currentPage = 1;
        this.renderVideos();
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.currentPage = 1;
        this.renderVideos();
      });
    }

    // Page size
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.pageSize = parseInt(e.target.value, 10) || 10;
        this.currentPage = 1;
        this.renderVideos();
      });
    }

    // Add Video Button
    const btnAddVideo = document.getElementById('btn-add-video');
    if (btnAddVideo) {
      btnAddVideo.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // Video Form Submit (Create / Update)
    const videoForm = document.getElementById('video-form');
    if (videoForm) {
      videoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // Live Thumbnail Preview in Modal
    const thumbInput = document.getElementById('video-thumbnail');
    const thumbPreviewImg = document.getElementById('modal-thumb-preview');
    const thumbPlaceholder = document.getElementById('modal-thumb-placeholder');

    if (thumbInput && thumbPreviewImg && thumbPlaceholder) {
      const updatePreview = () => {
        const url = thumbInput.value.trim();
        if (url) {
          thumbPreviewImg.src = url;
          thumbPreviewImg.style.display = 'block';
          thumbPlaceholder.style.display = 'none';
        } else {
          thumbPreviewImg.style.display = 'none';
          thumbPlaceholder.style.display = 'block';
        }
      };

      thumbInput.addEventListener('input', updatePreview);
      thumbPreviewImg.onerror = () => {
        thumbPreviewImg.src = 'assets/images/placeholder.svg';
      };
    }

    // Confirm Delete Button in Modal
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        await this.handleDeleteConfirm();
      });
    }

    // Sync to Supabase button
    const syncSupaBtn = document.getElementById('btn-sync-supabase');
    if (syncSupaBtn) {
      syncSupaBtn.addEventListener('click', async () => {
        try {
          syncSupaBtn.disabled = true;
          syncSupaBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...';
          const res = await window.supabaseService.syncLocalToSupabase();
          showToast('success', 'Đồng bộ Supabase thành công!', `Đã đưa ${res.videosCount} video và ${res.usersCount} tài khoản lên Supabase Cloud.`);
          await this.populateCategoryOptions();
          await this.renderVideos();
        } catch (err) {
          showToast('error', 'Đồng bộ thất bại', err.message);
        } finally {
          syncSupaBtn.disabled = false;
          syncSupaBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đẩy dữ liệu lên Supabase';
        }
      });
    }

    // Database tools export/import
    const exportVideosBtn = document.getElementById('btn-export-videos');
    if (exportVideosBtn) {
      exportVideosBtn.addEventListener('click', () => {
        window.dbService.exportDatabase('videos');
        showToast('success', 'Database Exported', 'Downloaded videos.db successfully.');
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
          this.populateCategoryOptions();
          this.renderVideos();
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
          this.populateCategoryOptions();
          this.renderVideos();
        }
      });
    }
  }

  // Build SQL Query based on search, filter, and sort
  getFilteredVideos() {
    const db = window.dbService.videosDb;
    if (!db) return [];

    let sql = `
      SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_url,
             v.category_id, v.views, v.file_size_bytes, v.duration_seconds,
             v.created_at, v.updated_at, c.name AS category_name
      FROM videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Search filter
    if (this.searchTerm) {
      sql += ` AND LOWER(v.title) LIKE ?`;
      params.push(`%${this.searchTerm}%`);
    }

    // Category filter
    if (this.selectedCategory !== 'all') {
      sql += ` AND v.category_id = ?`;
      params.push(parseInt(this.selectedCategory, 10));
    }

    // Sorting
    switch (this.sortBy) {
      case 'views_desc':
        sql += ` ORDER BY v.views DESC`;
        break;
      case 'views_asc':
        sql += ` ORDER BY v.views ASC`;
        break;
      case 'title_asc':
        sql += ` ORDER BY v.title COLLATE NOCASE ASC`;
        break;
      case 'id_asc':
        sql += ` ORDER BY v.id ASC`;
        break;
      case 'id_desc':
      default:
        sql += ` ORDER BY v.id DESC`;
        break;
    }

    return window.dbService.query(db, sql, params);
  }

  // Render Video Table and Pagination
  async renderVideos() {
    let allResults = [];
    let totalCount = 0;

    // 1. Try Supabase first
    if (window.supabaseService && window.supabaseService.isAvailable) {
      const res = await window.supabaseService.getVideos({
        searchTerm: this.searchTerm,
        categoryId: this.selectedCategory,
        sortBy: this.sortBy
      });
      if (res && res.data) {
        allResults = res.data;
        totalCount = res.totalCount;
      }
    }

    // 2. Fallback to Local SQLite
    if (!allResults.length && (!window.supabaseService || !window.supabaseService.isAvailable)) {
      allResults = this.getFilteredVideos();
      totalCount = allResults.length;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));

    // Boundary check
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageItems = allResults.slice(startIndex, startIndex + this.pageSize);

    const tbody = document.getElementById('videos-tbody');
    const emptyState = document.getElementById('videos-empty-state');
    const tableContainer = document.getElementById('videos-table-container');

    if (!totalCount) {
      if (tbody) tbody.innerHTML = '';
      if (tableContainer) tableContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      this.renderPagination(0, 0, 0, 0);
      return;
    }

    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = pageItems.map(video => {
      const catClass = (video.category_name || 'tutorial').toLowerCase();
      const thumb = video.thumbnail_url || 'assets/images/placeholder.svg';
      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-muted); width: 60px;">#${video.id}</td>
          <td>
            <div class="video-cell">
              <div class="video-thumb-wrap">
                <img src="${thumb}" alt="${video.title}" class="video-thumb" onerror="this.src='assets/images/placeholder.svg'">
                <span class="duration-tag">${formatDuration(video.duration_seconds)}</span>
              </div>
              <div class="video-meta">
                <h4>${video.title}</h4>
                <p>${video.description ? (video.description.length > 55 ? video.description.substring(0, 52) + '...' : video.description) : 'No description'}</p>
              </div>
            </div>
          </td>
          <td>
            <span class="category-badge ${catClass}">${video.category_name || 'General'}</span>
          </td>
          <td style="font-weight: 600;">${formatViews(video.views)}</td>
          <td style="color: var(--text-secondary);">${formatStorage(video.file_size_bytes)}</td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(video.created_at)}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-icon" title="Edit Video" onclick="window.videosCtrl.openEditModal(${video.id})">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon delete" title="Delete Video" onclick="window.videosCtrl.openDeleteModal(${video.id})">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.renderPagination(totalCount, totalPages, startIndex + 1, Math.min(startIndex + this.pageSize, totalCount));
  }

  // Render pagination controls
  renderPagination(totalCount, totalPages, start, end) {
    const infoEl = document.getElementById('pagination-info');
    const controlsEl = document.getElementById('pagination-controls');

    if (infoEl) {
      if (totalCount === 0) {
        infoEl.textContent = 'Showing 0 of 0 videos';
      } else {
        infoEl.textContent = `Showing ${start} to ${end} of ${totalCount} videos`;
      }
    }

    if (!controlsEl) return;
    if (totalPages <= 1) {
      controlsEl.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window.videosCtrl.changePage(${this.currentPage - 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      html += `
        <button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="window.videosCtrl.changePage(${p})">
          ${p}
        </button>
      `;
    }

    html += `
      <button class="page-btn" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window.videosCtrl.changePage(${this.currentPage + 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    controlsEl.innerHTML = html;
  }

  changePage(page) {
    this.currentPage = page;
    this.renderVideos();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Open Modal to Add Video
  openAddModal() {
    this.editingVideoId = null;
    document.getElementById('modal-video-title').textContent = 'Add New Video';
    document.getElementById('btn-save-video').textContent = 'Create Video';

    // Clear form
    const form = document.getElementById('video-form');
    form.reset();

    // Default values
    document.getElementById('video-views').value = '0';
    document.getElementById('video-size').value = '250';
    document.getElementById('video-duration').value = '05:00';

    // Reset preview
    document.getElementById('modal-thumb-preview').style.display = 'none';
    document.getElementById('modal-thumb-placeholder').style.display = 'block';

    openModal('modal-video-form');
  }

  // Open Modal to Edit Video
  openEditModal(id) {
    const db = window.dbService.videosDb;
    const results = window.dbService.query(db, 'SELECT * FROM videos WHERE id = ? LIMIT 1', [id]);
    if (!results.length) return;

    const video = results[0];
    this.editingVideoId = id;

    document.getElementById('modal-video-title').textContent = `Edit Video #${id}`;
    document.getElementById('btn-save-video').textContent = 'Save Changes';

    document.getElementById('video-title').value = video.title || '';
    document.getElementById('video-category').value = video.category_id || '1';
    document.getElementById('video-thumbnail').value = video.thumbnail_url || '';
    document.getElementById('video-url').value = video.video_url || '';
    document.getElementById('video-views').value = video.views || 0;
    
    // File size in MB
    const mb = Math.round((video.file_size_bytes || 0) / (1024 * 1024));
    document.getElementById('video-size').value = mb || 100;

    // Duration in mm:ss
    document.getElementById('video-duration').value = formatDuration(video.duration_seconds);
    document.getElementById('video-description').value = video.description || '';

    // Update preview
    const previewImg = document.getElementById('modal-thumb-preview');
    const placeholder = document.getElementById('modal-thumb-placeholder');
    if (video.thumbnail_url) {
      previewImg.src = video.thumbnail_url;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      previewImg.style.display = 'none';
      placeholder.style.display = 'block';
    }

    openModal('modal-video-form');
  }

  // Save Video (Create or Update)
  async handleFormSubmit() {
    const title = document.getElementById('video-title').value.trim();
    if (!title) {
      document.getElementById('video-title').classList.add('is-invalid');
      return;
    }
    document.getElementById('video-title').classList.remove('is-invalid');

    const categoryId = parseInt(document.getElementById('video-category').value, 10);
    const thumbnailUrl = document.getElementById('video-thumbnail').value.trim();
    const videoUrl = document.getElementById('video-url').value.trim();
    const views = Math.max(0, parseInt(document.getElementById('video-views').value, 10) || 0);
    const sizeMb = Math.max(1, parseFloat(document.getElementById('video-size').value) || 100);
    const fileSizeBytes = Math.round(sizeMb * 1024 * 1024);
    const durationInput = document.getElementById('video-duration').value.trim();
    const durationSeconds = parseDurationToSeconds(durationInput);
    const description = document.getElementById('video-description').value.trim();

    try {
      // 1. If Supabase is available, perform cloud operation
      if (window.supabaseService && window.supabaseService.isAvailable) {
        if (this.editingVideoId) {
          await window.supabaseService.updateVideo(this.editingVideoId, {
            title, description, thumbnail_url: thumbnailUrl, video_url: videoUrl,
            category_id: categoryId, views, file_size_bytes: fileSizeBytes, duration_seconds: durationSeconds
          });
        } else {
          await window.supabaseService.createVideo({
            title, description, thumbnail_url: thumbnailUrl, video_url: videoUrl,
            category_id: categoryId, views, file_size_bytes: fileSizeBytes, duration_seconds: durationSeconds
          });
        }
      }

      // 2. Also keep local SQLite updated for offline consistency
      if (this.editingVideoId) {
        // UPDATE
        const sql = `
          UPDATE videos
          SET title = ?, description = ?, thumbnail_url = ?, video_url = ?,
              category_id = ?, views = ?, file_size_bytes = ?, duration_seconds = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `;
        await window.dbService.runVideos(sql, [
          title, description, thumbnailUrl, videoUrl, categoryId,
          views, fileSizeBytes, durationSeconds, this.editingVideoId
        ]);
        showToast('success', 'Video Updated', `"${title}" was updated successfully.`);
      } else {
        // INSERT
        const sql = `
          INSERT INTO videos (title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, duration_seconds, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        await window.dbService.runVideos(sql, [
          title, description, thumbnailUrl, videoUrl, categoryId,
          views, fileSizeBytes, durationSeconds
        ]);

        // If views > 0, also insert an entry in view_stats for today
        if (views > 0) {
          const lastIdRes = window.dbService.query(window.dbService.videosDb, 'SELECT last_insert_rowid() AS id');
          const newId = lastIdRes[0]?.id;
          if (newId) {
            const today = new Date().toISOString().split('T')[0];
            const statSql = `INSERT INTO video_view_stats (video_id, view_date, views) VALUES (?, ?, ?)`;
            await window.dbService.runVideos(statSql, [newId, today, views]);
          }
        }

        showToast('success', 'Video Created', `"${title}" has been added to library.`);
      }

      closeModal('modal-video-form');
      await this.renderVideos();
    } catch (err) {
      console.error('Error saving video:', err);
      showToast('error', 'Operation Failed', err.message);
    }
  }

  // Open Delete Confirmation Modal
  openDeleteModal(id) {
    const db = window.dbService.videosDb;
    const results = window.dbService.query(db, 'SELECT id, title, thumbnail_url FROM videos WHERE id = ? LIMIT 1', [id]);
    if (!results.length) return;

    const video = results[0];
    this.deleteTargetId = id;

    const titleEl = document.getElementById('delete-video-title');
    if (titleEl) titleEl.textContent = video.title;

    openModal('modal-delete-confirm');
  }

  // Confirm Delete
  async handleDeleteConfirm() {
    if (!this.deleteTargetId) return;

    try {
      if (window.supabaseService && window.supabaseService.isAvailable) {
        await window.supabaseService.deleteVideo(this.deleteTargetId);
      }
      await window.dbService.runVideos('DELETE FROM videos WHERE id = ?', [this.deleteTargetId]);
      showToast('success', 'Video Deleted', 'The video and its statistics have been removed.');
      closeModal('modal-delete-confirm');
      this.deleteTargetId = null;
      await this.renderVideos();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', 'Delete Failed', err.message);
    }
  }
}

// Global Video Controller
window.videosCtrl = new VideosController();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('videos-tbody')) {
    window.videosCtrl.init();
  }
});
