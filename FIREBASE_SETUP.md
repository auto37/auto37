# Hướng dẫn thiết lập Firebase Firestore

## Bước 1: Tạo Firebase Project
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Google
3. Nhấn **"Create a project"** hoặc **"Add project"**
4. Đặt tên project (ví dụ: "garage-management")
5. Có thể bỏ tích Google Analytics nếu không cần
6. Nhấn **"Create project"** và chờ khởi tạo

## Bước 2: Thêm Web App
1. Trong Firebase Console, chọn project vừa tạo
2. Nhấn biểu tượng **</> (Web)** để thêm web app
3. Đặt tên app (ví dụ: "Garage Management Web")
4. **Không** tích "Firebase Hosting" (chưa cần)
5. Nhấn **"Register app"**

## Bước 3: Lấy Config Keys
Sau khi đăng ký app, bạn sẽ thấy màn hình config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAX-62emVGaERGjY_zomxJSz3JTwwSapQ4",           // ← Copy cái này
  authDomain: "...",
  projectId: "garage-management-database",    // ← Copy cái này
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

**Chỉ cần copy 2 thông tin:**
- **API Key**: Chuỗi bắt đầu bằng "AIzaSy..."
- **Project ID**: Tên project ID (thường giống tên project)

## Bước 4: Tạo Firestore Database
1. Trong Firebase Console, vào **"Firestore Database"**
2. Nhấn **"Create database"**
3. Chọn **"Start in test mode"** (cho development)
4. Chọn vùng gần nhất (asia-southeast1 cho Việt Nam)
5. Nhấn **"Done"**

## Bước 5: Cấu hình trong ứng dụng
1. Vào **Settings → Cơ Sở Dữ Liệu** trong ứng dụng
2. Điền thông tin:
   - **Firebase API Key**: Paste API Key từ bước 3
   - **Firebase Project ID**: Paste Project ID từ bước 3
3. Tích **"Bật đồng bộ dữ liệu tự động"**
4. Nhấn **"Kiểm tra kết nối"**

## Bước 6: Test đồng bộ dữ liệu
1. Sau khi kết nối thành công, nhấn **"Đồng bộ lên Firebase"**
2. Kiểm tra trong Firebase Console → Firestore Database
3. Bạn sẽ thấy các collections: customers, vehicles, services, etc.

## ⚠️ Khắc phục lỗi kết nối
Nếu gặp lỗi "transport errored" hoặc "permission denied":

1. **Kiểm tra Firestore Rules**:
   - Vào Firebase Console → Firestore Database → **Rules**
   - Đảm bảo rules như sau:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
   - Nhấn **"Publish"** để áp dụng

2. **Kiểm tra Database Location**:
   - Database phải ở **asia-southeast1** (Singapore)
   - Nếu sai location, tạo lại database

3. **Kiểm tra Test Mode**:
   - Database phải ở **test mode**, không phải production mode
   - Test mode tự động cho phép read/write trong 30 ngày
```

## Ưu điểm Firebase Firestore
- **Miễn phí**: 1GB storage, 50K read/day, 20K write/day
- **Realtime**: Thay đổi sync ngay lập tức
- **Offline**: Hoạt động khi mất mạng
- **Simple**: Không cần viết SQL
- **Scalable**: Tự động scale theo nhu cầu

## Lưu ý quan trọng
- **Test mode**: Database rules cho phép access tự do (expires sau 30 ngày)
- **Production**: Cần setup authentication và security rules
- **Quota**: Free tier có giới hạn, nhưng đủ cho small business
- **Backup**: Tự động backup, không cần lo lắng

## Khắc phục sự cố
- **Permission denied**: Kiểm tra Firestore rules
- **API key invalid**: Kiểm tra lại API Key từ Firebase Console
- **Project not found**: Kiểm tra Project ID chính xác

## Monitoring
Trong Firebase Console có thể xem:
- **Usage**: Số lượng reads/writes đã dùng
- **Data**: Dữ liệu realtime trong database
- **Performance**: Tốc độ truy vấn