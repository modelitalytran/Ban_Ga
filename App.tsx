import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import SalesHistory from './components/SalesHistory';
import DealerManager from './components/DealerManager';
import DebtManager from './components/DebtManager';
import AIAssistant from './components/AIAssistant';
import { ViewState, Product, Order, Customer } from './types';
import { getProducts, saveProducts, getOrders, saveOrders, getCustomers, saveCustomers } from './services/storage';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Load initial data
  useEffect(() => {
    setProducts(getProducts());
    setOrders(getOrders());
    setCustomers(getCustomers());
  }, []);

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
  const handleCheckout = (order: Order) => {
    // 1. Save Order
    const updatedOrders = [...orders, order];
    setOrders(updatedOrders);
    saveOrders(updatedOrders);

    // 2. Update Inventory
    const updatedProducts = products.map(p => {
      const soldItem = order.items.find(i => i.id === p.id);
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

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard products={products} orders={orders} />;
      case 'pos':
        return (
          <POS 
            products={products} 
            customers={customers}
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
        return <SalesHistory orders={orders} />;
      case 'ai-assistant':
        return <AIAssistant products={products} orders={orders} />;
      default:
        return <Dashboard products={products} orders={orders} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6]">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;