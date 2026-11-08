# Video Admin Dashboard — Vibe Coding Brief

## Mục tiêu
Xây dựng website admin quản lý video với giao diện sáng (Light Mode), sử dụng **HTML, CSS, JavaScript thuần** và SQLite. Không xây dựng backend/server API.

## Tài liệu dự án
- `01_PROJECT_REQUIREMENTS.md`: yêu cầu chức năng và phạm vi.
- `02_UI_UX_SPEC.md`: cấu trúc giao diện, layout, phong cách.
- `03_DATABASE_SCHEMA.md`: schema SQLite và dữ liệu mẫu.
- `04_TECHNICAL_GUIDE.md`: kiến trúc frontend, thư viện và giới hạn kỹ thuật.
- `05_VIBE_CODING_PROMPT.md`: prompt tổng hợp để đưa vào công cụ Vibe Coding.

## Cách sử dụng
1. Đọc các file Markdown.
2. Mở `05_VIBE_CODING_PROMPT.md`, copy prompt vào Antigravity hoặc công cụ Vibe Coding.
3. Cho AI đọc thêm các file yêu cầu/schema nếu công cụ hỗ trợ context files.
4. Kiểm tra các luồng CRUD và dữ liệu demo sau khi code được tạo.

## Lưu ý quan trọng về SQLite và không có backend
Trình duyệt không thể tự truy cập hoặc ghi trực tiếp các file `users.db`, `videos.db` trên ổ đĩa bằng HTML/CSS/JavaScript thông thường.

Với yêu cầu **không backend**, phương án khả thi là dùng `sql.js` (SQLite được biên dịch sang WebAssembly) chạy ngay trong trình duyệt:
- Khởi tạo database trong browser.
- Lưu trạng thái database bằng IndexedDB.
- Có thể import/export database SQLite (`.db`) thông qua thao tác của người dùng.

Vì vậy, `users.db`, `videos.db` và các database liên quan được xem là database SQLite client-side được khởi tạo/nhập/xuất, không phải các file được server quản lý tự động.

**Cảnh báo:** xác thực người dùng hoàn toàn ở frontend chỉ phù hợp demo/học tập. Không thể bảo vệ tài khoản, mật khẩu hoặc dữ liệu trước người dùng có quyền truy cập trình duyệt. Không dùng cho production hoặc dữ liệu nhạy cảm.
