import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState({
    name: '',
    phone: '',
    block: '',
    classNumber: ''
  });
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  const categories = ['all', 'breakfast', 'lunch', 'dinner', 'snacks', 'beverages'];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    if (checkoutDetails.block && checkoutDetails.classNumber) {
      setDeliveryLocation(`Block ${checkoutDetails.block}, Room ${checkoutDetails.classNumber}`);
    } else {
      setDeliveryLocation('');
    }
  }, [checkoutDetails]);

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

  const addToCart = (item) => {
    const existingItem = cart.find((cartItem) => cartItem._id === item._id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success('Item added to cart');
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) =>
        item._id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleCheckoutDetailsChange = (e) => {
    const { name, value } = e.target;
    setCheckoutDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const placeOrder = async () => {
    try {
      if (cart.length === 0) {
        toast.error('Your cart is empty');
        return;
      }
      
      // Validate checkout details
      if (!checkoutDetails.name || !checkoutDetails.phone) {
        toast.error('Please provide your name and phone number');
        return;
      }
      
      if (!deliveryLocation) {
        toast.error('Please select a delivery location');
        return;
      }
      
      // Check for auth token 
      const token = localStorage.getItem('token');
      console.log('Order with token:', token ? 'Present' : 'Not present');
      
      const orderData = {
        items: cart.map(item => ({
          menuItemId: item._id,
          quantity: item.quantity
        })),
        deliveryLocation,
        customerDetails: {
          name: checkoutDetails.name,
          phone: checkoutDetails.phone
        }
      };
      
      console.log('Submitting order:', JSON.stringify(orderData, null, 2));
      
      const config = {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      };
      
      const response = await axios.post('/api/orders', orderData, config);
      
      console.log('Order response:', response.data);
      
      setCart([]);
      localStorage.removeItem('cart');
      setOrderSuccess(true);
      
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Menu Section */}
        <div className="md:w-2/3">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Menu</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full capitalize ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
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
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">₹{item.price}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="md:w-1/3">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-2xl font-bold mb-4">Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-4 mb-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-gray-600">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="px-2 py-1 bg-gray-200 rounded"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="px-2 py-1 bg-gray-200 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">₹{calculateTotal()}</span>
                  </div>
                  {!showCheckout ? (
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                    >
                      Proceed to Checkout
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          name="name"
                          value={checkoutDetails.name}
                          onChange={handleCheckoutDetailsChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={checkoutDetails.phone}
                          onChange={handleCheckoutDetailsChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Block</label>
                        <input
                          type="text"
                          name="block"
                          value={checkoutDetails.block}
                          onChange={handleCheckoutDetailsChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Class Number</label>
                        <input
                          type="text"
                          name="classNumber"
                          value={checkoutDetails.classNumber}
                          onChange={handleCheckoutDetailsChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowCheckout(false)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                        >
                          Back to Cart
                        </button>
                        <button
                          onClick={placeOrder}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                        >
                          Place Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu; 