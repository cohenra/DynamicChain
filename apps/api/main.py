from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth_router, products_router, depositors_router, warehouses_router, product_uoms_router


# Create FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(depositors_router)
app.include_router(warehouses_router)
app.include_router(product_uoms_router)


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "logisnap-api"}


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {
        "message": "LogiSnap API",
        "version": settings.api_version,
        "docs": "/api/docs"
    }
