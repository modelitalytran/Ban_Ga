import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, ShoppingCart, Package, History, Sparkles, LogOut, Users, FileText, KeyRound, Menu, X, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, onChangePassword }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={20} /> },
    { id: 'pos', label: 'Bán hàng', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Kho', icon: <Package size={20} /> },
    { id: 'debt-manager', label: 'Công nợ', icon: <FileText size={20} /> },
    { id: 'dealer-manager', label: 'Đại lý', icon: <Users size={20} /> },
    { id: 'history', label: 'Lịch sử', icon: <History size={20} /> },
    { id: 'ai-assistant', label: 'Trợ lý AI', icon: <Sparkles size={20} /> },
  ];

  // Items to show on the bottom bar (Priority)
  const bottomNavItems = menuItems.slice(0, 4);
  // Items to show in the "More" menu
  const moreNavItems = menuItems.slice(4);

  // Chicken Icon URL
  const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/616/616554.png";

  const handleMobileNavClick = (view: ViewState) => {
    onChangeView(view);
    setIsMobileMenuOpen(false);
  }

  return (
    <>
      {/* Desktop Sidebar (Left - Large Screens) */}
      <div className="hidden lg:flex w-64 bg-white h-screen flex-col border-r border-gray-200 sticky top-0 left-0 shrink-0">
        <div className="h-16 flex items-center justify-start px-6 border-b border-gray-100 gap-3">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="w-10 h-10 object-contain drop-shadow-sm"
          />
          <span className="font-bold text-gray-800 text-lg truncate">HoangTran_BanGa</span>
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

        <div className="p-4 border-t border-gray-100 space-y-2">
           <button 
            onClick={onChangePassword}
            className="w-full flex items-center justify-start px-3 py-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-sm font-medium"
           >
              <KeyRound size={18} />
              <span className="ml-3">Đổi mật khẩu</span>
           </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-start px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
          >
              <LogOut size={18} />
              <span className="ml-3">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Visible on all mobile screens < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 py-2 safe-area-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-end">
            {bottomNavItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => handleMobileNavClick(item.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl flex-1 active:scale-95 transition-transform ${
                        currentView === item.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <div className={`${currentView === item.id ? 'bg-blue-50 p-1.5 rounded-full' : 'mb-1.5'} transition-all`}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                    </div>
                    <span className="text-[10px] font-medium leading-none mt-1">{item.label}</span>
                </button>
            ))}
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl flex-1 text-gray-400 hover:text-gray-600 active:scale-95 transition-transform ${isMobileMenuOpen ? 'text-blue-600' : ''}`}
            >
                <div className="mb-1.5">
                    <Menu size={20} />
                </div>
                <span className="text-[10px] font-medium leading-none mt-1">Thêm</span>
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay (Drawer) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            {/* Content */}
            <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[85vh] overflow-y-auto">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Menu mở rộng</h3>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Grid for remaining nav items */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {moreNavItems.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => handleMobileNavClick(item.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${
                                currentView === item.id 
                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                : 'bg-gray-50 border-gray-100 text-gray-600'
                            }`}
                        >
                            <div className={`p-2 rounded-full ${currentView === item.id ? 'bg-white shadow-sm' : 'bg-white'}`}>
                                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 24 })}
                            </div>
                            <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Account Actions List */}
                <div className="space-y-3 pt-6 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tài khoản</p>
                    
                    <button 
                        onClick={() => { onChangePassword(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg text-gray-600 shadow-sm group-hover:text-blue-600">
                                <KeyRound size={20} />
                            </div>
                            <span className="font-semibold text-gray-700">Đổi mật khẩu</span>
                        </div>
                        <ChevronRight size={18} className="text-gray-400"/>
                    </button>

                    <button 
                        onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg text-red-600 shadow-sm">
                                <LogOut size={20} />
                            </div>
                            <span className="font-semibold text-red-700">Đăng xuất</span>
                        </div>
                        <ChevronRight size={18} className="text-red-300"/>
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;