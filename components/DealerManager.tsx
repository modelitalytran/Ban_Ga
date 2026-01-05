import React, { useState } from 'react';
import { Customer } from '../types';
import { Plus, Search, Edit2, Trash2, Users, X, MapPin, Phone, Percent, AlertCircle, Check } from 'lucide-react';

interface DealerManagerProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

const DealerManager: React.FC<DealerManagerProps> = ({ customers, onAddCustomer, onUpdateCustomer, onDeleteCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // UI States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    address: '',
    discountRate: 0,
    type: 'agency'
  });

  const showToastError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const showToastSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const openModal = (customer?: Customer) => {
    setErrorMessage(null); // Clear errors
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        address: '',
        discountRate: 0,
        type: 'agency'
      });
    }
    setIsModalOpen(true);
  };

  const validatePhone = (phone: string): boolean => {
    // Regex cho số điện thoại Việt Nam: 10 số, bắt đầu bằng 03, 05, 07, 08, 09
    const vnPhoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    return vnPhoneRegex.test(phone);
  };

  const handleSave = () => {
    // 1. Validate Empty Name
    if (!formData.name?.trim()) {
        showToastError("Tên đại lý không được để trống!");
        return;
    }

    // 2. Validate Phone Format
    if (formData.phone && !validatePhone(formData.phone)) {
        showToastError("Số điện thoại không đúng định dạng VN (09..., 03...)!");
        return;
    }

    // 3. Validate Duplicate Phone (check if another customer exists with same phone)
    if (formData.phone) {
        const duplicate = customers.find(c => 
            c.phone === formData.phone && 
            c.id !== editingCustomer?.id // Exclude self if editing
        );
        if (duplicate) {
            showToastError(`Số điện thoại này đã thuộc về đại lý: ${duplicate.name}`);
            return;
        }
    }

    // 4. Validate Discount Rate
    if ((formData.discountRate || 0) < 0 || (formData.discountRate || 0) > 100) {
        showToastError("Chiết khấu phải từ 0% đến 100%");
        return;
    }
    
    const customerData = {
      id: editingCustomer ? editingCustomer.id : `CUS-${Date.now()}`,
      name: formData.name.trim(),
      phone: formData.phone || '',
      address: formData.address || '',
      discountRate: Number(formData.discountRate),
      type: 'agency'
    } as Customer;

    if (editingCustomer) {
      onUpdateCustomer(customerData);
      showToastSuccess("Cập nhật thông tin thành công");
    } else {
      onAddCustomer(customerData);
      showToastSuccess("Thêm đại lý mới thành công");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
      if (window.confirm(`Bạn có chắc muốn xóa đại lý "${name}" không?`)) {
          onDeleteCustomer(id);
          showToastSuccess("Đã xóa đại lý");
      }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600"/> Quản lý Đại lý
        </h2>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus size={20} /> Thêm Đại lý
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Tìm tên đại lý, số điện thoại..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
        />
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Tên Đại lý</th>
                <th className="p-4 font-semibold text-gray-600">Liên hệ</th>
                <th className="p-4 font-semibold text-gray-600">Địa chỉ</th>
                <th className="p-4 font-semibold text-gray-600">Chiết khấu</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">
                    {customer.name}
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-gray-400"/> {customer.phone || '---'}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                     <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-gray-400"/> {customer.address || '---'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-sm font-bold ${customer.discountRate > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {customer.discountRate}%
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(customer)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(customer.id, customer.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                        Chưa có đại lý nào.
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCustomer ? 'Sửa thông tin Đại lý' : 'Thêm Đại lý mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Error within Modal if needed, but we use Toast now */}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đại lý / Khách hàng <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Nhập tên đại lý"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="09xx..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Nhập địa chỉ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mức chiết khấu cố định (%)</label>
                <div className="relative">
                    <input 
                    type="number" 
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                    value={formData.discountRate}
                    onChange={e => setFormData({...formData, discountRate: Number(e.target.value)})}
                    />
                    <Percent size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                </div>
                <p className="text-xs text-gray-500 mt-1">Đại lý sẽ được tự động giảm giá mức này khi lên đơn.</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
              <Check size={24} className="text-green-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerManager;