import { Product, Order, Customer } from '../types';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

// Mock data for initialization
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
    unit: 'con',
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
    unit: 'con',
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
    date: new Date(Date.now() - 86400000 * 65).toISOString(),
    items: [
      { ...MOCK_PRODUCTS[0], quantity: 10, weight: 25 },
      { ...MOCK_PRODUCTS[2], quantity: 5, weight: 12.5 }
    ],
    total: 3937500,
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
  }
];

// Document reference: all data stored in one doc for simplicity in this version
const STORE_DOC_REF = doc(db, 'data', 'main_store');

export interface AppData {
    products: Product[];
    orders: Order[];
    customers: Customer[];
}

// Function to listen to realtime updates
export const listenToStore = (callback: (data: AppData) => void, onError: (msg: string) => void) => {
    return onSnapshot(STORE_DOC_REF, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as AppData;
            callback(data);
        } else {
            // Initialize DB if it doesn't exist
            const initialData = {
                products: MOCK_PRODUCTS,
                orders: MOCK_ORDERS,
                customers: MOCK_CUSTOMERS
            };
            setDoc(STORE_DOC_REF, initialData).catch(e => onError(e.message));
            callback(initialData);
        }
    }, (error) => {
        console.error("Firebase Sync Error:", error);
        // User likely hasn't set up API keys or permissions yet
        onError(`Lỗi kết nối Firebase: ${error.code}. Vui lòng kiểm tra API Key và quyền truy cập.`);
    });
};

// Helper: Sanitize data (remove undefined) before sending to Firestore
// Firestore throws an error if any field is 'undefined'.
// JSON.stringify will remove keys with undefined values automatically.
const cleanPayload = (data: any): any => {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        console.error("Sanitization Failed:", e);
        return data;
    }
};

// Functions to save data to Cloud
export const saveProductsToCloud = async (products: Product[]) => {
    try {
        await updateDoc(STORE_DOC_REF, { products: cleanPayload(products) });
    } catch (e) {
        console.error("Error saving products:", e);
        throw e;
    }
};

export const saveOrdersToCloud = async (orders: Order[]) => {
    try {
        await updateDoc(STORE_DOC_REF, { orders: cleanPayload(orders) });
    } catch (e) {
        console.error("Error saving orders:", e);
        throw e;
    }
};

export const saveCustomersToCloud = async (customers: Customer[]) => {
    try {
        await updateDoc(STORE_DOC_REF, { customers: cleanPayload(customers) });
    } catch (e) {
        console.error("Error saving customers:", e);
        throw e;
    }
};

// New function to save both orders and products atomically (prevents race conditions)
export const saveTransactionToCloud = async (orders: Order[], products: Product[]) => {
    try {
        await updateDoc(STORE_DOC_REF, { 
            orders: cleanPayload(orders), 
            products: cleanPayload(products) 
        });
    } catch (e) {
        console.error("Error saving transaction:", e);
        throw e;
    }
};

// Stub functions for export/import (not used in Cloud mode usually, but kept for type compatibility)
export const exportDataToJson = () => { alert("Dữ liệu đang được lưu trên Cloud nên không cần sao lưu thủ công!"); };
export const importDataFromJson = async () => { alert("Chức năng này chỉ khả dụng ở chế độ Offline."); return false; };

// Deprecated wrappers
export const getProducts = () => MOCK_PRODUCTS; 
export const getOrders = () => MOCK_ORDERS;
export const getCustomers = () => MOCK_CUSTOMERS;
export const saveProducts = (p: any) => {};
export const saveOrders = (o: any) => {};
export const saveCustomers = (c: any) => {};