# Navigator - Group Travel Financial Management Platform

## Overview

<<<<<<< HEAD
Navigator is a comprehensive group travel financial management platform that combines collaborative trip planning, intelligent expense tracking, and seamless communication tools. Built with TypeScript, React, and PostgreSQL, the application empowers users to plan trips together while managing shared expenses and settlements through an intuitive, real-time interface.
=======
Navigator is a comprehensive group travel platform that combines collaborative trip planning with intelligent financial management. Built with modern technologies, it enables groups to coordinate travel plans, track expenses, and settle costs efficiently while maintaining real-time communication.
>>>>>>> c76e66f6ee3ec461f1f75c9346d2b837b6e25829

## System Architecture

### Frontend Architecture
<<<<<<< HEAD
- **Framework**: React 18 with TypeScript
- **Build System**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query v5) for server state management
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **Component Library**: Shadcn/ui design system with customizable components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the entire stack
- **Real-time Communication**: WebSocket connections for live chat and updates
- **Session Management**: Express-session with PostgreSQL store for authentication
- **API Design**: RESTful endpoints with consistent error handling

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Migration System**: Drizzle-kit for schema migrations and versioning
- **Connection**: Connection pooling with SSL support for production

## Key Components

### Authentication System
- Session-based authentication using express-session
- PostgreSQL session store for scalability
- Token-based API authentication for mobile compatibility
- Invitation link system for trip member onboarding

### Trip Management
- **Trip Creation**: Wizard-guided setup with destination, dates, and member management
- **Member Management**: Role-based permissions (organizer, admin, member)
- **RSVP Workflow**: Confirmation system with optional down payment requirements
- **Settings**: Configurable trip options (admin-only itinerary, payment requirements)

### Financial Engine
- **Expense Tracking**: Detailed expense recording with category classification
- **Smart Splitting**: Automatic cost allocation across participants
- **Settlement Algorithm**: Optimized debt settlement to minimize transaction count
- **Payment Integration**: PayPal and Venmo integration for seamless payments
- **Financial Integrity**: Data consistency protection through deletion restrictions

### Communication Platform
- **Real-time Chat**: WebSocket-powered group messaging
- **Polling System**: Democratic decision-making with integrated voting
- **Activity Notifications**: Real-time updates for trip changes and payments
- **Unread Message Tracking**: Visual indicators for new messages

### Itinerary System
- **Activity Management**: Collaborative activity planning with RSVP tracking
- **Calendar Views**: Day-based and chronological activity organization
- **Accommodation Tracking**: Custom-named accommodation links and booking management
- **Flight Information**: Flight tracking with airline integration lookup

## Data Flow

### User Journey
1. **Registration/Login**: User creates account or logs in with existing credentials
2. **Trip Creation**: Organizer creates trip with basic details and settings
3. **Member Invitation**: Share invitation links for seamless member onboarding
4. **RSVP Process**: Members confirm participation with optional payment
5. **Collaborative Planning**: Members add activities, expenses, and participate in discussions
6. **Real-time Updates**: Live synchronization of all trip changes across devices
7. **Settlement**: Automated debt calculation and payment facilitation

### Data Synchronization
- Real-time WebSocket updates for chat messages and activity changes
- Optimistic updates with React Query for responsive user experience
- Background synchronization for expense calculations and member status
- Conflict resolution for concurrent edits

## External Dependencies

### Third-party Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **PayPal SDK**: Payment processing for expense settlements
- **Venmo Integration**: Alternative payment method for user convenience

### Development Tools
- **Replit**: Primary development and deployment platform
- **Vite**: Fast development server with hot module replacement
- **TypeScript**: Compile-time type checking and IntelliSense
- **ESBuild**: Fast bundling for production builds

### UI Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide Icons**: Consistent icon library for UI elements
- **Recharts**: Data visualization for expense charts and analytics

## Deployment Strategy

### Production Environment
- **Backend Platform**: Railway with Node.js hosting
- **Frontend Platform**: Vercel with static site deployment
- **Build Process**: Separate builds for frontend (Vite) and backend (ESBuild)
- **SSL**: Automatic HTTPS on both Railway and Vercel
- **Architecture**: Decoupled frontend and backend services

### Deployment Configuration
- **Railway Backend**: 
  - Express.js server with PostgreSQL
  - WebSocket support for real-time features
  - Health check endpoint at `/api/health`
  - CORS configuration for Vercel frontend
- **Vercel Frontend**:
  - Static React SPA deployment
  - Environment variables for API URL configuration
  - Proxy configuration for API and WebSocket connections

### Development Workflow
- **Hot Reload**: Vite development server with instant updates
- **Database**: Direct connection to Neon PostgreSQL for development
- **Environment**: Node.js 20 with PostgreSQL 16 modules
- **Process Management**: Separate npm scripts for frontend and backend

### Scaling Considerations
- **Database**: Neon serverless automatically scales with demand
- **Backend**: Railway autoscaling based on resource usage
- **Frontend**: Vercel edge network with global CDN
- **Session Storage**: PostgreSQL session store supports horizontal scaling
- **WebSocket**: Direct connections from Vercel to Railway backend

## Changelog

Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Prepared app for Railway (backend) + Vercel (frontend) deployment:
  - Created separate package.json files for client and server
  - Added CORS configuration for cross-origin requests
  - Created deployment configuration files (railway.json, vercel.json)
  - Updated API client to work with external backend URL
  - Added health check endpoint for Railway monitoring
  - Created comprehensive deployment documentation

## User Preferences

Preferred communication style: Simple, everyday language.
=======
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
>>>>>>> c76e66f6ee3ec461f1f75c9346d2b837b6e25829
