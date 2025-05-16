import { useState, useEffect } from 'react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      setIsOffline(!event.detail.online);
      setShowIndicator(true);
      
      // Ẩn thông báo sau 5 giây nếu kết nối đã trở lại
      if (event.detail.online) {
        setTimeout(() => setShowIndicator(false), 5000);
      }
    };

    // Lắng nghe sự kiện kết nối thay đổi
    document.addEventListener('connection-changed', handleConnectionChange as EventListener);
    
    // Kiểm tra ban đầu
    setIsOffline(!navigator.onLine);
    setShowIndicator(!navigator.onLine);

    return () => {
      document.removeEventListener('connection-changed', handleConnectionChange as EventListener);
    };
  }, []);

  if (!showIndicator) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isOffline 
        ? 'bg-amber-600 text-white' 
        : 'bg-green-600 text-white'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-amber-300' : 'bg-green-300'}`}></div>
        <span>
          {isOffline 
            ? 'Đang hoạt động ở chế độ offline' 
            : 'Đã kết nối trở lại'}
        </span>
      </div>
    </div>
  );
}