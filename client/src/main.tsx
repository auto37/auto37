import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupOfflineDetection } from "./sw-register";
import { startAutoSync } from "./lib/auto-sync";

// Initialize the database
import "./lib/db";

// Đăng ký Service Worker để hỗ trợ chế độ Offline
// Temporarily disabled for StackBlitz compatibility
// registerServiceWorker();

// Thiết lập phát hiện trạng thái kết nối
setupOfflineDetection();

// Khởi động đồng bộ tự động với Supabase
startAutoSync().catch(err => console.error("Không thể khởi động đồng bộ tự động:", err));

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);