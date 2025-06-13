# Hướng dẫn thiết lập Supabase cho hệ thống quản lý garage

## Bước 1: Tạo dự án Supabase

1. Truy cập [supabase.com](https://supabase.com) và đăng nhập
2. Tạo dự án mới (New Project)
3. Chọn tên dự án và mật khẩu cơ sở dữ liệu
4. Chờ dự án được tạo (khoảng 2-3 phút)

## Bước 2: Thiết lập cơ sở dữ liệu

1. Vào dự án Supabase vừa tạo
2. Chọn **SQL Editor** từ menu bên trái
3. Tạo query mới bằng cách nhấn "New query"
4. Copy toàn bộ nội dung trong file `supabase-setup.sql` và paste vào
5. Nhấn **Run** để thực thi script

## Bước 3: Reset dữ liệu (nếu có lỗi đồng bộ)

**⚠️ QUAN TRỌNG**: Nếu gặp lỗi duplicate key hoặc foreign key constraint khi đồng bộ:

1. Vào **SQL Editor** trong Supabase
2. Tạo query mới
3. Copy toàn bộ nội dung trong file `supabase-reset.sql` và paste vào
4. Nhấn **Run** để xóa sạch dữ liệu cũ
5. Kiểm tra kết quả - tất cả bảng phải có 0 records

## Bước 4: Lấy thông tin kết nối

1. Vào **Settings** → **API** trong dự án Supabase
2. Copy 2 thông tin sau:
   - **Project URL** (ví dụ: https://xxxxx.supabase.co)
   - **anon public key** (key rất dài bắt đầu bằng "eyJ...")

## Bước 5: Cấu hình trong ứng dụng

1. Mở ứng dụng garage management
2. Vào **Cài Đặt** → tab **Supabase**
3. Điền thông tin:
   - **Supabase URL**: Project URL từ bước 4
   - **Supabase Key**: anon public key từ bước 4
4. Bật "Bật đồng bộ dữ liệu tự động"
5. Nhấn "Kiểm tra kết nối" để test

## Bước 6: Đồng bộ dữ liệu

1. **LẦN ĐẦU**: Nhấn "Đồng bộ ngay" để upload dữ liệu hiện tại lên Supabase
2. Hệ thống sẽ tự động đồng bộ mỗi 5 phút
3. Mở trình duyệt/thiết bị khác và cấu hình Supabase tương tự
4. Dữ liệu sẽ tự động tải về khi khởi động ứng dụng

## Lưu ý quan trọng

### Về bảo mật:
- **anon public key** có thể được chia sẻ, nhưng đảm bảo Row Level Security đã được bật
- Không chia sẻ **service_role key** với ai

### Về đồng bộ:
- Lần đầu mở ứng dụng trên thiết bị mới: dữ liệu sẽ được tải từ Supabase
- Khi thêm/sửa/xóa dữ liệu: tự động đồng bộ lên Supabase
- Đồng bộ định kỳ mỗi 5 phút khi có kết nối internet

### Khắc phục sự cố:
- Nếu không tải được dữ liệu: kiểm tra kết nối internet và thông tin Supabase
- Nếu lỗi permission: đảm bảo đã chạy script setup đúng cách
- Nếu dữ liệu không đồng bộ: thử "Đồng bộ ngay" trong cài đặt