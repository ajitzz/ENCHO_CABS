# Fleet Management Web Application

## Overview
This full-stack web application is designed for managing vehicle rental operations, encompassing vehicle leasing, driver assignments, trip tracking, and complex rental calculations. It supports integrations with providers like PMV and Letzryd, manages driver activities, and handles financial aspects such as rent logs, weekly settlements, and investment tracking with partial returns. The system aims to streamline fleet management, optimize rental income through performance-based pricing, and provide comprehensive financial oversight.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **Validation**: Zod schemas
- **Build System**: esbuild

### Data Storage and Schema
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle Kit for migrations
- **Connection Pooling**: Neon serverless pool with WebSocket support
- **Core Entities**: Vehicles, Drivers, Vehicle Driver Assignments, Trips, Driver Rent Logs, Weekly Settlements, Substitute Drivers, Investments, Investment Returns.

### Key Features
- **Rental Calculator**: Implements complex slab-based pricing.
- **Settlement Processor**: Calculates weekly rental costs based on trip performance.
- **Trip Logging & Management**: Allows logging, editing, and deleting daily trips; automatically creates rent logs.
- **Driver Performance**: Tracks and displays driver performance based on trip counts.
- **Rent & Payment Tracking**: Manages driver rent payments, tracks outstanding amounts, and supports "Mark as Paid" functionality.
- **Investment Tracking**: Comprehensive system for managing investments, including multiple partial returns, payment methods, and grouped views by investor.
- **QR Code System**: Unique QR code validation and display for vehicles and drivers.
- **UI/UX**: Dashboard, performance charts (Recharts), rental slab cards, and payment tracking interfaces.

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL.

### UI Libraries
- **Radix UI**: Accessible component primitives.
- **Recharts**: Charting library.
- **Lucide React**: Icon library.
- **date-fns**: Date manipulation utilities.

### Development Tools
- **Replit Integration**: Runtime error overlay and cartographer.
- **TypeScript**: Static type checking.