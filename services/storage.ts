import { Product, Order, Customer } from '../types';
import { db } from './firebase';
import { 
    doc, 
    onSnapshot, 
    setDoc, 
    updateDoc, 
    collection, 
    writeBatch, 
    getDoc, 
    deleteDoc, 
    runTransaction,
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';

// --- CONSTANTS ---
const PRODUCTS_COL_NAME = 'products';
const ORDERS_COL_NAME = 'orders';
const CUSTOMERS_COL_NAME = 'customers';
const OLD_STORE_DOC_REF = doc(db, 'data', 'main_store'); // Reference to old monolithic doc

// --- INTERFACES ---
export interface AppData {
    products: Product[];
    orders: Order[];
    customers: Customer[];
}

// --- HELPER: SANITIZE DATA ---
const cleanPayload = (data: any): any => {
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        console.error("Sanitization Failed:", e);
        return data;
    }
};

// --- MIGRATION LOGIC (Run once if collections are empty) ---
const migrateDataIfNeeded = async (
    productsCallback: (data: Product[]) => void,
    ordersCallback: (data: Order[]) => void,
    customersCallback: (data: Customer[]) => void
) => {
    try {
        // Check if old data exists
        const oldDocSnap = await getDoc(OLD_STORE_DOC_REF);
        if (!oldDocSnap.exists()) return;

        console.log("Found legacy data. Checking if migration is needed...");
        const oldData = oldDocSnap.data() as AppData;

        // Simple check: if we have legacy data but collections are likely empty (we can't easily check empty strictly without a read, but this is a heuristic)
        // Better approach: We migrate specific items using batch. Firestore overwrites if ID exists, so it's safe to re-run.
        
        const batch = writeBatch(db);
        let opCount = 0;
        const MAX_BATCH_SIZE = 450; // Firestore limit is 500

        const commitBatch = async () => {
            if (opCount > 0) {
                await batch.commit();
                opCount = 0;
            }
        };

        // 1. Migrate Products
        if (oldData.products && Array.isArray(oldData.products)) {
            for (const p of oldData.products) {
                const ref = doc(db, PRODUCTS_COL_NAME, p.id);
                batch.set(ref, cleanPayload(p));
                opCount++;
                if (opCount >= MAX_BATCH_SIZE) await commitBatch();
            }
            // Update local state immediately to prevent flicker
            productsCallback(oldData.products);
        }

        // 2. Migrate Customers
        if (oldData.customers && Array.isArray(oldData.customers)) {
            for (const c of oldData.customers) {
                const ref = doc(db, CUSTOMERS_COL_NAME, c.id);
                batch.set(ref, cleanPayload(c));
                opCount++;
                if (opCount >= MAX_BATCH_SIZE) await commitBatch();
            }
            customersCallback(oldData.customers);
        }

        // 3. Migrate Orders
        if (oldData.orders && Array.isArray(oldData.orders)) {
            for (const o of oldData.orders) {
                const ref = doc(db, ORDERS_COL_NAME, o.id);
                batch.set(ref, cleanPayload(o));
                opCount++;
                if (opCount >= MAX_BATCH_SIZE) await commitBatch();
            }
            ordersCallback(oldData.orders);
        }

        if (opCount > 0) await batch.commit();
        
        console.log("Migration completed successfully.");
        // Optional: Delete old doc to save space, but keeping it for backup is safer for now.
        // await deleteDoc(OLD_STORE_DOC_REF); 

    } catch (e) {
        console.error("Migration Error:", e);
    }
};


// --- MAIN LISTENER ---
export const listenToStore = (callback: (data: AppData) => void, onError: (msg: string) => void) => {
    // Local cache to aggregate updates from 3 collections
    const cache: AppData = { products: [], orders: [], customers: [] };
    
    // Status flags to know when initial sync is done (optional, but good for UX)
    // We just fire callback whenever any part updates.
    
    // 1. Listener for Products
    const unsubProducts = onSnapshot(collection(db, PRODUCTS_COL_NAME), (snap) => {
        // If snapshot is empty, check for migration
        if (snap.empty && cache.products.length === 0) {
             // Trigger migration check asynchronously
             migrateDataIfNeeded(
                 (p) => { cache.products = p; callback({...cache}); },
                 (o) => { cache.orders = o; callback({...cache}); },
                 (c) => { cache.customers = c; callback({...cache}); }
             );
        }
        
        cache.products = snap.docs.map(d => d.data() as Product);
        callback({ ...cache });
    }, (err) => {
        console.error("Products Sync Error", err);
        onError("Lỗi đồng bộ Sản phẩm: " + err.message);
    });

    // 2. Listener for Orders
    const unsubOrders = onSnapshot(collection(db, ORDERS_COL_NAME), (snap) => {
        cache.orders = snap.docs.map(d => d.data() as Order);
        // Sort orders client-side for consistent view (Desc Date)
        cache.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        callback({ ...cache });
    }, (err) => {
        console.error("Orders Sync Error", err);
    });

    // 3. Listener for Customers
    const unsubCustomers = onSnapshot(collection(db, CUSTOMERS_COL_NAME), (snap) => {
        cache.customers = snap.docs.map(d => d.data() as Customer);
        callback({ ...cache });
    }, (err) => {
        console.error("Customers Sync Error", err);
    });

    return () => {
        unsubProducts();
        unsubOrders();
        unsubCustomers();
    };
};

// --- GRANULAR SAVE FUNCTIONS (To replace monolithic saves) ---

// Save a single product (Add or Update)
export const saveProductToCloud = async (product: Product) => {
    try {
        const ref = doc(db, PRODUCTS_COL_NAME, product.id);
        await setDoc(ref, cleanPayload(product));
    } catch (e) {
        console.error("Error saving product:", e);
        throw e;
    }
};

// Delete a product
export const deleteProductFromCloud = async (id: string) => {
    try {
        await deleteDoc(doc(db, PRODUCTS_COL_NAME, id));
    } catch (e) {
        console.error("Error deleting product:", e);
        throw e;
    }
};

// Save a single customer
export const saveCustomerToCloud = async (customer: Customer) => {
    try {
        const ref = doc(db, CUSTOMERS_COL_NAME, customer.id);
        await setDoc(ref, cleanPayload(customer));
    } catch (e) {
        console.error("Error saving customer:", e);
        throw e;
    }
};

// Delete a customer
export const deleteCustomerFromCloud = async (id: string) => {
    try {
        await deleteDoc(doc(db, CUSTOMERS_COL_NAME, id));
    } catch (e) {
        console.error("Error deleting customer:", e);
        throw e;
    }
};

// Save a single order (Add or Update)
export const saveOrderToCloud = async (order: Order) => {
    try {
        const ref = doc(db, ORDERS_COL_NAME, order.id);
        await setDoc(ref, cleanPayload(order));
    } catch (e) {
        console.error("Error saving order:", e);
        throw e;
    }
};

// --- TRANSACTION SAVE (Checkout) ---
// Saves multiple orders (new + updated ones) and multiple product stock updates atomically
export const saveCheckoutTransaction = async (
    ordersToSave: Order[], 
    productsToUpdate: Product[]
) => {
    try {
        const batch = writeBatch(db);

        // 1. Queue Order Updates
        ordersToSave.forEach(order => {
            const ref = doc(db, ORDERS_COL_NAME, order.id);
            batch.set(ref, cleanPayload(order));
        });

        // 2. Queue Product Stock Updates
        productsToUpdate.forEach(product => {
            const ref = doc(db, PRODUCTS_COL_NAME, product.id);
            batch.set(ref, cleanPayload(product));
        });

        // 3. Commit all changes
        await batch.commit();
        console.log("Transaction committed successfully");
    } catch (e) {
        console.error("Transaction failed:", e);
        throw e;
    }
};

// --- DEPRECATED STUBS (Kept to prevent crash if old references exist, but should not be used) ---
export const saveProductsToCloud = async (products: Product[]) => { console.warn("Deprecated: Use granular saveProductToCloud"); };
export const saveOrdersToCloud = async (orders: Order[]) => { console.warn("Deprecated: Use granular saveOrderToCloud"); };
export const saveCustomersToCloud = async (customers: Customer[]) => { console.warn("Deprecated: Use granular saveCustomerToCloud"); };
export const saveTransactionToCloud = async (orders: Order[], products: Product[]) => { 
    console.error("Deprecated: saveTransactionToCloud (bulk) called. Please use saveCheckoutTransaction.");
    // Fallback: Just try to save them all (Inefficient but works for small data)
    // Only use for migration or emergency
    const batch = writeBatch(db);
    orders.forEach(o => batch.set(doc(db, ORDERS_COL_NAME, o.id), cleanPayload(o)));
    products.forEach(p => batch.set(doc(db, PRODUCTS_COL_NAME, p.id), cleanPayload(p)));
    await batch.commit();
};

export const exportDataToJson = () => { alert("Dữ liệu đang được lưu trên Cloud nên không cần sao lưu thủ công!"); };
export const importDataFromJson = async () => { alert("Chức năng này chỉ khả dụng ở chế độ Offline."); return false; };