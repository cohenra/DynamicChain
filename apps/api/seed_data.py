import asyncio
from datetime import datetime, timedelta
import random
from sqlalchemy import select
from database import AsyncSessionLocal
from models import (
    Tenant, User, UserRole, Warehouse, Zone, Location, 
    LocationTypeDefinition, LocationUsageDefinition,
    Depositor, UomDefinition, Product, ProductUOM,
    InboundOrder, InboundLine, InboundOrderType, InboundOrderStatus,
    InboundShipment, InboundShipmentStatus
)
from auth.utils import hash_password

# הגדרות קבועות
TENANT_ID = 1
ADMIN_EMAIL = "admin@logisnap.com"
ADMIN_PASSWORD = "123456"

async def seed_data():
    async with AsyncSessionLocal() as session:
        print("🌱 Starting database seed...")

        # 1. יצירת דייר (Tenant)
        tenant = await session.get(Tenant, TENANT_ID)
        if not tenant:
            print("🏢 Creating System Tenant...")
            tenant = Tenant(id=TENANT_ID, name="LogiSnap System")
            session.add(tenant)
            await session.flush()
        else:
            print("✅ Tenant exists.")

        # 2. יצירת משתמש אדמין
        user_stmt = select(User).where(User.email == ADMIN_EMAIL)
        user = (await session.execute(user_stmt)).scalar_one_or_none()

        if not user:
            print(f"👤 Creating Admin User ({ADMIN_EMAIL})...")
            user = User(
                tenant_id=TENANT_ID,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                full_name="System Admin",
                role=UserRole.ADMIN
            )
            session.add(user)
            await session.flush()
        else:
            print("✅ Admin user exists.")

        # 3. יצירת מחסן
        print("🏭 Creating Warehouse...")
        warehouse = (await session.execute(select(Warehouse).where(Warehouse.code == "WH-MAIN"))).scalar_one_or_none()
        if not warehouse:
            warehouse = Warehouse(
                tenant_id=TENANT_ID,
                name="מרכז לוגיסטי ראשי",
                code="WH-MAIN",
                address="רחוב התעשייה 10, חולון"
            )
            session.add(warehouse)
            await session.flush()

        # 4. יצירת אזורים
        print("🚧 Creating Zones...")
        zones_data = [
            {"name": "אזור יבש", "code": "DRY"},
            {"name": "אזור קירור", "code": "COOL"},
            {"name": "אזור קבלה", "code": "STAGING"}
        ]
        created_zones = {}
        for z_data in zones_data:
            zone = (await session.execute(select(Zone).where(Zone.code == z_data["code"]))).scalar_one_or_none()
            if not zone:
                zone = Zone(
                    tenant_id=TENANT_ID,
                    warehouse_id=warehouse.id,
                    name=z_data["name"],
                    code=z_data["code"]
                )
                session.add(zone)
                await session.flush()
            created_zones[z_data["code"]] = zone

        # 5. הגדרות מיקום
        loc_type = (await session.execute(select(LocationTypeDefinition).limit(1))).scalar_one_or_none()
        if not loc_type:
            loc_type = LocationTypeDefinition(tenant_id=TENANT_ID, name="Standard Shelf", code="SHELF")
            session.add(loc_type)
            await session.flush()

        loc_usage = (await session.execute(select(LocationUsageDefinition).limit(1))).scalar_one_or_none()
        if not loc_usage:
            loc_usage = LocationUsageDefinition(tenant_id=TENANT_ID, name="Picking", code="PICKING")
            session.add(loc_usage)
            await session.flush()

        # 6. יצירת מיקומים
        print("📍 Generating Locations...")
        locations_count = 0
        dry_zone = created_zones["DRY"]
        existing_loc = (await session.execute(select(Location).where(Location.zone_id == dry_zone.id))).first()
        if not existing_loc:
            for aisle in ['A', 'B', 'C']:
                for bay in range(1, 6):
                    for level in range(1, 4):
                        name = f"{aisle}-{str(bay).zfill(2)}-{str(level).zfill(2)}-01"
                        loc = Location(
                            tenant_id=TENANT_ID,
                            warehouse_id=warehouse.id,
                            zone_id=dry_zone.id,
                            name=name,
                            aisle=aisle,
                            bay=str(bay).zfill(2),
                            level=str(level).zfill(2),
                            slot="01",
                            type_id=loc_type.id,
                            usage_id=loc_usage.id,
                            pick_sequence=locations_count * 10
                        )
                        session.add(loc)
                        locations_count += 1
            print(f"   Created {locations_count} locations in DRY zone.")

        # 7. יצירת מאחסנים
        print("👥 Creating Depositors...")
        depositors_data = [
            {"name": "אלקטרוניקה פלוס בע״מ", "code": "ELEC"},
            {"name": "מזון מהיר שיווק", "code": "FOOD"}
        ]
        created_depositors = []
        for d_data in depositors_data:
            dep = (await session.execute(select(Depositor).where(Depositor.code == d_data["code"]))).scalar_one_or_none()
            if not dep:
                dep = Depositor(
                    tenant_id=TENANT_ID,
                    name=d_data["name"],
                    code=d_data["code"],
                    contact_info={"phone": "050-0000000", "email": "contact@example.com"}
                )
                session.add(dep)
                await session.flush()
            created_depositors.append(dep)

        # 8. יצירת יחידות מידה
        print("📏 Creating UOM Definitions...")
        uoms_data = [
            {"name": "יחידה", "code": "EA"},
            {"name": "קרטון", "code": "CS"},
            {"name": "משטח", "code": "PLT"}
        ]
        created_uoms = {}
        for u_data in uoms_data:
            uom = (await session.execute(select(UomDefinition).where(UomDefinition.code == u_data["code"]))).scalar_one_or_none()
            if not uom:
                uom = UomDefinition(tenant_id=TENANT_ID, name=u_data["name"], code=u_data["code"])
                session.add(uom)
                await session.flush()
            created_uoms[u_data["code"]] = uom

        # 9. יצירת מוצרים
        print("📦 Creating Products...")
        base_uom = created_uoms["EA"]
        
        products_list = [
            {"sku": "TV-55-4K", "name": "טלוויזיה 55 אינץ' 4K", "dep_idx": 0},
            {"sku": "LAPTOP-X1", "name": "מחשב נייד X1 Carbon", "dep_idx": 0},
            {"sku": "WIFI-ROUTER", "name": "ראוטר אלחוטי מהיר", "dep_idx": 0},
            {"sku": "HDMI-CABLE", "name": "כבל HDMI 2 מטר", "dep_idx": 0},
            {"sku": "PASTA-500G", "name": "פסטה 500 גרם", "dep_idx": 1},
            {"sku": "TOMATO-SAUCE", "name": "רוטב עגבניות", "dep_idx": 1}
        ]

        created_products = []
        for p_data in products_list:
            prod = (await session.execute(select(Product).where(Product.sku == p_data["sku"]))).scalar_one_or_none()
            if not prod:
                dep = created_depositors[p_data["dep_idx"]]
                prod = Product(
                    tenant_id=TENANT_ID,
                    depositor_id=dep.id,
                    sku=p_data["sku"],
                    name=p_data["name"],
                    base_uom_id=base_uom.id,
                    barcode=f"BAR-{p_data['sku']}",
                    custom_attributes={"color": "black"}
                )
                session.add(prod)
                await session.flush()
                
                # הוספת אריזה (קרטון)
                box_uom = ProductUOM(
                    tenant_id=TENANT_ID,
                    product_id=prod.id,
                    uom_id=created_uoms["CS"].id,
                    conversion_factor=10 if "TV" not in p_data["sku"] else 1, # טלויזיה 1 בקרטון
                    barcode=f"BOX-{p_data['sku']}",
                    length=50, width=30, height=20, weight=5
                )
                session.add(box_uom)
            created_products.append(prod)

        # 10. יצירת הזמנות קבלה מרובות
        print("🚛 Creating Multiple Inbound Orders...")
        
        orders_data = [
            {
                "num": "PO-2025-001", 
                "supplier": "סמסונג העולמית", 
                "status": InboundOrderStatus.CONFIRMED,
                "items": [0, 1, 2], # מוצרי אלקטרוניקה
                "notes": "הזמנה דחופה למלאי חג - יש משלוח משויך"
            },
            {
                "num": "PO-2025-002", 
                "supplier": "אסם השקעות", 
                "status": InboundOrderStatus.DRAFT,
                "items": [4, 5], # מוצרי מזון
                "notes": "המתנה לאישור סופי"
            },
            {
                "num": "RET-2025-003", 
                "supplier": "לקוח פרטי (החזרה)", 
                "status": InboundOrderStatus.DRAFT,
                "items": [2], # ראוטר
                "notes": "החזרת מוצר פגום לבדיקה"
            },
            {
                "num": "PO-2025-004", 
                "supplier": "יבואן רשמי", 
                "status": InboundOrderStatus.PARTIALLY_RECEIVED,
                "items": [3], # כבלים
                "notes": "הזמנת השלמה"
            }
        ]

        for i, o_data in enumerate(orders_data):
            existing_order = (await session.execute(select(InboundOrder).where(InboundOrder.order_number == o_data["num"]))).scalar_one_or_none()
            
            if not existing_order:
                # זיהוי המאחסן לפי המוצר הראשון ברשימה
                first_prod = created_products[o_data["items"][0]]
                customer_id = first_prod.depositor_id

                order = InboundOrder(
                    tenant_id=TENANT_ID,
                    order_number=o_data["num"],
                    order_type=InboundOrderType.SUPPLIER_DELIVERY.value,
                    status=o_data["status"].value,
                    supplier_name=o_data["supplier"],
                    customer_id=customer_id,
                    expected_delivery_date=datetime.now().date() + timedelta(days=i*2),
                    notes=o_data["notes"]
                )
                session.add(order)
                await session.flush()

                # יצירת שורות
                for item_idx in o_data["items"]:
                    prod = created_products[item_idx]
                    line = InboundLine(
                        inbound_order_id=order.id,
                        product_id=prod.id,
                        uom_id=base_uom.id,
                        expected_quantity=random.randint(10, 100),
                        received_quantity=0,
                        notes=f"בדיקה עבור {prod.name}"
                    )
                    session.add(line)
                
                # --- יצירת משלוח (Shipment) רק להזמנה הראשונה ---
                if i == 0:
                    print(f"   🚢 Creating Shipment for {o_data['num']}...")
                    shipment = InboundShipment(
                        inbound_order_id=order.id,
                        shipment_number=f"SH-{o_data['num']}-01",
                        status=InboundShipmentStatus.ARRIVED.value,
                        container_number="CNTR-998877",
                        driver_details="ישראל ישראלי - 0501234567",
                        arrival_date=datetime.now(),
                        notes="נהג ממתין ברמפה 2"
                    )
                    session.add(shipment)

        await session.commit()
        print("✅ Database seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())