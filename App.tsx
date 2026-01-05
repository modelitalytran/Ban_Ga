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

import { ViewState, Product, Order, Customer, PaymentRecord } from './types';
import { listenToStore, saveProductsToCloud, saveOrdersToCloud, saveCustomersToCloud, saveTransactionToCloud } from './services/storage';
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
      
      unsubscribe = listenToStore((data) => {
        setProducts(data.products || []);
        setOrders(data.orders || []);
        setCustomers(data.customers || []);
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

  const handleAddProduct = async (product: Product) => {
    const updated = [...products, product];
    setProducts(updated); 
    await saveProductsToCloud(updated);
  };

  const handleUpdateProduct = async (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    setProducts(updated);
    await saveProductsToCloud(updated);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        await saveProductsToCloud(updated);
    }
  };

  const handleAddCustomer = async (customer: Customer) => {
      const updated = [...customers, customer];
      setCustomers(updated);
      await saveCustomersToCloud(updated);
  };

  const handleUpdateCustomer = async (customer: Customer) => {
      const updated = customers.map(c => c.id === customer.id ? customer : c);
      setCustomers(updated);
      await saveCustomersToCloud(updated);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa đại lý này?")) {
        const updated = customers.filter(c => c.id !== id);
        setCustomers(updated);
        await saveCustomersToCloud(updated);
    }
  };

  // --- REFACTORED CHECKOUT LOGIC (Robust) ---
  const handleCheckout = async (orderInput: Order) => {
    try {
        const cashReceived = Number(orderInput.paidAmount) || 0; 
        const orderTotal = orderInput.total;
        
        // Deep copy orders array to ensure state immutability
        let updatedOrders = JSON.parse(JSON.stringify(orders)) as Order[];

        let amountForCurrentOrder = 0;
        let surplus = 0;
        let debtForCurrentOrder = 0;

        // 1. Determine Payment Allocation for the NEW order
        if (cashReceived >= orderTotal) {
            // Paid in full or more
            amountForCurrentOrder = orderTotal;
            surplus = cashReceived - orderTotal;
            debtForCurrentOrder = 0;
        } else {
            // Partial payment (Debt)
            amountForCurrentOrder = cashReceived;
            surplus = 0;
            debtForCurrentOrder = orderTotal - cashReceived;
        }

        // 2. Handle Surplus (Auto-pay old debts)
        if (surplus > 0) {
            // Find unpaid orders for this customer, sorted by Date ASC (Oldest first)
            for (let i = 0; i < updatedOrders.length; i++) {
                if (surplus <= 0) break;
                
                const oldOrder = updatedOrders[i];
                if (oldOrder.customerName === orderInput.customerName && oldOrder.debt > 0) {
                     const debtAmount = oldOrder.debt;
                     const paymentAmount = Math.min(surplus, debtAmount);
                     
                     // Create payment record
                     const paymentRecord: PaymentRecord = {
                         id: `PAY-AUTO-${Date.now()}-${i}`,
                         date: new Date().toISOString(),
                         amount: paymentAmount,
                         note: `Trừ nợ từ đơn mới #${orderInput.id.slice(-4)}`
                     };

                     // Update the old order
                     updatedOrders[i] = {
                         ...oldOrder,
                         paidAmount: oldOrder.paidAmount + paymentAmount,
                         debt: oldOrder.debt - paymentAmount,
                         payments: [...(oldOrder.payments || []), paymentRecord]
                     };

                     surplus -= paymentAmount;
                }
            }
        }

        // 3. Create the Final New Order Object
        // IMPORTANT: Manually constructing object to ensure NO UNDEFINED fields
        const finalNewOrder: Order = {
            id: orderInput.id,
            date: orderInput.date,
            items: orderInput.items.map(item => ({
                ...item,
                weight: item.weight || 0, // Force number, no undefined
                priceHistory: [] // Items in order don't need history, save space
            })),
            total: orderInput.total,
            customerName: orderInput.customerName,
            saleType: orderInput.saleType,
            paidAmount: amountForCurrentOrder,
            debt: debtForCurrentOrder,
            discountApplied: orderInput.discountApplied || 0,
            note: orderInput.note || '', // Trust the detailed note generated by POS
            payments: [] // New order starts with no historical payments record
        };

        // 4. Add new order to list
        updatedOrders.push(finalNewOrder);

        // 5. Update Inventory - STRICT SANITIZATION
        // We explicitly map EVERY field to ensure no 'undefined' creeps in from existing data
        const updatedProducts = products.map(p => {
            const soldItem = finalNewOrder.items.find(i => i.id === p.id);
            const stockDeduction = soldItem ? soldItem.quantity : 0;
            
            return {
                id: p.id,
                name: p.name || '',
                category: p.category || 'Khác',
                price: p.price || 0,
                stock: Math.max(0, (p.stock || 0) - stockDeduction),
                unit: p.unit || 'con',
                description: p.description || '',
                image: p.image || '',
                minStockThreshold: p.minStockThreshold || 10,
                priceHistory: p.priceHistory || []
            };
        });

        // 6. Update State Locally FIRST (Instant UI feedback)
        setOrders(updatedOrders);
        setProducts(updatedProducts);

        // 7. Save to Cloud ATOMICALLY
        // Sử dụng saveTransactionToCloud để lưu cùng lúc
        await saveTransactionToCloud(updatedOrders, updatedProducts);

    } catch (error) {
        console.error("Checkout Logic Error:", error);
        alert("LỖI: Không thể lưu đơn hàng. Vui lòng kiểm tra lại kết nối hoặc tải lại trang!");
    }
  };

  const handleUpdateOrder = async (order: Order) => {
    const updatedOrders = orders.map(o => o.id === order.id ? order : o);
    setOrders(updatedOrders);
    await saveOrdersToCloud(updatedOrders);
  };

  const handleEditOrder = async (updatedOrder: Order, originalOrder: Order) => {
      let tempProducts = [...products];
      
      // Revert stock
      originalOrder.items.forEach(oldItem => {
          const productIndex = tempProducts.findIndex(p => p.id === oldItem.id);
          if (productIndex !== -1) {
              const p = tempProducts[productIndex];
              tempProducts[productIndex] = {
                  ...p,
                  stock: (p.stock || 0) + oldItem.quantity,
                  minStockThreshold: p.minStockThreshold || 10,
                  priceHistory: p.priceHistory || []
              };
          }
      });

      // Deduct new stock
      updatedOrder.items.forEach(newItem => {
          const productIndex = tempProducts.findIndex(p => p.id === newItem.id);
          if (productIndex !== -1) {
              const p = tempProducts[productIndex];
              tempProducts[productIndex] = {
                  ...p,
                  stock: Math.max(0, (p.stock || 0) - newItem.quantity),
                  minStockThreshold: p.minStockThreshold || 10,
                  priceHistory: p.priceHistory || []
              };
          }
      });

      const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      
      setProducts(tempProducts);
      setOrders(updatedOrders);

      // Use atomic save here too
      await saveTransactionToCloud(updatedOrders, tempProducts);
      
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
        return <SalesHistory orders={orders} onEditOrder={handleEditOrder} />;
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