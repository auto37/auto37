// Đăng ký Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker đã đăng ký thành công:', registration.scope);
        })
        .catch((error) => {
          console.error('Lỗi đăng ký Service Worker:', error);
        });
    });
  } else {
    console.log('Service Worker không được hỗ trợ trên trình duyệt này');
  }
}

// Kiểm tra và thông báo cho người dùng về trạng thái kết nối
export function setupOfflineDetection() {
  // Lắng nghe sự kiện offline
  window.addEventListener('offline', () => {
    console.log('Mất kết nối mạng');
    document.dispatchEvent(new CustomEvent('connection-changed', { detail: { online: false } }));
  });

  // Lắng nghe sự kiện online
  window.addEventListener('online', () => {
    console.log('Đã kết nối mạng trở lại');
    document.dispatchEvent(new CustomEvent('connection-changed', { detail: { online: true } }));
  });

  // Kiểm tra ban đầu
  if (!navigator.onLine) {
    console.log('Đang ở chế độ offline');
    document.dispatchEvent(new CustomEvent('connection-changed', { detail: { online: false } }));
  }
}