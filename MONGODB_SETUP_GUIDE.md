# Hướng dẫn thiết lập MongoDB cho hệ thống quản lý garage

## Bước 1: Tạo tài khoản MongoDB Atlas

1. Truy cập [MongoDB Atlas](https://www.mongodb.com/atlas) và đăng ký tài khoản miễn phí
2. Tạo organization mới (nếu chưa có)
3. Tạo project mới cho ứng dụng garage management

## Bước 2: Tạo Database Cluster

1. Trong project vừa tạo, nhấn **Build a Database**
2. Chọn **M0 Sandbox** (miễn phí) 
3. Chọn vùng gần nhất (ví dụ: Singapore, Tokyo)
4. Đặt tên cluster (ví dụ: GarageCluster)
5. Nhấn **Create** và chờ cluster được tạo (2-3 phút)

## Bước 3: Cấu hình Database Access

1. Vào **Database Access** từ menu bên trái
2. Nhấn **Add New Database User**
3. Chọn **Password** authentication
4. Tạo username và password (lưu lại để dùng sau)
5. Database User Privileges: chọn **Read and write to any database**
6. Nhấn **Add User**

## Bước 4: Cấu hình Network Access

1. Vào **Network Access** từ menu bên trái
2. Nhấn **Add IP Address**
3. Chọn **Allow Access From Anywhere** (0.0.0.0/0)
4. Nhấn **Confirm**

## Bước 5: Lấy Connection String

1. Quay lại **Database** và nhấn **Connect** trên cluster
2. Chọn **Drivers**
3. Chọn **Node.js** và version mới nhất
4. Copy **connection string** (dạng: mongodb+srv://username:password@cluster.mongodb.net/)
5. Thay thế `<password>` bằng mật khẩu thực của database user

## Bước 6: Cấu hình trong ứng dụng

1. Mở ứng dụng garage management
2. Vào **Cài Đặt** → tab **Cơ Sở Dữ Liệu**
3. Điền thông tin:
   - **MongoDB Connection String**: Connection string từ bước 5
   - **Tên Database**: `garage_management` (hoặc tên khác tùy ý)
4. Bật "Bật đồng bộ dữ liệu tự động"
5. Nhấn "Kiểm tra kết nối" để test

## Bước 7: Đồng bộ dữ liệu

1. **LẦN ĐẦU**: Nhấn "Đồng bộ ngay" để upload dữ liệu hiện tại lên MongoDB
2. Hệ thống sẽ tự động đồng bộ mỗi 5 phút
3. Mở trình duyệt/thiết bị khác và cấu hình MongoDB tương tự
4. Dữ liệu sẽ tự động tải về khi khởi động ứng dụng

## Lưu ý quan trọng

### Về bảo mật:
- Connection string chứa mật khẩu, không chia sẻ với ai
- Có thể tạo nhiều database users với quyền khác nhau
- Cập nhật Network Access để hạn chế IP nếu cần bảo mật cao hơn

### Về đồng bộ:
- Lần đầu mở ứng dụng trên thiết bị mới: dữ liệu sẽ được tải từ MongoDB
- Khi thêm/sửa/xóa dữ liệu: tự động đồng bộ lên MongoDB
- Đồng bộ định kỳ mỗi 5 phút khi có kết nối internet

### Khắc phục sự cố:
- Nếu không tải được dữ liệu: kiểm tra kết nối internet và thông tin MongoDB
- Nếu lỗi authentication: kiểm tra username/password trong connection string
- Nếu lỗi network: kiểm tra Network Access settings trong MongoDB Atlas
- Nếu dữ liệu không đồng bộ: thử "Đồng bộ ngay" trong cài đặt

## Ví dụ Connection String

```
mongodb+srv://garageuser:mypassword123@garagecluster.abc123.mongodb.net/
```

Trong đó:
- `garageuser`: username của database user
- `mypassword123`: mật khẩu của database user  
- `garagecluster.abc123.mongodb.net`: địa chỉ cluster của bạn