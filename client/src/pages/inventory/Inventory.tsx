import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { InventoryItem, InventoryItemWithCategory, InventoryCategory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItemWithCategory[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItemWithCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const { toast } = useToast();

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        // Fetch categories
        const allCategories = await db.inventoryCategories.toArray();
        setCategories(allCategories);

        // Fetch inventory items
        const allItems = await db.inventoryItems.toArray();
        
        // Join with categories
        const itemsWithCategory = await Promise.all(
          allItems.map(async (item) => {
            const category = await db.inventoryCategories.get(item.categoryId);
            return { ...item, category };
          })
        );
        
        setItems(itemsWithCategory);
        setFilteredItems(itemsWithCategory);
      } catch (error) {
        console.error('Error fetching inventory:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải dữ liệu kho. Vui lòng thử lại.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [toast]);

  useEffect(() => {
    // Apply filters when dependencies change
    let result = [...items];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      const categoryId = parseInt(categoryFilter);
      result = result.filter(item => item.categoryId === categoryId);
    }
    
    // Apply search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.category?.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply low stock filter
    if (lowStockOnly) {
      result = result.filter(item => 
        item.minQuantity !== undefined && item.quantity <= item.minQuantity
      );
    }
    
    setFilteredItems(result);
  }, [items, searchTerm, categoryFilter, lowStockOnly]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vật tư này?')) {
      try {
        // Check if the inventory item is referenced in any repair orders or quotations
        const quotationItems = await db.quotationItems
          .where('type')
          .equals('part')
          .and(item => item.itemId === id)
          .count();
        
        const repairItems = await db.repairOrderItems
          .where('type')
          .equals('part')
          .and(item => item.itemId === id)
          .count();
        
        if (quotationItems > 0 || repairItems > 0) {
          toast({
            title: 'Không thể xóa',
            description: 'Vật tư đã được sử dụng trong báo giá hoặc lệnh sửa chữa.',
            variant: 'destructive'
          });
          return;
        }
        
        // If no references, delete the item
        await db.inventoryItems.delete(id);
        
        // Update state
        setItems(prev => prev.filter(item => item.id !== id));
        toast({
          title: 'Thành công',
          description: 'Đã xóa vật tư.',
        });
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa vật tư. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
      try {
        // Check if category is in use
        const itemsInCategory = await db.inventoryItems
          .where('categoryId')
          .equals(id)
          .count();
        
        if (itemsInCategory > 0) {
          toast({
            title: 'Không thể xóa',
            description: 'Danh mục đang chứa vật tư. Hãy chuyển vật tư sang danh mục khác trước.',
            variant: 'destructive'
          });
          return;
        }
        
        // If no references, delete the category
        await db.inventoryCategories.delete(id);
        
        // Update state
        setCategories(prev => prev.filter(cat => cat.id !== id));
        toast({
          title: 'Thành công',
          description: 'Đã xóa danh mục.',
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể xóa danh mục. Vui lòng thử lại.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleAddStock = async (itemId: number, currentQuantity: number) => {
    const quantity = prompt('Nhập số lượng cần thêm:');
    if (quantity === null) return;
    
    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: 'Lỗi',
        description: 'Số lượng không hợp lệ.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const newQuantity = currentQuantity + parsedQuantity;
      await db.inventoryItems.update(itemId, { quantity: newQuantity });
      
      // Update state
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
      
      toast({
        title: 'Thành công',
        description: `Đã thêm ${parsedQuantity} vào kho.`,
      });
    } catch (error) {
      console.error('Error adding stock:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật số lượng. Vui lòng thử lại.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Quản Lý Kho</h1>
            <div className="flex flex-wrap gap-2">
              {activeTab === 'inventory' && (
                <Link href="/inventory/new">
                  <Button className="bg-primary hover:bg-primary-dark text-white">
                    <i className="fas fa-plus mr-2"></i>
                    Thêm Vật Tư
                  </Button>
                </Link>
              )}
              {activeTab === 'categories' && (
                <Link href="/inventory/category/new">
                  <Button className="bg-primary hover:bg-primary-dark text-white">
                    <i className="fas fa-plus mr-2"></i>
                    Thêm Danh Mục
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="inventory">Vật Tư & Phụ Tùng</TabsTrigger>
              <TabsTrigger value="categories">Danh Mục</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Tìm kiếm theo mã, tên, danh mục..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-64">
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id?.toString() || ''}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lowStock"
                    checked={lowStockOnly}
                    onChange={() => setLowStockOnly(!lowStockOnly)}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="lowStock" className="text-sm">Chỉ hiện sắp hết</label>
                </div>
              </div>

              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Tên Vật Tư</TableHead>
                        <TableHead>Danh Mục</TableHead>
                        <TableHead>Đơn Vị</TableHead>
                        <TableHead>Tồn Kho</TableHead>
                        <TableHead>Giá Nhập</TableHead>
                        <TableHead>Giá Bán</TableHead>
                        <TableHead className="text-right">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                            {lowStockOnly 
                              ? 'Không có vật tư nào sắp hết' 
                              : searchTerm || categoryFilter !== 'all'
                                ? 'Không tìm thấy vật tư nào phù hợp'
                                : 'Chưa có dữ liệu vật tư'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => (
                          <TableRow key={item.id} className={
                            item.minQuantity !== undefined && item.quantity <= item.minQuantity
                              ? 'bg-red-50'
                              : ''
                          }>
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category?.name || '-'}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className={
                              item.minQuantity !== undefined && item.quantity <= item.minQuantity
                                ? 'text-red-600 font-semibold'
                                : ''
                            }>
                              {item.quantity} {item.minQuantity !== undefined && item.quantity <= item.minQuantity && 
                                <span className="text-xs text-red-600">(Min: {item.minQuantity})</span>
                              }
                            </TableCell>
                            <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                            <TableCell>{formatCurrency(item.sellingPrice)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => item.id && handleAddStock(item.id, item.quantity)}
                                >
                                  <i className="fas fa-plus-circle mr-1"></i> Nhập
                                </Button>
                                <Link href={`/inventory/${item.id}/edit`}>
                                  <Button variant="outline" size="sm">
                                    <i className="fas fa-edit mr-1"></i> Sửa
                                  </Button>
                                </Link>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => item.id && handleDelete(item.id)}
                                >
                                  <i className="fas fa-trash mr-1"></i> Xóa
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="categories">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mã</TableHead>
                        <TableHead>Tên Danh Mục</TableHead>
                        <TableHead>Số Lượng Vật Tư</TableHead>
                        <TableHead className="text-right">Thao Tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                            Chưa có danh mục nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => {
                          const itemCount = items.filter(item => item.categoryId === category.id).length;
                          return (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.code}</TableCell>
                              <TableCell>{category.name}</TableCell>
                              <TableCell>{itemCount}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Link href={`/inventory/category/${category.id}/edit`}>
                                    <Button variant="outline" size="sm">
                                      <i className="fas fa-edit mr-1"></i> Sửa
                                    </Button>
                                  </Link>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => category.id && handleDeleteCategory(category.id)}
                                  >
                                    <i className="fas fa-trash mr-1"></i> Xóa
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
