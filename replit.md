# Garage Management System

## Overview

This is a comprehensive garage management system built as a Progressive Web Application (PWA) for managing automotive repair shop operations. The application handles customers, vehicles, inventory, services, quotations, repair orders, and invoices with both online and offline capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query for server state, React Context for UI state
- **Offline Storage**: IndexedDB via Dexie.js for local data persistence
- **PWA Features**: Service worker support (temporarily disabled for compatibility)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and session management
- **API Design**: RESTful APIs with Express routes
- **Password Security**: bcryptjs for password hashing

### Database Design
- **Primary Database**: PostgreSQL for production data
- **Local Storage**: IndexedDB for offline functionality
- **External Sync**: Google Sheets API integration for data synchronization
- **Schema Management**: Drizzle ORM with TypeScript schema definitions

## Key Components

### Core Entities
- **Users**: Role-based access (admin, user, technician, manager)
- **Customers**: Customer information and contact details
- **Vehicles**: Vehicle records linked to customers
- **Inventory**: Parts and materials with category management
- **Services**: Service catalog with pricing
- **Quotations**: Customer quotes for repairs
- **Repair Orders**: Work orders for vehicle repairs  
- **Invoices**: Billing and payment tracking

### Business Logic
- **Workflow**: Quote → Repair Order → Invoice progression
- **Inventory Management**: Stock tracking with low-stock alerts
- **Pricing**: Automatic calculation of totals with tax support
- **Reporting**: Revenue, inventory, and customer analytics

## Data Flow

1. **User Authentication**: Login via username/password with session management
2. **Data Entry**: Forms for all entities with validation using Zod schemas
3. **Local Storage**: Automatic offline storage using IndexedDB
4. **Sync Process**: Bi-directional sync with MongoDB Atlas
5. **Print/Export**: PDF generation for quotations, repair orders, and invoices

## External Dependencies

### UI and Styling
- Radix UI components for accessibility
- Tailwind CSS for styling
- Lucide React for icons
- React Hook Form for form management

### Data Management
- Drizzle ORM for database operations
- Dexie.js for IndexedDB management
- React Query for API state management
- Zod for schema validation

### Backend Services
- Express.js web framework
- Passport.js for authentication
- bcryptjs for password security
- pg (node-postgres) for PostgreSQL connectivity

### External Integrations
- Google Sheets API for cloud synchronization
- PDF generation using @react-pdf/renderer

## Deployment Strategy

### Development Environment
- Vite for development server and hot module replacement
- Node.js 20 runtime
- PostgreSQL 16 database
- Port configuration: 5000 (backend), 5001 (frontend proxy)

### Production Build
- Static asset generation via Vite
- Express server bundle using esbuild
- Automatic deployment on Replit with autoscale configuration
- Environment variables for database and service connections

### Database Configuration
- Primary: PostgreSQL via DATABASE_URL environment variable
- Fallback: Google Sheets API for sync and backup
- Local: IndexedDB for offline functionality

## Changelog

- June 19, 2025. Initial setup
- June 19, 2025. Replaced Supabase with MongoDB Atlas Data API integration for real cloud synchronization
- June 19, 2025. Replaced MongoDB with Google Sheets API integration for simpler cloud synchronization
- June 20, 2025. Fixed Google Sheets API URL extraction issue - system now successfully syncs data to Google Sheets
- June 20, 2025. Added Google Sheets demo page at `/google-sheets-demo` for API testing and configuration

## User Preferences

Preferred communication style: Simple, everyday language.