# Database Repair - Quick Guide

## Step 1: Deploy to VPS

The code has been committed. Now deploy it:

### Option A: GitHub Actions (Automatic)
If you have GitHub Actions set up, the deployment should happen automatically after push.

### Option B: Manual Deployment
SSH into VPS and run:
```bash
cd /var/www/purple-port
git pull
npm install
npm run build
pm2 restart all
```

## Step 2: Trigger Repair

Once deployed, open your browser and:

1. **Login** to http://66.116.224.221 as DEVELOPER_ADMIN
2. **Open Browser Console** (F12)
3. **Get your auth token**:
   ```javascript
   localStorage.getItem('token')
   ```
4. **Trigger repair** using this command in console:
   ```javascript
   fetch('http://66.116.224.221/api/admin/repair-database', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('token')
     }
   }).then(r => r.json()).then(console.log)
   ```

## Step 3: Verify

After repair completes, check the biometric bridge console. It should show:
```
✅ Sync Success: Processed 557 logs
```

## Alternative: Use Postman/Thunder Client
```
POST http://66.116.224.221/api/admin/repair-database
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```
