import React, { createContext, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Context để quản lý toast toàn cục
const ToastContext = createContext({});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // Lắng nghe sự kiện hiển thị toast
  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      if (event.detail) {
        toast({
          title: event.detail.title,
          description: event.detail.description,
          variant: event.detail.variant || 'default',
        });
      }
    };

    // Lắng nghe sự kiện toàn cục để hiển thị toast
    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, [toast]);

  return <ToastContext.Provider value={{}}>{children}</ToastContext.Provider>;
}

export function useToastContext() {
  return useContext(ToastContext);
}