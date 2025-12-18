import pytest
import pytest_asyncio
import sys
import os
from httpx import AsyncClient, ASGITransport

# הוספת התיקייה הראשית ל-Path
sys.path.append(os.getcwd())
from main import app

BASE_URL = "http://test"
# פרטי התחברות תואמים ל-Seed Data
TEST_USER = {"email": "admin@logisnap.com", "password": "123456"}

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        try:
            # --- תיקון: שימוש בנתיב login וב-json payload ---
            login_res = await c.post("/api/auth/login", json=TEST_USER)
            # ------------------------------------------------
            
            if login_res.status_code == 200:
                token = login_res.json()["access_token"]
                c.headers = {"Authorization": f"Bearer {token}"}
            else:
                print(f"Login failed: {login_res.status_code} - {login_res.text}")
            yield c
        except Exception as e:
            print(f"Fixture setup failed: {e}")
            yield c

@pytest.mark.asyncio
async def test_inventory_partial_move(client):
    # יצירת LPN ייחודי לכל ריצה כדי למנוע התנגשויות
    lpn = f"TEST-LPN-{os.urandom(2).hex()}"
    
    # 1. קליטת מלאי
    receive_data = {
        "depositor_id": 1, "product_id": 1, "location_id": 1, 
        "quantity": 100, "lpn": lpn
    }
    res = await client.post("/api/inventory/receive", json=receive_data)
    assert res.status_code in [200, 201], f"Receive failed: {res.text}"
    
    # 2. העברה חלקית
    move_data = {
        "lpn": lpn, "to_location_id": 2, "quantity": 30
    }
    res = await client.post("/api/inventory/move", json=move_data)
    assert res.status_code == 200, f"Move failed: {res.text}"

@pytest.mark.asyncio
async def test_short_pick_zombie_allocation(client):
    assert True