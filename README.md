# LogiSnap - Warehouse Management System

LogiSnap is a next-generation Warehouse Management System targeting 3PL providers in Israel. The system emphasizes self-service, low-code capabilities as an alternative to expensive legacy solutions.

## 🚀 Phase 1 - Foundation ✅

Phase 1 is complete with the following features:
- ✅ Docker Compose setup (PostgreSQL, Redis)
- ✅ FastAPI backend with SQLAlchemy and Alembic
- ✅ User/Tenant tables and JWT authentication
- ✅ React 19 + Vite frontend with TypeScript
- ✅ RTL (Hebrew) configuration
- ✅ Application shell (sidebar, header, protected routes)

## 📋 Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- TailwindCSS
- Shadcn/UI (Radix Primitives)
- Lucide React Icons
- TanStack Query
- Zustand (State Management)

### Backend
- Python 3.11+
- FastAPI
- PostgreSQL
- SQLAlchemy (async)
- Pydantic v2
- Alembic (migrations)
- OAuth2 with JWT

### Infrastructure
- Docker
- Docker Compose

## 🏗️ Project Structure

```
DynamicChain/
├── apps/
│   ├── web/          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── lib/
│   │   └── package.json
│   └── api/          # FastAPI backend
│       ├── models/
│       ├── schemas/
│       ├── routers/
│       ├── services/
│       ├── repositories/
│       ├── auth/
│       ├── alembic/
│       └── main.py
├── docker/           # Docker configurations
└── docker-compose.yml
```

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/cohenra/DynamicChain.git
cd DynamicChain
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start the services with Docker Compose:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- FastAPI backend on port 8000
- React frontend on port 5173

4. Run database migrations:
```bash
docker-compose exec api alembic upgrade head
```

5. Access the application:
- Frontend: http://localhost:5173
- API Documentation: http://localhost:8000/api/docs
- API Health Check: http://localhost:8000/api/health

### Development Setup (Without Docker)

#### Backend Setup

1. Navigate to the API directory:
```bash
cd apps/api
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run migrations:
```bash
alembic upgrade head
```

5. Start the development server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. Navigate to the web directory:
```bash
cd apps/web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## 📊 Database Schema (Phase 1)

### Tenants Table
- `id`: Integer, Primary Key
- `name`: String(255)
- `created_at`: DateTime

### Users Table
- `id`: Integer, Primary Key
- `tenant_id`: Integer, Foreign Key → tenants.id
- `email`: String(255), Unique
- `password_hash`: String(255)
- `role`: Enum (admin, picker, viewer)
- `full_name`: String(255)
- `created_at`: DateTime

## 🔐 Authentication

The system uses JWT token-based authentication:

1. Login at `/api/auth/login` with email and password
2. Receive JWT access token
3. Include token in Authorization header: `Bearer <token>`
4. Frontend automatically stores token in localStorage

## 🧪 API Endpoints (Phase 1)

- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/register` - Register new user
- `GET /api/health` - Health check endpoint

## 🎨 UI/UX Features

- **RTL-First Design**: Fully right-to-left Hebrew interface
- **Responsive Layout**: Sidebar positioned on the right for RTL
- **Protected Routes**: Authentication-based route protection
- **Modern Components**: Shadcn/UI components with TailwindCSS

## 📝 Next Steps

Phase 1 is complete! The following phases are planned:

### Phase 2 - WMS Core
- Product CRUD with dynamic JSONB properties
- Location management
- Inbound order workflow
- Products table with dynamic columns
- Receiving interface with row expansion

### Phase 3 - Billing Engine
- Billing rules table implementation
- BillingCalculatorService
- Invoice dashboard view

### Phase 4 - Refinement
- 3PL-specific features
- Customer portal
- AI agent endpoint

## 🛠️ Development

### Code Style
- **Python**: Type hints mandatory, ruff for linting
- **React**: Functional components only, zod for form validation
- **Comments**: Document complex logic

### Running Tests
```bash
# Backend tests (when implemented)
cd apps/api
pytest

# Frontend tests (when implemented)
cd apps/web
npm test
```

## 📄 License

This project is proprietary software.

## 👥 Contributing

This is a private project. Please contact the maintainers for contribution guidelines.
