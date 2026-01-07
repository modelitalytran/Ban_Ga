import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import SalesHistory from './components/SalesHistory';
import DealerManager from './components/DealerManager';
import DebtManager from './components/DebtManager';
import AIAssistant from './components/AIAssistant';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';

import { ViewState, Product, Order, Customer, PaymentRecord, ImportRecord } from './types';
import { 
    listenToStore, 
    saveProductToCloud, 
    deleteProductFromCloud,
    saveCustomerToCloud,
    deleteCustomerFromCloud,
    saveOrderToCloud,
    saveCheckoutTransaction,
    saveImportTransaction
} from './services/storage';
import { isAuthenticated, setSession } from './services/auth';
import { Loader2, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);

  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;

    if (isLoggedIn) {
      setIsLoadingData(true);
      setSyncError(null);
      
      // The listener now aggregates data from collections automatically
      unsubscribe = listenToStore((data) => {
        setProducts(data.products || []);
        setOrders(data.orders || []);
        setCustomers(data.customers || []);
        setImports(data.imports || []);
        setIsLoadingData(false);
      }, (errorMsg) => {
        setSyncError(errorMsg);
        setIsLoadingData(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isLoggedIn]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      setSession(false);
      setIsLoggedIn(false);
      setCurrentView('dashboard'); 
    }
  };

  // --- CRUD Operations (Granular) ---

  const handleAddProduct = async (product: Product) => {
    // Optimistic Update
    setProducts(prev => [...prev, product]); 
    // Cloud Save (Granular)
    await saveProductToCloud(product);
  };

  const handleUpdateProduct = async (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    await saveProductToCloud(product);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        setProducts(prev => prev.filter(p => p.id !== id));
        await deleteProductFromCloud(id);
    }
  };

  const handleAddCustomer = async (customer: Customer) => {
      setCustomers(prev => [...prev, customer]);
      await saveCustomerToCloud(customer);
  };

  const handleUpdateCustomer = async (customer: Customer) => {
      setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
      await saveCustomerToCloud(customer);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa đại lý này?")) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        await deleteCustomerFromCloud(id);
    }
  };

  // --- IMPORT STOCK HANDLER ---
  const handleImportStock = async (record: ImportRecord, updatedProduct: Product) => {
      // Optimistic Update
      setImports(prev => [record, ...prev]);
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

      // Cloud Save (Atomic)
      await saveImportTransaction(record, updatedProduct);
  };

  // --- REFACTORED CHECKOUT LOGIC (Robust & Granular) ---
  const handleCheckout = async (orderInput: Order) => {
    try {
        const cashReceived = Number(orderInput.paidAmount) || 0; 
        const orderTotal = orderInput.total;
        
        // Deep copy orders array to calculate surplus/debts logic
        let localOrders = JSON.parse(JSON.stringify(orders)) as Order[];
        let ordersToSave: Order[] = []; // List of modified/new orders to push to cloud

        let amountForCurrentOrder = 0;
        let surplus = 0;
        let debtForCurrentOrder = 0;

        // 1. Determine Payment Allocation for the NEW order
        if (cashReceived >= orderTotal) {
            amountForCurrentOrder = orderTotal;
            surplus = cashReceived - orderTotal;
            debtForCurrentOrder = 0;
        } else {
            amountForCurrentOrder = cashReceived;
            surplus = 0;
            debtForCurrentOrder = orderTotal - cashReceived;
        }

        // 2. Handle Surplus (Auto-pay old debts)
        // CRITICAL FIX: Pay oldest debt first
        if (surplus > 0) {
            // Find unpaid orders for this customer, sorted by Date ASC (Oldest first)
            const unpaidOrders = localOrders
                .filter(o => o.customerName === orderInput.customerName && o.debt > 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            for (const oldOrder of unpaidOrders) {
                if (surplus <= 0) break;
                
                const debtAmount = oldOrder.debt;
                const paymentAmount = Math.min(surplus, debtAmount);
                
                const paymentRecord: PaymentRecord = {
                    id: `PAY-AUTO-${Date.now()}-${oldOrder.id}`,
                    date: new Date().toISOString(),
                    amount: paymentAmount,
                    note: `Trừ nợ từ đơn mới #${orderInput.id.slice(-4)}`
                };

                const updatedOldOrder = {
                    ...oldOrder,
                    paidAmount: oldOrder.paidAmount + paymentAmount,
                    debt: oldOrder.debt - paymentAmount,
                    payments: [...(oldOrder.payments || []), paymentRecord]
                };

                // Find index in MAIN localOrders array to update it
                const idx = localOrders.findIndex(x => x.id === oldOrder.id);
                if (idx !== -1) {
                    localOrders[idx] = updatedOldOrder;
                    ordersToSave.push(updatedOldOrder);
                }

                surplus -= paymentAmount;
            }
        }

        // 3. Create the Final New Order Object
        const finalNewOrder: Order = {
            id: orderInput.id,
            date: orderInput.date,
            items: orderInput.items.map(item => ({
                ...item,
                weight: item.weight || 0,
                priceHistory: [] // Save space
            })),
            total: orderInput.total,
            customerName: orderInput.customerName,
            saleType: orderInput.saleType,
            paidAmount: amountForCurrentOrder,
            debt: debtForCurrentOrder,
            discountApplied: orderInput.discountApplied || 0,
            note: orderInput.note || '',
            payments: [] 
        };

        // Add new order to save queue
        ordersToSave.push(finalNewOrder);
        // Update local state (Optimistic)
        localOrders.push(finalNewOrder);

        // 4. Determine Products to Update (Stock reduction)
        const productsToUpdate: Product[] = [];
        const updatedProductsState = products.map(p => {
            const soldItem = finalNewOrder.items.find(i => i.id === p.id);
            if (soldItem) {
                // Calculate new state
                const newStock = Math.max(0, (p.stock || 0) - soldItem.quantity);
                const updatedProduct = {
                    id: p.id,
                    name: p.name || '',
                    category: p.category || 'Khác',
                    price: p.price || 0,
                    stock: newStock,
                    unit: p.unit || 'con',
                    description: p.description || '',
                    image: p.image || '',
                    minStockThreshold: p.minStockThreshold || 10,
                    priceHistory: p.priceHistory || []
                };
                
                // Add to save queue
                productsToUpdate.push(updatedProduct);
                return updatedProduct;
            }
            return p;
        });

        // 5. Update State Locally FIRST (Instant UI feedback)
        // Sort orders back to DESC for UI consistency before setting state
        const uiOrders = [...localOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOrders(uiOrders);
        setProducts(updatedProductsState);

        // 6. Save to Cloud ATOMICALLY (Only changed items)
        await saveCheckoutTransaction(ordersToSave, productsToUpdate);

    } catch (error) {
        console.error("Checkout Logic Error:", error);
        alert("LỖI: Không thể lưu đơn hàng. Vui lòng kiểm tra lại kết nối hoặc tải lại trang!");
    }
  };

  const handleUpdateOrder = async (order: Order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    await saveOrderToCloud(order);
  };

  const handleEditOrder = async (updatedOrder: Order, originalOrder: Order) => {
      let tempProducts = [...products];
      const productsToUpdate: Product[] = [];
      
      // Helper to find/update product in list
      const updateStock = (productId: string, qtyChange: number) => {
          const idx = tempProducts.findIndex(p => p.id === productId);
          if (idx !== -1) {
              const p = tempProducts[idx];
              const newStock = Math.max(0, (p.stock || 0) + qtyChange);
              const updatedP = {
                  ...p,
                  stock: newStock,
                  minStockThreshold: p.minStockThreshold || 10,
                  priceHistory: p.priceHistory || []
              };
              tempProducts[idx] = updatedP;
              
              // Add to save queue (upsert logic if same product modded twice)
              const existingQueueIdx = productsToUpdate.findIndex(x => x.id === productId);
              if (existingQueueIdx !== -1) {
                  productsToUpdate[existingQueueIdx] = updatedP;
              } else {
                  productsToUpdate.push(updatedP);
              }
          }
      };

      // 1. Revert stock from original order (Add back)
      originalOrder.items.forEach(oldItem => {
          updateStock(oldItem.id, oldItem.quantity);
      });

      // 2. Deduct stock for new order items (Subtract)
      updatedOrder.items.forEach(newItem => {
          updateStock(newItem.id, -newItem.quantity);
      });

      // Update State
      setProducts(tempProducts);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

      // Save Transaction (Update Order + Update Modified Products)
      await saveCheckoutTransaction([updatedOrder], productsToUpdate);
      
      alert(`Đã cập nhật đơn hàng #${updatedOrder.id.slice(-6)} và điều chỉnh tồn kho.`);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard products={products} orders={orders} />;
      case 'pos':
        return (
          <POS 
            products={products} 
            customers={customers}
            orders={orders}
            onCheckout={handleCheckout} 
            onAddCustomer={handleAddCustomer}
          />
        );
      case 'inventory':
        return (
          <Inventory 
            products={products} 
            onAddProduct={handleAddProduct} 
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onImportStock={handleImportStock}
          />
        );
      case 'debt-manager':
        return (
            <DebtManager 
                orders={orders}
                customers={customers}
                onUpdateOrder={handleUpdateOrder}
            />
        );
      case 'dealer-manager':
        return (
            <DealerManager 
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
            />
        );
      case 'history':
        return <SalesHistory orders={orders} imports={imports} onEditOrder={handleEditOrder} />;
      case 'ai-assistant':
        return <AIAssistant products={products} orders={orders} />;
      default:
        return <Dashboard products={products} orders={orders} />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen h-[100dvh] bg-[#f3f4f6] overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        onLogout={handleLogout}
        onChangePassword={() => setIsChangePassOpen(true)}
      />
      <main className="flex-1 overflow-y-auto w-full relative">
        {isLoadingData && !syncError && (
            <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-600">Đang đồng bộ dữ liệu đám mây...</p>
                </div>
            </div>
        )}

        {syncError && (
             <div className="absolute inset-0 bg-white/95 z-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-6 text-center animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CloudOff size={32} className="text-red-500"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Lỗi Kết Nối</h3>
                    <p className="text-gray-500 text-sm mb-6">{syncError}</p>
                    
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors"
                    >
                        Tải lại trang
                    </button>
                </div>
            </div>
        )}
        
        <div className="p-4 pb-28 landscape:pb-4 landscape:pl-20 lg:pl-8 lg:pb-8 max-w-7xl mx-auto min-h-full">
            {renderContent()}
        </div>
      </main>

      <ChangePasswordModal 
        isOpen={isChangePassOpen} 
        onClose={() => setIsChangePassOpen(false)} 
      />
    </div>
  );
};

export default App;