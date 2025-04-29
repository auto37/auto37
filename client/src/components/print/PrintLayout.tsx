import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface PrintLayoutProps {
  children: ReactNode;
  onPrint: () => void;
  onBack?: () => void;
  printButtonLabel?: string;
  showBackButton?: boolean;
}

export default function PrintLayout({
  children,
  onPrint,
  onBack,
  printButtonLabel = 'Xuất PDF',
  showBackButton = true
}: PrintLayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="container mx-auto">
        <div className="mb-4 flex justify-between">
          <div>
            {showBackButton && onBack && (
              <Button 
                onClick={onBack}
                variant="outline"
                className="mr-2"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Quay lại
              </Button>
            )}
          </div>
          
          <Button 
            onClick={onPrint}
            className="bg-primary hover:bg-primary-dark text-white"
          >
            <i className="fas fa-file-pdf mr-2"></i>
            {printButtonLabel}
          </Button>
        </div>
        
        {/* Main content */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
