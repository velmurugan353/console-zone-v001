import React, { useState, useEffect } from 'react';
import { Product } from '../../lib/data';
import { formatCurrency } from '../../lib/utils';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Edit,
  Trash2,
  Plus,
  Search,
  XCircle,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  ShoppingBag,
  Calendar,
  Wrench,
  Activity,
  Box,
  RefreshCw,
  MoreHorizontal,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ProductType = 'store' | 'rental' | 'repair';

interface AdminProduct extends Product {
  stockCount: number;
  type: ProductType;
  enabled: boolean;
  securityDeposit?: number;
  maxDuration?: number;
  estimatedTime?: string;
  deviceType?: string;
}

const PRODUCT_TYPES = [
  { id: 'store', label: 'Store Products', icon: ShoppingBag },
];

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<ProductType>('store');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<AdminProduct>>({
    name: '',
    category: 'game',
    price: 0,
    image: '',
    description: '',
    inStock: true,
    type: 'store',
    stockCount: 0,
    enabled: true,
  });

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts: AdminProduct[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AdminProduct[];
      setProducts(fetchedProducts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'products', id), { enabled: !currentStatus });
  };

  const handleEditProduct = (product: AdminProduct) => {
    setNewProduct(product);
    setEditingProductId(product.id);
    setIsModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingProductId) {
        // Filter out undefined values from newProduct before updating
        const updateData = Object.fromEntries(
          Object.entries(newProduct).filter(([_, v]) => v !== undefined)
        );

        // Ensure isRental is synchronized with type updates
        if (updateData.type) {
          updateData.isRental = updateData.type === 'rental';
          if (updateData.isRental && !updateData.rentalPrice) {
            updateData.rentalPrice = updateData.price || 0;
          }
        }

        await updateDoc(doc(db, 'products', editingProductId), updateData);
      } else {
        const pId = `ITEM-${Date.now()}`;
        const isRental = newProduct.type === 'rental' || activeType === 'rental';

        const product: any = {
          id: pId,
          name: newProduct.name || '',
          category: newProduct.category as any || 'game',
          price: newProduct.price || 0,
          image: newProduct.image || 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?auto=format&fit=crop&q=80&w=200',
          description: newProduct.description || '',
          inStock: (newProduct.stockCount || 0) > 0,
          isRental: isRental,
          rating: 0,
          reviews: 0,
          stockCount: newProduct.stockCount || 0,
          type: (newProduct.type || activeType) as ProductType,
          enabled: true,
        };

        // Add optional fields only if they have values to avoid Firestore 'undefined' error
        if (isRental) {
          product.rentalPrice = newProduct.price || 0;
          if (newProduct.securityDeposit !== undefined) product.securityDeposit = newProduct.securityDeposit;
          if (newProduct.maxDuration !== undefined) product.maxDuration = newProduct.maxDuration;
        }

        if (product.type === 'repair') {
          if (newProduct.estimatedTime !== undefined) product.estimatedTime = newProduct.estimatedTime;
          if (newProduct.deviceType !== undefined) product.deviceType = newProduct.deviceType;
        }

        await setDoc(doc(db, 'products', pId), product);
      }
      setIsModalOpen(false);
      setEditingProductId(null);
      setNewProduct({
        name: '',
        category: 'game',
        price: 0,
        image: '',
        description: '',
        inStock: true,
        type: activeType,
        stockCount: 0,
        enabled: true,
        securityDeposit: 0,
        maxDuration: 30,
        estimatedTime: '2-3 Days',
        deviceType: 'PS5'
      });
    } catch (error: any) {
      console.error("Database initialization error:", error);
      alert(`Failed to commit asset to database: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      {/* Knowledge Base Overlay */}
      <div className="bg-[#B000FF]/5 border border-[#B000FF]/20 rounded-2xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#B000FF]/10 flex items-center justify-center text-[#B000FF] shrink-0">
          <HelpCircle size={20} />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">Protocol: Product Addition Registry</h4>
          <p className="text-xs text-gray-400 leading-relaxed max-w-2xl font-mono">
            To integrate new hardware into the sells matrix, use the <span className="text-[#B000FF]">"Add New Item"</span> trigger below. Ensure all technical specs are declared. For Rental items, cross-link with the inventory serial tracker for accurate fleet synchronization.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-[#080112] p-4 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Box className="h-3 w-3 text-[#B000FF] animate-pulse" />
            <span className="text-[10px] font-mono text-[#B000FF] uppercase tracking-[0.2em]">Product Maintenance // Master Control</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tighter uppercase italic">Inventory <span className="text-[#B000FF]">Master</span></h1>
          <p className="text-gray-500 font-mono text-xs mt-1">Centralized Control for Rentals, Store & Services</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors">
            <Upload className="h-4 w-4 text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Bulk Upload</span>
          </button>
          <button className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 flex items-center space-x-2 hover:bg-white/10 transition-colors">
            <Download className="h-4 w-4 text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Export CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingProductId(null);
              setNewProduct({
                name: '',
                category: 'game',
                price: 0,
                image: '',
                description: '',
                inStock: true,
                type: activeType,
                stockCount: 0,
                enabled: true,
                securityDeposit: 0,
                maxDuration: 30,
                estimatedTime: '2-3 Days',
                deviceType: 'PS5'
              });
              setIsModalOpen(true);
            }}
            className="bg-[#B000FF] text-black rounded-lg px-6 py-2 flex items-center space-x-2 hover:bg-[#9333EA] transition-colors font-bold"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Add New Item</span>
          </button>
        </div>
      </div>

      {/* Type Selector Removed as per request */}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${activeType} items...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm font-mono focus:outline-none focus:border-[#B000FF]/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm font-mono focus:outline-none appearance-none">
            <option className="bg-[#080112] text-white">All Categories</option>
            <option className="bg-[#080112] text-white">Consoles</option>
            <option className="bg-[#080112] text-white">Games</option>
            <option className="bg-[#080112] text-white">Accessories</option>
          </select>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Total Items</span>
          <span className="text-sm font-mono text-white font-bold">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Product Grid/Table */}
      <div className="bg-[#080112] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/10">
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Item Details</th>
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                {activeType === 'repair' ? 'Service Fee' : 'Base Price'}
              </th>
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                {activeType === 'repair' ? 'Est. Time' : 'Inventory'}
              </th>
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-white/[0.01] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded bg-white/5 border border-white/10 overflow-hidden">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{product.name}</p>
                      <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">ID: {product.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{product.category}</span>
                    <div className={`text-[8px] font-mono px-2 py-0.5 rounded-full w-fit uppercase tracking-tighter border ${product.type === 'rental'
                      ? 'bg-[#B000FF]/10 border-[#B000FF]/30 text-[#B000FF]'
                      : product.type === 'repair'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'bg-blue-500/10 border-blue-500/30 text-blue-500'
                      }`}>
                      {product.type === 'rental' ? 'Fleet (Rent)' : product.type === 'repair' ? 'Service' : 'Shop (Sale)'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-mono text-white font-bold">{formatCurrency(product.price)}</span>
                    {activeType === 'rental' && (
                      <span className="text-[9px] font-mono text-[#B000FF] uppercase tracking-tighter">Deposit: {formatCurrency(product.securityDeposit || 0)}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {activeType === 'repair' ? (
                    <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">{product.estimatedTime}</span>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${product.stockCount > 5 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">{product.stockCount} Units</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleStatus(product.id, product.enabled)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full border transition-all ${product.enabled
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-500'
                      }`}
                  >
                    {product.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    <span className="text-[9px] font-mono uppercase tracking-widest font-bold">
                      {product.enabled ? 'Live' : 'Hidden'}
                    </span>
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 bg-white/5 border border-white/10 rounded hover:bg-red-500/20 transition-colors text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#080112] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center space-x-3">
                  <Activity className="h-4 w-4 text-[#B000FF]" />
                  <h3 className="text-sm font-mono uppercase tracking-widest text-white">{editingProductId ? 'Edit Asset' : 'Initialize New Asset'}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Item Name</label>
                    <input
                      required
                      value={newProduct.name}
                      onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Usage Type</label>
                    <select
                      value={newProduct.type}
                      onChange={e => setNewProduct({ ...newProduct, type: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none appearance-none"
                    >
                      <option value="store" className="bg-[#080112] text-white">For Sale (Shop)</option>
                      <option value="rental" className="bg-[#080112] text-white">For Rent (Fleet)</option>
                      <option value="repair" className="bg-[#080112] text-white">Service (Repair)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct({ ...newProduct, category: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none appearance-none"
                    >
                      <option value="console" className="bg-[#080112] text-white">Console</option>
                      <option value="game" className="bg-[#080112] text-white">Game</option>
                      <option value="accessory" className="bg-[#080112] text-white">Accessory</option>
                      <option value="vr" className="bg-[#080112] text-white">VR Gear</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Image Asset URL</label>
                    <input
                      type="url"
                      value={newProduct.image}
                      onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      {newProduct.type === 'repair' ? 'Service Fee' : 'Price (â‚¹)'}
                    </label>
                    <input
                      type="number"
                      required
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                    />
                  </div>
                  {newProduct.type !== 'repair' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Initial Stock</label>
                      <input
                        type="number"
                        required
                        value={newProduct.stockCount}
                        onChange={e => setNewProduct({ ...newProduct, stockCount: parseInt(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Device Type</label>
                      <input
                        value={newProduct.deviceType}
                        onChange={e => setNewProduct({ ...newProduct, deviceType: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                      />
                    </div>
                  )}
                  {newProduct.type === 'rental' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Security Deposit</label>
                      <input
                        type="number"
                        value={newProduct.securityDeposit}
                        onChange={e => setNewProduct({ ...newProduct, securityDeposit: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Description // Metadata</label>
                  <textarea
                    value={newProduct.description}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm font-mono focus:border-[#B000FF]/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-[#B000FF] text-black font-bold rounded-lg text-[10px] font-mono uppercase tracking-widest hover:bg-[#9333EA] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      editingProductId ? 'Update Database' : 'Commit to Database'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

