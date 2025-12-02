from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.depositors import router as depositors_router
from routers.warehouses import router as warehouses_router

__all__ = ["auth_router", "products_router", "depositors_router", "warehouses_router"]
