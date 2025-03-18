require('dotenv').config();
const mongoose = require('mongoose');
const Menu = require('../models/Menu');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Menu items data
const menuItems = [
  // Breakfast items
  {
    name: 'Classic South Indian Breakfast',
    description: 'Idli, Vada, Sambar and Chutney combo',
    price: 80,
    category: 'breakfast',
    image: 'https://source.unsplash.com/random/800x600/?idli',
    isAvailable: true,
    preparationTime: 15
  },
  {
    name: 'Masala Dosa',
    description: 'Crispy rice crepe filled with spiced potato filling, served with sambar and chutney',
    price: 70,
    category: 'breakfast',
    image: 'https://source.unsplash.com/random/800x600/?dosa',
    isAvailable: true,
    preparationTime: 12
  },
  {
    name: 'Poha',
    description: 'Flattened rice with spices, onions, and peanuts',
    price: 50,
    category: 'breakfast',
    image: 'https://source.unsplash.com/random/800x600/?poha',
    isAvailable: true,
    preparationTime: 10
  },
  {
    name: 'Upma',
    description: 'Savory semolina porridge with vegetables and spices',
    price: 50,
    category: 'breakfast',
    image: 'https://source.unsplash.com/random/800x600/?upma',
    isAvailable: true,
    preparationTime: 10
  },
  {
    name: 'Aloo Paratha',
    description: 'Whole wheat flatbread stuffed with spiced potatoes, served with yogurt',
    price: 60,
    category: 'breakfast',
    image: 'https://source.unsplash.com/random/800x600/?paratha',
    isAvailable: true,
    preparationTime: 15
  },

  // Lunch items
  {
    name: 'Thali Meal',
    description: 'Complete meal with rice, dal, sabzi, roti, salad, and dessert',
    price: 120,
    category: 'lunch',
    image: 'https://source.unsplash.com/random/800x600/?thali',
    isAvailable: true,
    preparationTime: 20
  },
  {
    name: 'Rajma Chawal',
    description: 'Kidney bean curry served with steamed rice',
    price: 90,
    category: 'lunch',
    image: 'https://source.unsplash.com/random/800x600/?rajma',
    isAvailable: true,
    preparationTime: 18
  },
  {
    name: 'Chole Bhature',
    description: 'Spicy chickpea curry served with fried bread',
    price: 100,
    category: 'lunch',
    image: 'https://source.unsplash.com/random/800x600/?chole',
    isAvailable: true,
    preparationTime: 15
  },
  {
    name: 'Biryani',
    description: 'Fragrant rice dish with vegetables, spices, and herbs',
    price: 110,
    category: 'lunch',
    image: 'https://source.unsplash.com/random/800x600/?biryani',
    isAvailable: true,
    preparationTime: 25
  },
  {
    name: 'Paneer Butter Masala with Naan',
    description: 'Cottage cheese in rich tomato and butter gravy, served with flatbread',
    price: 130,
    category: 'lunch',
    image: 'https://source.unsplash.com/random/800x600/?paneer',
    isAvailable: true,
    preparationTime: 20
  },

  // Dinner items
  {
    name: 'Special Dinner Thali',
    description: 'Deluxe thali with paneer dish, dal makhani, rice, roti, salad, and sweet',
    price: 150,
    category: 'dinner',
    image: 'https://source.unsplash.com/random/800x600/?dinnerthali',
    isAvailable: true,
    preparationTime: 25
  },
  {
    name: 'Palak Paneer with Tandoori Roti',
    description: 'Cottage cheese in spinach gravy served with tandoor-baked flatbread',
    price: 130,
    category: 'dinner',
    image: 'https://source.unsplash.com/random/800x600/?palakpaneer',
    isAvailable: true,
    preparationTime: 20
  },
  {
    name: 'Dal Tadka with Jeera Rice',
    description: 'Yellow lentils with cumin-flavored rice',
    price: 100,
    category: 'dinner',
    image: 'https://source.unsplash.com/random/800x600/?dal',
    isAvailable: true,
    preparationTime: 15
  },
  {
    name: 'Veg Kofta Curry',
    description: 'Vegetable dumplings in aromatic gravy',
    price: 110,
    category: 'dinner',
    image: 'https://source.unsplash.com/random/800x600/?kofta',
    isAvailable: true,
    preparationTime: 20
  },
  {
    name: 'Butter Naan with Mix Veg',
    description: 'Buttered flatbread with mixed vegetable curry',
    price: 120,
    category: 'dinner',
    image: 'https://source.unsplash.com/random/800x600/?naan',
    isAvailable: true,
    preparationTime: 18
  },

  // Snacks items
  {
    name: 'Samosa',
    description: 'Triangular pastry filled with spiced potatoes and peas',
    price: 20,
    category: 'snacks',
    image: 'https://source.unsplash.com/random/800x600/?samosa',
    isAvailable: true,
    preparationTime: 8
  },
  {
    name: 'Vada Pav',
    description: 'Spicy potato fritter in a bun with chutneys',
    price: 25,
    category: 'snacks',
    image: 'https://source.unsplash.com/random/800x600/?vadapav',
    isAvailable: true,
    preparationTime: 5
  },
  {
    name: 'Pani Puri',
    description: 'Hollow crisp fried balls filled with spicy water and mashed potatoes',
    price: 40,
    category: 'snacks',
    image: 'https://source.unsplash.com/random/800x600/?panipuri',
    isAvailable: true,
    preparationTime: 8
  },
  {
    name: 'Aloo Tikki Chaat',
    description: 'Spiced potato patties topped with yogurt, chutneys, and spices',
    price: 50,
    category: 'snacks',
    image: 'https://source.unsplash.com/random/800x600/?aloochaat',
    isAvailable: true,
    preparationTime: 10
  },
  {
    name: 'Bread Pakora',
    description: 'Bread slices stuffed with potatoes, dipped in gram flour batter and fried',
    price: 30,
    category: 'snacks',
    image: 'https://source.unsplash.com/random/800x600/?pakora',
    isAvailable: true,
    preparationTime: 7
  },

  // Beverages items
  {
    name: 'Masala Chai',
    description: 'Spiced tea with milk',
    price: 15,
    category: 'beverages',
    image: 'https://source.unsplash.com/random/800x600/?tea',
    isAvailable: true,
    preparationTime: 5
  },
  {
    name: 'Cold Coffee',
    description: 'Sweetened coffee blended with ice and milk',
    price: 50,
    category: 'beverages',
    image: 'https://source.unsplash.com/random/800x600/?coldcoffee',
    isAvailable: true,
    preparationTime: 8
  },
  {
    name: 'Fresh Lime Soda',
    description: 'Refreshing lime juice with soda water, choice of sweet, salt, or mixed',
    price: 40,
    category: 'beverages',
    image: 'https://source.unsplash.com/random/800x600/?limesoda',
    isAvailable: true,
    preparationTime: 4
  },
  {
    name: 'Mango Lassi',
    description: 'Yogurt-based sweet drink with mango pulp',
    price: 60,
    category: 'beverages',
    image: 'https://source.unsplash.com/random/800x600/?lassi',
    isAvailable: true,
    preparationTime: 6
  },
  {
    name: 'Buttermilk',
    description: 'Spiced yogurt drink with cumin and mint',
    price: 25,
    category: 'beverages',
    image: 'https://source.unsplash.com/random/800x600/?buttermilk',
    isAvailable: true,
    preparationTime: 5
  }
];

// Insert menu items
const addMenuItems = async () => {
  try {
    // Delete existing menu items (optional, comment out if you want to keep existing items)
    console.log('Deleting existing menu items...');
    await Menu.deleteMany({});
    
    // Insert new menu items
    console.log('Adding new menu items...');
    const result = await Menu.insertMany(menuItems);
    
    console.log(`Added ${result.length} menu items to the database`);
    
    // Count items per category
    const categories = ['breakfast', 'lunch', 'dinner', 'snacks', 'beverages'];
    for (const category of categories) {
      const count = await Menu.countDocuments({ category });
      console.log(`- ${category}: ${count} items`);
    }
    
    console.log('Menu items added successfully!');
  } catch (error) {
    console.error('Error adding menu items:', error);
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the function
connectDB().then(() => {
  addMenuItems();
}); 