# Hướng dẫn thiết lập Supabase Database

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

## Bước 2: Lấy thông tin kết nối
Sau khi dự án được tạo:

1. Vào **Settings** > **Database**
2. Tìm mục **"Connection string"**
3. Chọn tab **"URI"**
4. Copy chuỗi kết nối có dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
   ```
5. Thay `[YOUR-PASSWORD]` bằng mật khẩu bạn đã tạo ở Bước 1

## Bước 3: Cấu hình trong ứng dụng
1. Vào trang **Settings** trong ứng dụng
2. Tìm mục **"Database Configuration"**
3. Dán chuỗi kết nối vào ô **"Database URL"**
4. Nhấn **"Save"** để lưu cấu hình

## Bước 4: Kiểm tra kết nối
1. Nhấn nút **"Test Connection"** để kiểm tra
2. Nếu thành công, nhấn **"Initialize Database"** để tạo bảng
3. Dữ liệu local sẽ được đồng bộ lên Supabase

## Lưu ý quan trọng
- **Bảo mật**: Không chia sẻ chuỗi kết nối database với ai
- **Backup**: Supabase tự động backup, nhưng nên export dữ liệu định kỳ
- **Giới hạn**: Free tier có giới hạn 500MB storage và 2GB bandwidth/tháng
- **Performance**: Kết nối có thể chậm hơn local database do network latency

## Khắc phục sự cố

### Lỗi ENOTFOUND hoặc Connection Refused
1. **Database bị tạm dừng**: Supabase tự động tạm dừng database sau 1 tuần không hoạt động
   - Vào Supabase Dashboard → Project → Settings → Database
   - Nhấn "Resume" nếu database đang pause
   
2. **URL không chính xác**: 
   - Kiểm tra lại Project Reference ID
   - URL phải có dạng: `db.[PROJECT_ID].supabase.co`
   
3. **Mật khẩu có ký tự đặc biệt**:
   - Encode ký tự `@` thành `%40`
   - Encode ký tự `#` thành `%23`
   - Encode ký tự `?` thành `%3F`

### Các bước troubleshooting
1. Vào Supabase Dashboard → Your Project
2. Kiểm tra trạng thái database trong Settings → Database
3. Copy lại connection string mới từ "Connection Info"
4. Thử với `?sslmode=require` hoặc `?sslmode=disable`

### Lỗi thường gặp
- **ENOTFOUND**: Database hostname không tồn tại hoặc bị pause
- **ECONNREFUSED**: Database từ chối kết nối (firewall/network)
- **ETIMEDOUT**: Timeout kết nối (network chậm)
- **Authentication failed**: Sai username/password

## Hỗ trợ
Nếu gặp vấn đề, kiểm tra:
1. [Supabase Documentation](https://supabase.com/docs)
2. [Supabase Status Page](https://status.supabase.com/)