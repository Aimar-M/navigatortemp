# Navigator - Group Travel Financial Management Platform

## Overview

Navigator is a comprehensive group travel platform that combines collaborative trip planning with intelligent financial management. Built with modern technologies, it enables groups to coordinate travel plans, track expenses, and settle costs efficiently while maintaining real-time communication.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build system for fast development and optimized production builds
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query v5)** for server state management and caching
- **Radix UI + Tailwind CSS** for accessible, customizable UI components
- **Shadcn/ui** component library for consistent design system

### Backend Architecture
- **Express.js** with TypeScript for API development
- **WebSocket** integration for real-time features (chat, notifications)
- **Session-based authentication** using express-session with PostgreSQL storage
- **RESTful API** design with comprehensive route structure
- **Middleware-based** request handling and error management

### Database Design
- **PostgreSQL** as the primary database with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations and migrations
- **Relational schema** with proper foreign key constraints and indexing
- **Session storage** table for express-session persistence

## Key Components

### Trip Management System
- **Trip Creation**: Comprehensive trip setup with destinations, dates, and member management
- **Member Invitation**: Token-based invitation system with RSVP workflows
- **Role-based Permissions**: Organizer, admin, and member access levels
- **Trip Settings**: Down payment requirements, admin-only controls

### Financial Management Engine
- **Expense Tracking**: Multi-category expense management with receipt support
- **Smart Splitting**: Automatic cost allocation with customizable split methods
- **Settlement Algorithm**: Debt optimization to minimize transaction complexity
- **Payment Integration**: PayPal integration for seamless settlements
- **Financial Integrity**: Expense deletion restrictions to maintain data consistency

### Itinerary Planning System
- **Activity Management**: Collaborative activity creation with RSVP tracking
- **Flexible Payment Types**: Support for free, prepaid, advance, and on-site payments
- **Accommodation Integration**: Custom-named accommodation links and booking management
- **Calendar Views**: Day-based and chronological activity organization

### Real-time Communication
- **WebSocket-powered Chat**: Live group messaging with trip-specific channels
- **Democratic Polling**: Integrated voting system for group decision-making
- **Notification System**: Real-time updates for trip changes and financial activities

## Data Flow

### Authentication Flow
1. User credentials validated against PostgreSQL user table
2. Session created and stored in PostgreSQL sessions table
3. JWT token issued for API authentication
4. WebSocket connection established with user context

### Trip Creation Flow
1. Organizer creates trip with basic details
2. Invitation links generated with unique tokens
3. Members join via invitation links with RSVP workflow
4. Trip data synchronized across all connected clients

### Expense Management Flow
1. Expenses created with automatic split calculations
2. Settlement algorithm processes all trip expenses
3. Optimized payment suggestions generated
4. PayPal integration facilitates actual settlements

### Real-time Updates
1. WebSocket connections maintain user-trip associations
2. Events broadcast to relevant trip members
3. Client state updated via TanStack Query invalidation
4. UI reflects changes without page refresh

## External Dependencies

### Core Infrastructure
- **Neon PostgreSQL**: Serverless database hosting with automatic scaling
- **Replit**: Development and deployment platform with auto-scaling
- **WebSocket API**: Real-time communication protocol

### Payment Processing
- **PayPal Server SDK**: Payment processing and settlement workflows
- **Venmo Integration**: Alternative payment method support

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Consistent iconography
- **Recharts**: Data visualization for expense analytics

### Development Tools
- **TypeScript**: Type safety across frontend and backend
- **Drizzle Kit**: Database migration management
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Development Environment
- **Replit integration** with Node.js 20, Web, and PostgreSQL modules
- **Hot module replacement** via Vite for rapid development
- **Automatic dependency management** with npm

### Production Deployment
- **Autoscale deployment target** on Replit platform
- **Build process**: Vite frontend build + ESBuild backend bundle
- **Port configuration**: Internal port 5000 mapped to external port 80
- **Environment variables**: Secure database connection strings

### Database Management
- **Migration system** using Drizzle Kit for schema updates
- **Connection pooling** with SSL for secure Neon connectivity
- **Backup strategy** handled by Neon's managed service

## Deployment Configuration

### Railway Backend Deployment
- **Configuration**: `railway.json`, `nixpacks.toml`, and `Procfile`
- **Entry Point**: `server/standalone-index.ts` (production server with CORS)
- **Build Command**: `esbuild server/standalone-index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- **Start Command**: `node dist/standalone-index.js`
- **Required Environment Variables**: DATABASE_URL, SESSION_SECRET, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, FRONTEND_URL

### Vercel Frontend Deployment
- **Configuration**: `vercel.json` and `client/vite.config.ts`
- **Root Directory**: `client/`
- **Build Command**: `vite build`
- **Output Directory**: `../dist/public`
- **Required Environment Variables**: VITE_API_URL, VITE_NODE_ENV

### Database Configuration
- **Production**: Neon PostgreSQL serverless database
- **Migrations**: Drizzle Kit with `npm run db:push`
- **Schema**: Shared between frontend and backend via `shared/schema.ts`

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
- June 25, 2025. Added deployment configuration for Railway (backend) and Vercel (frontend)
  - Created railway.json, vercel.json, nixpacks.toml, Procfile
  - Added standalone server entry point with CORS configuration
  - Separated frontend/backend package.json files
  - Updated client to use environment variables for API URL
  - Created deployment documentation and environment variable templates
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```