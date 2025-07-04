# Fleet Management Web Application

## Overview

This is a full-stack fleet management web application designed to help manage vehicle rental operations. The system handles vehicle leasing from providers (PMV and Letzryd), driver assignments, trip tracking, and complex rental calculations based on performance slabs.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (Neon serverless)
- **Validation**: Zod schemas for runtime type checking
- **Build System**: esbuild for production bundling

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless pool with WebSocket support

## Key Components

### Database Schema
The application uses the following core entities:
- **Vehicles**: Store vehicle information with company association
- **Drivers**: Manage driver details including accommodation status
- **Vehicle Driver Assignments**: Link drivers to vehicles (morning/evening shifts)
- **Trips**: Track daily trip counts per driver/vehicle/shift
- **Driver Rent Logs**: Record daily rent payments from drivers
- **Weekly Settlements**: Calculate and store weekly rental costs
- **Substitute Drivers**: Handle temporary driver replacements

### Business Logic Components
- **Rental Calculator**: Implements complex slab-based pricing for PMV and Letzryd
- **Settlement Processor**: Calculates weekly settlements based on trip performance
- **Storage Layer**: Abstracts database operations with type-safe interfaces

### Frontend Components
- **Dashboard**: Main interface showing vehicle performance and quick actions
- **Vehicle Selector**: Dropdown for selecting vehicles with performance summary
- **Trip Logging**: Modal form for recording daily trips
- **Profit Charts**: Recharts-based visualization of vehicle profitability
- **Rental Slab Cards**: Display current pricing tier and next tier requirements
- **Payment Tracking**: Monitor unpaid rents and payment status

## Data Flow

1. **Trip Logging**: Drivers log daily trips through the web interface
2. **Real-time Updates**: TanStack Query automatically refetches affected data
3. **Weekly Calculations**: Settlement processor calculates rental costs based on trip totals
4. **Slab Determination**: System applies appropriate rental rates based on performance tiers
5. **Profit Analysis**: Dashboard displays calculated profits/losses per vehicle
6. **Payment Tracking**: System tracks driver rent payments and outstanding amounts

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL with connection pooling
- **WebSocket Support**: For real-time database connections

### UI Libraries
- **Radix UI**: Unstyled, accessible component primitives
- **Recharts**: Chart library for data visualization
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer for development
- **TypeScript**: Static type checking across the entire stack
- **ESLint/Prettier**: Code formatting and linting (implicit)

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Type Checking**: Incremental TypeScript compilation
- **Database**: Direct connection to Neon database
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
- **Frontend**: Vite builds to optimized static assets
- **Backend**: esbuild bundles server code to single file
- **Deployment**: Single artifact with both frontend and backend
- **Database**: Same Neon database with production connection string

### Build Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build both frontend and backend for production
- `npm run start`: Start production server
- `npm run db:push`: Push schema changes to database

## Changelog
```
Changelog:
- July 04, 2025. Initial setup and migration from Replit Agent
- July 04, 2025. Enhanced fleet management system with four major features:
  • Delete Trip Log Feature: Added DELETE endpoint and frontend delete buttons with confirmation
  • Edit Trip Log Feature: Added PUT endpoint and edit modal for modifying existing trip entries
  • Driver Performance Status: Added Low/Good/Excellent badges based on trip counts (🔴<10, 🟡=10, 🟢>10)
  • Optimization Tips: Added slab-based recommendations showing trips needed for better rates
  • Updated rental calculator to include optimization tips in API responses
  • Enhanced UI with performance badges, optimization guidance, and edit/delete actions
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```