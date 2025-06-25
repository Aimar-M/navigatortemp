# Deployment Guide

This guide explains how to deploy the Navigator app with the backend on Railway and frontend on Vercel.

## Prerequisites

1. A Railway account (https://railway.app)
2. A Vercel account (https://vercel.com)
3. A Neon PostgreSQL database (https://neon.tech) or another PostgreSQL provider
4. PayPal developer account for payment processing

## Backend Deployment (Railway)

### 1. Prepare Your Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, etc.).

### 2. Create Railway Project

1. Go to Railway.app and create a new project
2. Connect your Git repository
3. Railway will automatically detect the `railway.json` configuration

### 3. Set Environment Variables

In your Railway project dashboard, add these environment variables:

```
DATABASE_URL=your-postgresql-connection-string
SESSION_SECRET=your-secure-random-string
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
FRONTEND_URL=https://your-app.vercel.app
```

### 4. Deploy

Railway will automatically build and deploy your backend using the configuration in `railway.json`.

Your backend will be available at: `https://your-project.railway.app`

## Frontend Deployment (Vercel)

### 1. Prepare Client Environment

Create a `.env.local` file in the `client/` directory:

```
VITE_API_URL=https://your-backend-url.railway.app
VITE_NODE_ENV=production
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to client directory
cd client

# Deploy
vercel --prod
```

#### Option B: Vercel Dashboard
1. Go to Vercel.com and import your repository
2. Set the root directory to `client/`
3. Vercel will use the `vercel.json` configuration automatically

### 3. Configure Environment Variables

In your Vercel project settings, add:
```
VITE_API_URL=https://your-backend-url.railway.app
VITE_NODE_ENV=production
```

## Database Setup

### Using Neon (Recommended)

1. Create a Neon project at https://neon.tech
2. Create a database
3. Copy the connection string
4. Add it to Railway as `DATABASE_URL`

### Run Migrations

After deployment, you need to push your database schema:

```bash
# Set your DATABASE_URL locally
export DATABASE_URL="your-connection-string"

# Push schema to database
npm run db:push
```

## Important Notes

### CORS Configuration

The backend is configured to accept requests from your frontend URL. Make sure to:
1. Set `FRONTEND_URL` in Railway to your Vercel app URL
2. Update the URL after deploying to Vercel

### Session Storage

The app uses database-backed sessions. Ensure your PostgreSQL database is accessible from Railway.

### File Structure for Deployment

```
navigator/
├── client/                 # Frontend (deploy to Vercel)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
├── server/                 # Backend files
│   ├── standalone-index.ts # Production server entry
│   └── *.ts               # Other server files
├── shared/                # Shared types and schemas
├── railway.json           # Railway deployment config
├── vercel.json           # Vercel deployment config
└── Procfile              # Alternative Railway config
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `FRONTEND_URL` matches your Vercel deployment URL
2. **Database Connection**: Verify `DATABASE_URL` is correct and accessible
3. **Build Errors**: Check that all dependencies are listed in package.json files
4. **Environment Variables**: Ensure all required variables are set in both platforms

### Logs

- **Railway**: Check logs in the Railway dashboard
- **Vercel**: Check function logs in the Vercel dashboard
- **Local Development**: Use `npm run dev` to test locally

## Production Checklist

Before going live:

- [ ] Database is set up and accessible
- [ ] All environment variables are configured
- [ ] CORS is properly configured
- [ ] SSL certificates are active (automatic on both platforms)
- [ ] Domain names are configured (optional)
- [ ] Payment processing is tested
- [ ] Database migrations are applied

## Scaling Considerations

- **Railway**: Automatically scales based on usage
- **Vercel**: Serverless functions scale automatically
- **Database**: Consider connection pooling for high traffic
- **Sessions**: Database-backed sessions scale with your database