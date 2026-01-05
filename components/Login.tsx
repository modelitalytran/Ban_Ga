import React, { useState } from 'react';
import { login, setSession } from '../services/auth';
import { User, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for better UX
    setTimeout(() => {
      if (login(username, password)) {
        setSession(true);
        onLoginSuccess();
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng!');
        setIsLoading(false);
      }
    }, 600);
  };

  // Chicken Icon URL
  const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/616/616554.png";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 border border-white/50">
        <div className="p-8 pb-6 text-center bg-gradient-to-b from-blue-50 to-white border-b border-gray-50">
          <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-5 ring-4 ring-blue-50">
             <img src={LOGO_URL} alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">HoangTran_BanGa</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">Hệ thống quản lý kinh doanh</p>
        </div>

        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Tên đăng nhập</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                    <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white font-medium text-gray-800 placeholder-gray-300"
                  placeholder="Nhập tên đăng nhập"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-focus-within:bg-blue-100 group-focus-within:text-blue-600 transition-colors">
                    <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white font-medium text-gray-800 placeholder-gray-300"
                  placeholder="Nhập mật khẩu"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>Đăng nhập <ArrowRight size={20} /></>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">
              Mặc định: <span className="font-mono font-medium text-gray-600">admin</span> / <span className="font-mono font-medium text-gray-600">123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;