# LOGISNAP - PROJECT MASTER SPECIFICATION

## 1. Project Overview
We are building **LogiSnap**, a next-gen Warehouse Management System (WMS) focused on 3PL providers in Israel.
**Core Value Proposition:** A self-service, low-code WMS that replaces expensive legacy systems.
**Key Features:**
1.  **Dynamic WMS:** Receiving, Inventory, Picking.
2.  **Dynamic Billing Engine:** A rule-based engine to calculate storage/handling fees based on complex 3PL contracts.
3.  **AI-First:** Architecture ready for AI Agents to query data via API.
4.  **UX:** Fully RTL (Hebrew), Row-Expansion interaction (minimal navigation), High-performance React UI.

---

## 2. Tech Stack (Strict Enforcement)
* **Frontend:** React 19, TypeScript, Vite, TailwindCSS.
* **UI Library:** Shadcn/UI (Radix Primitives) + Lucide React Icons.
* **State Management:** TanStack Query (React Query) + Zustand.
* **Backend:** Python 3.11+, FastAPI.
* **Database:** PostgreSQL.
* **ORM:** SQLAlchemy (Async) + Pydantic v2.
* **Migrations:** Alembic.
* **Authentication:** OAuth2 with JWT (Access + Refresh tokens).
* **Containerization:** Docker + Docker Compose.

---

## 3. Architecture & Folder Structure (Monorepo)
The project root must contain:
* `/apps/web` (Frontend)
* `/apps/api` (Backend)
* `/docker` (Infrastructure)

### Backend Architecture (Modular Monolith)
Each module (Auth, WMS, Billing) must have its own folder in `apps/api/routers` and `apps/api/services`.
* **Pattern:** Router -> Service -> Repository -> DB Model.

---

## 4. Database Schema (Core Tables)

### A. Auth & Tenants
* `tenants`: id, name, created_at (Multi-tenancy support).
* `users`: id, tenant_id, email, password_hash, role (admin, picker, viewer), full_name.

### B. WMS Core
* `locations`: id, tenant_id, name (e.g., A-01-02), type (pick, storage, receiving), max_volume.
* `products`: id, tenant_id, sku, name, barcode, dimensions (l/w/h), **custom_attributes (JSONB)** - *Critical for dynamic props*.
* `inventory`: id, product_id, location_id, quantity, batch_number, expiry_date, status (available, quarantine).

### C. Receiving (Inbound)
* `inbound_orders`: id, tenant_id, supplier_name, status (draft, pending, received, putaway), expected_date.
* `inbound_items`: id, order_id, product_id, expected_qty, received_qty.

### D. Picking (Outbound)
* `outbound_orders`: id, tenant_id, customer_name, status (new, released, picking, packed, shipped).
* `pick_tasks`: id, order_id, picker_user_id, from_location_id, product_id, qty_to_pick, status.

### E. Billing (The Killer Feature)
* `billing_contracts`: id, tenant_id, customer_id, name.
* `billing_rules`: id, contract_id, trigger_event (e.g., 'inbound_item', 'storage_daily_snapshot'), condition_logic (JSONB), fee_amount, fee_currency.
* `invoices`: id, contract_id, period_start, period_end, total_amount, status.
* `invoice_lines`: id, invoice_id, description, amount, related_operation_id.

---

## 5. UI/UX Requirements (Critical)

1.  **RTL First:** The `html` tag must have `dir="rtl"`. Sidebar on the right.
2.  **Compact Density:** Use dense tables. Logistics managers see lots of data.
3.  **Row Expansion:** Do NOT navigate to a new page for details. Clicking a row in "Inbound Orders" should expand an accordion/drawer showing the "Items" in that order.
4.  **Grid/List Toggle:** Every main entity (Products, Orders) must have a toggle to switch view: Table View vs. Grid/Card View.
5.  **Shadcn/UI:** Use standard components (DataTable, Dialog, Sheet, Form).

---

## 6. Implementation Phases (Execute in Order)

**PHASE 1: Foundation**
1.  Setup Docker Compose (Postgres, Redis).
2.  Initialize FastAPI with SQLAlchemy & Alembic.
3.  Create User & Tenant tables + Auth Login Endpoint (JWT).
4.  Initialize React + Vite + Tailwind + RTL setup.
5.  Create a "Shell" (Sidebar, Header, Protected Route).

**PHASE 2: WMS Core (Receiving & Inventory)**
1.  Backend: CRUD for Products (with JSONB props) and Locations.
2.  Backend: Inbound Order logic (Create -> Receive -> Update Inventory).
3.  Frontend: Products Table (with dynamic columns based on JSONB).
4.  Frontend: Receiving Screen (Row expansion logic).

**PHASE 3: Billing Engine (Logic)**
1.  Backend: Create `billing_rules` table.
2.  Backend: Implement a `BillingCalculatorService` that runs nightly or on-trigger.
3.  Frontend: Simple dashboard to view Invoices.

**PHASE 4: Refinement**
1.  Add specific 3PL features (Customer Portal view).
2.  Connect AI Agent endpoint (an endpoint that accepts natural language and queries the DB).

---

## 7. Coding Standards
* **Python:** Type hints are mandatory. Use `ruff` for linting.
* **React:** Functional components only. Use `zod` for form validation.
* **Comments:** Explain complex logic (especially in the Billing Service).
* **Error Handling:** Backend must return standard HTTP error codes (400, 401, 403, 404, 500) with clear messages.