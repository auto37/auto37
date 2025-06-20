import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function GoogleSheetsDemo() {
  const [sheetsId, setSheetsId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const extractSheetId = (input: string): string => {
    // Extract ID from full Google Sheets URL if provided
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  };

  const testConnection = async () => {
    if (!sheetsId || !apiKey) {
      setResult('Vui lòng điền đầy đủ Sheets ID và API Key');
      return;
    }

    setIsLoading(true);
    setResult('Đang kiểm tra kết nối...');

    try {
      // Extract clean ID from URL or use as-is
      const cleanId = extractSheetId(sheetsId);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?key=${apiKey}&fields=spreadsheetId,properties.title`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Kết nối thành công!\nTên sheets: ${data.properties?.title || 'Không có tên'}\nID: ${data.spreadsheetId}`);
      } else {
        const errorText = await response.text();
        setResult(`❌ Lỗi kết nối (${response.status}): ${errorText}`);
      }
    } catch (error) {
      setResult(`❌ Lỗi mạng: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoSheets = async () => {
    if (!apiKey) {
      setResult('Cần API Key để tạo sheets mới');
      return;
    }

    setIsLoading(true);
    setResult('Đang tạo demo sheets...');

    try {
      // Try to create a new spreadsheet
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: 'Garage Management Demo'
          },
          sheets: [
            { properties: { title: 'Customers' } },
            { properties: { title: 'Vehicles' } },
            { properties: { title: 'InventoryCategories' } },
            { properties: { title: 'InventoryItems' } },
            { properties: { title: 'Services' } },
            { properties: { title: 'Quotations' } },
            { properties: { title: 'QuotationItems' } },
            { properties: { title: 'RepairOrders' } },
            { properties: { title: 'RepairOrderItems' } },
            { properties: { title: 'Invoices' } }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(`✅ Tạo sheets thành công!\nID: ${data.spreadsheetId}\nLink: https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`);
        setSheetsId(data.spreadsheetId);
      } else {
        const errorText = await response.text();
        setResult(`❌ Không thể tạo sheets (${response.status}): ${errorText}`);
      }
    } catch (error) {
      setResult(`❌ Lỗi tạo sheets: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Google Sheets API Test Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Hướng dẫn chi tiết:</strong><br/>
            1. Tạo API Key trong Google Cloud Console và bật Google Sheets API<br/>
            2. Tạo Google Sheets mới hoặc dùng sheets có sẵn<br/>
            3. Từ URL như: https://docs.google.com/spreadsheets/d/<strong>1F2Ik4lkVHbN4-roOULqkRrwdEaqzlZ3wzqcdI-qkg7w</strong>/edit<br/>
            4. Copy phần <strong>ID giữa /d/ và /edit</strong> hoặc paste toàn bộ URL (tự động trích xuất ID)
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google Sheets API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetsId">Google Sheets ID hoặc URL đầy đủ</Label>
            <Input
              id="sheetsId"
              value={sheetsId}
              onChange={(e) => setSheetsId(e.target.value)}
              placeholder="Paste URL: https://docs.google.com/spreadsheets/d/1F2Ik.../edit hoặc chỉ ID"
            />
            {sheetsId && (
              <p className="text-sm text-gray-600">
                ID được trích xuất: <code className="bg-gray-100 px-1 rounded">{extractSheetId(sheetsId)}</code>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testConnection}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Đang test...' : 'Test kết nối'}
            </Button>
            
            <Button 
              onClick={createDemoSheets}
              disabled={isLoading || !apiKey}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo demo sheets'}
            </Button>
          </div>

          {result && (
            <div className="p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{result}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}