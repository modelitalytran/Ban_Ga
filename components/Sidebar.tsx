import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, ShoppingCart, Package, History, Sparkles, LogOut, Users, FileText } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} /> },
    { id: 'pos', label: 'Bán hàng', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Kho hàng', icon: <Package size={20} /> },
    { id: 'debt-manager', label: 'Công nợ', icon: <FileText size={20} /> },
    { id: 'dealer-manager', label: 'Đại lý', icon: <Users size={20} /> },
    { id: 'history', label: 'Lịch sử', icon: <History size={20} /> },
    { id: 'ai-assistant', label: 'Trợ lý AI', icon: <Sparkles size={20} /> },
  ];

  return (
    <div className="w-20 lg:w-64 bg-white h-screen flex flex-col border-r border-gray-200 sticky top-0 left-0">
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            Q
        </div>
        <span className="hidden lg:block ml-3 font-bold text-gray-800 text-lg">Sales Manager</span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl transition-all duration-200 group relative ${
              currentView === item.id 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={currentView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                {item.icon}
            </span>
            <span className={`hidden lg:block ml-3 font-medium ${currentView === item.id ? 'font-semibold' : ''}`}>
                {item.label}
            </span>
            
            {/* Tooltip for mobile */}
            <div className="lg:hidden absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
            </div>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center lg:justify-start px-3 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={20} />
            <span className="hidden lg:block ml-3 font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;