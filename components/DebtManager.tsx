import React, { useState, useMemo } from 'react';
import { Order, Customer, PaymentRecord } from '../types';
import { 
  Users, Search, DollarSign, Calendar, AlertCircle, CheckCircle, 
  ChevronRight, ArrowUpRight, Clock, FileText, X, Check
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DebtManagerProps {
  orders: Order[];
  customers: Customer[];
  onUpdateOrder: (order: Order) => void;
}

type Tab = 'overview' | 'aging';

const DebtManager: React.FC<DebtManagerProps> = ({ orders, customers, onUpdateOrder }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNote, setPaymentNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // --- Statistics ---
  const debtStats = useMemo(() => {
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    const totalDebtors = new Set(orders.filter(o => o.debt > 0).map(o => o.customerName)).size;
    const overdueOrders = orders.filter(o => {
        if (o.debt <= 0) return false;
        const diffTime = Math.abs(new Date().getTime() - new Date(o.date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 30; // 30 days credit term
    }).length;
    return { totalDebt, totalDebtors, overdueOrders };
  }, [orders]);

  // --- Group By Customer ---
  const debtsByCustomer = useMemo(() => {
    const map = new Map<string, { totalDebt: number, count: number, latestDate: string }>();
    
    orders.filter(o => o.debt > 0).forEach(order => {
        const current = map.get(order.customerName) || { totalDebt: 0, count: 0, latestDate: order.date };
        map.set(order.customerName, {
            totalDebt: current.totalDebt + order.debt,
            count: current.count + 1,
            latestDate: new Date(order.date) > new Date(current.latestDate) ? order.date : current.latestDate
        });
    });

    // Map to array and filter by search
    return Array.from(map.entries())
        .map(([name, data]) => {
            const customerInfo = customers.find(c => c.name === name);
            return {
                name,
                ...data,
                phone: customerInfo?.phone || '---',
                address: customerInfo?.address || '---'
            };
        })
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.totalDebt - a.totalDebt);
  }, [orders, customers, searchTerm]);

  // --- Debt Aging Analysis ---
  const agingData = useMemo(() => {
    const bins = {
        '0-30 ngày': 0,
        '31-60 ngày': 0,
        'Trên 60 ngày': 0
    };

    orders.filter(o => o.debt > 0).forEach(order => {
        const diffTime = Math.abs(new Date().getTime() - new Date(order.date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays <= 30) bins['0-30 ngày'] += order.debt;
        else if (diffDays <= 60) bins['31-60 ngày'] += order.debt;
        else bins['Trên 60 ngày'] += order.debt;
    });

    return [
        { name: 'Trong hạn (0-30)', value: bins['0-30 ngày'], color: '#10b981' }, // Green
        { name: 'Quá hạn (31-60)', value: bins['31-60 ngày'], color: '#f59e0b' }, // Orange
        { name: 'Nợ xấu (>60)', value: bins['Trên 60 ngày'], color: '#ef4444' }    // Red
    ];
  }, [orders]);

  // --- Actions ---

  const openPaymentModal = (order: Order) => {
    setSelectedOrderForPayment(order);
    setPaymentAmount(order.debt); // Default to full remaining debt
    setPaymentNote('');
    setIsPaymentModalOpen(true);
  };

  const handleProcessPayment = () => {
    if (!selectedOrderForPayment || !paymentAmount || Number(paymentAmount) <= 0) return;

    const amount = Number(paymentAmount);
    if (amount > selectedOrderForPayment.debt) {
        alert("Số tiền thanh toán không được lớn hơn số nợ còn lại!");
        return;
    }

    const newPayment: PaymentRecord = {
        id: `PAY-${Date.now()}`,
        date: new Date().toISOString(),
        amount: amount,
        note: paymentNote
    };

    const updatedOrder: Order = {
        ...selectedOrderForPayment,
        paidAmount: selectedOrderForPayment.paidAmount + amount,
        debt: selectedOrderForPayment.debt - amount,
        payments: [...(selectedOrderForPayment.payments || []), newPayment]
    };

    onUpdateOrder(updatedOrder);
    setIsPaymentModalOpen(false);
    
    // Show success animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // --- Render Helpers ---
  const getSelectedCustomerOrders = () => {
      if (!selectedCustomerName) return [];
      return orders
        .filter(o => o.customerName === selectedCustomerName && o.debt > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Oldest first
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600"/> Quản lý Công nợ
            </h2>
            <p className="text-gray-500 text-sm mt-1">Theo dõi các khoản phải thu và lịch sử thanh toán</p>
        </div>
        
        {/* KPI Summary */}
        <div className="flex gap-4">
             <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                <p className="text-xs text-red-500 uppercase font-bold">Tổng nợ phải thu</p>
                <p className="text-xl font-bold text-red-600">{debtStats.totalDebt.toLocaleString('vi-VN')} ₫</p>
             </div>
             <div className="hidden md:block bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-500 uppercase font-bold">Đơn quá hạn</p>
                <p className="text-xl font-bold text-orange-600">{debtStats.overdueOrders}</p>
             </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            Danh sách Khách nợ
        </button>
        <button 
            onClick={() => setActiveTab('aging')}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'aging' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
            Báo cáo Tuổi nợ
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        
        {activeTab === 'overview' && (
            <div className="flex flex-col lg:flex-row h-full">
                {/* Left Panel: Customer List */}
                <div className={`${selectedCustomerName ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 flex-col border-r border-gray-100`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Tìm khách nợ..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {debtsByCustomer.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">Không có khách hàng nào đang nợ.</div>
                        ) : (
                            debtsByCustomer.map(c => (
                                <div 
                                    key={c.name}
                                    onClick={() => setSelectedCustomerName(c.name)}
                                    className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomerName === c.name ? 'bg-blue-50 ring-inset ring-2 ring-blue-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-gray-800">{c.name}</h4>
                                        <span className="font-bold text-red-600 text-sm">{c.totalDebt.toLocaleString('vi-VN')}</span>
                                    </div>
                                    <div className="flex justify-between items-end text-xs text-gray-500">
                                        <div>
                                            <p className="flex items-center gap-1"><Users size={12}/> {c.phone}</p>
                                            <p className="mt-0.5">{c.count} đơn nợ</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300"/>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Debt Details */}
                <div className={`${!selectedCustomerName ? 'hidden lg:flex' : 'flex'} w-full lg:w-2/3 flex-col bg-white`}>
                    {selectedCustomerName ? (
                        <>
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <button onClick={() => setSelectedCustomerName(null)} className="lg:hidden p-2 -ml-2 text-gray-600">
                                    <ChevronRight size={20} className="rotate-180"/>
                                </button>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{selectedCustomerName}</h3>
                                    <p className="text-sm text-gray-500">Chi tiết các đơn hàng chưa thanh toán</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 uppercase block">Tổng phải thu</span>
                                    <span className="text-xl font-bold text-red-600">
                                        {debtsByCustomer.find(c => c.name === selectedCustomerName)?.totalDebt.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {getSelectedCustomerOrders().map(order => {
                                    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24));
                                    const isOverdue = diffDays > 30;
                                    
                                    return (
                                        <div key={order.id} className={`border rounded-xl p-4 shadow-sm ${isOverdue ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-white'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm font-semibold text-gray-600">#{order.id.slice(-6)}</span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Calendar size={12}/> {new Date(order.date).toLocaleDateString('vi-VN')}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full uppercase">
                                                                Quá hạn {diffDays} ngày
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                                        {order.items.map(i => `${i.quantity} ${i.name}`).join(', ')}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => openPaymentModal(order)}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                                                >
                                                    <DollarSign size={14}/> Thanh toán
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-sm pt-3 border-t border-dashed border-gray-200">
                                                <div className="flex gap-4">
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Tổng tiền</span>
                                                        <span className="font-semibold">{order.total.toLocaleString('vi-VN')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Đã trả</span>
                                                        <span className="font-semibold text-green-600">{order.paidAmount.toLocaleString('vi-VN')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs text-gray-500">Còn nợ</span>
                                                    <span className="font-bold text-red-600 text-base">{order.debt.toLocaleString('vi-VN')}</span>
                                                </div>
                                            </div>

                                            {/* Payment History Mini View */}
                                            {order.payments && order.payments.length > 0 && (
                                                <div className="mt-3 bg-white/50 rounded-lg p-2 text-xs border border-gray-100">
                                                    <p className="font-semibold text-gray-500 mb-1">Lịch sử trả tiền:</p>
                                                    {order.payments.map((p, idx) => (
                                                        <div key={p.id || idx} className="flex justify-between text-gray-600">
                                                            <span>{new Date(p.date).toLocaleDateString('vi-VN')}</span>
                                                            <span className="text-gray-400 italic truncate max-w-[100px]">{p.note}</span>
                                                            <span className="font-medium text-green-600">+{p.amount.toLocaleString('vi-VN')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <ArrowUpRight size={32} className="opacity-50"/>
                            </div>
                            <p>Chọn một khách hàng để xem chi tiết nợ và thanh toán</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'aging' && (
            <div className="p-6 h-full overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chart */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock size={18} className="text-orange-500"/> Phân tích Tuổi nợ
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={agingData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 500, fontSize: 12}} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                        formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, 'Số tiền nợ']}
                                    />
                                    <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                                        {agingData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Explainer */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-800">Gợi ý hành động</h3>
                        
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                             <div className="p-2 bg-green-100 text-green-600 rounded-lg shrink-0">
                                <CheckCircle size={20}/>
                             </div>
                             <div>
                                <p className="font-bold text-green-800 text-sm">Trong hạn (0-30 ngày)</p>
                                <p className="text-xs text-green-700 mt-1">Các khoản nợ mới phát sinh, thường nằm trong chu kỳ thanh toán bình thường. Gửi tin nhắn nhắc nhẹ trước ngày chốt sổ.</p>
                             </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                                <AlertCircle size={20}/>
                             </div>
                             <div>
                                <p className="font-bold text-orange-800 text-sm">Quá hạn (31-60 ngày)</p>
                                <p className="text-xs text-orange-700 mt-1">Cần liên hệ trực tiếp để nhắc nhở thanh toán. Xem xét tạm dừng cấp hàng mới nếu chưa thanh toán khoản cũ.</p>
                             </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                             <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
                                <X size={20}/>
                             </div>
                             <div>
                                <p className="font-bold text-red-800 text-sm">Nợ xấu ({'>'} 60 ngày)</p>
                                <p className="text-xs text-red-700 mt-1">Rủi ro cao. Cần có biện pháp thu hồi nợ quyết liệt hơn hoặc lên phương án xử lý nợ khó đòi.</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                        <DollarSign size={20}/> Thu nợ
                    </h3>
                    <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Khách hàng</p>
                        <p className="font-bold text-gray-800">{selectedOrderForPayment.customerName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Đơn hàng</p>
                        <p className="text-sm text-gray-800">#{selectedOrderForPayment.id.slice(-6)} - Còn nợ: <span className="font-bold text-red-600">{selectedOrderForPayment.debt.toLocaleString('vi-VN')}</span></p>
                    </div>
                    
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thanh toán</label>
                        <input 
                            type="number" 
                            autoFocus
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-blue-700"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(Number(e.target.value))}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={paymentNote}
                            onChange={e => setPaymentNote(e.target.value)}
                            placeholder="VD: Chuyển khoản, tiền mặt..."
                        />
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button 
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleProcessPayment}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all"
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200"></div>
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 relative z-10">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                  <Check size={28} className="text-green-600 stroke-[3]" />
              </div>
              <p className="font-bold text-gray-800">Thanh toán đã được ghi nhận</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtManager;