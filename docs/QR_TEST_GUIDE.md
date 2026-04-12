# QR Code Testing Guide

## Quick Test (HTML Page)

1. Make sure both servers are running:
   ```bash
   npm start
   ```

2. Open `backend/test-whatsapp.html` in your browser

3. Click buttons in order:
   - **1. Login** - Get authentication token
   - **2. Check Status** - Should show "disconnected"
   - **3. Initialize WhatsApp** - Starts WhatsApp client
   - **2. Check Status** (again) - QR code should appear after 2-3 seconds

4. Scan the QR code with your phone

5. Keep clicking "Check Status" to see status change:
   - `disconnected` → `qr_ready` → `authenticated` → `ready`

## Test in React App

1. Open http://localhost:5174 (or 5173)

2. Login with:
   - Username: `admin`
   - Password: `admin123`

3. On Dashboard:
   - Click "🔌 Connect" button
   - Wait 2-3 seconds
   - QR code modal should pop up automatically
   - If not, click "📱 Show QR" button

4. Scan QR code with WhatsApp on your phone

5. Status should change:
   - 🔴 Disconnected
   - 🟡 Scan QR Code
   - 🔵 Authenticated
   - 🟢 Ready

## Troubleshooting

### QR Code Not Appearing

**Check backend console:**
```
[WhatsApp] Creating new client...
[WhatsApp] Initializing client...
[WhatsApp] Scan the QR code below:
[WhatsApp] QR code ready for frontend
```

If you see errors instead, try:

1. **Delete WhatsApp session:**
   ```bash
   cd backend
   rm -rf .wwebjs_auth
   ```

2. **Restart backend:**
   ```bash
   cd backend
   npm start
   ```

3. **Try again**

### Puppeteer Errors

If you see `ProtocolError` or `Execution context was destroyed`:

1. Stop all servers
2. Delete `.wwebjs_auth` folder
3. Restart servers
4. Try initializing again

### QR Code Expires

QR codes expire after ~60 seconds. If expired:
- A new QR code generates automatically
- Just wait and it will refresh
- Or click "🔄 Refresh" button

### Status Stuck

If status is stuck on "qr_ready" or "authenticated":
- Wait 10-15 seconds
- Click "🔄 Refresh"
- Check backend console for progress
- WhatsApp may be loading your chats

## Manual Backend Test

Test backend directly with curl:

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save the token from response

# 2. Check status
curl http://localhost:3000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Initialize WhatsApp
curl -X POST http://localhost:3000/api/whatsapp/init \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Check status again (should have QR code)
curl http://localhost:3000/api/whatsapp/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

The QR code will be in the response as a data URL starting with `data:image/png;base64,...`

## Expected Flow

1. **User clicks Connect** → Frontend calls `/api/whatsapp/init`
2. **Backend initializes** → Creates WhatsApp client with Puppeteer
3. **QR generated** → Backend stores QR as data URL
4. **Frontend polls** → Checks `/api/whatsapp/status` every 3 seconds
5. **QR appears** → Modal shows QR image
6. **User scans** → Status changes to authenticated
7. **Modal closes** → Auto-closes when ready
8. **Ready to send** → Can now send messages

## Debug Mode

To see detailed logs, check backend console for:
- `[WhatsApp] Creating new client...`
- `[WhatsApp] Initializing client...`
- `[WhatsApp] QR code ready for frontend`
- `[WhatsApp] Authenticated successfully`
- `[WhatsApp] Client is ready`

Any errors will show as:
- `[WhatsApp] Failed to create client:`
- `[WhatsApp] Initialization failed:`
- `[WhatsApp] Authentication failure:`
