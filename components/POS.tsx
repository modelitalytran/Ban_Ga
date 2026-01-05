import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, Order, SaleType, Customer } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Search, ShoppingBag, User, Store, Home, DollarSign, Wallet, Tag, Check, AlertCircle, X, ChevronUp } from 'lucide-react';

interface POSProps {
  products: Product[];
  customers: Customer[];
  onCheckout: (order: Order) => void;
  onAddCustomer: (customer: Customer) => void;
}

const POS: React.FC<POSProps> = ({ products, customers, onCheckout, onAddCustomer }) => {
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
    if (saleType !== 'agency') return null;
    return customers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) || null;
  }, [customerName, saleType, customers]);

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
    setPaidAmount(cartTotal);
  }, [cartTotal]);

  const debtAmount = useMemo(() => {
    const paid = Number(paidAmount);
    return Math.max(0, cartTotal - paid);
  }, [cartTotal, paidAmount]);

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
    
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      items: [...cart],
      total: cartTotal,
      customerName: customerName,
      saleType: saleType,
      paidAmount: finalPaid,
      debt: Math.max(0, cartTotal - finalPaid),
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
            h-[85dvh] lg:h-full overflow-hidden
            transform transition-transform duration-300
            ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
          `}>
            {/* 1. Header (Fixed) */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingCart size={20} /> Giỏ hàng ({cart.reduce((acc, item) => acc + item.quantity, 0)})
                </h2>
                <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 text-gray-500 hover:text-gray-800 bg-white rounded-full shadow-sm">
                    <X size={20} />
                </button>
            </div>

            {/* 2. Scrollable Middle Area (Items + Input Form) */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {/* Cart Items List */}
                <div className="space-y-4 mb-6">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            <ShoppingBag className="mx-auto mb-2 opacity-50" size={48} />
                            <p>Chưa có sản phẩm nào</p>
                        </div>
                    ) : (
                        cart.map(item => (
                        <div key={item.id} className="flex gap-3 items-center border-b border-gray-50 pb-3 last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate text-sm">{item.name}</p>
                                <p className="text-blue-600 text-sm font-semibold">{item.price.toLocaleString('vi-VN')} ₫</p>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-50">
                                    <Minus size={14} />
                                </button>
                                <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm">
                                    <Plus size={14} />
                                </button>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                <Trash2 size={18} />
                            </button>
                        </div>
                        ))
                    )}
                </div>

                {/* Form Inputs (Now part of the scrollable area) */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                     {/* Sale Type */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Loại đơn hàng</label>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                            <button 
                                onClick={() => setSaleType('retail')}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${saleType === 'retail' ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <User size={16} className="mb-1"/> Bán lẻ
                            </button>
                            <button 
                                onClick={() => setSaleType('agency')}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${saleType === 'agency' ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Store size={16} className="mb-1"/> Đại lý
                            </button>
                            <button 
                                onClick={() => setSaleType('internal')}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${saleType === 'internal' ? 'bg-green-100 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Home size={16} className="mb-1"/> Nhà ăn
                            </button>
                        </div>
                    </div>

                    {/* Customer Input */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Thông tin khách hàng</label>
                        <input 
                            type="text" 
                            placeholder={saleType === 'agency' ? "Chọn đại lý từ danh sách..." : "Nhập tên khách..."}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            list={saleType === 'agency' ? "customer-list" : undefined}
                            className="w-full mt-1.5 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        />
                        {saleType === 'agency' && (
                            <datalist id="customer-list">
                                {customers.map(c => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>
                        )}
                        
                        {/* Discount Info */}
                        {saleType === 'agency' && (
                            <div className="mt-1.5 flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-100">
                                {selectedCustomer ? (
                                    <span className="text-green-600 font-bold flex items-center gap-1">
                                        <Tag size={12}/> Chiết khấu: {selectedCustomer.discountRate}%
                                    </span>
                                ) : (
                                    <span className="text-orange-500 italic">* Khách mới (0%)</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Input */}
                    {saleType !== 'internal' && (
                         <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Thanh toán</label>
                            <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex-1">
                                    <span className="text-[10px] text-gray-500 block mb-0.5">Khách đưa</span>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(Number(e.target.value))}
                                            className="w-full pl-8 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                            placeholder="0"
                                        />
                                        <Wallet size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] text-gray-500 block mb-0.5">Còn nợ</span>
                                    <div className="w-full p-2 border border-red-100 bg-red-50 text-red-600 rounded-lg text-sm font-bold text-right">
                                        {debtAmount > 0 ? debtAmount.toLocaleString('vi-VN') : '0'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Footer (Fixed at Bottom) - Checkout Button & Totals */}
            <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] shrink-0 z-10">
                <div className="flex justify-between items-end mb-3">
                    <span className="text-sm text-gray-500">Tổng thanh toán:</span>
                    <div className="text-right">
                        {saleType === 'agency' && discountRate > 0 && (
                            <div className="text-xs text-green-600 line-through mb-0.5">
                                {subTotal.toLocaleString('vi-VN')} ₫
                            </div>
                        )}
                        <div className="text-xl font-bold text-gray-900 leading-none">
                            {cartTotal.toLocaleString('vi-VN')} ₫
                        </div>
                    </div>
                </div>

                <button 
                    disabled={cart.length === 0}
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <DollarSign size={20} />
                    {debtAmount > 0 ? 'Xác nhận Bán nợ' : 'Thanh toán Hoàn tất'}
                </button>
            </div>
          </div>
      </div>

      {/* Mobile Cart Toggle Button - Adjusted position */}
      <div className={`lg:hidden fixed bottom-20 landscape:bottom-4 left-4 right-4 z-40 transition-transform duration-300 ${cart.length > 0 ? 'translate-y-0' : 'translate-y-40'}`}>
        <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between ring-2 ring-white/20 backdrop-blur-sm"
        >
            <div className="flex items-center gap-3">
                <div className="bg-blue-500 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </div>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Tạm tính</span>
                    <span className="font-bold text-lg">{cartTotal.toLocaleString('vi-VN')} ₫</span>
                </div>
            </div>
            <div className="flex items-center gap-2 font-semibold text-sm bg-gray-800 px-3 py-1.5 rounded-lg">
                Xem giỏ hàng <ChevronUp size={16}/>
            </div>
        </button>
      </div>

      {/* Error Toast Notification */}
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
          <div className="bg-white px-10 py-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative z-10">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                  <Check size={32} className="text-green-600 stroke-[3]" />
              </div>
              <p className="font-bold text-xl text-gray-800">Thành công!</p>
              <p className="text-gray-500 text-sm mt-1">Đơn hàng đã được tạo</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;