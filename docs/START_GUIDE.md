# How to Start the Application

## ✅ Recommended Method (Separate Terminals)

This is the most reliable way to run both servers:

### Terminal 1 - Backend
```bash
cd backend
npm start
```

Wait until you see:
```
[Server] Running on http://localhost:3000
[Server] Ready to accept requests
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

Wait until you see:
```
VITE ready in XXXms
➜  Local:   http://localhost:5173/
```

### Access the App
Open your browser to: **http://localhost:5173** (or 5174 if 5173 is in use)

---

## 🪟 Windows Batch Files

Double-click these files in order:

1. **`start-backend.bat`** - Opens backend in new window
2. **`start-frontend.bat`** - Opens frontend in new window

---

## 🔧 Alternative: Single Command

If you want to run both with one command:

```bash
npm start
```

**Note:** This uses `concurrently` which can sometimes have issues. If it fails, use the separate terminals method above.

---

## 🧪 Testing

Once both servers are running:

1. Open http://localhost:5173 (or 5174)
2. Login with:
   - Username: `admin`
   - Password: `admin123`
3. Click "🔌 Connect" on Dashboard
4. Wait 2-3 seconds for QR code modal
5. Scan QR code with WhatsApp on your phone

---

## 🐛 Troubleshooting

### Backend won't start

**Check if port 3000 is in use:**
```bash
# Windows
netstat -ano | findstr :3000

# If something is using it, kill the process or change port in backend/.env
```

**Try running directly:**
```bash
cd backend
node index.js
```

### Frontend won't start

**Check if port 5173 is in use:**
```bash
# Windows
netstat -ano | findstr :5173
```

**Vite will automatically use 5174 if 5173 is busy** - this is normal!

### Connection Refused Errors

If frontend shows `ECONNREFUSED`:

1. Make sure backend is running first
2. Check backend console shows "Server Running"
3. Test backend: `curl http://localhost:3000/health`
4. Should return: `{"status":"ok"}`

### Both servers running but can't connect

1. Stop both servers (Ctrl+C)
2. Start backend first, wait for "Ready"
3. Then start frontend
4. Refresh browser

---

## 📝 Quick Reference

| Component | Port | URL |
|-----------|------|-----|
| Backend | 3000 | http://localhost:3000 |
| Frontend | 5173 | http://localhost:5173 |
| Frontend (alt) | 5174 | http://localhost:5174 |

**Default Login:**
- Username: `admin`
- Password: `admin123`

**Backend Health Check:**
```bash
curl http://localhost:3000/health
```

**Stop Servers:**
- Press `Ctrl+C` in each terminal
- Or close the terminal windows
