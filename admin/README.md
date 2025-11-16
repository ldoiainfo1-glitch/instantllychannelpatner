# Channel Partner Admin Portal

Separate admin portal for channel partner management.

## 📁 Structure

```
/admin/
  ├── index.html        → Admin Login Page
  ├── dashboard.html    → Main Admin Dashboard
  ├── ads.html          → Advertisement Management
  ├── credits.html      → Credits & Transactions Admin
  └── video-upload.html → Video Upload Management
```

## 🔐 Access

**Login URL:** https://instantllychannelpatner.vercel.app/admin

**Credentials:**
- Username: `admin`
- Password: `admin123`

## 🔑 Authentication

- Uses `channelPartnerToken` in localStorage
- Separate from user authentication (`authToken`)
- JWT-based with 7-day expiration
- Auto-redirects to `/admin/index.html` if not logged in

## 🚀 Deployment

Automatically deployed with Vercel. The `/admin` route is configured in `vercel.json`.

## 📝 Key Features

1. **Separate Login** - No conflict with main user portal
2. **Admin-only Access** - JWT token validation
3. **Full Management** - Ads, Credits, Videos
4. **Transaction Tracking** - View all credit transfers
5. **User Management** - Admin credit transfers to any user
