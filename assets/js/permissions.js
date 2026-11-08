/**
 * VideoHub - Permissions (Phân Quyền) Module Controller
 * Role-Based Access Control (RBAC): ADMIN and USER
 * Only ADMIN accounts can access and modify user roles.
 */

class PermissionsController {
  constructor() {
    this.searchTerm = '';
    this.filterRole = 'all';
    this.modalTargetUserId = null;
    this.selectedModalRole = 'USER';
  }

  async init() {
    // 1. Check basic authentication
    const user = window.authService.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // 2. Initialize Database & Supabase probe
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
      showToast('error', 'Lỗi cơ sở dữ liệu', err.message);
      return;
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    // 3. Enforce Role: Only ADMIN allowed
    const currentUserRole = (user.role || 'USER').toUpperCase();
    const authorizedContainer = document.getElementById('permissions-authorized-content');
    const deniedContainer = document.getElementById('permissions-access-denied');

    if (currentUserRole !== 'ADMIN') {
      if (authorizedContainer) authorizedContainer.style.display = 'none';
      if (deniedContainer) deniedContainer.style.display = 'block';
      return;
    }

    if (authorizedContainer) authorizedContainer.style.display = 'block';
    if (deniedContainer) deniedContainer.style.display = 'none';

    // 4. Setup event listeners
    this.setupEventListeners();

    // 5. Render stats and user list
    await this.renderPermissions();
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-user-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.renderUsersTable();
      });
    }

    // Filter by role
    const filterSelect = document.getElementById('filter-user-role');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filterRole = e.target.value;
        this.renderUsersTable();
      });
    }

    // Role option cards inside Edit Role Modal
    const roleOptions = document.querySelectorAll('.role-option-card[data-role]');
    roleOptions.forEach(card => {
      card.addEventListener('click', () => {
        roleOptions.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedModalRole = card.getAttribute('data-role');
      });
    });

    // Save button in Edit Role Modal
    const btnSaveModalRole = document.getElementById('btn-save-modal-role');
    if (btnSaveModalRole) {
      btnSaveModalRole.addEventListener('click', async () => {
        await this.handleSaveModalRole();
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
          await this.renderPermissions();
        } catch (err) {
          showToast('error', 'Đồng bộ thất bại', err.message);
        } finally {
          syncSupaBtn.disabled = false;
          syncSupaBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đẩy dữ liệu lên Supabase';
        }
      });
    }
  }

  // Get users matching search & role filters
  async getFilteredUsers() {
    let users = [];

    // 1. Try Supabase first
    if (window.supabaseService && window.supabaseService.isAvailable) {
      const supaUsers = await window.supabaseService.getAllUsers();
      if (supaUsers && supaUsers.length) {
        users = supaUsers;
      }
    }

    // 2. Fallback to Local SQLite
    if (!users.length && window.dbService.usersDb) {
      users = window.dbService.query(window.dbService.usersDb, `
        SELECT id, full_name, email, role, created_at, updated_at FROM users
      `);
    }

    // Apply client filters
    return users.filter(user => {
      const matchesSearch = !this.searchTerm ||
        (user.full_name && user.full_name.toLowerCase().includes(this.searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(this.searchTerm));

      const matchesRole = this.filterRole === 'all' ||
        (user.role && user.role.toUpperCase() === this.filterRole.toUpperCase());

      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
      return a.id - b.id;
    });
  }

  // Render stats and table
  async renderPermissions() {
    await this.renderStats();
    await this.renderUsersTable();
  }

  // Render Role & Account Summary KPIs
  async renderStats() {
    let users = [];
    if (window.supabaseService && window.supabaseService.isAvailable) {
      users = await window.supabaseService.getAllUsers();
    }
    if (!users.length && window.dbService.usersDb) {
      users = window.dbService.query(window.dbService.usersDb, 'SELECT id, role FROM users');
    }

    const totalUsers = users.length;
    const adminCount = users.filter(u => (u.role || '').toUpperCase() === 'ADMIN').length;
    const standardUserCount = users.filter(u => (u.role || '').toUpperCase() === 'USER').length;

    const statTotalEl = document.getElementById('stat-total-users');
    const statAdminEl = document.getElementById('stat-admin-users');
    const statRegularEl = document.getElementById('stat-regular-users');

    if (statTotalEl) statTotalEl.textContent = totalUsers;
    if (statAdminEl) statAdminEl.textContent = adminCount;
    if (statRegularEl) statRegularEl.textContent = standardUserCount;
  }

  // Render Users Table
  async renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    const emptyState = document.getElementById('users-empty-state');
    const tableContainer = document.getElementById('users-table-container');
    const resultsCountEl = document.getElementById('users-results-count');

    const users = await this.getFilteredUsers();
    const currentUser = window.authService.getCurrentUser();

    if (resultsCountEl) {
      resultsCountEl.textContent = `Hiển thị ${users.length} tài khoản`;
    }

    if (!users.length) {
      if (tbody) tbody.innerHTML = '';
      if (tableContainer) tableContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = users.map(user => {
      const isCurrent = currentUser && currentUser.id === user.id;
      const isAdmin = (user.role || 'USER').toUpperCase() === 'ADMIN';
      const initials = (user.full_name || 'User')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      return `
        <tr>
          <td style="font-weight: 600; color: var(--text-muted); width: 60px;">#${user.id}</td>
          <td>
            <div class="user-table-cell">
              <div class="user-table-avatar ${isAdmin ? 'admin' : 'user'}">
                ${initials}
              </div>
              <div class="user-details">
                <h4>
                  ${user.full_name} 
                  ${isCurrent ? '<span style="font-size: 0.7rem; color: var(--primary); font-weight: 600; margin-left: 4px;">(Bạn)</span>' : ''}
                </h4>
                <p>${user.email}</p>
              </div>
            </div>
          </td>
          <td>
            <span class="role-badge ${isAdmin ? 'admin' : 'user'}">
              <i class="fa-solid ${isAdmin ? 'fa-shield-halved' : 'fa-user'}"></i>
              ${user.role}
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">
            ${formatDate(user.created_at)}
          </td>
          <td>
            <select 
              class="role-select ${isAdmin ? 'is-admin' : ''}" 
              data-user-id="${user.id}"
              onchange="window.permissionsCtrl.handleInlineRoleChange(${user.id}, this.value)"
              title="Thay đổi quyền tài khoản"
            >
              <option value="ADMIN" ${isAdmin ? 'selected' : ''}>ADMIN</option>
              <option value="USER" ${!isAdmin ? 'selected' : ''}>USER</option>
            </select>
          </td>
          <td style="text-align: right; padding-right: 20px;">
            <button 
              type="button" 
              class="btn btn-secondary btn-sm"
              onclick="window.permissionsCtrl.openEditModal(${user.id})"
              title="Chi tiết & Thay đổi quyền"
            >
              <i class="fa-solid fa-user-pen"></i> Chỉnh sửa
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Handle direct inline select change
  async handleInlineRoleChange(userId, newRole) {
    const currentUser = window.authService.getCurrentUser();
    const isSelf = currentUser && currentUser.id === userId;

    if (isSelf && newRole === 'USER') {
      const confirmDemote = confirm('Cảnh báo: Bạn đang tự hạ quyền ADMIN của chính mình. Sau khi hạ quyền, bạn sẽ không thể truy cập trang Phân Quyền nữa. Bạn có chắc chắn không?');
      if (!confirmDemote) {
        this.renderUsersTable();
        return;
      }
    }

    try {
      // 1. Update in Supabase if connected
      if (window.supabaseService && window.supabaseService.isAvailable) {
        await window.supabaseService.updateUserRole(userId, newRole);
      }

      // 2. Also update local SQLite
      const targetUser = await window.dbService.updateUserRole(userId, newRole);
      showToast('success', 'Cập nhật thành công', `Đã chuyển tài khoản ${targetUser.email} sang quyền [${newRole}].`);

      // If user changed their own role, update local session
      if (isSelf) {
        currentUser.role = newRole;
        window.authService.setSession(currentUser);
        setTimeout(() => {
          window.location.reload();
        }, 800);
        return;
      }

      await this.renderPermissions();
    } catch (err) {
      showToast('error', 'Không thể đổi quyền', err.message);
      await this.renderUsersTable();
    }
  }

  // Open Edit Role Modal
  openEditModal(userId) {
    const db = window.dbService.usersDb;
    const users = window.dbService.query(db, `SELECT id, full_name, email, role FROM users WHERE id = ? LIMIT 1`, [userId]);
    if (!users.length) return;

    const user = users[0];
    this.modalTargetUserId = user.id;
    this.selectedModalRole = (user.role || 'USER').toUpperCase();

    document.getElementById('modal-edit-user-name').textContent = user.full_name;
    document.getElementById('modal-edit-user-email').textContent = user.email;

    // Set active option card in modal
    document.querySelectorAll('.role-option-card').forEach(card => {
      const cardRole = card.getAttribute('data-role');
      if (cardRole === this.selectedModalRole) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    openModal('modal-edit-role');
  }

  // Handle Save in Modal
  async handleSaveModalRole() {
    if (!this.modalTargetUserId) return;

    const currentUser = window.authService.getCurrentUser();
    const isSelf = currentUser && currentUser.id === this.modalTargetUserId;

    if (isSelf && this.selectedModalRole === 'USER') {
      const confirmDemote = confirm('Cảnh báo: Bạn đang tự hạ quyền ADMIN của chính mình. Sau khi hạ quyền, bạn sẽ mất quyền quản lý Phân Quyền. Bạn có muốn tiếp tục?');
      if (!confirmDemote) return;
    }

    try {
      if (window.supabaseService && window.supabaseService.isAvailable) {
        await window.supabaseService.updateUserRole(this.modalTargetUserId, this.selectedModalRole);
      }
      const updated = await window.dbService.updateUserRole(this.modalTargetUserId, this.selectedModalRole);
      showToast('success', 'Thành công', `Đã lưu vai trò ${this.selectedModalRole} cho ${updated.email}.`);
      closeModal('modal-edit-role');

      if (isSelf) {
        currentUser.role = this.selectedModalRole;
        window.authService.setSession(currentUser);
        setTimeout(() => {
          window.location.reload();
        }, 800);
        return;
      }

      await this.renderPermissions();
    } catch (err) {
      showToast('error', 'Lỗi phân quyền', err.message);
    }
  }
}

// Global Permissions Controller Instance
window.permissionsCtrl = new PermissionsController();
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('users-tbody')) {
    window.permissionsCtrl.init();
  }
});
