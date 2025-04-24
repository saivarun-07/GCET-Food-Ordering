import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Function to fetch orders
  const fetchOrders = async () => {
    try {
      console.log('Fetching orders with token:', localStorage.getItem('token'));
      // Add authorization header
      const config = {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      };
      
      let response;
      if (user && user.role === 'admin') {
        // Admin users can see all orders
        response = await axios.get('/api/orders/all', config);
      } else if (user && user.phone) {
        // Regular users see only their orders by phone number
        response = await axios.get(`/api/orders/guest/${user.phone}`, config);
      } else {
        // Fallback if somehow user is not properly authenticated
        toast.error('User information not available. Please log in again.');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      console.log('Orders fetched:', response.data);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders. ' + (error.response?.data?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-100';
      case 'preparing':
        return 'text-blue-500 bg-blue-100';
      case 'ready':
        return 'text-green-500 bg-green-100';
      case 'delivered':
        return 'text-purple-500 bg-purple-100';
      case 'cancelled':
        return 'text-red-500 bg-red-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">No Orders Yet</h2>
        <p className="text-gray-600">You haven't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Your Orders</h2>
      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">Order ID: {order._id}</p>
                <p className="text-sm text-gray-500">
                  Placed on: {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                  order.status
                )}`}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <div className="border-t border-b py-4 mb-4">
              {order.items && order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center mb-2"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Delivery Location:</p>
                <p className="text-sm text-gray-500">{order.deliveryLocation}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">Total Amount:</p>
                <p className="text-xl font-bold">₹{order.totalAmount}</p>
              </div>
            </div>
            {order.status === 'pending' && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Implement cancel order functionality
                    toast.info('Cancel functionality coming soon');
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders; 