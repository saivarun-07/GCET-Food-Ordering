# Create Admin Account Using cURL

If you're having trouble with the HTML tool due to CORS issues, you can use the following curl command in a terminal or command prompt to create an admin account directly:

## Windows (PowerShell)

```powershell
$data = @{
    phone = "YOUR_PHONE_NUMBER"
    name = "Admin User"
    secretKey = "gcet-admin-secret"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://gcet-food-ordering-backend.onrender.com/api/auth/create-admin" -Method POST -Body $data -ContentType "application/json"
```

## Windows (Command Prompt)

```batch
curl -X POST "https://gcet-food-ordering-backend.onrender.com/api/auth/create-admin" -H "Content-Type: application/json" -d "{\"phone\":\"YOUR_PHONE_NUMBER\",\"name\":\"Admin User\",\"secretKey\":\"gcet-admin-secret\"}"
```

## macOS/Linux

```bash
curl -X POST "https://gcet-food-ordering-backend.onrender.com/api/auth/create-admin" \
  -H "Content-Type: application/json" \
  -d '{"phone":"YOUR_PHONE_NUMBER","name":"Admin User","secretKey":"gcet-admin-secret"}'
```

Replace `YOUR_PHONE_NUMBER` with the actual phone number you want to use for the admin account.

## What to Expect

If successful, you'll receive a response similar to:

```json
{
  "message": "Admin user created successfully",
  "userId": "67d8fa71b603961672cd5d99",
  "instructions": "You can now use this phone number to login as admin"
}
```

## After Creating the Admin Account

1. Make note of the phone number you used
2. Remove the temporary admin creation route from your `auth.js` file
3. Deploy the changes to secure your application 