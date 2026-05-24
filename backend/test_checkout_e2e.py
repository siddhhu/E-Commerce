#!/usr/bin/env python3
"""
Full checkout timing test — directly against the backend API.
This simulates a real user: OTP login → add to cart → checkout → measure time.
"""
import asyncio
import time
import os
import sys
import httpx

BASE = "http://localhost:8001/api/v1"
TEST_EMAIL = "checkout-timing-test@pranjay.com"

async def main():
    print("=" * 60)
    print("CHECKOUT TIMING TEST")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=120) as c:
        
        # 1. Request OTP
        print("\n[1] Requesting OTP...")
        r = await c.post(f"{BASE}/auth/request-otp", json={"email": TEST_EMAIL})
        print(f"    Status: {r.status_code}")
        if r.status_code != 200:
            print(f"    Error: {r.text}")
            return

        # 2. Read OTP from server logs (ask user)
        print(f"\n    >> Check your backend terminal for the OTP sent to {TEST_EMAIL}")
        print(f"    >> Or check the Resend dashboard if email is configured.")
        otp = input("\n    Enter OTP: ").strip()

        # 3. Verify OTP
        print("\n[2] Verifying OTP...")
        r = await c.post(f"{BASE}/auth/verify-otp", json={"email": TEST_EMAIL, "otp": otp})
        if r.status_code != 200:
            print(f"    Failed: {r.text}")
            return
        token = r.json()["access_token"]
        user_id = r.json()["user"]["id"]
        print(f"    ✅ Logged in as {TEST_EMAIL} (user_id: {user_id})")
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Find a product
        print("\n[3] Finding a product...")
        r = await c.get(f"{BASE}/products?page_size=5&is_active=true")
        items = r.json().get("items", [])
        if not items:
            print("    No products found!")
            return
        product = items[0]
        print(f"    ✅ Product: {product['name']} | Price: ₹{product['selling_price']}")

        # 5. Clear cart first (in case it has stale items)
        r = await c.delete(f"{BASE}/cart", headers=headers)
        print(f"\n[4] Cart cleared: {r.status_code}")

        # 6. Add product to cart
        r = await c.post(f"{BASE}/cart/items", json={"product_id": product["id"], "quantity": 1}, headers=headers)
        print(f"\n[5] Add to cart: {r.status_code}")
        if r.status_code not in (200, 201):
            print(f"    Error: {r.text}")
            return

        # 7. Get or create address
        print("\n[6] Setting up address...")
        r = await c.get(f"{BASE}/users/addresses", headers=headers)
        addresses = r.json() if r.status_code == 200 else []
        
        if addresses:
            addr_id = addresses[0]["id"]
            print(f"    Using existing address: {addr_id}")
        else:
            r = await c.post(f"{BASE}/users/addresses", json={
                "full_name": "Timing Test",
                "phone": "9876543210",
                "address_line1": "1 Test Lane",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postal_code": "400001",
                "country": "India",
                "is_default": True
            }, headers=headers)
            if r.status_code in (200, 201):
                addr_id = r.json()["id"]
                print(f"    ✅ Created address: {addr_id}")
            else:
                print(f"    Error creating address: {r.text}")
                return

        # 8. 🚀 TIMED CHECKOUT
        print("\n" + "=" * 60)
        print("[7] PLACING ORDER — TIMER STARTS NOW")
        print("=" * 60)
        
        t0 = time.perf_counter()
        r = await c.post(f"{BASE}/checkout", json={
            "shipping_address_id": str(addr_id),
            "payment_method": "cod"
        }, headers=headers)
        elapsed = time.perf_counter() - t0

        print(f"\nRESULT:")
        print(f"  HTTP Status: {r.status_code}")
        print(f"  ⏱  Time:   {elapsed:.2f}s")
        
        if r.status_code == 201:
            order = r.json()
            print(f"  Order No:   {order.get('order_number')}")
            print(f"  Total:      ₹{order.get('total_amount')}")
        else:
            print(f"  Response:   {r.text[:300]}")

        if elapsed < 5:
            print(f"\n🚀 EXCELLENT! Checkout is fast ({elapsed:.2f}s)")
        elif elapsed < 10:
            print(f"\n⚡ GOOD! Checkout is acceptable ({elapsed:.2f}s)")
        elif elapsed < 20:
            print(f"\n⚠️  SLOW — still room to improve ({elapsed:.2f}s)")
        else:
            print(f"\n❌ TOO SLOW! ({elapsed:.2f}s) — optimization needed")


asyncio.run(main())
