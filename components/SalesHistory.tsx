import React from 'react';
import { Order } from '../types';
import { Calendar, User, Tag, AlertCircle, CheckCircle } from 'lucide-react';

interface SalesHistoryProps {
  orders: Order[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ orders }) => {
  // Sort orders by date descending
  const sortedOrders = [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {sortedOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900 text-sm">#{order.id.slice(-6)}</span>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar size={12} />
                                {new Date(order.date).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </td>
                    <td className="p-4">
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
                    <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="text-sm text-gray-700 flex items-center justify-between gap-4 border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
                                    <span>{item.quantity} x {item.name}</span>
                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                        {item.price.toLocaleString('vi-VN')} ₫
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                        {order.total.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="p-4">
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
                            </div>
                        )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;