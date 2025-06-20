# Hướng Dẫn Thiết Lập MongoDB Atlas Data API

## Tổng Quan

Để đồng bộ dữ liệu thực sự giữa các thiết bị, bạn cần thiết lập MongoDB Atlas Data API. Đây là dịch vụ cho phép truy cập MongoDB từ trình duyệt web thông qua HTTP requests.

## Bước 1: Tạo MongoDB Atlas Cluster

1. Truy cập [https://mongodb.com/atlas](https://mongodb.com/atlas)
2. Đăng ký/đăng nhập tài khoản
3. Tạo **Organization** và **Project** mới
4. Tạo **Cluster** (chọn **M0 Sandbox** miễn phí)
5. Chọn region gần Việt Nam (Singapore hoặc Tokyo)
6. Đợi cluster được khởi tạo (2-3 phút)

## Bước 2: Tạo Database User

1. Vào **Database Access** → **Add New Database User**
2. Chọn **Password** authentication
3. Username: `garageadmin`
4. Password: tạo password mạnh (lưu lại)
5. **Built-in Role**: chọn **Read and write to any database**
6. **Add User**

## Bước 3: Cấu hình Network Access

1. Vào **Network Access** → **Add IP Address**
2. Chọn **Allow Access From Anywhere** (0.0.0.0/0)
3. **Confirm**

## Bước 4: Tạo App Services Application

1. Từ MongoDB Atlas dashboard, chọn **App Services**
2. **Create a New App**
3. **Template**: chọn **Build your own App**
4. **App Name**: `garage-management-api`
5. **Data Source**: chọn cluster vừa tạo
6. **Create App**

## Bước 5: Bật Data API

1. Trong App Services, vào **HTTPS Endpoints** → **Data API**
2. **Enable** Data API
3. **Create API Key**:
   - **API Key Name**: `garage-app-key`
   - **Add API Key**
4. **Copy và lưu API Key** (chỉ hiển thị 1 lần)

## Bước 6: Cấu hình Authentication

1. Vào **Authentication** → **Authentication Providers**
2. **Add a Provider** → **API Keys**
3. **Enable** API Key authentication
4. **Save**

## Bước 7: Cấu hình Rules

1. Vào **Rules** → **Add Collection**
2. Thêm từng collection với Full Access:
   - `customers`
   - `vehicles`
   - `inventory_categories`
   - `inventory_items`
   - `services`
   - `quotations`
   - `quotation_items`
   - `repair_orders`
   - `repair_order_items`
   - `invoices`

3. Cho mỗi collection:
   - **Database**: `garage_management`
   - **Collection**: tên collection
   - **Template**: **Users can read and write all data**
   - **Save**

## Bước 8: Lấy Data API URL

1. Vào **HTTPS Endpoints** → **Data API**
2. Copy **Data API Base URL**
3. URL sẽ có dạng: `https://data.mongodb-api.com/app/data-xxxxx/endpoint/data/v1`

## Bước 9: Cấu hình trong Ứng dụng

1. Mở ứng dụng garage management
2. **Cài Đặt** → tab **Cơ Sở Dữ Liệu**
3. Điền thông tin:
   - **MongoDB Connection String**: (để trống hoặc điền connection string từ bước 1)
   - **Tên Database**: `garage_management`
   - **MongoDB Data API URL**: URL từ bước 8
   - **MongoDB API Key**: API Key từ bước 5
4. **Bật đồng bộ dữ liệu tự động**
5. **Kiểm tra kết nối**

## Bước 10: Test Đồng bộ

1. **Đồng bộ ngay** để upload dữ liệu hiện tại
2. Mở trình duyệt/thiết bị khác
3. Cấu hình MongoDB với cùng thông tin
4. **Tải từ MongoDB** để download dữ liệu

## Lưu Ý Quan Trọng

- **Bảo mật API Key**: Không chia sẻ API Key với ai khác
- **Backup**: Luôn backup dữ liệu trước khi test
- **Network**: Cần kết nối internet để đồng bộ
- **Cluster Name**: Mặc định là "Cluster0", có thể thay đổi trong code nếu cần

## Khắc phục Sự cố

### Lỗi Authentication
- Kiểm tra API Key còn hạn
- Đảm bảo API Key authentication đã được bật

### Lỗi Permission
- Kiểm tra Rules cho từng collection
- Đảm bảo database user có quyền read/write

### Lỗi Network
- Kiểm tra Network Access đã cho phép IP
- Thử với "Allow Access From Anywhere"

### Data API URL không hoạt động
- Đảm bảo Data API đã được Enable
- Kiểm tra URL format đúng chuẩn