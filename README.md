# WhatsApp Chatbot with CSV & React Dashboard

Full-stack WhatsApp bot with authentication, CSV contact management, and React frontend.

## Features

- 🔐 JWT authentication (login/register)
- 📋 CSV-based contact management
- 📤 Send messages to individual contacts or bulk send to all
- 📥 Auto-log all incoming replies
- 📊 Real-time dashboard with stats
- 📱 **QR Code login in browser** - scan directly from the dashboard
- 🚪 **WhatsApp logout** - disconnect and clear session
- 🎨 Clean React UI with routing

## Project Structure

```
├── backend/
│   ├── data/
│   │   ├── contacts.csv          # Your contacts (name, phone, message)
│   │   └── messages_log.csv      # Auto-generated message log
│   ├── src/
│   │   ├── auth/                 # Login & JWT middleware
│   │   ├── csv/                  # CSV read/write service
│   │   ├── whatsapp/             # WhatsApp client (whatsapp-web.js)
│   │   └── routes/               # Express API routes
│   ├── .env                      # Config (JWT secret, admin creds)
│   └── index.js                  # Express server
│
└── frontend/
    ├── src/
    │   ├── api/                  # Axios API client
    │   ├── components/           # Navbar, StatusBadge
    │   ├── context/              # Auth context
    │   ├── pages/                # Login, Dashboard, Contacts, Messages, Send
    │   └── App.jsx
    └── vite.config.js
```

## Setup

### 1. Install Dependencies

From the root folder:
```bash
npm install
```

This installs `concurrently` to run both servers at once.

### 2. Backend Setup

```bash
cd backend
npm install
```

Edit `.env`:
```env
PORT=3000
JWT_SECRET=your_secret_key_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Add contacts to `data/contacts.csv`:
```csv
name,phone,message
John Doe,5511999990001,Hello John! This is a test message.
Jane Smith,5511999990002,Hi Jane! Hope you're doing well.
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Start Both Servers

From the root folder:
```bash
npm start
```

Or on Windows, double-click `start.bat`

This starts:
- Backend on http://localhost:3000
- Frontend on http://localhost:5173

On first backend run, scan the QR code with WhatsApp to authenticate.

## Usage

1. **Login** with `admin` / `admin123` (or register a new account)
2. **Dashboard** — view stats, WhatsApp status
3. **Connect WhatsApp**:
   - Click "🔌 Connect" button
   - QR code will appear in a modal automatically
   - Scan with WhatsApp mobile app
   - Status will change to "Ready"
4. **Contacts** — see all contacts from CSV, send to all
5. **Messages** — view full log, filter by sent/received
6. **Send** — send a message to a single number
7. **Logout WhatsApp** — click "🚪 Logout" to disconnect (requires QR scan next time)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Get JWT token |
| POST | `/api/auth/register` | No | Register new user |
| GET | `/api/whatsapp/status` | JWT | Check bot status + QR code |
| POST | `/api/whatsapp/init` | JWT | Initialize WhatsApp client |
| POST | `/api/whatsapp/logout` | JWT | Logout from WhatsApp |
| GET | `/api/whatsapp/contacts` | JWT | List contacts from CSV |
| POST | `/api/whatsapp/send` | JWT | Send to one number |
| POST | `/api/whatsapp/send-all` | JWT | Send to all contacts |
| GET | `/api/whatsapp/messages` | JWT | View message log |

## Testing

```bash
cd backend
npm test              # Unit tests (auth, CSV, formatting)
node test.api.js      # API integration tests
```

## CSV Files

### contacts.csv
```csv
name,phone,message
John Doe,5511999990001,Hello John!
```

### messages_log.csv (auto-generated)
```csv
timestamp,direction,from,to,name,message,status
2024-01-15T10:30:00.000Z,sent,bot,5511999990001@c.us,John Doe,Hello John!,sent
2024-01-15T10:31:00.000Z,received,5511999990001@c.us,bot,John Doe,Hi bot!,received
```

## Tech Stack

**Backend:**
- Node.js + Express
- whatsapp-web.js (WhatsApp Web API)
- csv-parse + csv-writer
- JWT + bcrypt
- dotenv

**Frontend:**
- React 18
- React Router v6
- Axios
- Vite
- react-hot-toast

## Notes

- WhatsApp client uses Puppeteer (headless Chrome) — first run downloads Chromium
- Session persists in `.wwebjs_auth/` folder
- All sent/received messages auto-log to `messages_log.csv`
- Contact names are looked up from `contacts.csv` when logging replies
- Frontend proxies `/api` requests to backend (configured in `vite.config.js`)

## License

MIT
