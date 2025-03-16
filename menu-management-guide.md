# Menu Management Guide for GCET Food Ordering System

This guide explains how to add, update, and manage menu items in your GCET Food Ordering application.

## Menu Item Structure

Each menu item in the system has the following properties:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| name | String | Name of the food/beverage item | Yes |
| description | String | Description of the item | Yes |
| price | Number | Price in INR | Yes |
| category | String | One of: 'breakfast', 'lunch', 'dinner', 'snacks', 'beverages' | Yes |
| image | String | URL to the image of the item | Yes |
| isAvailable | Boolean | Whether the item is currently available | No (defaults to true) |
| preparationTime | Number | Time to prepare in minutes | Yes |

## Admin Authentication

To add menu items, you need to:
1. Have an admin account (role = 'admin')
2. Be authenticated in the system

## Adding Menu Items

### Using Postman or similar API tools

1. **Authenticate as Admin**
   - Send a POST request to `https://gcet-food-ordering-backend.onrender.com/api/auth/send-otp` with your admin phone number
   - Verify the OTP at `https://gcet-food-ordering-backend.onrender.com/api/auth/verify-otp`
   - Copy the JWT token from the response

2. **Add a Menu Item**
   - Send a POST request to `https://gcet-food-ordering-backend.onrender.com/api/menu`
   - Include the Authorization header: `Authorization: Bearer YOUR_JWT_TOKEN`
   - In the request body (JSON format), include all required fields:
   
   ```json
   {
     "name": "Samosa",
     "description": "Crispy fried pastry with savory potato filling",
     "price": 15,
     "category": "snacks",
     "image": "https://example.com/images/samosa.jpg",
     "preparationTime": 10,
     "isAvailable": true
   }
   ```

### Example Menu Items by Category

#### Breakfast
```json
{
  "name": "Idli Sambar",
  "description": "Soft steamed rice cakes served with sambar and chutney",
  "price": 40,
  "category": "breakfast",
  "image": "https://example.com/images/idli.jpg",
  "preparationTime": 15,
  "isAvailable": true
}
```

#### Lunch
```json
{
  "name": "Veg Thali",
  "description": "Complete meal with rice, roti, dal, sabzi, and dessert",
  "price": 80,
  "category": "lunch",
  "image": "https://example.com/images/veg-thali.jpg",
  "preparationTime": 20,
  "isAvailable": true
}
```

#### Dinner
```json
{
  "name": "Paneer Butter Masala",
  "description": "Paneer cubes in rich tomato and cream gravy with butter",
  "price": 120,
  "category": "dinner",
  "image": "https://example.com/images/paneer-butter-masala.jpg",
  "preparationTime": 25,
  "isAvailable": true
}
```

#### Snacks
```json
{
  "name": "Masala Vada",
  "description": "Crispy deep-fried snack made with chana dal and spices",
  "price": 25,
  "category": "snacks",
  "image": "https://example.com/images/masala-vada.jpg",
  "preparationTime": 15,
  "isAvailable": true
}
```

#### Beverages
```json
{
  "name": "Masala Chai",
  "description": "Classic Indian tea with aromatic spices",
  "price": 15,
  "category": "beverages",
  "image": "https://example.com/images/masala-chai.jpg",
  "preparationTime": 8,
  "isAvailable": true
}
```

## Managing Menu Items

### Update a Menu Item
- Send a PUT request to `https://gcet-food-ordering-backend.onrender.com/api/menu/{item_id}`
- Include the same Authorization header
- Include all fields you want to update in the request body

### Toggle Item Availability
- Send a PUT request to `https://gcet-food-ordering-backend.onrender.com/api/menu/{item_id}/toggle-availability`
- Include the same Authorization header
- No body needed

### Delete a Menu Item
- Send a DELETE request to `https://gcet-food-ordering-backend.onrender.com/api/menu/{item_id}`
- Include the same Authorization header

## Bulk Adding Menu Items

For adding multiple menu items at once, you can create a script that sends multiple requests to the API. Here's a simple Node.js example:

```javascript
const axios = require('axios');

const token = 'YOUR_JWT_TOKEN'; // JWT token from admin login
const apiUrl = 'https://gcet-food-ordering-backend.onrender.com/api/menu';

const menuItems = [
  // Add your menu items here as objects
  {
    "name": "Samosa",
    "description": "Crispy fried pastry with savory potato filling",
    "price": 15,
    "category": "snacks",
    "image": "https://example.com/images/samosa.jpg",
    "preparationTime": 10,
    "isAvailable": true
  },
  // Add more items...
];

async function addMenuItems() {
  for (const item of menuItems) {
    try {
      const response = await axios.post(apiUrl, item, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Added ${item.name} successfully`);
    } catch (error) {
      console.error(`Error adding ${item.name}:`, error.response?.data || error.message);
    }
  }
}

addMenuItems();
```

## Best Practices

1. **Images**: Use hosted images with stable URLs (e.g., from a CDN or image hosting service)
2. **Categories**: Stick to the predefined categories 
3. **Description**: Provide clear and appetizing descriptions
4. **Preparation Time**: Be realistic about preparation times to manage customer expectations
5. **Availability**: Use the toggle availability feature for items that are temporarily unavailable rather than deleting them

## Troubleshooting

If you encounter issues:

1. **Authentication errors (401)**: Make sure your JWT token is valid and included correctly
2. **Permission errors (403)**: Verify that your account has admin privileges 
3. **Validation errors (400)**: Check that all required fields are included and valid
4. **Server errors (500)**: Contact the backend developer for assistance

For any other questions or issues related to menu management, please contact the system administrator. 