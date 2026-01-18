"""
Email Service - Send emails via Resend
"""
import resend

from app.config import settings


class EmailService:
    """Service for sending emails via Resend."""
    
    def __init__(self):
        resend.api_key = settings.resend_api_key
        self.from_email = settings.email_from
        self.admin_email = settings.admin_email
    
    async def send_otp_email(self, to_email: str, otp: str) -> bool:
        """Send OTP verification email."""
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Your Pranjay verification code: {otp}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Pranjay - Verification Code</h2>
                        <p>Hello,</p>
                        <p>Your verification code is:</p>
                        <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                                {otp}
                            </span>
                        </div>
                        <p>This code will expire in {settings.otp_expire_minutes} minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending OTP email: {e}")
            return False
    
    async def send_welcome_email(self, to_email: str, name: str = None) -> bool:
        """Send welcome email to new users."""
        display_name = name or "there"
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": "Welcome to Pranjay!",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Welcome to Pranjay!</h2>
                        <p>Hi {display_name},</p>
                        <p>Thank you for joining Pranjay - your trusted B2B cosmetics platform.</p>
                        <p>You can now:</p>
                        <ul>
                            <li>Browse our extensive catalog of cosmetics</li>
                            <li>Get exclusive B2B pricing</li>
                            <li>Place bulk orders with ease</li>
                            <li>Track your orders in real-time</li>
                        </ul>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending welcome email: {e}")
            return False
    
    async def send_order_confirmation_email(
        self,
        to_email: str,
        order_number: str,
        total_amount: float,
        items_count: int
    ) -> bool:
        """Send order confirmation email to customer."""
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Order Confirmed - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Order Confirmed!</h2>
                        <p>Thank you for your order.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            <p><strong>Items:</strong> {items_count}</p>
                            <p><strong>Total:</strong> ₹{total_amount:,.2f}</p>
                        </div>
                        <p>We'll notify you when your order ships.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending order confirmation email: {e}")
            return False
    
    async def send_order_notification_to_admin(
        self,
        order_number: str,
        customer_email: str,
        customer_name: str,
        total_amount: float,
        items_count: int
    ) -> bool:
        """Send new order notification to admin."""
        try:
            params = {
                "from": self.from_email,
                "to": [self.admin_email],
                "subject": f"🛒 New Order - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">New Order Received!</h2>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            <p><strong>Customer:</strong> {customer_name} ({customer_email})</p>
                            <p><strong>Items:</strong> {items_count}</p>
                            <p><strong>Total:</strong> ₹{total_amount:,.2f}</p>
                        </div>
                        <p>
                            <a href="#" style="background: #333; color: white; padding: 10px 20px; text-decoration: none; display: inline-block;">
                                View Order
                            </a>
                        </p>
                    </div>
                """
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending admin notification: {e}")
            return False
    
    async def send_order_shipped_email(
        self,
        to_email: str,
        order_number: str,
        tracking_info: str = None
    ) -> bool:
        """Send order shipped notification."""
        tracking_section = ""
        if tracking_info:
            tracking_section = f"<p><strong>Tracking:</strong> {tracking_info}</p>"
        
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Your Order is on the way! - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Your Order is Shipped!</h2>
                        <p>Great news! Your order has been shipped.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            {tracking_section}
                        </div>
                        <p>You'll receive it soon!</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Error sending shipped email: {e}")
            return False


# Singleton instance
email_service = EmailService()
