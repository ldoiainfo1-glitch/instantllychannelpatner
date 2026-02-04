# AWS Deployment Fix for Empty Applications Table

## Problem
The "Area Wise Channel Partners" table on production (instantllycards.com) shows empty positions instead of the 111 approved applications that exist in the database.

## Root Cause
The backend server on AWS **is not connected to the production MongoDB database**. 

When the backend starts, it looks for `process.env.MONGODB_URI`. If not found, it falls back to `mongodb://localhost:27017/instantly-cards` (a local MongoDB that doesn't exist on the AWS server).

## Solution
Set the `MONGODB_URI` environment variable on your AWS deployment:

### For AWS EC2
```bash
# SSH into your EC2 instance
ssh your-ec2-instance

# Edit the backend's .env file
cd /path/to/your/backend
nano .env
```

Add this line:
```
MONGODB_URI=mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner
```

Then restart your Node.js server:
```bash
pm2 restart all
# OR if using systemd:
sudo systemctl restart your-backend-service
```

### For AWS Elastic Beanstalk
Go to your Elastic Beanstalk environment configuration and add environment variables:
- **Key**: `MONGODB_URI`
- **Value**: `mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner`

### For AWS App Runner / ECS
Add the environment variable in your service configuration:
```json
{
  "MONGODB_URI": "mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner"
}
```

### For Docker Deployment
Add to your docker-compose.yml or docker run command:
```yaml
environment:
  - MONGODB_URI=mongodb+srv://channel_partner_database:Newpass123@channelpartner-prod.pmy5cc.mongodb.net/channelpartner
```

## How to Verify the Fix

1. **Check backend logs** after setting the environment variable and restarting:
   ```
   ✅ Connected to MongoDB Atlas
   ```
   
   If you see this, the connection is successful!

2. **Test the API directly**:
   ```bash
   curl https://api.channel-partner.instantllycards.com/api/dynamic-positions?country=India
   ```
   
   This should return JSON with the `positions` array containing approved applications.

3. **Check frontend**: Visit https://instantllycards.com and the "Area Wise Channel Partners" table should now show filled positions with applicant names instead of "Apply Now" buttons.

## Additional Environment Variables
While you're at it, also set these (optional but recommended):
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-strong-random-secret-key
```

## Testing Locally
If you want to test locally with production data:
1. The `.env` file has already been created in `backend/.env`
2. Start the backend: `cd backend && npm start`
3. Open the frontend in your browser and it will auto-detect localhost

## Files Modified
- ✅ `backend/.env` - Created (not in git for security)
- ✅ `backend/.env.example` - Committed to git as documentation
- ✅ `frontend/js/app.js` - Fixed API_BASE_URL to detect localhost
- ✅ `frontend/index.html` - Fixed API_BASE_URL to detect localhost

## Next Steps
1. **Set the environment variable on AWS** (see above based on your deployment method)
2. **Restart the backend server**
3. **Verify the fix** by checking the frontend
4. **Monitor logs** to ensure no errors

## Questions?
If the issue persists after setting the environment variable:
1. Check backend logs for "Connected to MongoDB Atlas" message
2. Verify the MONGODB_URI is spelled correctly (no typos!)
3. Check if AWS security groups allow outbound connections to MongoDB Atlas
4. Ensure MongoDB Atlas IP whitelist includes your AWS server's IP (or use 0.0.0.0/0 for testing)
