/**
 * VideoHub - Authentication Service (Client-Side Demo)
 * Manages user sessions, registration, login, and access control.
 *
 * NOTE: As noted in project requirements, frontend-only authentication
 * is for educational/demo purposes only and not for production security.
 */

const AUTH_STORAGE_KEY = 'videohub_session';

class AuthService {
  // Get current active session
  getCurrentUser() {
    try {
      const data = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // Set session
  setSession(user) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      id: user.id,
      email: user.email,
      fullName: user.full_name || user.fullName || 'Admin User',
      role: (user.role || 'USER').toUpperCase(),
      loginTime: new Date().toISOString()
    }));
  }

  // Clear session
  logout() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = 'login.html';
  }

  // Check role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && (user.role || '').toUpperCase() === role.toUpperCase();
  }

  // Login verification
  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Try Supabase Cloud Login if available
    if (window.supabaseService && window.supabaseService.isAvailable) {
      try {
        const supaUser = await window.supabaseService.getUserByEmail(cleanEmail);
        if (supaUser) {
          if (supaUser.password_hash !== cleanPassword) {
            throw new Error('Mật khẩu không chính xác.');
          }
          this.setSession(supaUser);
          return supaUser;
        }
      } catch (err) {
        if (err.message.includes('Mật khẩu')) throw err;
        console.warn('[Auth] Supabase login error, falling back to local SQLite:', err);
      }
    }

    // 2. Fallback to Local SQLite
    if (!window.dbService.isInitialized) {
      await window.dbService.init();
    }

    const sql = `SELECT id, full_name, email, password_hash, role FROM users WHERE LOWER(email) = ? LIMIT 1`;
    const users = window.dbService.query(window.dbService.usersDb, sql, [cleanEmail]);

    if (!users || users.length === 0) {
      throw new Error('Email không tồn tại. Vui lòng đăng ký hoặc sử dụng tài khoản demo.');
    }

    const user = users[0];
    if (user.password_hash !== cleanPassword) {
      throw new Error('Mật khẩu không chính xác. Mặc định là "admin123" hoặc "user123".');
    }

    this.setSession(user);
    return user;
  }

  // Register new demo user
  async register(fullName, email, password) {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Register in Supabase if available
    if (window.supabaseService && window.supabaseService.isAvailable) {
      try {
        const existing = await window.supabaseService.getUserByEmail(cleanEmail);
        if (existing) {
          throw new Error('Email này đã được đăng ký trên Supabase. Vui lòng đăng nhập.');
        }
        await window.supabaseService.registerUser({
          full_name: cleanName,
          email: cleanEmail,
          password_hash: cleanPassword,
          role: 'USER'
        });
      } catch (err) {
        if (err.message.includes('đã được đăng ký')) throw err;
        console.warn('[Auth] Supabase register error, syncing locally:', err);
      }
    }

    // 2. Also register in local SQLite for offline access
    if (!window.dbService.isInitialized) {
      await window.dbService.init();
    }

    const checkSql = `SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`;
    const existing = window.dbService.query(window.dbService.usersDb, checkSql, [cleanEmail]);

    if (existing.length === 0) {
      const insertSql = `
        INSERT INTO users (full_name, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'USER', datetime('now'))
      `;
      await window.dbService.runUsers(insertSql, [cleanName, cleanEmail, cleanPassword]);
    }

    return {
      email: cleanEmail,
      full_name: cleanName,
      role: 'USER'
    };
  }

  // Forgot password demo simulation
  async simulateForgotPassword(email) {
    if (!window.dbService.isInitialized) {
      await window.dbService.init();
    }

    const cleanEmail = email.trim().toLowerCase();
    const checkSql = `SELECT id, full_name FROM users WHERE LOWER(email) = ? LIMIT 1`;
    const users = window.dbService.query(window.dbService.usersDb, checkSql, [cleanEmail]);

    if (!users.length) {
      throw new Error('No account found with this email address.');
    }

    return users[0];
  }

  // Reset user password
  async resetPassword(email, newPassword) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    let success = false;

    // 1. Update in Supabase
    if (window.supabaseService && window.supabaseService.isAvailable) {
      try {
        await window.supabaseService.client
          .from('users')
          .update({ password_hash: cleanPassword, updated_at: new Date().toISOString() })
          .eq('email', cleanEmail);
        success = true;
      } catch (err) {
        console.warn('[Auth] Supabase reset error:', err);
      }
    }

    // 2. Update in local SQLite
    if (!window.dbService.isInitialized) {
      await window.dbService.init();
    }
    const checkSql = `SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`;
    const users = window.dbService.query(window.dbService.usersDb, checkSql, [cleanEmail]);
    if (users.length > 0) {
      await window.dbService.runUsers(
        "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        [cleanPassword, users[0].id]
      );
      success = true;
    }

    if (!success) {
      throw new Error('Không tìm thấy tài khoản với email này.');
    }
    return true;
  }

  // Route Guard with optional Role check
  guardRoute(requiresAuth = true, requiredRole = null) {
    const user = this.getCurrentUser();
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes('login.html') || path.includes('register.html') || path.includes('forgot-password.html') || path.includes('update-password.html');

    if (requiresAuth && !user) {
      // Not authenticated, redirect to login
      window.location.href = 'login.html';
      return false;
    }

    if (!requiresAuth && isAuthPage && user) {
      // Already logged in, redirect to dashboard
      window.location.href = 'index.html';
      return false;
    }

    // Role check if required
    if (user && requiredRole) {
      const userRole = (user.role || 'USER').toUpperCase();
      if (userRole !== requiredRole.toUpperCase()) {
        return false;
      }
    }

    // Update UI elements with user info if available
    if (user) {
      document.querySelectorAll('.user-name').forEach(el => el.textContent = user.fullName);
      document.querySelectorAll('.user-avatar').forEach(el => {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        el.textContent = initials || 'AD';
      });
      document.querySelectorAll('.user-role').forEach(el => {
        el.textContent = user.role === 'ADMIN' ? 'Administrator' : 'Standard User';
      });
    }

    return true;
  }
}

// Global Auth Instance
window.authService = new AuthService();
