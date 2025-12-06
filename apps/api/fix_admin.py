import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models import User, UserRole, Tenant
from auth.utils import hash_password

async def fix_admin_user():
    async with AsyncSessionLocal() as session:
        print("🔧 Starting Admin User Fix...")

        # 1. וודא שקיים Tenant (חובה עבור ה-FK)
        print("   Checking Tenant...")
        tenant = await session.get(Tenant, 1)
        if not tenant:
            print("   ⚠️ Tenant 1 missing. Creating it...")
            tenant = Tenant(id=1, name="System Tenant")
            session.add(tenant)
            await session.flush()
        
        # 2. חפש את המשתמש
        print("   Searching for 'admin@logisnap.com'...")
        result = await session.execute(select(User).where(User.email == "admin@logisnap.com"))
        user = result.scalar_one_or_none()

        new_password_hash = hash_password("123456")

        if user:
            print("   👤 User found. Overwriting password...")
            user.password_hash = new_password_hash
            user.role = UserRole.ADMIN
            user.tenant_id = 1
        else:
            print("   👤 User NOT found. Creating new Admin user...")
            user = User(
                tenant_id=1,
                email="admin@logisnap.com",
                password_hash=new_password_hash,
                full_name="System Admin",
                role=UserRole.ADMIN
            )
            session.add(user)

        await session.commit()
        print("✅ SUCCESS: User 'admin@logisnap.com' is ready with password '123456'")

if __name__ == "__main__":
    asyncio.run(fix_admin_user())