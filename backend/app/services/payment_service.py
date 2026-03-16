import hmac
import hashlib
from typing import Dict, Any, Optional

import razorpay

from app.config import settings

class PaymentService:
    def __init__(self):
        self.key_id = settings.razorpay_key_id
        self.key_secret = settings.razorpay_key_secret
        self.client = None
        
        if self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
            
    async def create_order(self, amount: int, currency: str = "INR", receipt: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a Razorpay order.
        Amount should be in paise (e.g., 50000 for ₹500.00).
        """
        if not self.client:
            raise ValueError("Razorpay is not configured")
            
        data = {
            "amount": amount,
            "currency": currency,
            "receipt": receipt or "receipt#1"
        }
        
        # In a real async environment, we'd ideally use an async HTTP client,
        # but the razorpay officially supported python client is synchronous.
        # For this prototype, we'll use it directly. In production with heavy load,
        # wrap this in run_in_threadpool.
        order = self.client.order.create(data=data)
        return order
        
    def verify_payment_signature(self, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """
        Verify the signature received from the frontend after successful payment.
        """
        if not self.key_secret:
            return False
            
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        
        # Generate the expected signature
        generated_signature = hmac.new(
            self.key_secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(generated_signature, razorpay_signature)
