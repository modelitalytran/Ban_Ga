import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem, Order, SaleType, Customer } from '../types';
import { ShoppingCart, Plus, Minus, Trash2, Search, User, DollarSign, Wallet, Check, AlertCircle, X, Clock, AlertTriangle, Store, Home, ArrowRight, CreditCard, Scale, HandCoins } from 'lucide-react';

interface POSProps {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  onCheckout: (order: Order) => void;
  onAddCustomer: (customer: Customer) => void;
}

const POS: React.FC<POSProps> = ({ products, customers, orders, onCheckout, onAddCustomer }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Input Modal State for KG products
  const [selectedProductForInput, setSelectedProductForInput] = useState<Product | null>(null);
  const [inputWeight, setInputWeight] = useState<string>('');
  const [inputQuantity, setInputQuantity] = useState<string>('1');

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('retail');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Find selected customer object to get discount
  const selectedCustomer = useMemo(() => {
    const match = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
    return match || null;
  }, [customerName, customers]);

  // --- SMART FEATURE: Customer Credit Health ---
  const debtInfo = useMemo(() => {
    if (!customerName.trim()) return null;

    const customerOrders = orders.filter(o => 
        o.customerName.toLowerCase() === customerName.trim().toLowerCase() && 
        o.debt > 0
    );

    const totalOldDebt = customerOrders.reduce((sum, o) => sum + o.debt, 0);
    
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

  const handleProductClick = (product: Product) => {
      if (product.stock <= 0) {
          showError("Sản phẩm đã hết hàng!");
          return;
      }

      if (product.unit === 'kg') {
          setSelectedProductForInput(product);
          setInputWeight('');
          setInputQuantity('1'); 
      } else {
          addToCart(product, 1);
      }
  };

  const confirmAddToCart = () => {
      if (!selectedProductForInput) return;
      
      const weight = parseFloat(inputWeight);
      const qty = parseInt(inputQuantity);

      if (isNaN(weight) || weight <= 0) {
          alert("Vui lòng nhập số cân hợp lệ");
          return;
      }
      if (isNaN(qty) || qty <= 0) {
          alert("Vui lòng nhập số lượng con hợp lệ");
          return;
      }

      if (qty > selectedProductForInput.stock) {
          showError(`Kho chỉ còn ${selectedProductForInput.stock} con!`);
          return;
      }

      addToCart(selectedProductForInput, qty, weight);
      setSelectedProductForInput(null);
  };

  const addToCart = (product: Product, quantity: number, weight?: number) => {
    const existing = cart.find(item => item.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    
    if (currentQtyInCart + quantity > product.stock) {
        showError(`Không thể thêm! Chỉ còn ${product.stock} con trong kho.`);
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => {
            if (item.id === product.id) {
                return { 
                    ...item, 
                    quantity: item.quantity + quantity,
                    weight: (item.weight || 0) + (weight || 0) 
                };
            }
            return item;
        });
      }
      return [...prev, { ...product, quantity, weight: weight || 0 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
      const item = cart.find(i => i.id === id);
      const product = products.find(p => p.id === id);
      if (!item || !product) return;

      if (item.unit === 'kg') {
          showError("Vui lòng xóa và nhập lại để cập nhật số cân chính xác.");
          return; 
      }

      if (delta > 0 && item.quantity + delta > product.stock) {
          showError(`Đã đạt giới hạn tồn kho (${product.stock} con)`);
          return;
      }

      setCart(prev => prev.map(it => {
        if (it.id === id) {
            return { ...it, quantity: Math.max(1, it.quantity + delta) };
        }
        return it;
      }));
  };

  const subTotal = useMemo(() => {
      return cart.reduce((sum, item) => {
          if (item.unit === 'kg') {
              return sum + (item.price * (item.weight || 0));
          } else {
              return sum + (item.price * item.quantity);
          }
      }, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    if (saleType === 'internal') return 0;
    if (saleType === 'agency' && selectedCustomer) {
        return subTotal * ((100 - selectedCustomer.discountRate) / 100);
    }
    return subTotal;
  }, [subTotal, saleType, selectedCustomer]);

  useEffect(() => {
    setPaidAmount(cartTotal);
  }, [cartTotal]);

  // Handle Input Change for Paid Amount (Currency Formatting)
  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, ''); // Remove all non-digits
      if (rawValue === '') {
          setPaidAmount('');
      } else {
          setPaidAmount(parseInt(rawValue, 10)); // parseInt automatically removes leading zeros
      }
  };

  // --- STRICT LOGIC FOR PAYMENT ALLOCATION ---
  const paymentAllocation = useMemo(() => {
      const pay = Number(paidAmount) || 0;
      const oldDebt = debtInfo?.totalOldDebt || 0;
      
      let forCurrentOrder = 0;
      let forOldDebt = 0;
      let changeReturn = 0; // Tiền thừa trả khách
      let remainingDebt = 0; // Nợ mới của đơn này (nếu thiếu)

      if (pay >= cartTotal) {
          // 1. Pay full current order
          forCurrentOrder = cartTotal;
          
          // 2. Surplus logic
          const surplus = pay - cartTotal;
          
          if (surplus > 0) {
              if (oldDebt > 0) {
                  // Pay off old debt
                  forOldDebt = Math.min(surplus, oldDebt);
                  // Calculate remainder after paying old debt
                  const remainingSurplus = surplus - forOldDebt;
                  changeReturn = remainingSurplus > 0 ? remainingSurplus : 0;
              } else {
                  // No old debt, all surplus is change
                  changeReturn = surplus;
              }
          }
          
          remainingDebt = 0;
      } else {
          // Underpayment (Mua thiếu)
          forCurrentOrder = pay;
          forOldDebt = 0;
          changeReturn = 0;
          remainingDebt = cartTotal - pay;
      }

      return {
          forCurrentOrder,
          forOldDebt,
          changeReturn,
          remainingDebt, 
          // New total outstanding debt
          totalOutstanding: (oldDebt - forOldDebt) + remainingDebt
      };
  }, [cartTotal, paidAmount, debtInfo]);


  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
        showError("Vui lòng nhập tên khách hàng.");
        return;
    }

    if (paymentAllocation.changeReturn > 0 && (debtInfo?.totalOldDebt || 0) === 0) {
        if (!window.confirm(`Khách đưa dư ${paymentAllocation.changeReturn.toLocaleString('vi-VN')}đ. Xác nhận trả lại tiền thừa cho khách?`)) {
            return;
        }
    }
    
    if (paymentAllocation.forOldDebt > 0) {
         if (!window.confirm(`Đã thu dư ${paymentAllocation.forOldDebt.toLocaleString('vi-VN')}đ so với đơn này. Hệ thống sẽ tự động trừ vào nợ cũ của khách. Tiếp tục?`)) {
            return;
        }
    }

    if (saleType === 'agency' && !selectedCustomer) {
        const confirmNew = window.confirm(`Đại lý "${customerName}" chưa có trong danh sách. Thêm mới?`);
        if (confirmNew) {
            const newCustomer: Customer = {
                id: `CUS-${Date.now()}`,
                name: customerName,
                type: 'agency',
                discountRate: 0 
            };
            onAddCustomer(newCustomer);
        } else {
            return;
        }
    }

    // Quan trọng: Gửi số tiền khách đưa thực tế, App.tsx sẽ tính toán debt
    const finalPaidInput = paidAmount === '' ? 0 : Number(paidAmount);
    
    // Construct Detailed Note
    let detailedNote = '';
    if (saleType === 'internal') {
        detailedNote = 'Xuất nội bộ/Tặng';
    } else {
        // Build detailed payment breakdown string
        const parts = [];
        parts.push(`Khách đưa: ${finalPaidInput.toLocaleString('vi-VN')}đ`);
        
        if (paymentAllocation.forCurrentOrder > 0) {
            parts.push(`Đơn này: ${paymentAllocation.forCurrentOrder.toLocaleString('vi-VN')}đ`);
        }
        
        if (paymentAllocation.forOldDebt > 0) {
             parts.push(`Trừ nợ cũ: ${paymentAllocation.forOldDebt.toLocaleString('vi-VN')}đ`);
        }
        
        if (paymentAllocation.changeReturn > 0) {
             parts.push(`Tiền thừa: ${paymentAllocation.changeReturn.toLocaleString('vi-VN')}đ`);
        }

        detailedNote = parts.join(" | ");
    }

    // Create Clean Order Object
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      items: cart.map(item => ({
          ...item,
          weight: item.weight || 0 // Ensure weight is 0 if undefined
      })),
      total: cartTotal,
      customerName: customerName,
      saleType: saleType,
      paidAmount: finalPaidInput, 
      debt: 0, // Placeholder, will be calculated in App.tsx
      note: detailedNote, // Use the generated detailed note
      discountApplied: discountRate || 0,
      payments: []
    };

    onCheckout(newOrder);
    
    // Reset
    setCart([]); 
    setCustomerName('');
    setSaleType('retail');
    setPaidAmount('');
    setIsMobileCartOpen(false); 
    
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
              onClick={() => handleProductClick(product)}
              className={`bg-white p-3 rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col relative overflow-hidden h-full min-h-[280px] ${product.stock === 0 ? 'opacity-60 grayscale cursor-not-allowed border-gray-100' : 'border-gray-100'}`}
            >
              {product.stock === 0 && (
                <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center pointer-events-none">
                    <span className="bg-gray-800 text-white text-xs px-2 py-1 rounded font-bold">HẾT HÀNG</span>
                </div>
              )}
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden relative shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                {product.unit === 'kg' && (
                    <div className="absolute top-1 right-1 bg-white/90 p-1 rounded-md shadow-sm">
                        <Scale size={14} className="text-blue-600"/>
                    </div>
                )}
              </div>
              <h3 className="font-medium text-gray-800 text-sm mb-2 flex-1 leading-snug line-clamp-2" title={product.name}>{product.name}</h3>
              
              {/* Footer Section - Always Visible */}
              <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-end">
                <div className="flex flex-col">
                     <span className="text-xs text-gray-400 font-medium">Giá bán</span>
                     <span className="text-blue-600 font-bold text-sm">
                        {product.price.toLocaleString('vi-VN')}
                        <span className="text-[10px] text-gray-500 font-normal">/{product.unit}</span>
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400 font-medium">Tồn kho</span>
                    <span className={`text-xs ${product.stock < (product.minStockThreshold || 10) ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
                        {product.stock} con
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className={`
        fixed inset-0 z-50 lg:static lg:z-auto 
        flex flex-col justify-end lg:justify-start
        transition-opacity duration-300
        ${isMobileCartOpen ? 'opacity-100 visible' : 'opacity-0 invisible lg:opacity-100 lg:visible'}
      `}>
          <div 
            className="absolute inset-0 bg-black/60 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileCartOpen(false)}
          ></div>

          <div className={`
            relative w-full lg:w-96 bg-white lg:rounded-2xl rounded-t-2xl shadow-2xl lg:shadow-lg border border-gray-100 flex flex-col 
            h-[90dvh] lg:h-full animate-in slide-in-from-bottom-10 lg:animate-none
          `}>
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

             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                        <Store size={48} className="mb-2"/>
                        <p>Giỏ hàng trống</p>
                    </div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex gap-3 items-center group">
                             <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                                 <img src={item.image} alt="" className="w-full h-full object-cover"/>
                                 {item.unit === 'kg' && (
                                     <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl-md">
                                         {item.weight}kg
                                     </div>
                                 )}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
                                 <p className="text-blue-600 font-bold text-sm">
                                     {item.unit === 'kg' 
                                        ? (item.price * (item.weight || 0)).toLocaleString('vi-VN')
                                        : (item.price * item.quantity).toLocaleString('vi-VN')
                                     }
                                 </p>
                             </div>
                             <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                                 {item.unit === 'kg' ? (
                                    <div className="px-2 py-1 text-sm font-bold text-gray-600">
                                        {item.quantity} con
                                    </div>
                                 ) : (
                                    <>
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md text-gray-500 transition-colors"><Minus size={14}/></button>
                                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md text-gray-500 transition-colors"><Plus size={14}/></button>
                                    </>
                                 )}
                             </div>
                             <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Trash2 size={16}/>
                             </button>
                        </div>
                    ))
                )}
             </div>

             <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3 lg:rounded-b-2xl">
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
                                        Công nợ cũ
                                        {debtInfo.status === 'danger' && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase">Nợ xấu</span>}
                                    </p>
                                    <p className="text-lg font-bold text-red-600">
                                        {debtInfo.totalOldDebt.toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleFullPaymentClick}
                                className="w-full mt-1 bg-white/50 hover:bg-white/80 border border-current rounded py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                                <CreditCard size={12}/> Thanh toán hết cả nợ cũ ({ (cartTotal + debtInfo.totalOldDebt).toLocaleString('vi-VN') })
                            </button>
                        </div>
                     )}
                 </div>

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

                 <div className="space-y-2 pt-2 border-t border-gray-200">
                     <div className="flex justify-between items-end">
                         <span className="text-gray-800 font-bold">Tổng đơn hàng</span>
                         <span className="text-xl font-bold text-blue-600">{cartTotal.toLocaleString('vi-VN')}</span>
                     </div>
                 </div>

                 <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">Tiền khách đưa</label>
                     <div className="relative">
                         <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                             <DollarSign size={16} />
                         </div>
                         <input 
                            type="text"
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
                            value={paidAmount ? paidAmount.toLocaleString('vi-VN') : ''}
                            onChange={handlePaidAmountChange}
                            placeholder="0"
                         />
                     </div>
                     
                     {/* PAYMENT ALLOCATION VISUALIZATION */}
                     {paidAmount !== '' && (
                         <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-gray-200 shadow-sm animate-in slide-in-from-top-1">
                             <div className="flex justify-between items-center text-gray-600 pb-1 border-b border-dashed border-gray-100">
                                 <span>Thanh toán đơn này:</span>
                                 <span className={`font-bold ${paymentAllocation.remainingDebt > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                     {paymentAllocation.forCurrentOrder.toLocaleString('vi-VN')}
                                     {paymentAllocation.remainingDebt > 0 && ` (Thiếu ${paymentAllocation.remainingDebt.toLocaleString('vi-VN')})`}
                                 </span>
                             </div>
                             
                             {/* Show old debt deduction */}
                             {paymentAllocation.forOldDebt > 0 && (
                                <div className="flex justify-between text-orange-600 py-1">
                                    <span className="flex items-center gap-1 font-medium"><ArrowRight size={10}/> Trừ nợ cũ:</span>
                                    <span className="font-bold">-{paymentAllocation.forOldDebt.toLocaleString('vi-VN')}</span>
                                </div>
                             )}

                             {/* Show Change Return */}
                             {paymentAllocation.changeReturn > 0 && (
                                <div className="flex justify-between text-blue-600 py-1 bg-blue-50 px-1.5 rounded -mx-1.5">
                                    <span className="flex items-center gap-1 font-bold"><HandCoins size={12}/> Tiền thừa trả khách:</span>
                                    <span className="font-bold">+{paymentAllocation.changeReturn.toLocaleString('vi-VN')}</span>
                                </div>
                             )}

                             <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-bold">
                                 <span>Tổng nợ sau giao dịch:</span>
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

      {selectedProductForInput && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          <img src={selectedProductForInput.image} className="w-full h-full object-cover"/>
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-800">{selectedProductForInput.name}</h3>
                          <p className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-1.5 rounded">{selectedProductForInput.price.toLocaleString()}đ / kg</p>
                      </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                       <div>
                           <label className="block text-sm font-semibold text-gray-700 mb-1">Cân nặng (Kg) <span className="text-red-500">*</span></label>
                           <input 
                               type="number" 
                               autoFocus
                               className="w-full px-4 py-3 border border-blue-200 bg-blue-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-bold text-blue-700"
                               placeholder="0.0"
                               value={inputWeight}
                               onChange={e => setInputWeight(e.target.value)}
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng con</label>
                           <div className="flex items-center gap-2">
                               <button 
                                   onClick={() => setInputQuantity(Math.max(1, parseInt(inputQuantity || '0') - 1).toString())}
                                   className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50"
                               >
                                   <Minus size={18}/>
                               </button>
                               <input 
                                   type="number" 
                                   className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 outline-none text-xl font-bold text-center"
                                   placeholder="1"
                                   value={inputQuantity}
                                   onChange={e => setInputQuantity(e.target.value)}
                               />
                               <button 
                                   onClick={() => setInputQuantity((parseInt(inputQuantity || '0') + 1).toString())}
                                   className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50"
                               >
                                   <Plus size={18}/>
                               </button>
                           </div>
                       </div>
                  </div>

                  <div className="p-5 border-t border-gray-100 flex gap-3">
                      <button 
                        onClick={() => setSelectedProductForInput(null)}
                        className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                      >
                          Hủy
                      </button>
                      <button 
                        onClick={confirmAddToCart}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                      >
                          Xác nhận
                      </button>
                  </div>
              </div>
          </div>
      )}

      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
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