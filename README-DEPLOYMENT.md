# Quick Deployment Guide

## Overview
This guide shows you how to deploy your Navigator app with:
- **Backend**: Railway (handles API, database, WebSocket)
- **Frontend**: Vercel (handles the React app)

## Step 1: Database Setup

1. Go to [Neon.tech](https://neon.tech) and create a free account
2. Create a new project and database
3. Copy your connection string (looks like: `postgresql://user:pass@host/dbname`)

## Step 2: Backend on Railway

1. Go to [Railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Railway will auto-detect the `railway.json` config

### Environment Variables (Railway)
In your Railway dashboard, add these variables:
```
DATABASE_URL=postgresql://neondb_owner:npg_bNmBGXOQ75Is@ep-cool-glade-a5d6gw1g.us-east-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=navigator-session-secret-2025-production-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
FRONTEND_URL=https://your-app.vercel.app
```

Railway will give you a URL like: `https://your-app.railway.app`

## Step 3: Frontend on Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up
2. Click "New Project" → Import your repository
3. Set **Root Directory** to `client`
4. Vercel will use the `vercel.json` config automatically

### Environment Variables (Vercel)
In your Vercel project settings, add:
```
VITE_API_URL=https://navigatortemp-production.up.railway.app
VITE_NODE_ENV=production
```

## Step 4: Update CORS

After both are deployed:
1. Copy your Vercel URL (like `https://your-app.vercel.app`)
2. Go back to Railway → Environment Variables
3. Update `FRONTEND_URL` to your actual Vercel URL

## Step 5: Database Migration

Run this once after deployment:
```bash
# Install dependencies locally
npm install

# Set your database URL
export DATABASE_URL="postgresql://neondb_owner:npg_bNmBGXOQ75Is@ep-cool-glade-a5d6gw1g.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Push database schema
npm run db:push
```

## That's it!
Your app should now be live with the backend on Railway and frontend on Vercel.

## Files Created for Deployment

```
├── railway.json          # Railway deployment config
├── vercel.json           # Vercel deployment config  
├── nixpacks.toml         # Alternative Railway config
├── Procfile              # Heroku-style config
├── server/
│   ├── standalone-index.ts  # Production server
│   ├── package.json         # Backend dependencies
│   └── drizzle.config.ts    # Database config
├── client/
│   ├── package.json         # Frontend dependencies
│   ├── vite.config.ts       # Build configuration
│   └── tailwind.config.ts   # Styling config
└── DEPLOYMENT.md            # Detailed guide
```

## Troubleshooting

- **CORS errors**: Make sure `FRONTEND_URL` matches your Vercel URL exactly
- **Database connection**: Verify your `DATABASE_URL` is correct
- **Build errors**: Check the logs in Railway/Vercel dashboards
- **Environment variables**: Double-check all variables are set correctly