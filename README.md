# Personal Finance Tracker

A complete, modular Personal Finance Tracker application for tracking Israeli bank and credit card transactions. Built with Node.js, React, Supabase, and deployed as a PWA.

## Features

- 🏦 **Multi-Provider Scraping** - Support for Max, Isracard, Hapoalim, Leumi, Pepper, and other Israeli financial institutions
- 🔄 **Automated Sync** - GitHub Actions workflow runs nightly at 3:00 AM UTC
- 💾 **Duplicate Prevention** - Uses SHA256 hashes to prevent duplicate transactions
- 📊 **Interactive Dashboard** - Clean, dark-mode minimalist UI with charts and statistics
- 🔍 **Search & Filter** - Search transactions, filter by provider/category, sort by date/amount
- 📱 **PWA Support** - Installable as a Progressive Web App with offline capabilities
- 🛡️ **Secure** - Credentials stored in environment variables, service role key for backend

## Architecture

### Backend (Server)

- **Node.js/ES Modules** - Modern JavaScript with ES modules
- **israeli-bank-scrapers** - Official library for scraping Israeli banks/cards
- **Supabase** - PostgreSQL database with upsert logic
- **Environment-based configuration** - Secure credential management

### Frontend (Client)

- **React 18** with Vite for fast development
- **Chart.js** for spending visualizations
- **Supabase JS Client** for real-time data fetching
- **Service Worker** for PWA offline support
- **Modern CSS** with dark mode design

## Database Schema

Create a `transactions` table in Supabase with the following schema:

```sql
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  description TEXT NOT NULL,
  category TEXT,
  provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_hash ON transactions(hash);
CREATE INDEX idx_transactions_provider ON transactions(provider);
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema above in the SQL Editor
3. Get your project URL and service role key from Settings > API

### 3. Configure Environment Variables

#### Server (.env)

Copy `.env.example` to `.env` in the server directory:

```bash
cp server/.env.example server/.env
```

Fill in your credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CARD_PROVIDERS=max,isracard
MAX_USERNAME=your_username
MAX_PASSWORD=your_password
```

#### Client

Create `.env` in the client directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Scraper

```bash
cd server
npm start
```

### 5. Run the Frontend

```bash
cd client
npm run dev
```

Visit `http://localhost:3000` to view the dashboard.

## GitHub Actions Setup

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CARD_PROVIDERS`
- `MAX_USERNAME`, `MAX_PASSWORD`
- `ISRACARD_ID`, `ISRACARD_PASSWORD`, `ISRACARD_CARD6DIGITS`
- etc. for each provider

The workflow will run automatically at 3:00 AM UTC daily or can be triggered manually.

## PWA Installation

The app is installable as a PWA:

1. Open the app in a modern browser (Chrome, Edge, Safari)
2. Look for the "Install" button or use browser menu > Install app
3. The app will work offline with cached resources

## Project Structure

```
├── server/                 # Backend scraper service
│   ├── index.js           # Entry point
│   ├── scraper.js         # Multi-provider scraper logic
│   ├── supabaseClient.js  # Supabase connection & upsert
│   ├── package.json
│   └── .env.example
├── client/                # React PWA frontend
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   └── sw.js          # Service worker
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── .github/workflows/
    └── nightly-sync.yml   # Automated sync workflow
```

## Security Notes

- Never commit `.env` files
- Use `SUPABASE_SERVICE_ROLE_KEY` only on the server (never expose to client)
- Use `VITE_SUPABASE_ANON_KEY` for the client with appropriate RLS policies
- Consider enabling Row Level Security (RLS) on your Supabase tables

## License

MIT
