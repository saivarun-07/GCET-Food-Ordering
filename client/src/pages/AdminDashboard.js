import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    preparationTime: ''
  });

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchMenuItems();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/all');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await axios.get('/api/menu');
      setMenuItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status });
      fetchOrders();
      toast.success('Order status updated successfully');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleMenuItemSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/menu', newMenuItem);
      fetchMenuItems();
      setNewMenuItem({
        name: '',
        description: '',
        price: '',
        category: '',
        image: '',
        preparationTime: ''
      });
      toast.success('Menu item added successfully');
    } catch (error) {
      toast.error('Failed to add menu item');
    }
  };

  const toggleMenuItemAvailability = async (itemId) => {
    try {
      await axios.put(`/api/menu/${itemId}/toggle-availability`);
      fetchMenuItems();
      toast.success('Menu item availability updated');
    } catch (error) {
      toast.error('Failed to update menu item availability');
    }
  };

  const deleteMenuItem = async (itemId) => {
    try {
      await axios.delete(`/api/menu/${itemId}`);
      fetchMenuItems();
      toast.success('Menu item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Manage Orders
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'menu'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Manage Menu
        </button>
      </div>

      {/* Orders Management */}
      {activeTab === 'orders' && (
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
                    Customer: {order.user.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Placed on: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                  className="border rounded-md px-2 py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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

      {/* Menu Management */}
      {activeTab === 'menu' && (
        <div className="space-y-8">
          {/* Add New Menu Item Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Add New Menu Item</h3>
            <form onSubmit={handleMenuItemSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newMenuItem.name}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, name: e.target.value })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={newMenuItem.category}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, category: e.target.value })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snacks">Snacks</option>
                    <option value="beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newMenuItem.price}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, price: e.target.value })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={newMenuItem.preparationTime}
                    onChange={(e) =>
                      setNewMenuItem({
                        ...newMenuItem,
                        preparationTime: e.target.value
                      })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newMenuItem.description}
                    onChange={(e) =>
                      setNewMenuItem({
                        ...newMenuItem,
                        description: e.target.value
                      })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={newMenuItem.image}
                    onChange={(e) =>
                      setNewMenuItem({ ...newMenuItem, image: e.target.value })
                    }
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Add Menu Item
              </button>
            </form>
          </div>

          {/* Menu Items List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {item.description}
                  </p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold">₹{item.price}</span>
                    <span className="text-sm text-gray-500">
                      {item.preparationTime} mins
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => toggleMenuItemAvailability(item._id)}
                      className={`px-4 py-2 rounded-md ${
                        item.isAvailable
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => deleteMenuItem(item._id)}
                      className="px-4 py-2 rounded-md bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 