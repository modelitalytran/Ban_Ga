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
import { getProducts, saveProducts, getOrders, saveOrders, getCustomers, saveCustomers } from './services/storage';
import { isAuthenticated, setSession } from './services/auth';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Check Auth on Mount
  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (isLoggedIn) {
      setProducts(getProducts());
      setOrders(getOrders());
      setCustomers(getCustomers());
    }
  }, [isLoggedIn]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      setSession(false);
      setIsLoggedIn(false);
      setCurrentView('dashboard'); // Reset view
    }
  };

  // Product Handlers
  const handleAddProduct = (product: Product) => {
    const updated = [...products, product];
    setProducts(updated);
    saveProducts(updated);
  };

  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    setProducts(updated);
    saveProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        saveProducts(updated);
    }
  };

  // Customer Handlers
  const handleAddCustomer = (customer: Customer) => {
      const updated = [...customers, customer];
      setCustomers(updated);
      saveCustomers(updated);
  };

  const handleUpdateCustomer = (customer: Customer) => {
      const updated = customers.map(c => c.id === customer.id ? customer : c);
      setCustomers(updated);
      saveCustomers(updated);
  };

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa đại lý này?")) {
        const updated = customers.filter(c => c.id !== id);
        setCustomers(updated);
        saveCustomers(updated);
    }
  };

  // Order Handlers
  const handleCheckout = (newOrder: Order) => {
    // 1. Calculate Surplus Logic (Gạch nợ tự động)
    let surplus = 0;
    const finalNewOrder = { ...newOrder };

    // If customer pays more than the order total
    if (finalNewOrder.paidAmount > finalNewOrder.total) {
        surplus = finalNewOrder.paidAmount - finalNewOrder.total;
        finalNewOrder.debt = 0;
    } else {
        finalNewOrder.debt = finalNewOrder.total - finalNewOrder.paidAmount;
    }

    let updatedOrders = [...orders];

    // 2. Distribute Surplus to Oldest Debts
    if (surplus > 0) {
        const customerDebtsIndices = updatedOrders
            .map((order, index) => ({ ...order, originalIndex: index }))
            .filter(o => 
                o.customerName === finalNewOrder.customerName && 
                o.debt > 0
            )
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const debtOrder of customerDebtsIndices) {
            if (surplus <= 0) break;

            const amountToPay = Math.min(surplus, debtOrder.debt);
            
            const paymentRecord: PaymentRecord = {
                id: `PAY-AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: new Date().toISOString(),
                amount: amountToPay,
                note: `Thanh toán cấn trừ từ đơn mới #${finalNewOrder.id.slice(-6)}`
            };

            const targetIndex = debtOrder.originalIndex;
            const orderToUpdate = updatedOrders[targetIndex];
            
            updatedOrders[targetIndex] = {
                ...orderToUpdate,
                paidAmount: orderToUpdate.paidAmount + amountToPay,
                debt: orderToUpdate.debt - amountToPay,
                payments: [...(orderToUpdate.payments || []), paymentRecord]
            };

            surplus -= amountToPay;
        }
    }

    // 3. Add the new order
    updatedOrders = [...updatedOrders, finalNewOrder];
    
    setOrders(updatedOrders);
    saveOrders(updatedOrders);

    // 4. Update Inventory
    const updatedProducts = products.map(p => {
      const soldItem = finalNewOrder.items.find(i => i.id === p.id);
      if (soldItem) {
        return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
      }
      return p;
    });
    setProducts(updatedProducts);
    saveProducts(updatedProducts);
  };

  const handleUpdateOrder = (order: Order) => {
    const updatedOrders = orders.map(o => o.id === order.id ? order : o);
    setOrders(updatedOrders);
    saveOrders(updatedOrders);
  };

  const handleEditOrder = (updatedOrder: Order, originalOrder: Order) => {
      // 1. Revert Stock from Original Order (Add back)
      let tempProducts = [...products];
      
      originalOrder.items.forEach(oldItem => {
          const productIndex = tempProducts.findIndex(p => p.id === oldItem.id);
          if (productIndex !== -1) {
              tempProducts[productIndex] = {
                  ...tempProducts[productIndex],
                  stock: tempProducts[productIndex].stock + oldItem.quantity
              };
          }
      });

      // 2. Deduct Stock for Updated Order (Subtract new qty)
      updatedOrder.items.forEach(newItem => {
          const productIndex = tempProducts.findIndex(p => p.id === newItem.id);
          if (productIndex !== -1) {
              tempProducts[productIndex] = {
                  ...tempProducts[productIndex],
                  stock: tempProducts[productIndex].stock - newItem.quantity
              };
          }
      });

      // 3. Update Order in List
      const updatedOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
      
      // 4. Save All
      setProducts(tempProducts);
      saveProducts(tempProducts);
      
      setOrders(updatedOrders);
      saveOrders(updatedOrders);
      
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
            orders={orders} // Added orders prop here
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
      <main className="flex-1 overflow-y-auto w-full">
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