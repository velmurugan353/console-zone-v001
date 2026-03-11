import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, Gamepad2, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCustomizer } from '../context/CustomizerContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { EditableText, EditableImage } from './Editable';

export default function Navbar({ onAuthClick }: { onAuthClick?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { cartCount } = useCart();
  const { user, isAdmin } = useAuth();
  const { layout } = useCustomizer();
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Rentals', path: '/rentals' },
    { name: 'Sell', path: '/sell' },
    { name: 'Repair', path: '/repair' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-gaming-bg/80 backdrop-blur-md border-b border-gaming-border">
      <div className="w-full px-6 transition-all duration-500">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 bg-gaming-accent/10 rounded-lg group-hover:bg-gaming-accent/20 transition-colors">
              <Gamepad2 className="h-6 w-6 text-gaming-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white italic">
              <EditableText pageKey="global" itemKey="site_name" defaultText="ConsoleZone" />
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-gaming-accent",
                  location.pathname === link.path ? "text-gaming-accent" : "text-gaming-muted"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/cart" className="relative text-gaming-text hover:text-gaming-accent transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gaming-secondary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-sm font-medium text-gaming-text hover:text-gaming-accent transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gaming-card border border-gaming-border flex items-center justify-center overflow-hidden">
                  {user.avatar ? <img src={user.avatar} alt={user.name} /> : <User className="h-4 w-4" />}
                </div>
                <span>{user.name}</span>
              </Link>
            ) : (
              <button
                onClick={onAuthClick}
                className="px-4 py-2 text-sm font-medium bg-gaming-accent text-black rounded-lg hover:bg-gaming-accent/90 transition-colors"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gaming-text hover:text-white p-2"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gaming-card border-b border-gaming-border overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    location.pathname === link.path
                      ? "bg-gaming-accent/10 text-gaming-accent"
                      : "text-gaming-muted hover:bg-gaming-border/50 hover:text-white"
                  )}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gaming-border">
                <Link
                  to="/cart"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-gaming-muted hover:text-white"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart ({cartCount})</span>
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-gaming-muted hover:text-white"
                  >
                    <User className="h-5 w-5" />
                    <span>Dashboard</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (onAuthClick) onAuthClick();
                    }}
                    className="block w-full mt-2 px-3 py-2 text-center bg-gaming-accent text-black rounded-md font-medium"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
