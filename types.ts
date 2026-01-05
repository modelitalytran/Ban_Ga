export interface PriceHistoryItem {
  date: string;
  price: number;
}

export type ProductUnit = 'kg' | 'con';

export interface Product {
  id: string;
  name: string;
  category: string; // Gà, Vịt, Bồ câu
  price: number; // Giá trên mỗi đơn vị (đ/kg hoặc đ/con)
  stock: number; // Số con (luôn quản lý theo đầu con)
  unit: ProductUnit; // Đơn vị tính giá
  description: string;
  image: string; // URL
  minStockThreshold?: number; // Mức cảnh báo tồn kho tối thiểu
  priceHistory?: PriceHistoryItem[]; // Lịch sử thay đổi giá
}

export interface CartItem extends Product {
  quantity: number; // Số con
  weight?: number; // Tổng cân nặng (chỉ dùng nếu unit='kg')
}

export type SaleType = 'retail' | 'agency' | 'internal'; // Bán lẻ, Đại lý, Nhà ăn/Tặng

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Order {
  id: string;
  date: string; // ISO string
  items: CartItem[];
  total: number;
  
  // New fields for Poultry App
  customerName: string;
  saleType: SaleType;
  paidAmount: number; // Số tiền khách thực trả
  debt: number; // Số tiền nợ lại (Total - PaidAmount)
  note?: string;
  discountApplied?: number; // % giảm giá đã áp dụng
  payments?: PaymentRecord[]; // Lịch sử thanh toán
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  type: 'agency' | 'retail';
  discountRate: number; // % chiết khấu riêng (0-100)
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  totalDebt: number;
  topSellingProduct: string;
}

export type ViewState = 'dashboard' | 'pos' | 'inventory' | 'history' | 'ai-assistant' | 'dealer-manager' | 'debt-manager';