# Deployment Guide - Railway (Backend) + Vercel (Frontend)

This guide explains how to deploy Navigator with the backend on Railway and frontend on Vercel.

## Architecture Overview

- **Backend (Railway)**: Express.js API server with PostgreSQL database
- **Frontend (Vercel)**: React SPA served statically with API calls to Railway
- **Database**: PostgreSQL (Neon or Railway PostgreSQL)
- **Real-time**: WebSocket connections from Vercel frontend to Railway backend

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Railway Account**: Sign up at [railway.app](https://railway.app)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
4. **PostgreSQL Database**: Neon or Railway PostgreSQL service

## Railway Backend Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Railway will automatically detect the Node.js project

### 2. Configure Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Session Security (generate a secure random string)
SESSION_SECRET=your-super-secure-session-secret-min-32-characters

# Production Settings
NODE_ENV=production
PORT=5000

# CORS Configuration
FRONTEND_URL=https://your-vercel-app.vercel.app

# PayPal (Optional)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

### 3. Database Setup

If using Railway PostgreSQL:
1. Add PostgreSQL service to your Railway project
2. Use the provided DATABASE_URL in your environment variables

If using Neon:
1. Create a Neon database
2. Copy the connection string to DATABASE_URL

### 4. Deploy Configuration

Railway will use the `railway.json` configuration:
- Build command: `cd server && npm install && npm run build`
- Start command: `cd server && npm start`
- Health check: `/api/health`

## Vercel Frontend Deployment

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Set the root directory to `client/`
3. Vercel will automatically detect the Vite framework

### 2. Configure Environment Variables

In Vercel dashboard, add this environment variable:

```bash
VITE_API_URL=https://your-railway-app.railway.app
```

### 3. Build Configuration

Vercel will use the `vercel.json` configuration in the root:
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite

## Database Migrations

Run database migrations after deployment:

1. In Railway dashboard, go to your project
2. Open the terminal/console
3. Run: `npm run db:push`

Or use Railway CLI:
```bash
railway login
railway link [your-project-id]
railway run npm run db:push
```

## Environment Variable Setup

### Railway Environment Variables

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secure-session-secret
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-app.vercel.app
PAYPAL_CLIENT_ID=optional
PAYPAL_CLIENT_SECRET=optional
```

### Vercel Environment Variables

```bash
VITE_API_URL=https://your-app.railway.app
```

## Testing the Deployment

1. **Backend Health Check**: Visit `https://your-railway-app.railway.app/api/health`
2. **Frontend**: Visit `https://your-vercel-app.vercel.app`
3. **Full Integration**: Test user registration and trip creation

## Common Issues & Solutions

### CORS Errors
- Ensure `FRONTEND_URL` is set correctly in Railway
- Verify the Vercel domain matches the CORS configuration

### Database Connection
- Check DATABASE_URL format and credentials
- Ensure database accepts connections from Railway IPs

### WebSocket Issues
- WebSocket connections use the same Railway URL with `wss://` protocol
- Check browser console for WebSocket connection errors

### Build Failures

**Railway Build Issues:**
- Check Node.js version compatibility
- Verify all dependencies are in `server/package.json`

**Vercel Build Issues:**
- Ensure `VITE_API_URL` is set
- Check TypeScript compilation errors

## Performance Optimization

### Railway Backend
- Enable connection pooling for PostgreSQL
- Set appropriate session store configuration
- Monitor memory usage and scale as needed

### Vercel Frontend
- Static assets are automatically optimized
- Enable Vercel Analytics for performance monitoring
- Consider edge caching for API responses

## Security Considerations

1. **Session Security**: Use strong SESSION_SECRET (32+ characters)
2. **CORS Configuration**: Only allow your Vercel domain
3. **Environment Variables**: Never commit secrets to Git
4. **Database Security**: Use connection pooling and SSL
5. **HTTPS**: Both Railway and Vercel provide HTTPS by default

## Monitoring & Logging

### Railway
- View logs in Railway dashboard
- Set up log retention as needed
- Monitor resource usage

### Vercel
- Check function logs for API proxy issues
- Monitor build logs for deployment issues
- Use Vercel Analytics for user metrics

## Scaling

### Railway
- Automatic scaling based on resource usage
- Configure scaling policies as needed

### Vercel
- Automatic edge caching and CDN
- Serverless architecture scales automatically

## Backup Strategy

1. **Database**: Set up automated backups for PostgreSQL
2. **Code**: GitHub serves as code backup
3. **Environment Variables**: Document and backup securely