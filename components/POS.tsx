import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, Order, SaleType, Customer } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Search, User, DollarSign, Wallet, Tag, Check, AlertCircle, X, Clock, AlertTriangle, TrendingUp, ShoppingBag, Store, Home, ArrowRight, CreditCard } from 'lucide-react';

interface POSProps {
  products: Product[];
  customers: Customer[];
  orders: Order[]; // Required for debt calculation
  onCheckout: (order: Order) => void;
  onAddCustomer: (customer: Customer) => void;
}

const POS: React.FC<POSProps> = ({ products, customers, orders, onCheckout, onAddCustomer }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('retail');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Find selected customer object to get discount
  const selectedCustomer = useMemo(() => {
    // Try to match exactly or case-insensitive
    const match = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
    return match || null;
  }, [customerName, customers]);

  // --- SMART FEATURE: Customer Credit Health ---
  const debtInfo = useMemo(() => {
    if (!customerName.trim()) return null;

    // Filter orders for this customer that still have debt
    const customerOrders = orders.filter(o => 
        o.customerName.toLowerCase() === customerName.trim().toLowerCase() && 
        o.debt > 0
    );

    const totalOldDebt = customerOrders.reduce((sum, o) => sum + o.debt, 0);
    
    // Check overdue (older than 30 days)
    const overdueOrders = customerOrders.filter(o => {
        const diffTime = Math.abs(new Date().getTime() - new Date(o.date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 30;
    });

    let status: 'good' | 'warning' | 'danger' = 'good';
    if (overdueOrders.length > 0) status = 'danger';
    else if (totalOldDebt > 0) status = 'warning';

    return {
        hasDebt: totalOldDebt > 0,
        totalOldDebt,
        overdueCount: overdueOrders.length,
        status
    };
  }, [customerName, orders]);

  // Auto-set Sale Type based on customer type
  useEffect(() => {
      if (selectedCustomer) {
          setSaleType(selectedCustomer.type);
      }
  }, [selectedCustomer]);

  const discountRate = useMemo(() => {
      if (saleType === 'internal') return 100;
      if (saleType === 'agency' && selectedCustomer) return selectedCustomer.discountRate;
      return 0;
  }, [saleType, selectedCustomer]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const addToCart = (product: Product) => {
    // Check stock limit
    const existing = cart.find(item => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    
    if (currentQty + 1 > product.stock) {
        showError(`Không thể thêm! Chỉ còn ${product.stock} con trong kho.`);
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    // Check stock limit before updating
    if (delta > 0) {
        const item = cart.find(i => i.id === id);
        const product = products.find(p => p.id === id);
        
        if (item && product) {
            if (item.quantity + delta > product.stock) {
                showError(`Đã đạt giới hạn tồn kho (${product.stock} con)`);
                return;
            }
        }
    }

    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subTotal = useMemo(() => {
      return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    if (saleType === 'internal') return 0; // Biếu tặng = 0đ
    if (saleType === 'agency' && selectedCustomer) {
        // Dynamic discount per customer
        return subTotal * ((100 - selectedCustomer.discountRate) / 100);
    }
    return subTotal;
  }, [subTotal, saleType, selectedCustomer]);

  // Set default paid amount when total changes 
  useEffect(() => {
     // Default to full payment of CURRENT order
    setPaidAmount(cartTotal);
  }, [cartTotal]);

  // --- SMART PAYMENT CALCULATION ---
  const paymentAllocation = useMemo(() => {
      const pay = Number(paidAmount) || 0;
      const oldDebt = debtInfo?.totalOldDebt || 0;
      
      let forCurrentOrder = 0;
      let forOldDebt = 0;
      let remainingDebt = 0;
      let newDebt = 0;

      if (pay >= cartTotal) {
          forCurrentOrder = cartTotal;
          const surplus = pay - cartTotal;
          forOldDebt = Math.min(surplus, oldDebt);
          remainingDebt = Math.max(0, oldDebt - forOldDebt);
          newDebt = 0;
      } else {
          forCurrentOrder = pay;
          forOldDebt = 0;
          remainingDebt = oldDebt;
          newDebt = cartTotal - pay;
      }

      return {
          forCurrentOrder,
          forOldDebt,
          remainingDebt, // Old debt remaining
          newDebt, // New debt from this order
          totalOutstanding: remainingDebt + newDebt
      };
  }, [cartTotal, paidAmount, debtInfo]);


  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
        showError("Vui lòng nhập tên khách hàng.");
        return;
    }

    // Auto-save new customer if agency
    if (saleType === 'agency' && !selectedCustomer) {
        const confirmNew = window.confirm(`Đại lý "${customerName}" chưa có trong danh sách. Bạn có muốn thêm mới với mức chiết khấu 0% không?`);
        if (confirmNew) {
            const newCustomer: Customer = {
                id: `CUS-${Date.now()}`,
                name: customerName,
                type: 'agency',
                discountRate: 0 // Default 0 for new on-the-fly agents
            };
            onAddCustomer(newCustomer);
        } else {
            return;
        }
    }

    const finalPaid = Number(paidAmount);
    
    // Note: We send the raw entered paidAmount. App.tsx handles the distribution logic.
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal,
      customerName: customerName,
      saleType: saleType,
      paidAmount: finalPaid,
      debt: 0, // This will be recalculated in App.tsx
      note: saleType === 'internal' ? 'Xuất nội bộ/Tặng' : undefined,
      discountApplied: discountRate
    };

    onCheckout(newOrder);
    setCart([]); 
    setCustomerName('');
    setSaleType('retail');
    setPaidAmount('');
    setIsMobileCartOpen(false); // Close mobile cart
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleFullPaymentClick = () => {
      const totalNeedToPay = cartTotal + (debtInfo?.totalOldDebt || 0);
      setPaidAmount(totalNeedToPay);
  }

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-2rem)] gap-6 relative">
      
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        <div className="relative sticky top-0 z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
            type="text" 
            placeholder="Tìm gà, vịt, bồ câu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
            />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 landscape:grid-cols-4 sm:grid-cols-3 xl:grid-cols-4 gap-4 p-1 pb-32 lg:pb-1">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className={`bg-white p-3 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col relative overflow-hidden ${product.stock === 0 ? 'opacity-60 grayscale cursor-not-allowed border-gray-100' : 'border-gray-100'}`}
            >
              {product.stock === 0 && (
                <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded font-bold">HẾT HÀNG</span>
                </div>
              )}
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-medium text-gray-800 line-clamp-2 mb-1 text-sm">{product.name}</h3>
              <div className="mt-auto flex justify-between items-center">
                <span className="text-blue-600 font-bold text-sm">{product.price.toLocaleString('vi-VN')}</span>
                <span className={`text-xs ${product.stock < (product.minStockThreshold || 10) ? 'text-orange-500 font-bold' : 'text-gray-500'}`}>
                    Kho: {product.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section - Improved Layout for Mobile */}
      <div className={`
        fixed inset-0 z-50 lg:static lg:z-auto 
        flex flex-col justify-end lg:justify-start
        transition-opacity duration-300
        ${isMobileCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible lg:opacity-100 lg:visible'}
      `}>
          {/* Backdrop for Mobile */}
          <div 
            className="absolute inset-0 bg-black/60 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileCartOpen(false)}
          ></div>

          {/* Cart Container */}
          <div className={`
            relative w-full lg:w-96 bg-white lg:rounded-2xl rounded-t-2xl shadow-2xl lg:shadow-lg border border-gray-100 flex flex-col 
            h-[85dvh] lg:h-full animate-in slide-in-from-bottom-10 lg:animate-none
          `}>
             {/* Header */}
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 lg:rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <ShoppingCart size={20} />
                    </div>
                    <h2 className="font-bold text-gray-800">Giỏ hàng</h2>
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.reduce((s,i) => s + i.quantity, 0)}</span>
                </div>
                <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full">
                    <X size={20} />
                </button>
             </div>

             {/* Cart Items */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <ShoppingBag size={48} className="mb-2"/>
                        <p>Giỏ hàng trống</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex gap-3 items-center group">
                             <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                 <img src={item.image} alt="" className="w-full h-full object-cover"/>
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
                                 <p className="text-blue-600 font-bold text-sm">{(item.price * item.quantity).toLocaleString('vi-VN')}</p>
                             </div>
                             <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                 <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md text-gray-500 transition-colors"><Minus size={14}/></button>
                                 <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                 <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md text-gray-500 transition-colors"><Plus size={14}/></button>
                             </div>
                             <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 size={16}/>
                             </button>
                        </div>
                    ))
                )}
             </div>

             {/* Checkout Form */}
             <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3 lg:rounded-b-2xl">
                 {/* 1. Customer Selection */}
                 <div className="space-y-1">
                     <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                        Khách hàng
                        {selectedCustomer && <span className="text-green-600 flex items-center gap-1 normal-case"><Check size={12}/> Đã lưu</span>}
                     </label>
                     <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                             <User size={16} />
                         </div>
                         <input 
                            list="customer-list"
                            className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-colors ${debtInfo?.status === 'danger' ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
                            placeholder="Nhập tên khách..."
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                         />
                         <datalist id="customer-list">
                            {customers.map(c => <option key={c.id} value={c.name} />)}
                         </datalist>
                     </div>

                     {/* SMART DEBT INFO CARD */}
                     {debtInfo && debtInfo.hasDebt && (
                        <div className={`mt-2 p-3 rounded-lg border text-sm animate-in slide-in-from-top-2 ${
                            debtInfo.status === 'danger' ? 'bg-red-50 border-red-200 text-red-900' :
                            debtInfo.status === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-900' :
                            'bg-blue-50 border-blue-200 text-blue-900'
                        }`}>
                            <div className="flex items-start gap-2 mb-2">
                                {debtInfo.status === 'danger' ? <AlertTriangle size={18} className="text-red-600 shrink-0"/> : <Clock size={18} className="text-orange-600 shrink-0"/>}
                                <div className="flex-1">
                                    <p className="font-bold flex items-center justify-between">
                                        Hồ sơ công nợ
                                        {debtInfo.status === 'danger' && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase">Nợ xấu</span>}
                                    </p>
                                    <p className="text-xs opacity-90 mt-0.5">
                                        Đang nợ cũ: <span className="font-bold">{debtInfo.totalOldDebt.toLocaleString('vi-VN')}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleFullPaymentClick}
                                className="w-full mt-1 bg-white/50 hover:bg-white/80 border border-current rounded py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                                <CreditCard size={12}/> Thanh toán hết ({ (cartTotal + debtInfo.totalOldDebt).toLocaleString('vi-VN') })
                            </button>
                        </div>
                     )}
                 </div>

                 {/* 2. Sale Type */}
                 <div className="grid grid-cols-3 gap-2">
                     {[
                         {id: 'retail', label: 'Bán lẻ', icon: <Store size={14}/>},
                         {id: 'agency', label: 'Đại lý', icon: <Wallet size={14}/>},
                         {id: 'internal', label: 'Nội bộ', icon: <Home size={14}/>}
                     ].map(type => (
                         <button
                            key={type.id}
                            onClick={() => setSaleType(type.id as SaleType)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                                saleType === type.id 
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                            }`}
                         >
                             <div className="mb-1">{type.icon}</div>
                             {type.label}
                         </button>
                     ))}
                 </div>

                 {/* 3. Totals */}
                 <div className="space-y-2 pt-2 border-t border-gray-200">
                     <div className="flex justify-between items-end">
                         <span className="text-gray-800 font-bold">Thành tiền</span>
                         <span className="text-xl font-bold text-blue-600">{cartTotal.toLocaleString('vi-VN')}</span>
                     </div>
                 </div>

                 {/* 4. Payment Input */}
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">Khách trả</label>
                     <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                             <DollarSign size={16} />
                         </div>
                         <input 
                            type="number"
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(Number(e.target.value))}
                            placeholder="0"
                         />
                     </div>
                     
                     {/* SMART ALLOCATION VISUALIZATION */}
                     {paidAmount !== '' && (
                         <div className="text-xs space-y-1 bg-gray-50 p-2 rounded border border-gray-100 animate-in slide-in-from-top-1">
                             <div className="flex justify-between text-gray-600">
                                 <span>Đơn này:</span>
                                 <span className={paymentAllocation.forCurrentOrder < cartTotal ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                     {paymentAllocation.forCurrentOrder.toLocaleString('vi-VN')} / {cartTotal.toLocaleString('vi-VN')}
                                 </span>
                             </div>
                             
                             {debtInfo?.hasDebt && paymentAllocation.forOldDebt > 0 && (
                                <div className="flex justify-between text-blue-600 bg-blue-50 px-1 rounded">
                                    <span className="flex items-center gap-1"><ArrowRight size={10}/> Trừ nợ cũ:</span>
                                    <span className="font-bold">-{paymentAllocation.forOldDebt.toLocaleString('vi-VN')}</span>
                                </div>
                             )}

                             <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-bold">
                                 <span>Tổng dư nợ còn lại:</span>
                                 <span className={paymentAllocation.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}>
                                     {paymentAllocation.totalOutstanding.toLocaleString('vi-VN')}
                                 </span>
                             </div>
                         </div>
                     )}
                 </div>

                 <button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] mt-2"
                 >
                     Thanh toán
                 </button>
             </div>
          </div>
      </div>

      {/* Floating Cart Button (Mobile Only) */}
      {!isMobileCartOpen && cart.length > 0 && (
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="lg:hidden fixed bottom-24 right-4 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-40 animate-bounce-subtle flex items-center gap-2"
          >
              <ShoppingCart size={24} />
              <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full absolute -top-1 -right-1 border border-blue-600">
                  {cart.reduce((s,i) => s + i.quantity, 0)}
              </span>
          </button>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200"></div>
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 relative z-10">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                  <Check size={28} className="text-green-600 stroke-[3]" />
              </div>
              <p className="font-bold text-gray-800">Thanh toán thành công!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;