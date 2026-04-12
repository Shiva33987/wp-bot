# Troubleshooting Guide

## Common Issues and Solutions

### 1. ECONNREFUSED Error (Frontend can't connect to backend)

**Symptoms:**
```
[vite] http proxy error: /api/auth/login
AggregateError [ECONNREFUSED]
```

**Cause:** Backend server is not running

**Solutions:**

**Option A: Use the main start command**
```bash
npm start
```
This starts both backend and frontend together.

**Option B: Start servers separately**

Terminal 1 (Backend):
```bash
cd backend
npm start
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Option C: Use batch files (Windows)**
- Double-click `start-backend.bat`
- Double-click `start-frontend.bat`

### 2. Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

**Kill the process using the port:**

Windows:
```bash
# Find process on port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F
```

Or change the port in `backend/.env`:
```env
PORT=3001
```

### 3. Frontend Port Changed

**Symptoms:**
```
Port 5173 is in use, trying another one...
➜  Local:   http://localhost:5174/
```

**Solution:** This is normal! Vite automatically finds an available port. Just use the URL shown in the terminal.

### 4. WhatsApp QR Code Not Appearing

**Symptoms:** Status shows "Disconnected", no QR code modal

**Solutions:**
1. Click the "🔌 Connect" button on Dashboard
2. Wait 3-5 seconds for QR to generate
3. Check backend terminal for errors
4. If status shows "🟡 Scan QR Code", click "📱 Show QR"

### 5. Module Not Found Errors

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 6. WhatsApp Session Issues

**Symptoms:** Can't connect, stuck on "Authenticated", or random disconnects

**Solutions:**

**Clear session and reconnect:**
1. Click "🚪 Logout" on Dashboard
2. Delete `.wwebjs_auth` folder in backend directory
3. Restart backend server
4. Click "🔌 Connect" and scan new QR code

**Manual cleanup:**
```bash
cd backend
rm -rf .wwebjs_auth
npm start
```

### 7. CSV File Errors

**Symptoms:**
```
Error: contacts.csv not found
```

**Solution:**

Create `backend/data/contacts.csv`:
```csv
name,phone,message
John Doe,5511999999999,Hello John!
```

### 8. Login Fails with 401

**Symptoms:** "Invalid credentials" error

**Solution:**

Check `backend/.env` file:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Default credentials:
- Username: `admin`
- Password: `admin123`

### 9. Build Errors

**Frontend build fails:**
```bash
cd frontend
npm run build
```

Check for:
- Missing dependencies: `npm install`
- Syntax errors in React components
- Import errors

**Backend won't start:**
```bash
cd backend
node index.js
```

Check for:
- Missing `.env` file
- Syntax errors in JavaScript files
- Missing dependencies

### 10. Concurrently Not Working

**Symptoms:**
```
'concurrently' is not recognized
```

**Solution:**
```bash
# Install concurrently at root level
npm install
```

## Quick Health Check

Run these commands to verify everything is set up:

```bash
# 1. Check Node.js version (should be 14+)
node --version

# 2. Check if dependencies are installed
ls node_modules/concurrently
ls backend/node_modules/express
ls frontend/node_modules/react

# 3. Test backend directly
cd backend
node index.js
# Should see: [Server] Running on http://localhost:3000

# 4. Test frontend directly
cd frontend
npm run dev
# Should see: Local: http://localhost:5173
```

## Getting Help

If none of these solutions work:

1. Check the terminal output for specific error messages
2. Look for error details in browser console (F12)
3. Verify all files are present:
   - `backend/.env`
   - `backend/data/contacts.csv`
   - `backend/node_modules/`
   - `frontend/node_modules/`

4. Try a clean reinstall:
```bash
# Remove all node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Reinstall everything
npm install
cd backend && npm install
cd ../frontend && npm install
```
