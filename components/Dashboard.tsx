import React, { useMemo } from 'react';
import { Product, Order } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  LineChart, Line, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';
import { DollarSign, Package, ShoppingBag, AlertTriangle, UserMinus, TrendingUp, Calendar, PieChart as PieIcon, CreditCard, BarChart2 } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  orders: Order[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, orders }) => {
  
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalCashIn = orders.reduce((sum, order) => sum + order.paidAmount, 0);
    const totalDebt = orders.reduce((sum, order) => sum + order.debt, 0);
    const totalOrders = orders.length;
    
    // Dynamic low stock check based on individual threshold
    const lowStockProducts = products.filter(p => p.stock <= (p.minStockThreshold || 10));
    
    // --- Chart 1: Sales Trend (Daily - Last 7 days) ---
    // Group sales by date
    const salesByDateMap = new Map<string, number>();
    orders.forEach(order => {
        const date = new Date(order.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        salesByDateMap.set(date, (salesByDateMap.get(date) || 0) + order.total);
    });
    
    const trendData = Array.from(salesByDateMap.entries())
        .map(([name, value]) => ({ name, value }))
        .slice(-7);

    // --- New Chart: Daily Sales for Current Month ---
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const monthlySalesData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return {
            day: day,
            name: `${day}/${currentMonth + 1}`,
            value: 0
        };
    });

    orders.forEach(order => {
        const d = new Date(order.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            const day = d.getDate();
            if (monthlySalesData[day - 1]) {
                monthlySalesData[day - 1].value += order.total;
            }
        }
    });


    // --- Helper to group Retail vs Agencies ---
    const getAgencyBreakdown = (orderList: Order[]) => {
        let retailTotal = 0;
        const agencyMap = new Map<string, number>();

        orderList.forEach(order => {
            if (order.saleType === 'retail' || order.saleType === 'internal') {
                retailTotal += order.total;
            } else if (order.saleType === 'agency') {
                const current = agencyMap.get(order.customerName) || 0;
                agencyMap.set(order.customerName, current + order.total);
            }
        });

        return [
            { name: 'Khách lẻ', value: retailTotal, type: 'Retail' },
            ...Array.from(agencyMap.entries()).map(([name, value]) => ({ name, value, type: 'Agency' }))
        ].sort((a, b) => b.value - a.value);
    };

    // --- Chart 2: Total Sales Breakdown (All Time) ---
    const totalBreakdownData = getAgencyBreakdown(orders);

    // --- Chart 3: Today's Sales Breakdown ---
    const todayStr = new Date().toDateString();
    const todaysOrders = orders.filter(o => new Date(o.date).toDateString() === todayStr);
    const todayBreakdownData = getAgencyBreakdown(todaysOrders);
    
    // Calculate Today's Total Revenue for display
    const todayRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);


    // --- Chart 4: Product Category Distribution (Revenue) ---
    const categoryMap = new Map<string, number>();
    orders.forEach(order => {
        order.items.forEach(item => {
            const current = categoryMap.get(item.category) || 0;
            categoryMap.set(item.category, current + (item.price * item.quantity));
        });
    });
    const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];


    // --- Chart 5: Financial Overview (Cash vs Debt) ---
    const financeData = [
        { name: 'Tiền mặt', value: totalCashIn, fill: '#10b981' },
        { name: 'Công nợ', value: totalDebt, fill: '#ef4444' }
    ];

    return { 
        totalRevenue, totalCashIn, totalDebt, totalOrders, 
        lowStockProducts, 
        trendData, 
        monthlySalesData, // New data
        totalBreakdownData, 
        todayBreakdownData, todayRevenue,
        categoryData, PIE_COLORS,
        financeData
    };
  }, [products, orders]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800">Báo cáo Hoạt động</h2>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            Hôm nay: {new Date().toLocaleDateString('vi-VN')}
        </span>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tổng doanh số</p>
            <p className="text-lg font-bold text-gray-900">{stats.totalRevenue.toLocaleString('vi-VN')} ₫</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
                <TrendingUp size={24} />
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Doanh số Hôm nay</p>
                <p className="text-lg font-bold text-indigo-700">{stats.todayRevenue.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <UserMinus size={24} />
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Tổng nợ</p>
                <p className="text-lg font-bold text-red-600">{stats.totalDebt.toLocaleString('vi-VN')} ₫</p>
            </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-3">
          <div className={`p-3 rounded-full shrink-0 ${stats.lowStockProducts.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Cảnh báo tồn kho</p>
            <p className="text-lg font-bold text-gray-900">{stats.lowStockProducts.length} mặt hàng</p>
          </div>
        </div>
      </div>

      {/* NEW: Monthly Sales Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-teal-600"/> Doanh số Tháng {new Date().getMonth() + 1} (Theo ngày)
            </h3>
        </div>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11}} 
                    interval={2} // Show every 2nd label to avoid clutter
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11}} 
                    tickFormatter={(val) => `${val/1000000}M`} 
                />
                <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    labelFormatter={(label) => `Ngày ${label}`}
                    formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, 'Doanh thu']}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[2, 2, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Sales Trend */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-500"/> Xu hướng Doanh số (7 ngày gần nhất)
                </h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, 'Doanh số']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Financial Overview */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CreditCard size={18} className="text-green-500"/> Tài chính: Thu & Nợ
                </h3>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.financeData} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                         <XAxis type="number" hide />
                         <YAxis type="category" dataKey="name" width={80} axisLine={false} tickLine={false} tick={{fill: '#334155', fontWeight: 500}} />
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                            formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, 'Số tiền']}
                         />
                         <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                            {stats.financeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                         </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* Row 2: Sales Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 2: Total Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Package size={18} className="text-purple-500"/> Tổng doanh số: Đại lý vs Lẻ
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.totalBreakdownData} margin={{top: 10, right: 10, left: 0, bottom: 20}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} angle={-15} textAnchor="end" interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip 
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                     formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, '']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.totalBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'Retail' ? '#3b82f6' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Category Pie */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-orange-500"/> Tỷ trọng Doanh thu
            </h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={stats.categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {stats.categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={stats.PIE_COLORS[index % stats.PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => `${val.toLocaleString('vi-VN')} ₫`} />
                        <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>
      
      {/* Row 3: Today's Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <div className="flex items-center gap-2 mb-4">
             <Calendar size={18} className="text-indigo-600"/>
             <h3 className="font-semibold text-gray-800">Chi tiết Doanh số Hôm nay ({new Date().toLocaleDateString('vi-VN')})</h3>
         </div>
         {stats.todayBreakdownData.length > 0 ? (
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.todayBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `${val/1000}k`} />
                    <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                        formatter={(val: number) => [`${val.toLocaleString('vi-VN')} ₫`, 'Doanh số']}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stats.todayBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.type === 'Retail' ? '#60a5fa' : '#a78bfa'} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         ) : (
             <div className="h-32 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                 Chưa có giao dịch nào trong hôm nay
             </div>
         )}
      </div>

      {/* Low Stock Alert List */}
      {stats.lowStockProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-orange-50">
            <h3 className="text-orange-700 font-semibold flex items-center gap-2">
              <AlertTriangle size={18} /> Cảnh báo tồn kho (Dưới mức quy định)
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.lowStockProducts.map(product => (
              <div key={product.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.category} • Mức tối thiểu: {product.minStockThreshold || 10}</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold mb-1">
                    Còn: {product.stock}
                    </span>
                    <span className="text-xs text-red-500 font-medium">Cần nhập thêm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;