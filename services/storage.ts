import { Product, Order, Customer } from '../types';

const PRODUCTS_KEY = 'poultry_app_products';
const ORDERS_KEY = 'poultry_app_orders';
const CUSTOMERS_KEY = 'poultry_app_customers';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Gà Minh Dư Bình Định',
    category: 'Gà',
    price: 120000,
    stock: 200,
    unit: 'kg',
    description: 'Giống gà Minh Dư chính gốc, thịt chắc, lông đẹp.',
    image: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 50
  },
  {
    id: '2',
    name: 'Gà CP Lai Chọi',
    category: 'Gà',
    price: 95000,
    stock: 500,
    unit: 'kg',
    description: 'Gà CP lớn nhanh, thích hợp nuôi thịt công nghiệp.',
    image: 'https://images.unsplash.com/photo-1612170139146-37330761e053?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 100
  },
  {
    id: '3',
    name: 'Vịt Xiêm (Ngan)',
    category: 'Vịt',
    price: 75000,
    stock: 80,
    unit: 'kg',
    description: 'Vịt Xiêm đen, thịt nạc, ít mỡ, nuôi thả vườn.',
    image: 'https://images.unsplash.com/photo-1555855853-9f552600868c?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 20
  },
  {
    id: '4',
    name: 'Vịt Đồng (Vịt cỏ)',
    category: 'Vịt',
    price: 80000,
    stock: 150,
    unit: 'con', // Vịt cỏ đôi khi bán theo con nếu nhỏ
    description: 'Vịt chạy đồng, thịt thơm ngọt tự nhiên.',
    image: 'https://images.unsplash.com/photo-1516467508483-a7212060cb6e?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 30
  },
  {
    id: '5',
    name: 'Bồ Câu Pháp Titan',
    category: 'Bồ câu',
    price: 250000,
    stock: 40,
    unit: 'con', // Bồ câu bán cặp/con
    description: 'Cặp bồ câu Pháp giống, to con, sinh sản tốt. Giá tính theo cặp/con.',
    image: 'https://images.unsplash.com/photo-1544453531-152864f77c8e?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 10
  },
  {
    id: '6',
    name: 'Bồ Câu Mĩ (King)',
    category: 'Bồ câu',
    price: 400000,
    stock: 10,
    unit: 'con',
    description: 'Bồ câu vua, kích thước lớn, làm cảnh hoặc thịt cao cấp.',
    image: 'https://images.unsplash.com/photo-1563220448-b3d978a3ce28?q=80&w=200&auto=format&fit=crop',
    minStockThreshold: 5
  }
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Đại lý Anh Ba', type: 'agency', discountRate: 10, phone: '0901234567', address: 'Chợ Huyện' },
  { id: 'c2', name: 'Trại gà Chú Tư', type: 'agency', discountRate: 15, phone: '0909888777', address: 'Xã Vĩnh Lộc' },
  { id: 'c3', name: 'Nhà hàng Hạnh Phúc', type: 'agency', discountRate: 5, phone: '0283888888', address: 'Trung tâm Thị trấn' },
  { id: 'c4', name: 'Chị Bảy (Chợ Lớn)', type: 'agency', discountRate: 8, phone: '0912341234', address: 'Chợ Đầu mối' }
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    date: new Date(Date.now() - 86400000 * 65).toISOString(), // 65 days ago (Overdue > 60)
    items: [
      { ...MOCK_PRODUCTS[0], quantity: 10, weight: 25 }, // 10 con, 25kg
      { ...MOCK_PRODUCTS[2], quantity: 5, weight: 12.5 }
    ],
    total: 3937500, // Calculated roughly
    customerName: 'Đại lý Anh Ba',
    saleType: 'agency',
    paidAmount: 2000000,
    debt: 1937500,
    discountApplied: 10,
    payments: [
        { id: 'pay1', date: new Date(Date.now() - 86400000 * 65).toISOString(), amount: 2000000, note: 'Đặt cọc' }
    ]
  },
  {
    id: 'ORD-002',
    date: new Date(Date.now() - 86400000 * 35).toISOString(), 
    items: [
      { ...MOCK_PRODUCTS[4], quantity: 2 }
    ],
    total: 500000,
    customerName: 'Khách lẻ vãng lai',
    saleType: 'retail',
    paidAmount: 500000,
    debt: 0,
    payments: []
  },
    {
    id: 'ORD-003',
    date: new Date().toISOString(), 
    items: [
      { ...MOCK_PRODUCTS[1], quantity: 100, weight: 220 } // 100 con, 220kg
    ],
    total: 17765000,
    customerName: 'Trại gà Chú Tư',
    saleType: 'agency',
    paidAmount: 10000000,
    debt: 7765000, 
    discountApplied: 15,
    payments: [
        { id: 'pay2', date: new Date().toISOString(), amount: 10000000, note: 'Thanh toán đợt 1' }
    ]
  }
];

export const getProducts = (): Product[] => {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (!stored) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(MOCK_PRODUCTS));
    return MOCK_PRODUCTS;
  }
  return JSON.parse(stored);
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getOrders = (): Order[] => {
  const stored = localStorage.getItem(ORDERS_KEY);
  if (!stored) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(MOCK_ORDERS));
    return MOCK_ORDERS;
  }
  return JSON.parse(stored);
};

export const saveOrders = (orders: Order[]) => {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
};

export const getCustomers = (): Customer[] => {
  const stored = localStorage.getItem(CUSTOMERS_KEY);
  if (!stored) {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(MOCK_CUSTOMERS));
    return MOCK_CUSTOMERS;
  }
  return JSON.parse(stored);
};

export const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};