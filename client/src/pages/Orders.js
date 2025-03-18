import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(true);

  useEffect(() => {
    if (phoneNumber) {
      fetchOrders();
    }
  }, [phoneNumber]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`/api/orders/guest/${phoneNumber}`);
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phoneNumber) {
      setShowPhoneInput(false);
      fetchOrders();
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (showPhoneInput) {
    return (
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">View Your Orders</h2>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
            >
              View Orders
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Orders</h2>
        <button
          onClick={() => {
            setPhoneNumber('');
            setShowPhoneInput(true);
            setOrders([]);
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          Change Phone Number
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders found for this phone number</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Order ID: {order._id}
                  </p>
                  <p className="text-sm text-gray-500">
                    Placed on: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
              <div className="border-t border-b py-4 mb-4">
                {order.items.map((item, index) => (
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
                  <p className="text-sm text-gray-500">
                    Block {order.deliveryLocation.block}, Class{' '}
                    {order.deliveryLocation.classNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Total Amount:</p>
                  <p className="text-xl font-bold">₹{order.totalAmount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders; 