from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.depositors import router as depositors_router
from routers.warehouses import router as warehouses_router
from routers.product_uoms import router as product_uoms_router
from routers.uom_definitions import router as uom_definitions_router
from routers.zones import router as zones_router
from routers.locations import router as locations_router
from routers.location_type_definitions import router as location_type_definitions_router
from routers.location_usage_definitions import router as location_usage_definitions_router
from routers.user_table_settings import router as user_table_settings_router
from routers.inventory import router as inventory_router

__all__ = ["auth_router", "products_router", "depositors_router", "warehouses_router", "product_uoms_router", "uom_definitions_router", "zones_router", "locations_router", "location_type_definitions_router", "location_usage_definitions_router", "user_table_settings_router", "inventory_router"]
