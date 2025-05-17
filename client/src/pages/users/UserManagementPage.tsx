import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

// Định nghĩa kiểu dữ liệu cho người dùng
interface User {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
}

// Định nghĩa kiểu dữ liệu cho form tạo/cập nhật người dùng
interface UserFormData {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  isActive: boolean;
}

export function UserManagementPage() {
  // State quản lý danh sách người dùng và form
  const [isLoading, setIsLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    email: "",
    phone: "",
    role: "user",
    isActive: true,
  });

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Lấy thông tin trạng thái xác thực
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    user?: { id: number; username: string; fullName: string; role: string };
  }>({
    isAuthenticated: false,
  });

  // Kiểm tra xác thực
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          setAuthStatus(data);
          
          // Nếu chưa đăng nhập hoặc không phải admin, chuyển về trang đăng nhập
          if (!data.isAuthenticated || data.user?.role !== "admin") {
            toast({
              title: "Không có quyền truy cập",
              description: "Bạn cần đăng nhập với tài khoản quản trị để truy cập trang này",
              variant: "destructive",
            });
            setLocation("/auth/login");
          }
        } else {
          setLocation("/auth/login");
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái xác thực:", error);
        setLocation("/auth/login");
      }
    };
    
    checkAuth();
  }, [toast, setLocation]);

  // Lấy danh sách người dùng
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Không thể lấy danh sách người dùng");
      }
      
      return response.json();
    },
    enabled: authStatus.isAuthenticated && authStatus.user?.role === "admin",
  });

  // Tạo người dùng mới
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<UserFormData, "confirmPassword">) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể tạo người dùng");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpenCreateDialog(false);
      toast({
        title: "Tạo người dùng thành công",
        description: "Người dùng mới đã được tạo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Tạo người dùng thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cập nhật người dùng
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể cập nhật người dùng");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpenEditDialog(false);
      toast({
        title: "Cập nhật người dùng thành công",
        description: "Thông tin người dùng đã được cập nhật",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Cập nhật người dùng thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Xóa người dùng
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể xóa người dùng");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteUser(null);
      toast({
        title: "Xóa người dùng thành công",
        description: "Người dùng đã được xóa khỏi hệ thống",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Xóa người dùng thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Xử lý thay đổi dữ liệu form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Xử lý chọn vai trò
  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  // Xử lý chọn trạng thái
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, isActive: value === "active" }));
  };

  // Đặt lại form về trạng thái ban đầu
  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      phone: "",
      role: "user",
      isActive: true,
    });
  };

  // Mở hộp thoại chỉnh sửa người dùng
  const handleEdit = (user: User) => {
    setCurrentUser(user);
    setFormData({
      username: user.username,
      password: "",
      confirmPassword: "",
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      role: user.role,
      isActive: user.isActive,
    });
    setOpenEditDialog(true);
  };

  // Xử lý tạo người dùng mới
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.fullName) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Mật khẩu không khớp",
        description: "Mật khẩu xác nhận không khớp với mật khẩu đã nhập",
        variant: "destructive",
      });
      return;
    }
    
    const { confirmPassword, ...userData } = formData;
    createUserMutation.mutate(userData);
  };

  // Xử lý cập nhật người dùng
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    if (!formData.username || !formData.fullName) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ tên đăng nhập và họ tên",
        variant: "destructive",
      });
      return;
    }
    
    const updateData: Partial<UserFormData> = {
      username: formData.username,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      isActive: formData.isActive,
    };
    
    // Chỉ cập nhật mật khẩu nếu có nhập
    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Mật khẩu không khớp",
          description: "Mật khẩu xác nhận không khớp với mật khẩu đã nhập",
          variant: "destructive",
        });
        return;
      }
      
      updateData.password = formData.password;
    }
    
    updateUserMutation.mutate({ id: currentUser.id, data: updateData });
  };

  // Xử lý xóa người dùng
  const handleDelete = () => {
    if (deleteUser) {
      deleteUserMutation.mutate(deleteUser.id);
    }
  };

  // Hiển thị trang quản lý người dùng
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>
                Quản lý tài khoản người dùng trong hệ thống
              </CardDescription>
            </div>
            <Button onClick={() => setOpenCreateDialog(true)}>
              Thêm người dùng mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Danh sách người dùng hệ thống</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Đăng nhập cuối</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email || "—"}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${user.role === "admin" ? "text-blue-600" : ""}`}>
                      {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.isActive 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {user.isActive ? "Đang hoạt động" : "Đã khóa"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? format(new Date(user.lastLogin), "dd/MM/yyyy HH:mm") 
                      : "Chưa đăng nhập"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        Sửa
                      </Button>
                      
                      {/* Chỉ cho phép xóa người dùng khác, không xóa chính mình */}
                      {user.id !== authStatus.user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => setDeleteUser(user)}
                            >
                              Xóa
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa người dùng</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa người dùng "{deleteUser?.fullName}" khỏi hệ thống?
                                Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteUser(null)}>
                                Hủy bỏ
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>
                                Xác nhận xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Chưa có người dùng nào trong hệ thống
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog tạo người dùng mới */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng mới</DialogTitle>
            <DialogDescription>
              Tạo tài khoản mới cho người dùng trong hệ thống
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Tên đăng nhập
                </Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Nhập tên đăng nhập"
                  className="col-span-3"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullName" className="text-right">
                  Họ và tên
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Nhập họ và tên"
                  className="col-span-3"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Mật khẩu
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  className="col-span-3"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmPassword" className="text-right">
                  Xác nhận mật khẩu
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  className="col-span-3"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email (không bắt buộc)"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Nhập số điện thoại (không bắt buộc)"
                  className="col-span-3"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Vai trò
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                    <SelectItem value="technician">Kỹ thuật viên</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Trạng thái
                </Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setOpenCreateDialog(false);
                }}
              >
                Hủy bỏ
              </Button>
              <Button type="submit">Tạo người dùng</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog chỉnh sửa người dùng */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin người dùng trong hệ thống
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Tên đăng nhập
                </Label>
                <Input
                  id="edit-username"
                  name="username"
                  placeholder="Nhập tên đăng nhập"
                  className="col-span-3"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-fullName" className="text-right">
                  Họ và tên
                </Label>
                <Input
                  id="edit-fullName"
                  name="fullName"
                  placeholder="Nhập họ và tên"
                  className="col-span-3"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">
                  Mật khẩu mới
                </Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  placeholder="Để trống nếu không đổi mật khẩu"
                  className="col-span-3"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-confirmPassword" className="text-right">
                  Xác nhận mật khẩu
                </Label>
                <Input
                  id="edit-confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Xác nhận mật khẩu mới"
                  className="col-span-3"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email (không bắt buộc)"
                  className="col-span-3"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">
                  Số điện thoại
                </Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  placeholder="Nhập số điện thoại (không bắt buộc)"
                  className="col-span-3"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  Vai trò
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Quản trị viên</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                    <SelectItem value="technician">Kỹ thuật viên</SelectItem>
                    <SelectItem value="manager">Quản lý</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Trạng thái
                </Label>
                <Select
                  value={formData.isActive ? "active" : "inactive"}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Khóa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setOpenEditDialog(false);
                }}
              >
                Hủy bỏ
              </Button>
              <Button type="submit">Cập nhật</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserManagementPage;