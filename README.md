# VideoHub — Modern Video Admin Dashboard

Website quản trị video hiện đại (Light Mode) xây dựng hoàn toàn bằng **HTML5, CSS3, JavaScript thuần (ES6+)** kết hợp với **SQLite chạy trong trình duyệt thông qua WebAssembly (`sql.js`)** và lưu trữ bền vững bằng **IndexedDB**. 

> [!NOTE]
> Dự án hoạt động 100% ở phía client (trình duyệt), không cần bất kỳ backend server hay API nào (Node.js, Express, Python, PHP, v.v.).

---

## 🚀 Tính năng nổi bật

### 1. Quản lý cơ sở dữ liệu SQLite trong trình duyệt (Client-Side SQLite)
- Sử dụng **`sql.js` (WebAssembly)** để thực thi câu lệnh SQL trực tiếp trong browser.
- **Tách biệt 2 cơ sở dữ liệu logic**:
  - `users.db`: Bảng `users` quản lý tài khoản quản trị demo.
  - `videos.db`: Bảng `video_categories`, `videos`, `video_view_stats`.
- **Tự động lưu trữ (Persistence)**: Trạng thái binary của SQLite được đồng bộ liên tục vào **IndexedDB**, giữ nguyên toàn bộ dữ liệu khi refresh hoặc đóng trình duyệt.
- **Import / Export SQLite (`.db`)**: Cho phép người dùng tải file `videos.db` hoặc `users.db` về máy hoặc tải lên file SQLite từ máy tính để phân tích.
- **Khôi phục dữ liệu mẫu (Seed Data)**: Tự động khởi tạo 4 danh mục và 14 video mẫu cùng dữ liệu lượt xem 30 ngày trong lần đầu mở trang. Có nút reset dữ liệu mẫu trong **Database Tools**.

### 2. Dashboard & Phân tích số liệu (Chart.js)
- **3 KPI Cards động**:
  - **Total Videos**: Tổng số video trong cơ sở dữ liệu (`COUNT(*)`).
  - **Total Views**: Tổng lượt xem thực tế (`SUM(views)`).
  - **Estimated Storage**: Dung lượng video ước tính từ metadata (`SUM(file_size_bytes)` quy đổi KB/MB/GB).
- **Biểu đồ cột (Bar Chart)**: Top 10 video có lượt xem cao nhất.
- **Biểu đồ đường (Line Chart)**: Thống kê lượt xem theo thời gian (Views Over Time).
- **Bộ lọc thời gian**: Chuyển đổi linh hoạt giữa **Daily (theo ngày)** và **Monthly (theo tháng)**.
- **Trạng thái rỗng (Empty state)**: Xử lý giao diện trực quan khi cơ sở dữ liệu trống.

### 3. Quản lý thư viện Video (CRUD)
- **Danh sách video**: Hiển thị dạng bảng gồm Thumbnail, Tiêu đề, Thời lượng, Danh mục, Lượt xem, Dung lượng, Ngày tạo, Nút thao tác.
- **Tìm kiếm theo tiêu đề**: Tìm kiếm trực tiếp theo từ khóa.
- **Bộ lọc danh mục**: Lọc theo Tutorial, Entertainment, Marketing, Education.
- **Sắp xếp linh hoạt**: Mới nhất, Cũ nhất, Nhiều lượt xem nhất, Ít lượt xem nhất, Tên A-Z.
- **Phân trang (Pagination)**: Hỗ trợ chọn số lượng mục hiển thị (5, 10, 20 mục / trang).
- **Thêm video mới (Create)**: Modal nhập tiêu đề, danh mục, thumbnail URL (có live preview & nút chọn nhanh ảnh mẫu), lượt xem ban đầu, dung lượng, thời lượng, mô tả.
- **Chỉnh sửa video (Update)**: Nạp thông tin hiện tại vào modal để cập nhật.
- **Xóa video (Delete)**: Hộp thoại xác nhận trước khi xóa, tự động xóa liên đới (Cascade) dữ liệu thống kê `video_view_stats`.

### 4. Xác thực & Điều hướng (Demo Authentication)
- **Đăng nhập (`login.html`)**: Đăng nhập với tài khoản admin trong `users.db`, có nút 1-click tự động điền tài khoản demo.
- **Đăng ký (`register.html`)**: Kiểm tra trùng email, kiểm tra độ dài mật khẩu, lưu tài khoản mới vào SQLite.
- **Quên mật khẩu (`forgot-password.html`)**: Xác nhận email và mô phỏng thông báo khôi phục mật khẩu.
- **Bảo vệ route (Route Guard)**: Tự động chuyển hướng về trang `login.html` nếu chưa đăng nhập.

> [!WARNING]
> Xác thực hoàn toàn ở frontend chỉ phục vụ mục đích học tập và trình diễn (demo). Trình duyệt không thể bảo vệ mật khẩu hoặc dữ liệu an toàn như một backend thực tế.

### 5. Module Phân Quyền (Permissions / RBAC) — [Module #1]
- **2 Vai trò cốt lõi**: `ADMIN` và `USER`.
- **Kiểm soát truy cập (Access Control)**:
  - Chỉ tài khoản có vai trò **ADMIN** mới có quyền xem và chỉnh sửa trang **Phân Quyền** (`permissions.html`).
  - Tài khoản **USER** khi cố tình truy cập sẽ hiển thị giao diện *Access Denied* (Quyền truy cập bị từ chối) kèm nút quay về Dashboard.
- **Thao tác thay đổi quyền**:
  - Đổi vai trò trực tiếp thông qua dropdown chọn nhanh (inline select) hoặc mở modal chi tiết.
  - Ngăn chặn việc tự xóa/hạ quyền admin cuối cùng trong hệ thống (bảo vệ an toàn).
  - Cập nhật tức thì vào `users.db` và lưu giữ trong IndexedDB.
- **10 Tài khoản USER mẫu**:
  - `user1@demo.com` đến `user10@demo.com` (mật khẩu mặc định: `user123`) để kiểm tra phân quyền.

### 6. Kết nối Supabase Cloud Database (Mới)
- **Tích hợp Supabase Real-Time**: Kết nối trực tiếp tới project `https://pmxvshdtcwxbqjdmfyll.supabase.co` bằng Public API key.
- **File kịch bản khởi tạo**: Cung cấp file [supabase_schema.sql](file:///D:/HA/Admin%20Video/supabase_schema.sql) gồm đầy đủ cấu trúc bảng (`users`, `video_categories`, `videos`, `video_view_stats`), chính sách Row Level Security (RLS), và seed data.
- **Cơ chế hoạt động linh hoạt (Hybrid Sync & Fallback)**:
  - Khi Supabase có sẵn và đã tạo bảng: Website tự động đọc/ghi dữ liệu thời gian thực lên Supabase Cloud.
  - Khi offline hoặc khi đang thiết lập: Tự động dùng bộ đệm SQLite + IndexedDB nội bộ để đảm bảo giao diện luôn mượt mà.
  - Hỗ trợ nút **"Đẩy dữ liệu lên Supabase"** trong modal Database Tools để đồng bộ 1-click toàn bộ dữ liệu nội bộ lên cloud.

### 7. Chức năng Quên mật khẩu qua Supabase Auth (Mới)
- **Tích hợp Supabase Auth Recovery**: Gọi trực tiếp `supabase.auth.resetPasswordForEmail()` gửi email khôi phục mật khẩu có liên kết an toàn tới hòm thư của người dùng.
- **Trang đặt mật khẩu mới ([update-password.html](file:///D:/HA/Admin%20Video/update-password.html))**: Tự động nhận diện phiên khôi phục (recovery token) từ Supabase Auth, cho phép người dùng nhập mật khẩu mới và xác nhận mật khẩu.
- **Đồng bộ đa tầng**: Khi người dùng đổi mật khẩu, hệ thống cập nhật đồng thời lên Supabase `auth.users`, bảng `public.users` và cơ sở dữ liệu SQLite cục bộ.
- **Hỗ trợ chế độ thử nghiệm**: Có sẵn nút mở nhanh trang đặt mật khẩu cho các tài khoản mẫu (như `admin@videohub.com`) để kiểm thử ngay lập tức mà không cần kiểm tra email thật.

---

## 📂 Cấu trúc thư mục

```text
Admin Video/
├── index.html               # Trang Dashboard tổng quan & biểu đồ
├── videos.html              # Trang quản lý video & các chức năng CRUD
├── permissions.html         # [Module #1] Trang Quản lý Phân Quyền (ADMIN & USER)
├── login.html               # Trang đăng nhập (có nút nạp nhanh tài khoản Admin / User)
├── register.html            # Trang đăng ký
├── forgot-password.html     # Trang yêu cầu khôi phục mật khẩu qua Supabase Auth
├── update-password.html     # Trang đặt lại mật khẩu mới từ link email Supabase
├── Supabase.txt             # Thông tin dự án Supabase (URL, Public Key)
├── supabase_schema.sql      # Script SQL khởi tạo bảng, RLS và dữ liệu mẫu trên Supabase
├── assets/
│   ├── css/
│   │   └── style.css        # Toàn bộ giao diện Light Mode, Responsive
│   ├── js/
│   │   ├── supabase.js      # Module kết nối và đồng bộ Supabase Cloud
│   │   ├── database.js      # Module quản lý sql.js (WASM) & IndexedDB (users.db & videos.db)
│   │   ├── auth.js          # Module xác thực demo & route guard theo vai trò (RBAC)
│   │   ├── permissions.js   # [Module #1] Controller quản lý phân quyền tài khoản
│   │   ├── dashboard.js     # Module tính toán KPI & render Chart.js
│   │   ├── videos.js        # Module CRUD video, search, filter, pagination
│   │   └── app.js           # Utilities dùng chung (Toast, Formatter, Modal)
│   └── images/
│       └── placeholder.svg  # Ảnh thumbnail dự phòng khi URL lỗi
└── README.md
```

---

## 🛠️ Hướng dẫn khởi chạy

Do trình duyệt chặn tải WebAssembly (`.wasm`) trực tiếp từ giao thức `file:///`, bạn cần chạy ứng dụng qua một máy chủ tĩnh (static file server).

### Cách 1: Sử dụng VS Code Live Server (Khuyên dùng)
1. Mở thư mục `D:\HA\Admin Video` bằng **Visual Studio Code**.
2. Cài đặt extension **Live Server** (của Ritwick Dey).
3. Nhấp chuột phải vào file `login.html` hoặc `index.html` và chọn **Open with Live Server**.
4. Trình duyệt sẽ tự động mở tại địa chỉ `http://127.0.0.1:5500/login.html`.

### Cách 2: Sử dụng Python HTTP Server
Mở terminal tại thư mục dự án và chạy:
```bash
python -m http.server 3000
```
Sau đó truy cập `http://localhost:3000/login.html`.

### Cách 3: Sử dụng Node.js `npx serve`
```bash
npx serve .
```

---

## 🔑 Thông tin đăng nhập mặc định

| Vai trò | Email | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@videohub.com` | `admin123` | Toàn quyền quản trị, chỉnh sửa vai trò, xem Dashboard & Video |
| **USER** | `user1@demo.com` ... `user10@demo.com` | `user123` | Người dùng thường, quản lý video, **không thể** vào trang Phân Quyền |
| **Nút bấm nhanh** | Có sẵn 2 nút **"Đăng nhập ADMIN"** và **"Đăng nhập USER"** trên trang `login.html` | | |

---

## ⚡ Hướng dẫn cài đặt Supabase Cloud Database

Nếu bạn muốn lưu trữ dữ liệu thực tế trên Cloud thay vì chỉ lưu cục bộ trong trình duyệt:
1. Mở trang quản trị dự án Supabase: [https://supabase.com/dashboard/project/pmxvshdtcwxbqjdmfyll](https://supabase.com/dashboard/project/pmxvshdtcwxbqjdmfyll)
2. Chọn menu **SQL Editor** ở cột bên trái.
3. Bấm **New Query**, mở file [supabase_schema.sql](file:///D:/HA/Admin%20Video/supabase_schema.sql), sao chép toàn bộ nội dung dán vào và bấm **Run**.
4. Mở website và xem góc dưới Sidebar chuyển sang **🟢 Supabase Cloud: Đã kết nối**. Mọi thao tác thêm/sửa/xóa video và phân quyền sẽ được đồng bộ trực tiếp lên Cloud!
