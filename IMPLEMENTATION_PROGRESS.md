# Implementation Plan: Local Image Storage

## Summary
We're implementing local image storage in the Channel Partner backend so admin panel can display images immediately without depending on main backend image endpoints.

## What We're Doing

### 1. Created Ad Model (`/backend/api/models/Ad.js`)
✅ Stores ad metadata locally
✅ References to GridFS image/video IDs
✅ Tracks main backend sync status  
✅ Approval status for admin panel

### 2. Need to Modify `/backend/api/routes/ads.js`

**Current flow:**
```
1. Receive ad + images
2. Deduct credits
3. Forward everything to main backend
4. Return response
```

**New flow:**
```
1. Receive ad + images
2. Deduct credits
3. Store images in GridFS locally ← NEW
4. Create Ad document locally ← NEW
5. Forward ad to main backend (optional, for sync)
6. Update local Ad with main backend ID
7. Return response with local ad ID
```

### 3. Modify Image Endpoint `/api/ads/image/:id/:type`

**Current:**
```javascript
// Proxies to main backend
fetch(`${MAIN_BACKEND}/api/ads/image/${id}/${type}`)
```

**New:**
```javascript
// Serve from local GridFS
const ad = await Ad.findById(id);
const fileId = ad.bottomImageId; // or fullscreenImageId
const bucket = new GridFSBucket(mongoose.connection.db);
bucket.openDownloadStream(fileId).pipe(res);
```

### 4. Modify Admin Endpoint `/api/admin/ads`

**Current:**
```javascript
// Proxies to main backend
fetch(`${MAIN_BACKEND}/api/ads?approvalStatus=pending`)
```

**New:**
```javascript
// Query local database
const ads = await Ad.find({ approvalStatus: 'pending' })
  .sort({ createdAt: -1 });
res.json({ ads });
```

## Benefits

1. ✅ Admin panel works immediately
2. ✅ No dependency on main backend for images
3. ✅ Faster image loading (local storage)
4. ✅ Full control over approval workflow
5. ✅ Can still sync to main backend

## Implementation Status

- [x] Ad model created
- [ ] POST /ads modified for local storage
- [ ] GET /ads/image modified to serve locally
- [ ] GET /admin/ads modified to query locally
- [ ] Admin approval endpoints updated
- [ ] Test complete workflow

## Next Step

Modify the POST /ads route to implement steps 3-4 from the new flow.

The file is large (900 lines), so we need to:
1. Add GridFS storage function
2. Add Ad creation function
3. Update the route handler
