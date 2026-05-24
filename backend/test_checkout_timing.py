#!/usr/bin/env python3
"""
Checkout Timing Test
Tests the full checkout flow end-to-end and measures time
"""
import asyncio
import time
import httpx
import json

BASE = "http://localhost:8001/api/v1"

async def test_checkout_timing():
    """Tests checkout time by simulating a real user flow."""
    async with httpx.AsyncClient(timeout=120) as client:
        # ── Step 1: Request OTP ──────────────────────────────────────────
        print("Step 1: Requesting OTP...")
        r = await client.post(f"{BASE}/auth/request-otp", json={"email": "timing-test-user@pranjay.com"})
        print(f"  OTP Request: {r.status_code} - {r.json()}")

        otp = input("\n>> Enter the OTP you received (or check server logs): ").strip()

        # ── Step 2: Verify OTP and get token ─────────────────────────────
        print("\nStep 2: Verifying OTP...")
        r = await client.post(f"{BASE}/auth/verify-otp", json={"email": "timing-test-user@pranjay.com", "otp": otp})
        if r.status_code != 200:
            print(f"  OTP verify failed: {r.text}")
            return
        tokens = r.json()
        token = tokens["access_token"]
        print(f"  Got token: {token[:30]}...")

        headers = {"Authorization": f"Bearer {token}"}

        # ── Step 3: Add an item to cart ───────────────────────────────────
        print("\nStep 3: Looking for a product...")
        r = await client.get(f"{BASE}/products?page_size=1")
        products = r.json()
        if not products["items"]:
            print("  No products found in the database!")
            return
        product = products["items"][0]
        print(f"  Found product: {product['name']} (id: {product['id']})")

        print("\nStep 4: Adding to cart...")
        r = await client.post(f"{BASE}/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
        print(f"  Add to cart: {r.status_code}")

        # ── Step 5: Add an address ────────────────────────────────────────
        print("\nStep 5: Adding shipping address...")
        r = await client.post(f"{BASE}/users/addresses", json={
            "full_name": "Test User",
            "phone": "9999999999",
            "address_line1": "123 Test Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "postal_code": "400001",
            "country": "India",
            "is_default": True
        }, headers=headers)
        if r.status_code not in (200, 201):
            print(f"  Address failed: {r.text}")
            # Try to get existing address
            r2 = await client.get(f"{BASE}/users/addresses", headers=headers)
            addresses = r2.json()
            if not addresses:
                print("  No addresses found, cannot test!")
                return
            address_id = addresses[0]["id"]
        else:
            address_id = r.json()["id"]
        print(f"  Address ID: {address_id}")

        # ── Step 6: TIME THE CHECKOUT ─────────────────────────────────────
        print("\n" + "="*50)
        print("Step 6: Placing order (timing starts now)...")
        print("="*50)

        t0 = time.time()
        r = await client.post(f"{BASE}/checkout", json={
            "shipping_address_id": str(address_id),
            "payment_method": "cod"
        }, headers=headers)
        elapsed = time.time() - t0

        print(f"\n✅ Checkout response received!")
        print(f"   Status: {r.status_code}")
        print(f"   ⏱  Time: {elapsed:.2f} seconds")
        if r.status_code == 201:
            order = r.json()
            print(f"   Order Number: {order.get('order_number', 'N/A')}")
            print(f"   Order Total: ₹{order.get('total_amount', 'N/A')}")
        else:
            print(f"   Error: {r.text[:500]}")

        if elapsed < 5:
            print(f"\n🚀 FAST! Checkout is working optimally ({elapsed:.2f}s)")
        elif elapsed < 10:
            print(f"\n⚠️  Acceptable ({elapsed:.2f}s) — some slowness detected")
        else:
            print(f"\n❌ SLOW! ({elapsed:.2f}s) — further optimization needed")

asyncio.run(test_checkout_timing())
