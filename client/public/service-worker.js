// Service Worker cho ứng dụng Garage Manager
const CACHE_NAME = 'garage-manager-v1';

// Danh sách các tài nguyên cần cache khi cài đặt
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Khi service worker được cài đặt
self.addEventListener('install', (event) => {
  console.log('Service Worker: Đang cài đặt');
  
  // Precache các tài nguyên quan trọng
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Đang cache tài nguyên');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Đã cài đặt tất cả tài nguyên');
        return self.skipWaiting();
      })
  );
});

// Khi service worker được kích hoạt
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Đã kích hoạt');
  
  // Xóa các cache cũ
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Xóa cache cũ', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Đã claim clients');
      return self.clients.claim();
    })
  );
});

// Khi có request từ ứng dụng
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Trả về từ cache nếu có
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Fetch từ network
        return fetch(event.request)
          .then((response) => {
            // Không cache nếu không phải response thành công
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response vì nó chỉ có thể được sử dụng một lần
            const responseToCache = response.clone();
            
            // Cache response mới
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Nếu không kết nối mạng, thử trả về cache của trang chính
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            
            // Trả về lỗi nếu không tìm thấy trong cache
            return new Response('Không tìm thấy dữ liệu. Vui lòng kiểm tra kết nối mạng.', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
    );
  }
});