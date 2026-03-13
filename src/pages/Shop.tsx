import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../lib/data';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { EditableText } from '../components/Editable';

export default function Shop() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Bind the storefront natively to the active database
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(fetchedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesCategory = filter === 'all' || product.category === filter;
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'controller', 'game', 'accessory', 'vr'];

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ maxWidth: 'var(--layout-max-width, 1280px)' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            <EditableText pageKey="shop" itemKey="title" defaultText="Shop Gear" />
          </h1>
          <p className="text-gaming-muted">
            <EditableText pageKey="shop" itemKey="subtitle" defaultText="Browse the latest gaming hardware and accessories." />
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gaming-muted" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gaming-card border border-gaming-border rounded-lg text-white focus:outline-none focus:border-gaming-accent w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-accent"></div>
        </div>
      ) : (
        <>
          {/* Categories */}
          <div className="flex overflow-x-auto pb-4 mb-8 gap-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === cat
                    ? 'bg-gaming-accent text-black'
                    : 'bg-gaming-card border border-gaming-border text-gaming-muted hover:text-white'
                  }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 'var(--layout-grid-gap, 1.5rem)' }}>
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#B000FF]/10 to-[#4D008C]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl blur-xl pointer-events-none" />
                <Link to={`/product/${product.id}`} className="group block h-full relative z-10">
                  <div className="bg-[#0c021a] overflow-hidden border border-white/5 hover:border-[#B000FF]/50 transition-all duration-500 hover:-translate-y-1 shadow-xl h-full flex flex-col relative" style={{ borderRadius: 'var(--layout-border-radius, 1.5rem)' }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
                    <div className="relative aspect-square overflow-hidden bg-[#080112]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-5 flex-grow flex flex-col relative z-20 bg-gradient-to-b from-transparent to-[#080112]">
                      <h3 className="text-lg font-black text-white mb-1 group-hover:text-[#B000FF] transition-colors uppercase tracking-tight leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">{product.category}</p>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                        <div>
                          <span className="text-xl font-black text-white italic tracking-tighter drop-shadow-md block">{formatCurrency(product.price)}</span>
                          {product.rentalPrice && (
                            <span className="text-[10px] font-bold text-[#B000FF] uppercase tracking-widest mt-1 block">
                              Rent: {formatCurrency(product.rentalPrice)}/d
                            </span>
                          )}
                        </div>
                        <button className="px-4 py-2 bg-white/5 hover:bg-[#B000FF] border border-white/10 hover:border-[#B000FF] text-white hover:text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_#B000FF]">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gaming-muted text-lg">No products found matching your criteria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
