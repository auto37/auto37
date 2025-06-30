// Supabase service cho Customers
import { supabase, handleSupabaseError } from '../supabase';
import { Customer } from '../types';

// Định nghĩa kiểu dữ liệu Customer cho Supabase
export interface SupabaseCustomer {
  id?: number;
  code: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  tax_code?: string;
  notes?: string;
}

// Chuyển đổi từ SupabaseCustomer sang Customer
function mapToCustomer(data: SupabaseCustomer): Customer {
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    phone: data.phone,
    address: data.address,
    email: data.email,
    taxCode: data.tax_code,
    notes: data.notes
  };
}

// Chuyển đổi từ Customer sang SupabaseCustomer
function mapFromCustomer(data: Customer): SupabaseCustomer {
  return {
    code: data.code,
    name: data.name,
    phone: data.phone,
    address: data.address,
    email: data.email,
    tax_code: data.taxCode,
    notes: data.notes
  };
}

// Service cho Customers
export class SupabaseCustomerService {
  // Lấy tất cả khách hàng
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return (data as SupabaseCustomer[]).map(mapToCustomer);
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'lấy danh sách khách hàng'));
    }
  }
  
  // Lấy khách hàng theo ID
  async getCustomerById(id: number): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Không tìm thấy
        }
        throw error;
      }
      
      return mapToCustomer(data as SupabaseCustomer);
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'lấy thông tin khách hàng'));
    }
  }
  
  // Tạo khách hàng mới
  async createCustomer(customer: Customer): Promise<Customer> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(mapFromCustomer(customer))
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return mapToCustomer(data as SupabaseCustomer);
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'tạo khách hàng'));
    }
  }
  
  // Cập nhật khách hàng
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer> {
    try {
      const updateData: Partial<SupabaseCustomer> = {};
      
      if (customer.code !== undefined) updateData.code = customer.code;
      if (customer.name !== undefined) updateData.name = customer.name;
      if (customer.phone !== undefined) updateData.phone = customer.phone;
      if (customer.address !== undefined) updateData.address = customer.address;
      if (customer.email !== undefined) updateData.email = customer.email;
      if (customer.taxCode !== undefined) updateData.tax_code = customer.taxCode;
      if (customer.notes !== undefined) updateData.notes = customer.notes;
      
      const { data, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return mapToCustomer(data as SupabaseCustomer);
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'cập nhật khách hàng'));
    }
  }
  
  // Xóa khách hàng
  async deleteCustomer(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'xóa khách hàng'));
    }
  }
  
  // Tạo mã khách hàng tự động
  async generateCustomerCode(): Promise<string> {
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      const nextNumber = (count || 0) + 1;
      return `KH${nextNumber.toString().padStart(4, '0')}`;
    } catch (error: any) {
      throw new Error(handleSupabaseError(error, 'tạo mã khách hàng'));
    }
  }
}

export const supabaseCustomerService = new SupabaseCustomerService();