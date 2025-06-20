# Hướng dẫn thiết lập Google Apps Script cho đồng bộ dữ liệu

## Vấn đề
Google Sheets API với API Key chỉ cho phép đọc dữ liệu, không thể ghi. Để ghi dữ liệu cần OAuth2 hoặc Service Account credentials.

## Giải pháp: Sử dụng Google Apps Script

### Bước 1: Tạo Google Apps Script Project

1. Truy cập [script.google.com](https://script.google.com)
2. Click "New Project"
3. Đặt tên project: "Garage Management Sync"

### Bước 2: Code Google Apps Script

Paste code sau vào Apps Script editor:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheetName;
    const records = data.records;
    
    // Mở spreadsheet bằng ID
    const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Thay bằng ID thực
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Tìm hoặc tạo sheet
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }
    
    // Xóa dữ liệu cũ
    sheet.clear();
    
    if (records.length > 0) {
      // Tạo headers từ object đầu tiên
      const headers = Object.keys(records[0]);
      
      // Tạo data matrix
      const values = [
        headers,
        ...records.map(record => headers.map(header => record[header] || ''))
      ];
      
      // Ghi dữ liệu
      sheet.getRange(1, 1, values.length, headers.length).setValues(values);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: `Updated ${sheetName} with ${records.length} records`
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Garage Management Sync API is running')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

### Bước 3: Deploy Web App

1. Click "Deploy" > "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone" 
5. Click "Deploy"
6. Copy Web App URL

### Bước 4: Cấu hình trong ứng dụng

Sử dụng Web App URL thay vì Google Sheets API để đồng bộ dữ liệu.

### Ưu điểm

- Không cần OAuth2 phức tạp
- Có thể ghi dữ liệu trực tiếp
- Tự động tạo sheets nếu chưa có
- Miễn phí và đơn giản

### Lưu ý bảo mật

- Web App URL nên được giữ bí mật
- Có thể thêm authentication token nếu cần
- Logs được Google Apps Script tự động ghi lại