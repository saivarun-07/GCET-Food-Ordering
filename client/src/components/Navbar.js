import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
  };

  return (
    <nav className="bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-white font-bold text-xl">
              GCET Food
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}
              >
                Menu
              </Link>
              <Link
                to="/orders"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/orders')}`}
              >
                Orders
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/admin')}`}
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 