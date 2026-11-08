# Master Prompt — Build Video Admin Website

Bạn là senior frontend developer. Hãy xây dựng một website admin quản lý video hoàn chỉnh theo yêu cầu dưới đây. Đây là dự án học Vibe Coding, ưu tiên code rõ ràng, dễ hiểu, dễ chỉnh sửa.

## Công nghệ bắt buộc
- HTML5, CSS3, JavaScript thuần (ES6+).
- SQLite chạy trong trình duyệt bằng `sql.js` (WASM).
- IndexedDB để lưu database giữa các lần refresh.
- Chart.js cho dashboard charts.
- Không backend, không API server, không Node.js/Express, không framework frontend.
- Giao diện Light Mode, nền trắng/sáng.

## Quan trọng
Browser không thể tự ghi file SQLite trực tiếp vào ổ đĩa. Hãy dùng SQL.js in-memory database + IndexedDB persistence và bổ sung import/export `.db`. Giải thích rõ đây là ứng dụng demo client-side. Không được tuyên bố authentication frontend là bảo mật production.

## Pages
1. `login.html`
2. `register.html`
3. `forgot-password.html`
4. `index.html` — Dashboard
5. `videos.html` — Video list + CRUD

## Dashboard
- KPI card: Total Videos, Total Views, Estimated Storage Used.
- Bar chart: Top 10 videos by views.
- Line chart: Views over time.
- Dropdown/segmented filter Daily / Monthly.
- Dữ liệu dashboard phải query từ SQLite, không hardcode.
- Empty state khi database chưa có dữ liệu.

## Video management
Table columns:
- ID
- Title
- Thumbnail
- Views
- Actions: Edit, Delete

Thêm:
- Search title
- Add Video
- Edit video modal/form
- Delete confirmation dialog
- Pagination
- Toast notifications
- Form validation

Video fields:
- title (required)
- description
- thumbnail_url
- video_url
- category
- views
- file_size_bytes
- duration_seconds

## Authentication demo
- Register: name, email, password, confirm password.
- Login: email, password.
- Forgot password: email + demo confirmation.
- Session demo bằng sessionStorage.
- Không gửi email thật.
- Không lưu password thật; đánh dấu rõ authentication chỉ phục vụ demo.

## SQLite
Logical DBs:
- `users.db`: users.
- `videos.db`: videos, video_categories, video_view_stats.

Dùng schema trong `03_DATABASE_SCHEMA.md`.
Seed data khoảng 10–15 videos, 4 categories, 30 ngày view stats. Chỉ seed một lần.

## Design
- Brand: VideoHub
- Background: #F7F8FA
- Cards: #FFFFFF
- Primary: #4F46E5
- Text: #111827
- Secondary text: #6B7280
- Border: #E5E7EB
- Rounded cards, subtle shadows, clean spacing.
- Sidebar + topbar cho admin pages.
- Responsive desktop/tablet/mobile.
- Dùng semantic HTML và accessible labels.

## Implementation quality
- Tách CSS và JavaScript thành file riêng.
- Tạo helper dùng chung cho database, auth, toast, formatting.
- Không duplicate code không cần thiết.
- Tất cả button/action phải hoạt động.
- Sau CRUD, refresh bảng, KPI và chart.
- Thêm fallback thumbnail.
- Format views (ví dụ 1.2K, 3.4M) và storage (MB/GB).
- Có loading/error/empty states.
- Không tạo backend hoặc API.
- Không giả định video được upload lên cloud. Storage chỉ là metadata của video.

## Deliverables
Tạo đầy đủ source code:
- HTML pages
- CSS
- JavaScript modules
- Database schema/seed logic
- README hướng dẫn chạy bằng VS Code Live Server

Trước khi kết thúc, tự kiểm tra các luồng:
- Register → Login → Dashboard
- Logout
- Add/Edit/Delete video
- Search/pagination
- Daily/Monthly chart switch
- Refresh browser vẫn còn dữ liệu
- Export/import SQLite DB

Nếu có chi tiết không thể thực hiện an toàn trong frontend-only, hãy giải thích và chọn phương án demo phù hợp thay vì giả lập rằng có backend.
