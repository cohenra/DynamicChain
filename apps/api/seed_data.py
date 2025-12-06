import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from database import AsyncSessionLocal
from models import (
    Tenant, User, UserRole, Warehouse, Zone, Location, 
    LocationTypeDefinition, LocationUsageDefinition,
    Depositor, UomDefinition, Product, ProductUOM,
    InboundOrder, InboundLine, InboundOrderType, InboundOrderStatus
)
from auth.utils import hash_password

# הגדרות קבועות
TENANT_ID = 1
ADMIN_EMAIL = "admin@logisnap.com"
ADMIN_PASSWORD = "123456"

async def seed_data():
    async with AsyncSessionLocal() as session:
        print("🌱 Starting database seed...")

        # ---------------------------------------------------------
        # 1. יצירת דייר (Tenant) - חובה שיהיה ראשון
        # ---------------------------------------------------------
        tenant = await session.get(Tenant, TENANT_ID)
        if not tenant:
            print("🏢 Creating System Tenant...")
            tenant = Tenant(
                id=TENANT_ID,
                name="LogiSnap System"
            )
            session.add(tenant)
            await session.flush()
        else:
            print("✅ Tenant exists.")

        # ---------------------------------------------------------
        # 2. יצירת משתמש אדמין (Admin User)
        # ---------------------------------------------------------
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

        # ---------------------------------------------------------
        # 3. יצירת מחסן (Warehouse)
        # ---------------------------------------------------------
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
        
        # ---------------------------------------------------------
        # 4. יצירת אזורים (Zones)
        # ---------------------------------------------------------
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

        # ---------------------------------------------------------
        # 5. וידוא קיום הגדרות מיקום (Types/Usages)
        # ---------------------------------------------------------
        # אם הטבלה ריקה (קורה במחיקת DB מלאה), ניצור ברירות מחדל
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

        # ---------------------------------------------------------
        # 6. יצירת מיקומים (Locations)
        # ---------------------------------------------------------
        print("📍 Generating Locations...")
        locations_count = 0
        dry_zone = created_zones["DRY"]
        
        existing_loc = (await session.execute(select(Location).where(Location.zone_id == dry_zone.id))).first()
        if not existing_loc:
            for aisle in ['A', 'B', 'C']:
                for bay in range(1, 6): # 1-5
                    for level in range(1, 4): # 1-3
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

        # ---------------------------------------------------------
        # 7. יצירת מאחסנים (Depositors)
        # ---------------------------------------------------------
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

        # ---------------------------------------------------------
        # 8. יצירת יחידות מידה (UOM Definitions)
        # ---------------------------------------------------------
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

        # ---------------------------------------------------------
        # 9. יצירת מוצרים (Products)
        # ---------------------------------------------------------
        print("📦 Creating Products...")
        elec_dep = created_depositors[0]
        base_uom = created_uoms["EA"]
        
        products_list = [
            {"sku": "TV-55-4K", "name": "טלוויזיה 55 אינץ' 4K", "price": 2500},
            {"sku": "LAPTOP-X1", "name": "מחשב נייד X1 Carbon", "price": 8000},
            {"sku": "WIFI-ROUTER", "name": "ראוטר אלחוטי מהיר", "price": 300},
            {"sku": "HDMI-CABLE", "name": "כבל HDMI 2 מטר", "price": 50}
        ]

        for p_data in products_list:
            prod = (await session.execute(select(Product).where(Product.sku == p_data["sku"]))).scalar_one_or_none()
            
            if not prod:
                # יצירת מוצר
                prod = Product(
                    tenant_id=TENANT_ID,
                    depositor_id=elec_dep.id,
                    sku=p_data["sku"],
                    name=p_data["name"],
                    base_uom_id=base_uom.id,
                    barcode=f"BAR-{p_data['sku']}",
                    custom_attributes={"color": "black", "warranty": "1 year"}
                )
                session.add(prod)
                await session.flush()

                # יצירת אריזות למוצר (Product UOMs)
                # קרטון = 10 יחידות
                box_uom = ProductUOM(
                    tenant_id=TENANT_ID,
                    product_id=prod.id,
                    uom_id=created_uoms["CS"].id,
                    conversion_factor=10,
                    barcode=f"BOX-{p_data['sku']}",
                    length=50, width=30, height=20, weight=5
                )
                session.add(box_uom)

        # ---------------------------------------------------------
        # 10. יצירת הזמנת קבלה (Inbound Order)
        # ---------------------------------------------------------
        print("🚛 Creating Inbound Order...")
        order_num = "PO-2025-001"
        existing_order = (await session.execute(select(InboundOrder).where(InboundOrder.order_number == order_num))).scalar_one_or_none()
        
        if not existing_order:
            # שליפת מוצר ראשון
            p1 = (await session.execute(select(Product).limit(1))).scalar_one()
            
            order = InboundOrder(
                tenant_id=TENANT_ID,
                order_number=order_num,
                order_type=InboundOrderType.SUPPLIER_DELIVERY.value,
                status=InboundOrderStatus.DRAFT.value,
                supplier_name="סמסונג העולמית",
                expected_delivery_date=datetime.now().date() + timedelta(days=2),
                notes="הזמנה דחופה למלאי חג"
            )
            session.add(order)
            await session.flush()

            # הוספת שורות
            line1 = InboundLine(
                inbound_order_id=order.id,
                product_id=p1.id,
                uom_id=base_uom.id,
                expected_quantity=100,
                received_quantity=0,
                notes="לבדוק תקינות אריזה"
            )
            session.add(line1)

        await session.commit()
        print("✅ Database seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())