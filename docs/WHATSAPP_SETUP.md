# WhatsApp QR Code Setup Guide

## Step-by-Step Instructions

### 1. Start the Application

```bash
np```

This starts both backend (port 3000) and frontend (port 5173).

### 2. Login to Dashboard

- Open http://localhost:5173
- Login with:
  - Username: `admin`
  - Password: `admin123`

### 3. Connect WhatsApp

On the Dashboard page:

1. **Click "🔌 Connect" button** in the WhatsApp Status card
2. **QR Code Modal appears automatically** within 2-3 seconds
3. **Scan the QR code** with your phone:
   - Open WhatsApp on your phone
   - Tap Menu (⋮) or Settings
   - Tap "Linked Devices"
   - Tap "Link a Device"
   - Scan the QR code displayed in the browser

4. **Status changes**:
   - `🟡 Scan QR Code` → QR is ready
   - `🔵 Authenticated` → QR scanned successfully
   - `🟢 Ready` → Connected and ready to send messages

### 4. Send Messages

Once status is "Ready":

- **Send to All**: Click "📤 Send to All" on Dashboard
- **Send to One**: Go to "Send" page and enter phone + message
- **View Contacts**: Go to "Contacts" page
- **View Log**: Go to "Messages" page

### 5. Logout from WhatsApp

To disconnect:

1. Click "🚪 Logout" button on Dashboard
2. Confirm the action
3. Status returns to "Disconnected"
4. Next time you'll need to scan QR code again

## Features

### QR Code Display
- **Auto-popup**: QR code appears automatically when ready
- **Manual show**: Click "📱 Show QR" if modal was closed
- **Auto-refresh**: QR updates every 3 seconds if needed
- **Auto-close**: Modal closes when authenticated

### Status Indicators
- 🔴 **Disconnected**: Not connected, click "Connect"
- 🟡 **Scan QR Code**: QR ready, scan with phone
- 🔵 **Authenticated**: Scanned, loading session
- 🟢 **Ready**: Connected, can send messages

### Session Persistence
- Session saved in `.wwebjs_auth/` folder
- Survives server restarts
- Logout clears the session completely

## Troubleshooting

### QR Code doesn't appear
- Wait 3-5 seconds after clicking Connect
- Check backend console for errors
- Click "🔄 Refresh" button
- Try clicking "📱 Show QR" if status is "qr_ready"

### Can't scan QR code
- Make sure QR code is fully visible
- Try zooming out browser if QR is cut off
- Ensure phone has internet connection
- Try closing and reopening WhatsApp

### Status stuck on "Authenticated"
- Wait 10-15 seconds
- WhatsApp is loading your chats
- Check backend console for progress
- Click Refresh after waiting

### Want to reconnect
- Click "🚪 Logout" first
- Wait for status to show "Disconnected"
- Click "🔌 Connect" again
- Scan new QR code

## Notes

- QR code expires after ~60 seconds - a new one generates automatically
- You can only link one device at a time per WhatsApp account
- Logging out from dashboard also logs out from WhatsApp Web
- Session persists across server restarts unless you logout
