import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, Search } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../lib/data';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shop Gear</h1>
          <p className="text-gaming-muted">Browse the latest gaming hardware and accessories.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
              >
                <Link to={`/product/${product.id}`} className="group block h-full">
                  <div className="bg-gaming-card rounded-xl overflow-hidden border border-gaming-border hover:border-gaming-accent transition-all duration-300 h-full flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-white/5">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gaming-accent transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gaming-muted capitalize mb-4">{product.category}</p>

                      <div className="mt-auto flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-white block">{formatCurrency(product.price)}</span>
                          {product.rentalPrice && (
                            <span className="text-xs text-gaming-accent">
                              or rent from {formatCurrency(product.rentalPrice)}/day
                            </span>
                          )}
                        </div>
                        <button className="px-3 py-1.5 bg-gaming-border hover:bg-gaming-accent hover:text-black text-white text-sm font-medium rounded transition-colors">
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
