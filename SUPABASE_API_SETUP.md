# Hướng dẫn thiết lập Supabase với JavaScript API

## Bước 1: Tạo dự án Supabase
1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard)
2. Đăng nhập hoặc tạo tài khoản mới
3. Nhấn **"New project"** để tạo dự án mới
4. Chọn Organization (hoặc tạo mới nếu chưa có)
5. Điền thông tin dự án:
   - **Name**: Tên dự án (ví dụ: "garage-management")
   - **Database Password**: Tạo mật khẩu mạnh và lưu lại
   - **Region**: Chọn khu vực gần nhất (Singapore cho Việt Nam)
6. Nhấn **"Create new project"**

## Bước 2: Lấy thông tin API
Sau khi dự án được tạo:

1. Vào **Settings** > **API**
2. Copy 2 thông tin quan trọng:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: Chuỗi JWT dài bắt đầu bằng `eyJhbGciOiJIUzI1NiIs...`

## Bước 3: Cấu hình trong ứng dụng
1. Vào trang **Settings** trong ứng dụng
2. Chọn tab **"Cơ Sở Dữ Liệu"**
3. Điền thông tin:
   - **Supabase Project URL**: Dán URL từ bước 2
   - **Supabase Anon Key**: Dán anon key từ bước 2
4. Tích **"Bật đồng bộ dữ liệu tự động"**
5. Nhấn **"Kiểm tra kết nối"** để test

## Bước 4: Chạy SQL script để tạo database
1. Trong Supabase Dashboard, vào **SQL Editor** (biểu tượng </> ở sidebar)
2. Nhấn **"New query"**
3. Copy toàn bộ nội dung từ đầu đến cuối file `supabase-setup.sql` 
4. Paste vào SQL Editor và nhấn **"Run"** (nút màu xanh)
5. Đợi vài giây và kiểm tra message "Database setup completed successfully!"
6. Kiểm tra tab **Table Editor** để xác nhận các bảng đã được tạo

## Bước 5: Test kết nối trong ứng dụng
1. Vào Settings → tab "Cơ Sở Dữ Liệu"
2. Nhấn **"Kiểm tra kết nối"** để test
3. Nhấn **"Đồng bộ lên Supabase"** để upload dữ liệu local

## Ưu điểm của phương pháp API
- **Ổn định**: Không bị lỗi network như PostgreSQL direct connection
- **Đơn giản**: Chỉ cần Project URL và API Key
- **Bảo mật**: Sử dụng JWT token thay vì database password
- **Nhanh**: JavaScript client tối ưu cho web applications

## Tính năng hỗ trợ
- ✅ Kiểm tra kết nối
- ✅ Tự động khởi tạo database tables
- ✅ Đồng bộ dữ liệu lên cloud
- ✅ Tải dữ liệu từ cloud về local
- ✅ Realtime updates (future feature)

## Khắc phục sự cố
- **Invalid API key**: Kiểm tra lại anon key từ Settings > API
- **Project not found**: Kiểm tra lại Project URL
- **Permission denied**: Đảm bảo RLS (Row Level Security) được cấu hình đúng

## Lưu ý quan trọng
- **Free tier**: 500MB storage, 2GB bandwidth/tháng
- **Pause**: Database tự động pause sau 1 tuần không hoạt động
- **Backup**: Nên export dữ liệu định kỳ để backup
- **Security**: Anon key có thể public, nhưng cần cấu hình RLS cho bảo mật

## Hỗ trợ
Nếu gặp vấn đề:
1. [Supabase Documentation](https://supabase.com/docs)
2. [JavaScript Client Guide](https://supabase.com/docs/reference/javascript)
3. [Supabase Status Page](https://status.supabase.com/)