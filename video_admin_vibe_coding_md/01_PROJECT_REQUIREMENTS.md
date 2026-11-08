# Project Requirements — Video Admin

## 1. Mục tiêu
Tạo một website admin quản lý video với trải nghiệm trực quan, dễ sử dụng, responsive và Light Mode.

## 2. Công nghệ
- HTML5
- CSS3
- JavaScript thuần (ES6+)
- SQLite chạy trong browser bằng `sql.js` (WASM)
- IndexedDB để lưu database giữa các lần mở trình duyệt
- Chart.js cho biểu đồ
- Không sử dụng backend, server API, Node.js, PHP, Python hoặc framework frontend.

Có thể dùng CDN cho `sql.js` và Chart.js. Nếu ứng dụng cần chạy offline, tải thư viện về local thay vì CDN.

## 3. Các trang

### 3.1 Login
- Email
- Password
- Nút Sign in
- Link Forgot password
- Link Create account
- Hiển thị lỗi validation
- Sau khi đăng nhập demo thành công, chuyển đến Dashboard

### 3.2 Register
- Full name
- Email
- Password
- Confirm password
- Checkbox đồng ý điều khoản (demo)
- Nút Create account
- Link quay về Login
- Kiểm tra email trùng, password khớp, độ dài password

### 3.3 Forgot Password
- Email
- Nút Reset password
- Thông báo xác nhận yêu cầu
- Link quay về Login

Do không có backend/email service, trang Forgot Password chỉ mô phỏng giao diện và thông báo. Không gửi email reset thực tế.

### 3.4 Dashboard
KPI cards:
- Total Videos
- Total Views
- Storage Used

Charts:
- Bar chart: Top 10 videos by views
- Line chart: Views over time
- Bộ lọc line chart: Daily / Monthly
- Có trạng thái empty nếu database chưa có dữ liệu

KPI phải được tính từ database, không hardcode.

### 3.5 Video List
Bảng danh sách video gồm:
- ID
- Title
- Thumbnail
- Views
- Actions: Edit, Delete

Thêm các tiện ích:
- Search theo title
- Pagination hoặc page size
- Nút Add Video
- Sắp xếp theo title/views nếu phù hợp
- Xác nhận trước khi Delete
- Empty state khi chưa có video

### 3.6 Add/Edit Video
Có thể dùng modal hoặc trang riêng:
- Title
- Description (optional)
- Thumbnail URL hoặc chọn ảnh
- Video URL hoặc file metadata
- Category
- Views (demo/admin field)
- File size
- Save / Cancel

Không cần upload video lên server. Nếu chọn file local, chỉ lưu metadata và không giả định file được upload lên cloud.

## 4. CRUD
- Create video: thêm video vào SQLite.
- Read video: hiển thị danh sách và dashboard.
- Update video: chỉnh sửa thông tin.
- Delete video: xóa sau khi xác nhận.
- Sau mọi thay đổi, cập nhật KPI và chart.

## 5. User experience
- Toast notification khi thêm/sửa/xóa thành công hoặc lỗi.
- Form validation.
- Loading state khi khởi tạo database.
- Responsive cho desktop, tablet và mobile.
- Sidebar có thể thu gọn.
- Các trang admin yêu cầu trạng thái đăng nhập demo.

## 6. Điều kiện nghiệm thu
- Login/Register/Forgot Password hiển thị và validate.
- Dashboard lấy dữ liệu từ SQLite.
- Top 10 chart lấy đúng 10 video có views cao nhất.
- Daily/Monthly line chart thay đổi theo bộ lọc.
- Video CRUD hoạt động.
- Database được giữ lại sau refresh nhờ IndexedDB.
- Có chức năng export/import database nếu khả thi.
- Không có backend/API.
