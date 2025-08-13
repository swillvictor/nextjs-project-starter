```markdown
# Detailed Implementation Plan for ERP/POS System (Kenyan Market)

This plan outlines the complete system architecture, file changes, and integration steps. The system consists of a Node.js (Express) backend with MySQL/SQLite databases and a Next.js (React) frontend styled with TailwindCSS. It supports offline-first capabilities via Service Worker & IndexedDB, secure JWT authentication, M-Pesa STK Push payment, thermal printing, and multiple ERP modules.

---

## 1. Overall Folder Structure Changes
- Create a new “server” folder at the root for backend code.
  - **server/**
    - **controllers/** – Business logic for each module (auth, inventory, sales, etc.)
    - **routes/** – Express route definitions for endpoints.
    - **models/** – Database models/ORM files.
    - **migrations/** – SQL migration files for schema creation.
    - **middleware/** – JWT authentication and error-handling middleware.
    - **config/** – Database configuration and environment config loader.
    - **utils/** – Helper functions (e.g., ESC/POS printer command formatter, MPesa service helper).

- Update /src for frontend pages and components.
  - **src/app/auth/** – Login and registration pages.
  - **src/app/pos/** – POS interface for desktop/tablet/mobile.
  - **src/app/inventory**, **src/app/sales**, **src/app/purchases**, **src/app/crm**, **src/app/accounting**, **src/app/settings** – Module pages.
  - **src/components/POS/** – Dedicated UI components for POS (cart, product list, payment options).
  - **src/hooks/useOfflineSync.ts** – Custom hook for offline synchronization.

- Add a Service Worker file:
  - **public/service-worker.js** – Service Worker for offline caching and IndexedDB integration.

---

## 2. Database Schema & Migration Files (server/migrations)
- Create migration SQL files (or use a migration tool) to establish realistic tables:

### Example Migration: Create Users Table
_File: server/migrations/001_create_users_table.sql_
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- e.g. admin, cashier, manager
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Example Migration: Create Products Table
_File: server/migrations/002_create_products_table.sql_
```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) NOT NULL,
  quantity INT DEFAULT 0,
  vat DECIMAL(4,2) DEFAULT 16.00,   -- Kenya VAT 16%
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

- Similarly, create migrations for:
  - Inventory, Sales, SalesItems, Purchases, PurchaseItems, Suppliers
  - Accounting (journal entries), CRM (customers/leads)
  - SystemSettings (for VAT, till details, etc.)
  - MpesaTransactions table for tracking STK push events

---

## 3. Backend API Implementation (server/)
### 3.1. Express Server & App Initialization
- **File: server/index.js**
  - Initialize Express app and add middleware (morgan, cors, JSON body parser).
  - Load environment variables (including M-Pesa and DB credentials).
  - Mount routes from “server/routes”.
  - Include centralized error handling middleware.

### 3.2. API Route Definitions
- **File: server/routes/auth.js**
  - Endpoints: POST /api/auth/login, POST /api/auth/register.
  - Use controller functions in “server/controllers/authController.js”.

- **File: server/routes/inventory.js**
  - CRUD endpoints for inventory management.
  
- **Other Route Files:**
  - **sales.js** – Endpoints for sales/orders.
  - **purchases.js** – Endpoints for supplier orders.
  - **suppliers.js** – Endpoints for supplier management.
  - **accounting.js** – Endpoints returning financial reports.
  - **crm.js** – Endpoints for customer/lead management.
  - **systemSettings.js** – Get/Update system configurations.
  - **mpesa.js** – Endpoints for M-Pesa STK Push initiation and callback handling.
  - **users.js** – Staff/user management endpoints.

### 3.3. Controllers & Business Logic
- Create controllers for each module inside **server/controllers**.
  - Implement error handling using try-catch.
  - Validate incoming data and use realistic Kenyan business logic (VAT, till numbers, etc.).
  - Example: In “authController.js”, verify user credentials using bcrypt and return a JWT token on successful login.
  
### 3.4. Middleware
- **File: server/middleware/auth.js**
  - Validate JWT tokens using jsonwebtoken.
  - Check role-based access (read token payload “role” against allowed module roles).

- **File: server/middleware/errorHandler.js**
  - Centralized error handling for logging errors and sending proper HTTP codes.

---

## 4. M-Pesa STK Push Integration (server/controllers/mpesaController.js)
- Create functions:
  - initiateSTKPush – accepts transaction details and sends request to the M-Pesa API endpoint.
  - handleCallback – processes asynchronous callback responses from M-Pesa.
- Use environment variables to store Consumer Key, Consumer Secret, Business Short Code, and Passkey.
- Ensure robust error handling and logging for API communication.

---

## 5. Thermal Printer (ESC/POS) Integration
- **File: server/utils/escposPrinter.js**
  - Create functions to format receipts in ESC/POS command format.
  - Provide methods to convert sales data into printer-friendly binary strings.
- Include error handling to catch connection issues with printer hardware.

---

## 6. Frontend Implementation (src/app & src/components)
### 6.1. POS User Interface (src/app/pos/page.tsx)
- Design a responsive layout using Tailwind CSS.
  - A top header with business logo/branding, navigation links (Inventory, Sales, etc.).
  - Main area split into a product list/search pane and cart summary.
  - Payment section with options (M-Pesa, Cash, Card) and an “Offline” indicator.
- Include form validations for product scanning or manual entry.
- Use simple typography, spacing, and color classes without external icons.
- Example UI element:
  ```tsx
  <div className="p-4 bg-white shadow rounded">
    <h1 className="text-xl font-semibold mb-4">Point of Sale</h1>
    {/* Product List and Cart Summary Components */}
  </div>
  ```

### 6.2. Other Module Pages
- **Inventory, Sales, Purchases, CRM, Accounting, Settings:**
  - Create distinct pages with lists, forms for CRUD operations.
  - Ensure responsiveness and modern styling using Tailwind’s responsive classes.
  - Validate inputs and show error messages with built-in Alert components from your UI library (e.g. src/components/ui/alert.tsx).

### 6.3. Authentication Pages (src/app/auth)
- Build login and register pages with secure forms.
- Use JWT token storage in secure cookies or local storage.
- Provide clear error feedback for invalid credentials.

---

## 7. Offline Sync Implementation
### 7.1. Service Worker for Caching
- **File: public/service-worker.js**
  - Cache static assets and API responses.
  - Listen for “fetch” and “sync” events to allow offline interactions.
  - Update the cache on network availability.

### 7.2. IndexedDB Sync Hook
- **File: src/hooks/useOfflineSync.ts**
  - Use the IndexedDB API (or a lightweight library) to store transactional data during offline mode.
  - On network reconnection, automatically sync local changes with the backend via dedicated API endpoints.
  - Implement error handling to avoid data loss.

---

## 8. Secure Authentication & Role-Based Access (Integration)
- In Express middleware, verify JWT on each protected endpoint.
- Implement role checks in controllers to restrict functionalities based on user roles (e.g., admin vs cashier).
- Return HTTP 401/403 with clear messages on unauthorized access.

---

## 9. Configuration & Environment Variables
- Update **next.config.ts** and create a **.env.production** file at project root:
  - Include DB connection strings, M-Pesa credentials, JWT secret, etc.
- Ensure sensitive information is not committed to source control.

---

## 10. Testing & Deployment
- Write curl commands for API endpoint testing. For example:
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "manager", "password": "securepass"}'
  ```
- Test offline sync by simulating network disconnects.
- Validate printed receipt commands by issuing sample transactions.
- Use unit and integration tests for backend controllers and frontend UI components.

---

## Summary
- Created a modular folder structure with a dedicated backend (“server”) and updated frontend in “src/app”.  
- Defined database migrations for users, products, sales, inventory, purchases, CRM, and settings with Kenyan VAT logic.
- Implemented REST API endpoints with JWT authentication and role-based middleware.
- Integrated M-Pesa STK Push and thermal printer modules with robust error handling.
- Developed responsive Next.js pages for POS, inventory, and other modules using Tailwind CSS.
- Added offline support using a Service Worker and IndexedDB syncing hook.
- Configured environment variables for production and included thorough testing steps.
