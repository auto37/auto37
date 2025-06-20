# Hướng Dẫn Thiết Lập Google Sheets API

## Tổng Quan

Google Sheets API cho phép đồng bộ dữ liệu garage management giữa các thiết bị một cách đơn giản và miễn phí. Không cần tài khoản trả phí như MongoDB.

## Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập với tài khoản Google
3. **Create Project** → nhập tên dự án: `Garage Management`
4. Chọn project vừa tạo

## Bước 2: Bật Google Sheets API

1. Vào **APIs & Services** → **Library**
2. Tìm kiếm "Google Sheets API"
3. **Enable** Google Sheets API
4. Chờ vài giây để API được kích hoạt

## Bước 3: Tạo API Key

1. Vào **APIs & Services** → **Credentials**
2. **Create Credentials** → **API Key**
3. Copy API Key và lưu lại an toàn
4. (Tùy chọn) **Restrict Key** để bảo mật tốt hơn:
   - **API restrictions**: chọn "Google Sheets API"
   - **Save**

## Bước 4: Tạo Google Sheets

1. Truy cập [Google Sheets](https://sheets.google.com)
2. **Create** một spreadsheet mới
3. Đặt tên: `Garage Management Database`
4. Tạo các sheet với tên chính xác:
   - `Customers`
   - `Vehicles`
   - `InventoryCategories`
   - `InventoryItems`
   - `Services`
   - `Quotations`
   - `QuotationItems`
   - `RepairOrders`
   - `RepairOrderItems`
   - `Invoices`

## Bước 5: Cấu hình Chia Sẻ

1. **Share** spreadsheet
2. **Change to anyone with the link**
3. **Viewer** permission (ứng dụng sẽ ghi thông qua API)
4. Copy **Spreadsheet ID** từ URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

## Bước 6: Cấu hình trong Ứng dụng

1. Mở ứng dụng garage management
2. **Cài Đặt** → tab **Cơ Sở Dữ Liệu**
3. Điền thông tin:
   - **Google Sheets ID**: ID từ bước 5
   - **Google Sheets API Key**: API Key từ bước 3
4. **Bật đồng bộ dữ liệu tự động**
5. **Kiểm tra kết nối**

## Bước 7: Test Đồng bộ

1. **Đồng bộ ngay** để upload dữ liệu
2. Kiểm tra Google Sheets → dữ liệu đã xuất hiện
3. Mở trình duyệt/thiết bị khác
4. Cấu hình Google Sheets với cùng thông tin
5. **Tải từ Google Sheets** → dữ liệu tự động đồng bộ

## Ưu Điểm Google Sheets

- **Miễn phí**: Không cần trả phí như MongoDB Atlas
- **Đơn giản**: Thiết lập nhanh chóng
- **Trực quan**: Xem dữ liệu trực tiếp trong Google Sheets
- **Backup tự động**: Google tự động sao lưu
- **Chia sẻ dễ dàng**: Có thể chia sẻ với nhân viên

## Khắc phục Sự cố

### Lỗi 403 Forbidden
- Kiểm tra API Key đã được tạo đúng chưa
- Đảm bảo Google Sheets API đã được Enable

### Lỗi 404 Not Found
- Kiểm tra Spreadsheet ID đã chính xác chưa
- Đảm bảo spreadsheet được chia sẻ công khai

### Không thể ghi dữ liệu
- Kiểm tra tên các sheet phải chính xác
- Tạo đủ 10 sheets như hướng dẫn

### API Key không hoạt động
- Thử tạo API Key mới
- Kiểm tra restrictions không quá nghiêm ngặt

## Giới Hạn

- **Quota**: 100 requests/100 seconds/user (đủ dùng)
- **File size**: Tối đa 10 triệu cells/spreadsheet
- **Performance**: Chậm hơn MongoDB nhưng chấp nhận được

## Bảo Mật

- Không chia sẻ API Key với người khác
- Có thể restrict API Key theo domain
- Định kỳ tạo API Key mới (6 tháng/lần)