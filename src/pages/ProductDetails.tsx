import { useParams } from 'react-router-dom';
import { Product } from '../lib/data';
import { formatCurrency } from '../lib/utils';
import { Star, ShoppingCart, Calendar, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [rentMode, setRentMode] = useState(false);
  const [days, setDays] = useState(3);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'products', id), (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      } else {
        setProduct(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-accent"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center py-20 text-white">Product not found</div>;
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: rentMode ? (product.rentalPrice || 0) : product.price,
      quantity: 1,
      image: product.image,
      type: rentMode ? 'rent' : 'buy',
      rentalDuration: rentMode ? days : undefined
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-square rounded-2xl overflow-hidden bg-gaming-card border border-gaming-border"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2 py-1 bg-gaming-accent/10 text-gaming-accent text-xs font-bold rounded uppercase">
                {product.category}
              </span>
              {product.inStock ? (
                <span className="flex items-center text-green-500 text-xs font-bold">
                  <Check className="h-3 w-3 mr-1" /> In Stock
                </span>
              ) : (
                <span className="text-red-500 text-xs font-bold">Out of Stock</span>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{product.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-yellow-500">
                <Star className="h-5 w-5 fill-current" />
                <span className="ml-1 font-bold text-white">{product.rating}</span>
              </div>
              <span className="text-gaming-muted">({product.reviews} reviews)</span>
            </div>
          </div>

          <p className="text-gaming-muted text-lg leading-relaxed">
            {product.description}
          </p>

          {/* Purchase Options */}
          <div className="bg-gaming-card border border-gaming-border rounded-xl p-6 space-y-6">
            <div className="flex space-x-4 border-b border-gaming-border pb-6">
              <button
                onClick={() => setRentMode(false)}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${!rentMode
                  ? 'bg-gaming-accent text-black'
                  : 'bg-transparent text-gaming-muted hover:text-white'
                  }`}
              >
                Buy Now
              </button>
              {product.isRental && (
                <button
                  onClick={() => setRentMode(true)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${rentMode
                    ? 'bg-gaming-secondary text-white'
                    : 'bg-transparent text-gaming-muted hover:text-white'
                    }`}
                >
                  Rent
                </button>
              )}
            </div>

            <div>
              <div className="flex items-end justify-between mb-4">
                <span className="text-gaming-muted">Price</span>
                <span className="text-3xl font-bold text-white">
                  {rentMode
                    ? formatCurrency(product.rentalPrice || 0)
                    : formatCurrency(product.price)
                  }
                  {rentMode && <span className="text-sm text-gaming-muted font-normal"> / day</span>}
                </span>
              </div>

              {rentMode && (
                <div className="mb-6 space-y-2">
                  <label className="text-sm text-gaming-muted">Rental Duration (Days)</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value))}
                      className="flex-grow accent-gaming-secondary"
                    />
                    <span className="w-12 text-center font-mono text-white bg-gaming-bg py-1 rounded border border-gaming-border">
                      {days}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gaming-muted pt-2">
                    <span>Total Rental Cost:</span>
                    <span className="text-white font-bold">{formatCurrency((product.rentalPrice || 0) * days)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className={`w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center space-x-2 ${isAdded
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-black hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isAdded ? (
                  <>
                    <Check className="h-5 w-5" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    {rentMode ? <Calendar className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    <span>{rentMode ? 'Book Rental' : 'Add to Cart'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Specs / Details (Placeholder) */}
          <div className="border-t border-gaming-border pt-8">
            <h3 className="text-lg font-bold text-white mb-4">Product Highlights</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gaming-muted">
              <li className="flex items-center"><Check className="h-4 w-4 text-gaming-accent mr-2" /> Official Warranty</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-gaming-accent mr-2" /> Verified Condition</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-gaming-accent mr-2" /> Instant Shipping</li>
              <li className="flex items-center"><Check className="h-4 w-4 text-gaming-accent mr-2" /> 24/7 Support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
