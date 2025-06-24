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
- Cloud Sync: Supabase PostgreSQL database for multi-device synchronization
- Local: IndexedDB for offline functionality
- Legacy: Google Sheets API integration (deprecated due to write limitations)

## Changelog

- June 19, 2025. Initial setup
- June 19, 2025. Replaced Supabase with MongoDB Atlas Data API integration for real cloud synchronization
- June 19, 2025. Replaced MongoDB with Google Sheets API integration for simpler cloud synchronization
- June 20, 2025. Fixed Google Sheets API URL extraction issue - system now successfully syncs data to Google Sheets
- June 20, 2025. Added Google Sheets demo page at `/google-sheets-demo` for API testing and configuration
- June 20, 2025. Discovered Google Sheets API limitation: API Keys only support READ operations, not WRITE
- June 20, 2025. Implemented dual-mode solution: API Key for reading + Google Apps Script Web App for writing data
- June 20, 2025. Created GOOGLE_APPS_SCRIPT_SETUP.md with complete setup instructions for full read-write capability
- June 21, 2025. Switched back to Supabase PostgreSQL database due to Google Sheets write limitations
- June 21, 2025. Implemented comprehensive Supabase integration with full CRUD operations
- June 21, 2025. Created SUPABASE_SETUP.md with detailed setup instructions for database configuration
- June 21, 2025. Updated Settings page with modern Supabase configuration component
- June 21, 2025. Fixed field name mapping issues between IndexedDB and Supabase tables
- June 21, 2025. Created supabase-field-mapping.sql with correct schema matching local structure
- June 21, 2025. Resolved synchronization errors by aligning database field names (code, customerId, categoryId, etc.)
- June 21, 2025. Rebuilt Supabase API service with proper error handling and table mapping
- June 23, 2025. Completely removed Supabase integration per user request
- June 23, 2025. Implemented Firebase Firestore integration with comprehensive error handling
- June 23, 2025. Created detailed FIREBASE_SETUP.md guide and FirebaseConfig component
- June 23, 2025. Added improved error messages for common Firebase setup issues
- June 23, 2025. Identified and documented Firestore Database Rules issue causing transport errors
- June 23, 2025. Updated Firebase setup guide with rules troubleshooting section
- June 24, 2025. Successfully resolved Firebase connection issues and achieved working sync
- June 24, 2025. Fixed DataCloneError in customer form by cleaning undefined values for IndexedDB
- June 24, 2025. Created DirectCustomerForm, DirectInventoryForm, DirectServiceForm to bypass DataCloneError
- June 24, 2025. Removed all database hooks that were injecting Promise objects into IndexedDB
- June 24, 2025. Added auto-generating SKU system based on category (2 letters + 4 digits)

## User Preferences

Preferred communication style: Simple, everyday language.