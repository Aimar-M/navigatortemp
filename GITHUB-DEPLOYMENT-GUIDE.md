# GitHub to Production Deployment Guide

This guide shows you how to deploy your Navigator app from GitHub to Railway (backend) and Vercel (frontend).

## Prerequisites

✅ Your database is already configured: `postgresql://neondb_owner:npg_bNmBGXOQ75Is@ep-cool-glade-a5d6gw1g.us-east-2.aws.neon.tech/neondb?sslmode=require`
✅ Your Railway backend URL: `https://navigatortemp-production.up.railway.app`

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
```bash
git init
git add .
git commit -m "Initial commit with deployment configuration"
```

2. Create GitHub repository and push:
```bash
git remote add origin https://github.com/yourusername/navigator.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your navigator repository
4. Railway will auto-detect the `railway.json` configuration

### Environment Variables for Railway
Add these in your Railway dashboard:

```
DATABASE_URL=postgresql://neondb_owner:npg_bNmBGXOQ75Is@ep-cool-glade-a5d6gw1g.us-east-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=navigator-session-secret-2025-production-key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
FRONTEND_URL=https://your-app.vercel.app
```

**Note**: You'll update `FRONTEND_URL` after Vercel deployment.

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project" → Import your GitHub repository
3. **Important**: Set Root Directory to `client`
4. Vercel will automatically use the `vercel.json` configuration

### Environment Variables for Vercel
Add these in your Vercel project settings:

```
VITE_API_URL=https://navigatortemp-production.up.railway.app
VITE_NODE_ENV=production
```

## Step 4: Update CORS Configuration

After Vercel deployment:
1. Copy your Vercel URL (e.g., `https://navigator-app.vercel.app`)
2. Go back to Railway → Environment Variables
3. Update `FRONTEND_URL` to your actual Vercel URL
4. Railway will automatically redeploy

## Step 5: Database Migration

Run this command once after both deployments:

```bash
# Make sure you have the environment variable set
export DATABASE_URL="postgresql://neondb_owner:npg_bNmBGXOQ75Is@ep-cool-glade-a5d6gw1g.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Install dependencies and push schema
npm install
npm run db:push
```

## Deployment Status Check

✅ **Backend (Railway)**
- URL: `https://navigatortemp-production.up.railway.app`
- Database: Connected to Neon PostgreSQL
- Build: `esbuild server/standalone-index.ts --bundle --outdir=dist`
- Start: `node dist/standalone-index.js`

✅ **Frontend (Vercel)**
- Root Directory: `client/`
- Build: `vite build`
- API URL: `https://navigatortemp-production.up.railway.app`

## File Structure Ready for GitHub

```
navigator/
├── .env                    # Local environment (git-ignored)
├── .env.example           # Template with your settings
├── .gitignore             # Protects sensitive files
├── railway.json           # Railway auto-deployment
├── vercel.json            # Vercel auto-deployment
├── client/
│   ├── .env               # Frontend env (git-ignored)
│   ├── .env.example       # Frontend template
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Frontend build config
├── server/
│   ├── .env               # Backend env (git-ignored)
│   ├── .env.example       # Backend template
│   ├── standalone-index.ts # Production server
│   └── package.json       # Backend dependencies
└── shared/
    └── schema.ts          # Database schema
```

## Next Steps After Deployment

1. Test your live app at the Vercel URL
2. Verify API calls are working between frontend and backend
3. Update any remaining placeholder PayPal credentials
4. Configure custom domains (optional)

## Troubleshooting

- **CORS errors**: Ensure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- **Database connection**: The database URL is already configured correctly
- **Build failures**: Check Railway/Vercel logs in their dashboards
- **API not found**: Verify `VITE_API_URL` points to your Railway backend

Your app is now ready for GitHub deployment! 🚀