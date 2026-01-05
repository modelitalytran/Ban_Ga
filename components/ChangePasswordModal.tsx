import React, { useState, useEffect } from 'react';
import { changePassword } from '../services/auth';
import { X, Lock, Check, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  // Visibility States
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
        setOldPass('');
        setNewPass('');
        setConfirmPass('');
        setError('');
        setSuccess(false);
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPass !== confirmPass) {
      setError('Mật khẩu mới không khớp!');
      return;
    }

    if (newPass.length < 3) {
      setError('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }

    if (changePassword(oldPass, newPass)) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError('Mật khẩu cũ không chính xác!');
    }
  };

  const PasswordInput = ({ 
    label, 
    value, 
    onChange, 
    show, 
    onToggle, 
    autoFocus = false 
  }: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    show: boolean, 
    onToggle: () => void,
    autoFocus?: boolean
  }) => (
    <div className="space-y-1">
        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">{label}</label>
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus={autoFocus}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                tabIndex={-1}
            >
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                <KeyRound size={18} /> 
            </div>
            Đổi mật khẩu
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={32} className="text-green-600 stroke-[3]" />
              </div>
              <p className="font-bold text-gray-800 text-lg">Đổi mật khẩu thành công!</p>
              <p className="text-sm text-gray-500 mt-1">Đang đóng cửa sổ...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}
              
              <PasswordInput 
                label="Mật khẩu hiện tại" 
                value={oldPass} 
                onChange={setOldPass} 
                show={showOld} 
                onToggle={() => setShowOld(!showOld)} 
                autoFocus 
              />

              <div className="border-t border-gray-100 pt-2 space-y-4">
                  <PasswordInput 
                    label="Mật khẩu mới" 
                    value={newPass} 
                    onChange={setNewPass} 
                    show={showNew} 
                    onToggle={() => setShowNew(!showNew)} 
                  />

                  <PasswordInput 
                    label="Xác nhận mật khẩu mới" 
                    value={confirmPass} 
                    onChange={setConfirmPass} 
                    show={showConfirm} 
                    onToggle={() => setShowConfirm(!showConfirm)} 
                  />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!oldPass || !newPass || !confirmPass}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  Xác nhận thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;