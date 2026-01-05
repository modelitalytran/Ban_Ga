import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, ShoppingCart, Package, History, Sparkles, LogOut, Users, FileText, Menu } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} /> },
    { id: 'pos', label: 'Bán hàng', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Kho', icon: <Package size={20} /> },
    { id: 'debt-manager', label: 'Công nợ', icon: <FileText size={20} /> },
    { id: 'dealer-manager', label: 'Đại lý', icon: <Users size={20} /> },
    { id: 'history', label: 'Lịch sử', icon: <History size={20} /> },
    { id: 'ai-assistant', label: 'Trợ lý AI', icon: <Sparkles size={20} /> },
  ];

  return (
    <>
      {/* Desktop Sidebar (Left - Large Screens) */}
      <div className="hidden lg:flex w-64 bg-white h-screen flex-col border-r border-gray-200 sticky top-0 left-0 shrink-0">
        <div className="h-16 flex items-center justify-start px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
              Q
          </div>
          <span className="ml-3 font-bold text-gray-800 text-lg">Sales Manager</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center justify-start px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                currentView === item.id 
                  ? 'bg-blue-50 text-blue-600 font-semibold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={currentView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                  {item.icon}
              </span>
              <span className="ml-3 font-medium">
                  {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="w-full flex items-center justify-start px-3 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <LogOut size={20} />
              <span className="ml-3 font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Mobile Landscape Sidebar (Left Rail - Small Height/Wide Width) */}
      <div className="hidden landscape:flex lg:hidden fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-gray-200 flex-col z-50 overflow-y-auto no-scrollbar pb-2">
         <div className="h-14 flex items-center justify-center border-b border-gray-100 shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">Q</div>
         </div>
         <nav className="flex-1 py-2 flex flex-col items-center gap-2">
             {menuItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={`p-2.5 rounded-xl transition-all ${
                        currentView === item.id ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                    title={item.label}
                >
                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
                </button>
             ))}
         </nav>
      </div>

      {/* Mobile Portrait Bottom Navigation (Bottom - Tall Height/Narrow Width) */}
      <div className="lg:hidden landscape:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-1 safe-area-pb">
        <div className="flex justify-between items-center">
            {menuItems.slice(0, 5).map((item) => (
                <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
                        currentView === item.id ? 'text-blue-600' : 'text-gray-400'
                    }`}
                >
                    <div className={`${currentView === item.id ? 'bg-blue-50 p-1.5 rounded-full' : ''} mb-0.5`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                    </div>
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
            ))}
             <button
                onClick={() => onChangeView('ai-assistant')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
                    currentView === 'ai-assistant' ? 'text-blue-600' : 'text-gray-400'
                }`}
            >
                <div className={`${currentView === 'ai-assistant' ? 'bg-blue-50 p-1.5 rounded-full' : ''} mb-0.5`}>
                    <Sparkles size={20} />
                </div>
                <span className="text-[10px] font-medium leading-none">AI</span>
            </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;