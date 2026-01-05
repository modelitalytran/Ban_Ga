import React, { useState } from 'react';
import { Order, CartItem, Product } from '../types';
import { Calendar, User, Tag, AlertCircle, CheckCircle, Edit2, X, Save, Scale, Info } from 'lucide-react';

interface SalesHistoryProps {
  orders: Order[];
  onEditOrder?: (updatedOrder: Order, originalOrder: Order) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ orders, onEditOrder }) => {
  // Sort orders by date descending
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const getSaleTypeLabel = (type: string) => {
      switch(type) {
          case 'retail': return 'Bán lẻ';
          case 'agency': return 'Đại lý';
          case 'internal': return 'Nhà ăn/Tặng';
          default: return type;
      }
  }

  const getSaleTypeColor = (type: string) => {
    switch(type) {
        case 'retail': return 'bg-blue-100 text-blue-700';
        case 'agency': return 'bg-purple-100 text-purple-700';
        case 'internal': return 'bg-green-100 text-green-700';
        default: return 'bg-gray-100 text-gray-700';
    }
  }

  const handleOpenEdit = (order: Order) => {
      setOriginalOrder(JSON.parse(JSON.stringify(order))); // Deep copy
      setEditingOrder(JSON.parse(JSON.stringify(order)));
      setIsEditModalOpen(true);
  };

  const handleUpdateItem = (index: number, field: keyof CartItem, value: number) => {
      if (!editingOrder) return;
      const newItems = [...editingOrder.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total
      const newTotal = calculateTotal(newItems, editingOrder.saleType, editingOrder.discountApplied || 0);
      
      setEditingOrder({
          ...editingOrder,
          items: newItems,
          total: newTotal,
          debt: Math.max(0, newTotal - editingOrder.paidAmount)
      });
  };

  const handleUpdatePaid = (value: number) => {
      if (!editingOrder) return;
      setEditingOrder({
          ...editingOrder,
          paidAmount: value,
          debt: Math.max(0, editingOrder.total - value)
      });
  };

  const calculateTotal = (items: CartItem[], saleType: string, discount: number) => {
      if (saleType === 'internal') return 0;
      const subTotal = items.reduce((sum, item) => {
          if (item.unit === 'kg') {
              return sum + (item.price * (item.weight || 0));
          } else {
              return sum + (item.price * item.quantity);
          }
      }, 0);
      return subTotal * ((100 - discount) / 100);
  };

  const handleSaveEdit = () => {
      if (editingOrder && originalOrder && onEditOrder) {
          onEditOrder(editingOrder, originalOrder);
          setIsEditModalOpen(false);
      }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Lịch sử giao dịch</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                <th className="p-4 font-semibold text-gray-600">Ngày / Mã</th>
                <th className="p-4 font-semibold text-gray-600">Khách hàng</th>
                <th className="p-4 font-semibold text-gray-600">Chi tiết đơn hàng</th>
                <th className="p-4 font-semibold text-gray-600">Tổng tiền</th>
                <th className="p-4 font-semibold text-gray-600">Thanh toán</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Hành động</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {sortedOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 align-top">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">#{order.id.slice(-6)}</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar size={12} />
                                {new Date(order.date).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </td>
                    <td className="p-4 align-top">
                         <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 font-medium text-gray-800">
                                <User size={14} className="text-gray-400"/>
                                {order.customerName}
                            </div>
                            <span className={`self-start inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${getSaleTypeColor(order.saleType)}`}>
                                {getSaleTypeLabel(order.saleType)}
                            </span>
                         </div>
                    </td>
                    <td className="p-4 align-top">
                        <div className="flex flex-col gap-1.5">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="text-sm text-gray-700 flex items-center justify-between gap-4 border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold">{item.quantity} con</span>
                                        {item.unit === 'kg' && (
                                            <span className="text-gray-500 text-xs">({item.weight}kg)</span>
                                        )}
                                        <span className="truncate max-w-[120px]">x {item.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                        {item.unit === 'kg' 
                                            ? `${(item.price * (item.weight || 0)).toLocaleString('vi-VN')}đ`
                                            : `${(item.price * item.quantity).toLocaleString('vi-VN')}đ`
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900 align-top">
                        {order.total.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="p-4 align-top">
                        {order.saleType === 'internal' ? (
                            <span className="text-green-600 text-sm italic">Miễn phí</span>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-gray-600">Đã trả: <b className="text-gray-900">{order.paidAmount.toLocaleString('vi-VN')}</b></span>
                                {order.debt > 0 ? (
                                    <span className="text-sm text-red-600 flex items-center gap-1 font-semibold">
                                        <AlertCircle size={12}/> Nợ: {order.debt.toLocaleString('vi-VN')}
                                    </span>
                                ) : (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle size={12}/> Đủ
                                    </span>
                                )}
                                {/* Display Note if available */}
                                {order.note && (
                                    <div className="mt-1 text-xs text-gray-500 bg-gray-50 p-1.5 rounded border border-gray-100 flex items-start gap-1">
                                        <Info size={12} className="shrink-0 mt-0.5"/>
                                        <span className="italic">{order.note}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-right align-top">
                        <button 
                            onClick={() => handleOpenEdit(order)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Sửa đơn hàng"
                        >
                            <Edit2 size={16} />
                        </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingOrder && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <Edit2 size={18} /> Chỉnh sửa Đơn hàng #{editingOrder.id.slice(-6)}
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      {/* Items Editor */}
                      <div>
                          <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Sản phẩm</h4>
                          <div className="space-y-3">
                              {editingOrder.items.map((item, idx) => (
                                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                                      <div className="flex-1">
                                          <p className="font-bold text-gray-800">{item.name}</p>
                                          <p className="text-xs text-gray-500">{item.price.toLocaleString()} đ/{item.unit}</p>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                          {/* Quantity Input */}
                                          <div className="flex flex-col">
                                              <label className="text-[10px] text-gray-500 font-bold uppercase">Số con</label>
                                              <input 
                                                  type="number"
                                                  className="w-20 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                  value={item.quantity}
                                                  onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value))}
                                              />
                                          </div>

                                          {/* Weight Input (Only for KG items) */}
                                          {item.unit === 'kg' && (
                                             <div className="flex flex-col">
                                                 <label className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1"><Scale size={10}/> Kg</label>
                                                 <input 
                                                     type="number"
                                                     className="w-24 p-2 text-sm border border-blue-300 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                                                     value={item.weight}
                                                     onChange={(e) => handleUpdateItem(idx, 'weight', parseFloat(e.target.value))}
                                                 />
                                             </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Payment Adjustment */}
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Tổng tiền (Sau khi sửa)</label>
                              <div className="text-2xl font-bold text-blue-600">
                                  {editingOrder.total.toLocaleString('vi-VN')} ₫
                              </div>
                              {editingOrder.discountApplied && (
                                  <p className="text-xs text-green-600 mt-1">Đang áp dụng chiết khấu {editingOrder.discountApplied}%</p>
                              )}
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Khách đã trả</label>
                              <input 
                                  type="number" 
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                  value={editingOrder.paidAmount}
                                  onChange={(e) => handleUpdatePaid(Number(e.target.value))}
                              />
                              <p className="text-xs mt-1 text-gray-500">
                                  Còn nợ: <span className="font-bold text-red-600">{editingOrder.debt.toLocaleString('vi-VN')}</span>
                              </p>
                          </div>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-lg flex gap-2 text-sm text-yellow-800 border border-yellow-200">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          <p>Lưu ý: Khi lưu, hệ thống sẽ tự động cập nhật lại tồn kho (trả lại hàng cũ, trừ hàng mới) và tính lại công nợ cho khách hàng này.</p>
                      </div>
                  </div>

                  <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                      <button 
                          onClick={() => setIsEditModalOpen(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                          Hủy bỏ
                      </button>
                      <button 
                          onClick={handleSaveEdit}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                      >
                          <Save size={18}/> Lưu thay đổi
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalesHistory;