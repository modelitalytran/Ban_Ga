import React, { useState, useRef } from 'react';
import { Product, PriceHistoryItem } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { Plus, Search, Edit2, Trash2, Sparkles, X, Loader2, Feather, ArrowDownCircle, AlertTriangle, Upload, Image as ImageIcon, Filter, TrendingUp, History, Check, AlertCircle } from 'lucide-react';

interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'out'>('all');
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importingProduct, setImportingProduct] = useState<Product | null>(null);
  const [importQuantity, setImportQuantity] = useState<number | ''>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Gà',
    price: 0,
    stock: 0,
    description: '',
    image: '',
    minStockThreshold: 10,
    priceHistory: []
  });

  const showToastError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out';
    if (product.stock <= (product.minStockThreshold || 10)) return 'low';
    return 'in';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'out') return matchesSearch && p.stock === 0;
    if (filterStatus === 'low') return matchesSearch && p.stock > 0 && p.stock <= (p.minStockThreshold || 10);
    
    return matchesSearch;
  });

  const openProductModal = (product?: Product) => {
    setErrorMessage(null);
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category: 'Gà',
        price: 0,
        stock: 0,
        description: '',
        image: '',
        minStockThreshold: 10,
        priceHistory: []
      });
    }
    setIsProductModalOpen(true);
  };

  const openImportModal = (product: Product) => {
    setImportingProduct(product);
    setImportQuantity('');
    setIsImportModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB for localStorage performance)
      if (file.size > 2 * 1024 * 1024) {
        showToastError("Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = () => {
    // 1. Validate Name
    if (!formData.name?.trim()) {
        showToastError("Vui lòng nhập tên sản phẩm");
        return;
    }

    // 2. Validate Duplicate Name
    const isDuplicate = products.some(p => 
        p.name.toLowerCase() === formData.name?.toLowerCase() && 
        p.id !== editingProduct?.id
    );
    if (isDuplicate) {
        showToastError(`Sản phẩm "${formData.name}" đã tồn tại trong kho!`);
        return;
    }

    // 3. Validate Negative Numbers
    if ((formData.price || 0) < 0) {
        showToastError("Giá bán không được nhỏ hơn 0.");
        return;
    }
    if ((formData.stock || 0) < 0) {
        showToastError("Số lượng tồn kho không được nhỏ hơn 0.");
        return;
    }

    // Default image if none provided
    const defaultImage = 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=200';
    const currentPrice = Number(formData.price);
    
    let updatedPriceHistory: PriceHistoryItem[] = formData.priceHistory || [];

    // Logic: If updating an existing product and price has changed, save the OLD price to history
    if (editingProduct && editingProduct.price !== currentPrice) {
        const newHistoryItem: PriceHistoryItem = {
            date: new Date().toISOString(),
            price: editingProduct.price // Store the price before it changed
        };
        // Add to beginning of array
        updatedPriceHistory = [newHistoryItem, ...updatedPriceHistory];
    }

    const productData = {
      id: editingProduct ? editingProduct.id : crypto.randomUUID(),
      name: formData.name.trim(),
      category: formData.category || 'Gà',
      price: currentPrice,
      stock: Number(formData.stock),
      description: formData.description || '',
      image: formData.image || defaultImage,
      minStockThreshold: Number(formData.minStockThreshold) || 10,
      priceHistory: updatedPriceHistory
    } as Product;

    if (editingProduct) {
      onUpdateProduct(productData);
    } else {
      onAddProduct(productData);
    }
    setIsProductModalOpen(false);
  };

  const handleImportStock = () => {
    if (!importingProduct) return;
    
    if (!importQuantity || Number(importQuantity) <= 0) {
        showToastError("Số lượng nhập phải lớn hơn 0");
        return;
    }
    
    const updatedProduct = {
        ...importingProduct,
        stock: importingProduct.stock + Number(importQuantity)
    };
    
    onUpdateProduct(updatedProduct);
    setIsImportModalOpen(false);
    
    // Show success animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name || !formData.category) {
        showToastError("Vui lòng nhập tên và giống loài trước khi tạo mô tả.");
        return;
    }
    setIsGenerating(true);
    const desc = await generateProductDescription(formData.name, formData.category);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Feather className="text-blue-600"/> Quản lý Kho Hàng
            </h2>
            <p className="text-gray-500 text-sm mt-1">Quản lý nhập xuất, thông tin giống và tồn kho</p>
        </div>
        <button 
          onClick={() => openProductModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
        >
          <Plus size={20} /> Thêm Sản phẩm
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-20">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all"
            />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 shrink-0">
                <button 
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterStatus === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Tất cả
                </button>
                <button 
                    onClick={() => setFilterStatus('low')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 whitespace-nowrap ${filterStatus === 'low' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <AlertTriangle size={14}/> Sắp hết
                </button>
                <button 
                    onClick={() => setFilterStatus('out')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filterStatus === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Hết hàng
                </button>
            </div>
        </div>
      </div>

      {/* Responsive Product Table/List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table Header - Hidden on Mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Sản phẩm</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Danh mục</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Giá bán</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Tồn kho</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Trạng thái</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => {
                const status = getStockStatus(product);
                return (
                    <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shrink-0 relative">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-base">{product.name}</p>
                                <p className="text-xs text-gray-500 truncate max-w-[240px] mt-1 line-clamp-2 leading-relaxed">
                                    {product.description || 'Chưa có mô tả'}
                                </p>
                            </div>
                        </div>
                    </td>
                    <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {product.category}
                        </span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                        {product.price.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="p-4">
                        <div className="font-semibold text-gray-700">{product.stock} <span className="text-xs font-normal text-gray-500">con</span></div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Min: {product.minStockThreshold}</div>
                    </td>
                    <td className="p-4">
                        {status === 'out' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Hết hàng
                            </span>
                        )}
                        {status === 'low' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span> Sắp hết
                            </span>
                        )}
                        {status === 'in' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Sẵn sàng
                            </span>
                        )}
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => openImportModal(product)} 
                            className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                            title="Nhập thêm hàng"
                        >
                            <ArrowDownCircle size={18} />
                        </button>
                        <button 
                            onClick={() => openProductModal(product)} 
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={() => onDeleteProduct(product.id)} 
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Xóa"
                        >
                            <Trash2 size={18} />
                        </button>
                        </div>
                    </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile List View (Cards) - Optimized for Landscape Grid */}
        <div className="md:hidden grid grid-cols-1 landscape:grid-cols-2 gap-3 p-3">
           {filteredProducts.map(product => {
                const status = getStockStatus(product);
                return (
                    <div key={product.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-gray-900 truncate pr-2">{product.name}</h4>
                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 shrink-0">
                                        {product.category}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-1 mt-0.5 mb-1">{product.description}</p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="font-bold text-blue-600">{product.price.toLocaleString('vi-VN')} ₫</span>
                                    {status === 'out' && <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">Hết hàng</span>}
                                    {status === 'low' && <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">Sắp hết ({product.stock})</span>}
                                    {status === 'in' && <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">Còn {product.stock}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-dashed border-gray-200">
                            <button 
                                onClick={() => openImportModal(product)} 
                                className="flex-1 py-2 text-teal-700 bg-teal-50 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-teal-100"
                            >
                                <ArrowDownCircle size={16} /> Nhập hàng
                            </button>
                            <button 
                                onClick={() => openProductModal(product)} 
                                className="flex-1 py-2 text-blue-700 bg-blue-50 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-blue-100"
                            >
                                <Edit2 size={16} /> Sửa
                            </button>
                            <button 
                                onClick={() => onDeleteProduct(product.id)} 
                                className="w-10 flex items-center justify-center text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                );
           })}
        </div>

        {filteredProducts.length === 0 && (
            <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center text-gray-400">
                    <Search size={48} className="mb-4 opacity-20"/>
                    <p className="text-lg font-medium">Không tìm thấy sản phẩm nào</p>
                    <p className="text-sm">Thử tìm từ khóa khác hoặc thêm sản phẩm mới</p>
                </div>
            </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">Điền đầy đủ thông tin để quản lý chính xác</p>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 bg-white hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                {/* Left Column: Image Upload */}
                <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-100 flex flex-col gap-4 overflow-y-auto">
                    <label className="block text-sm font-semibold text-gray-700">Hình ảnh sản phẩm</label>
                    <div className="relative group w-full aspect-square bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-sm">
                        {formData.image ? (
                            <>
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData(prev => ({ ...prev, image: '' }));
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400 pointer-events-none">
                                <ImageIcon size={48} className="mb-2 opacity-50"/>
                                <span className="text-sm font-medium">Tải ảnh lên</span>
                                <span className="text-xs opacity-70 mt-1">Kéo thả hoặc click</span>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        Hỗ trợ: JPG, PNG, WEBP (Max 2MB)
                    </p>

                    {/* Price History Section */}
                    {formData.priceHistory && formData.priceHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
                                <History size={14} className="text-gray-500"/> Lịch sử giá
                            </h4>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-32 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 text-left text-gray-500">Ngày</th>
                                            <th className="p-2 text-right text-gray-500">Giá cũ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {formData.priceHistory.map((h, i) => (
                                            <tr key={i}>
                                                <td className="p-2 text-gray-600">
                                                    {new Date(h.date).toLocaleDateString('vi-VN')}
                                                </td>
                                                <td className="p-2 text-right font-medium text-gray-800">
                                                    {h.price.toLocaleString('vi-VN')} ₫
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Info Form */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên sản phẩm / Giống</label>
                        <input 
                        type="text" 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="VD: Gà Minh Dư, Vịt Xiêm..."
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Danh mục</label>
                            <select
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="Gà">Gà</option>
                                <option value="Vịt">Vịt</option>
                                <option value="Bồ câu">Bồ câu</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Giá bán lẻ (VNĐ)</label>
                            <div className="relative">
                                <input 
                                type="number" 
                                className="w-full pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-900"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">₫</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                <TrendingUp size={10}/> Lưu lịch sử khi đổi giá
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tồn kho hiện tại</label>
                            <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.stock}
                            onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-red-600 mb-1.5 flex items-center gap-1">
                                <AlertTriangle size={14}/> Cảnh báo tối thiểu
                            </label>
                            <input 
                            type="number" 
                            className="w-full px-3 py-2.5 border border-red-200 bg-white rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            value={formData.minStockThreshold}
                            onChange={e => setFormData({...formData, minStockThreshold: Number(e.target.value)})}
                            placeholder="10"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Mô tả đặc điểm</label>
                            <button 
                                type="button"
                                onClick={handleGenerateDescription}
                                disabled={isGenerating}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium px-2 py-1 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                            >
                                {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                AI viết mô tả
                            </button>
                        </div>
                        <textarea 
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Nhập đặc điểm nhận dạng, cân nặng trung bình, nguồn gốc..."
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSaveProduct}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all transform active:scale-95"
              >
                {editingProduct ? 'Cập nhật' : 'Lưu Sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Stock Modal */}
      {isImportModalOpen && importingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-teal-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                        <ArrowDownCircle size={20}/> Nhập hàng vào Kho
                    </h3>
                    <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="flex items-center gap-4">
                        <img src={importingProduct.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-gray-100"/>
                        <div>
                             <p className="text-sm text-gray-500">Sản phẩm</p>
                             <p className="font-bold text-gray-900 text-lg">{importingProduct.name}</p>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng nhập thêm (Con)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                autoFocus
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-2xl font-bold text-teal-700 text-center"
                                value={importQuantity}
                                onChange={e => setImportQuantity(Number(e.target.value))}
                                placeholder="0"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                                <button onClick={() => setImportQuantity(Number(importQuantity) + 10)} className="text-[10px] bg-gray-100 px-2 rounded hover:bg-gray-200">+10</button>
                                <button onClick={() => setImportQuantity(Number(importQuantity) + 50)} className="text-[10px] bg-gray-100 px-2 rounded hover:bg-gray-200">+50</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button 
                        onClick={() => setIsImportModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleImportStock}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        Xác nhận Nhập
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Modal for Import */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200"></div>
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 relative z-10">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
                  <Check size={28} className="text-green-600 stroke-[3]" />
              </div>
              <p className="font-bold text-gray-800">Đã cập nhật kho thành công!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;