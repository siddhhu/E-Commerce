"""
Email Service - Send emails via Resend

To enable email sending you need:
  1. A Resend account → https://resend.com (free tier: 3,000 emails/month)
  2. Set RESEND_API_KEY in backend/.env
  3. Verify your sending domain (or use Resend's sandbox domain for testing)
  4. Set EMAIL_FROM to your verified sender (e.g. noreply@pranjay.com)

Without RESEND_API_KEY all email methods are silently skipped (logged, no errors).
"""
import asyncio
from html import escape

import resend

from app.config import settings


def is_deliverable_email(email: str | None) -> bool:
    """Return False for phone-generated placeholder addresses that cannot receive mail."""
    if not email or "@" not in email:
        return False
    normalized = email.strip().lower()
    if normalized.endswith("@pranjay.com") and (
        normalized.startswith("phone_") or normalized.startswith("parlar_dummy_")
    ):
        return False
    return True


class EmailService:
    """Service for sending emails via Resend."""

    def __init__(self):
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key
        self.from_email = settings.email_from
        self.admin_email = settings.admin_email
        self.frontend_url = settings.frontend_url.rstrip("/")
        self._enabled = bool(settings.resend_api_key)

    def _log_skip(self, method: str, to: str):
        """Log that email was skipped because Resend is not configured."""
        print(f"[Email] SKIPPED {method} → {to}  (RESEND_API_KEY not set)")

    async def _send(self, params: dict) -> bool:
        if not self._enabled:
            recipients = params.get("to") or ["unknown"]
            self._log_skip("send", recipients[0] if recipients else "unknown")
            return False
        try:
            await asyncio.to_thread(resend.Emails.send, params)
            print(f"[Email] Sent → {params.get('to')} | {params.get('subject')}")
            return True
        except Exception as e:
            print(f"[Email] Send failed → {params.get('to')}: {e}")
            return False

    async def send_otp_email(self, to_email: str, otp: str) -> bool:
        """Send OTP verification email."""
        if not self._enabled:
            self._log_skip("send_otp_email", to_email)
            return False
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
            return await self._send(params)
        except Exception as e:
            print(f"Error sending OTP email: {e}")
            return False

    async def send_welcome_email(self, to_email: str, name: str = None) -> bool:
        """Send welcome email to new users."""
        if not self._enabled:
            self._log_skip("send_welcome_email", to_email)
            return False
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
                        <p>Thank you for joining Pranjay - your trusted wholesale cosmetics platform.</p>
                        <p>You can now:</p>
                        <ul>
                            <li>Browse our extensive catalog of cosmetics</li>
                            <li>Get exclusive wholesale pricing</li>
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
            return await self._send(params)
        except Exception as e:
            print(f"Error sending welcome email: {e}")
            return False

    async def send_contact_email(self, first_name: str, last_name: str, email: str, subject: str, message: str) -> bool:
        """Send contact form submission to admin."""
        if not self._enabled:
            self._log_skip("send_contact_email", self.admin_email or "support@pranjay.com")
            # If no resend key, we still want to pretend it succeeded for the frontend if they test it without keys
            return True
        safe_first_name = escape(first_name.strip())
        safe_last_name = escape(last_name.strip())
        reply_to_email = email.strip()
        safe_email = escape(reply_to_email)
        safe_subject = escape(subject.strip())
        safe_message = escape(message.strip()).replace("\n", "<br>")
        try:
            params = {
                "from": self.from_email,
                "to": [self.admin_email or "support@pranjay.com"],
                "reply_to": reply_to_email,
                "subject": f"New Contact Form Submission: {safe_subject}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">New Contact Form Message</h2>
                        <p><strong>Name:</strong> {safe_first_name} {safe_last_name}</p>
                        <p><strong>Email:</strong> {safe_email}</p>
                        <p><strong>Subject:</strong> {safe_subject}</p>
                        <p><strong>Message:</strong></p>
                        <blockquote style="border-left: 4px solid #eee; padding-left: 15px; color: #555;">
                            {safe_message}
                        </blockquote>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending contact email: {e}")
            return False

    async def send_order_confirmation_email(
        self,
        to_email: str,
        order_number: str,
        total_amount: float,
        items_count: int
    ) -> bool:
        """Send order confirmation email to customer."""
        if not self._enabled:
            self._log_skip("send_order_confirmation_email", to_email)
            return False
        try:
            orders_url = f"{self.frontend_url}/orders"
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Order Confirmed - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Order Confirmed!</h2>
                        <p>Thank you for shopping with Pranjay. We've received your order.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            <p><strong>Items:</strong> {items_count}</p>
                            <p><strong>Total:</strong> ₹{total_amount:,.2f}</p>
                        </div>
                        <p>We'll email you again when your order ships and when it's delivered.</p>
                        <p><a href="{orders_url}" style="color: #d81b60;">Track your order</a></p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending order confirmation email: {e}")
            return False

    async def send_order_notification_to_admin(
        self,
        order_number: str,
        customer_contact: str,
        customer_name: str,
        total_amount: float,
        items_count: int,
        order_id: str | None = None,
    ) -> bool:
        """Send new order notification to admin."""
        if not self._enabled:
            self._log_skip("send_order_notification_to_admin", self.admin_email)
            return False
        try:
            admin_link = (
                f"{self.frontend_url}/admin/orders/{order_id}"
                if order_id
                else f"{self.frontend_url}/admin/orders"
            )
            params = {
                "from": self.from_email,
                "to": [self.admin_email],
                "subject": f"🛒 New Order - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">New Order Received!</h2>
                        <p>A customer just placed an order. Please review and confirm it in the admin panel.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            <p><strong>Customer:</strong> {escape(customer_name)} ({escape(customer_contact)})</p>
                            <p><strong>Items:</strong> {items_count}</p>
                            <p><strong>Total:</strong> ₹{total_amount:,.2f}</p>
                        </div>
                        <p>
                            <a href="{admin_link}" style="display: inline-block; background: #d81b60; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                View order in admin
                            </a>
                        </p>
                    </div>
                """
            }
            return await self._send(params)
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
        if not self._enabled:
            self._log_skip("send_order_shipped_email", to_email)
            return False
        tracking_section = ""
        if tracking_info:
            tracking_section = f"<p><strong>Tracking:</strong> {escape(tracking_info)}</p>"
        try:
            orders_url = f"{self.frontend_url}/orders"
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Your Order is on the way! - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Your Order is Shipped!</h2>
                        <p>Great news! Your order has left our warehouse and is on its way to you.</p>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Order Number:</strong> {order_number}</p>
                            {tracking_section}
                        </div>
                        <p>We'll notify you once it's delivered.</p>
                        <p><a href="{orders_url}" style="color: #d81b60;">Track your order</a></p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending shipped email: {e}")
            return False

    async def send_order_delivered_email(
        self,
        to_email: str,
        order_number: str,
        customer_name: str = "Customer",
    ) -> bool:
        """Send order delivered notification."""
        if not self._enabled:
            self._log_skip("send_order_delivered_email", to_email)
            return False
        safe_name = escape(customer_name or "Customer")
        try:
            orders_url = f"{self.frontend_url}/orders"
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Order Delivered - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Your Order is Delivered!</h2>
                        <p>Hi {safe_name},</p>
                        <p>Your order <strong>{order_number}</strong> has been delivered. We hope you love your purchase!</p>
                        <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0;">If anything is missing or damaged, please contact us at <a href="mailto:{self.admin_email}">{self.admin_email}</a>.</p>
                        </div>
                        <p><a href="{orders_url}" style="color: #d81b60;">View order details</a></p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending delivered email: {e}")
            return False

    async def send_order_status_update(
        self,
        to_email: str,
        order_number: str,
        new_status: str,
        customer_name: str = "Customer"
    ) -> bool:
        """Send generic order status update notification."""
        if not self._enabled:
            self._log_skip("send_order_status_update", to_email)
            return False
            
        status_colors = {
            "pending": "#f59e0b",
            "confirmed": "#3b82f6",
            "processing": "#8b5cf6",
            "shipped": "#10b981",
            "delivered": "#059669",
            "cancelled": "#ef4444"
        }
        color = status_colors.get(new_status.lower(), "#d81b60")
        
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Order Status Update - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Order Status Update</h2>
                        <p>Hi {customer_name},</p>
                        <p>There is an update regarding your recent order <strong>#{order_number}</strong>.</p>
                        <div style="background: #fcfcfc; border-left: 4px solid {color}; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 16px;">
                                Your order status is now: <strong style="color: {color}; text-transform: uppercase;">{new_status.replace('_', ' ')}</strong>
                            </p>
                        </div>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">
                            &copy; 2024 Pranjay. All rights reserved.
                        </p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending order status email: {e}")
            return False

    async def send_order_item_cancelled_email(
        self,
        to_email: str,
        order_number: str,
        customer_name: str,
        product_name: str,
        quantity: int,
        removed_amount: float,
        new_total: float,
        reason: str | None = None,
    ) -> bool:
        """Notify customer when an unavailable item is removed from an order."""
        if not self._enabled:
            self._log_skip("send_order_item_cancelled_email", to_email)
            return False

        safe_customer = escape(customer_name or "Customer")
        safe_product = escape(product_name)
        safe_reason = escape(reason or "Item is currently unavailable with the seller/admin.")
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Order Updated - {order_number}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Your order has been updated</h2>
                        <p>Hi {safe_customer},</p>
                        <p>We are sorry, one item from your order <strong>#{order_number}</strong> could not be fulfilled and has been removed.</p>
                        <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 20px 0;">
                            <p><strong>Cancelled item:</strong> {safe_product}</p>
                            <p><strong>Quantity:</strong> {quantity}</p>
                            <p><strong>Amount removed:</strong> ₹{removed_amount:,.2f}</p>
                            <p><strong>Reason:</strong> {safe_reason}</p>
                        </div>
                        <div style="background: #f8fafc; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Updated order total:</strong> ₹{new_total:,.2f}</p>
                        </div>
                        <p>A revised invoice will be available on your order shortly. If you already paid online, our support team will coordinate the eligible refund/adjustment.</p>
                        <p>For help, reply to this email or contact support.</p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending order item cancellation email: {e}")
            return False

    async def send_seller_application_received(
        self,
        to_email: str,
        business_name: str = None
    ) -> bool:
        """Notify seller that their application has been received and is under review."""
        if not self._enabled:
            self._log_skip("send_seller_application_received", to_email)
            return False
        display_name = business_name or "there"
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": "Seller Application Received — Pranjay",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">Application Received!</h2>
                        <p>Hi {display_name},</p>
                        <p>Thank you for applying to sell on <strong>Pranjay</strong>. We've received your registration document and your application is now <strong>under review</strong>.</p>
                        <div style="background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Next step:</strong> Our admin team will review your document. Once approved, you will receive your login credentials directly. If you haven't heard back in 48 hours, please contact <a href="mailto:{self.admin_email}">{self.admin_email}</a>.</p>
                        </div>
                        <p>Once approved, you will use your registered seller email and a generated password to log in and start listing your products.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">&copy; 2024 Pranjay. All rights reserved.</p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending seller application received email: {e}")
            return False

    async def send_seller_application_to_admin(
        self,
        admin_email: str,
        seller_name: str,
        seller_phone: str,
        business_name: str,
        gst_number: str,
        invoice_url: str,
        user_id: str
    ) -> bool:
        """Notify admin of a new seller application awaiting review."""
        if not self._enabled:
            self._log_skip("send_seller_application_to_admin", admin_email)
            print(f"  ↳ New seller application from: {seller_name} ({seller_phone}) — {business_name}")
            print(f"  ↳ GST Registration Certificate: {invoice_url}")
            print(f"  ↳ User ID: {user_id}")
            return False
        try:
            params = {
                "from": self.from_email,
                "to": [admin_email],
                "subject": f"🆕 New Seller Application — {business_name or seller_name}",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a1a1a;">New Seller Application</h2>
                        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
                            <p><strong>Name:</strong> {seller_name}</p>
                            <p><strong>Phone:</strong> {seller_phone}</p>
                            <p><strong>Business:</strong> {business_name or '—'}</p>
                            <p><strong>GST:</strong> {gst_number or '—'}</p>
                            <p><strong>GST Registration Certificate:</strong> <a href="{invoice_url}">View Document</a></p>
                            <p><strong>User ID:</strong> {user_id}</p>
                        </div>
                        <p>Please review and approve/reject this application in the <strong>Admin Panel → Seller Applications</strong> tab.</p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending seller application admin email: {e}")
            return False

    async def send_seller_approved_credentials(
        self,
        to_email: str,
        seller_name: str,
        seller_username: str,
        plain_password: str
    ) -> bool:
        """
        Send approved seller their login credentials.
        Called after super-admin approves the application.
        """
        if not self._enabled:
            self._log_skip("send_seller_approved_credentials", to_email)
            print(f"  ↳ Seller credentials: {seller_username} / {plain_password}")
            return False
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": "🎉 Your Seller Account is Approved — Pranjay",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #16a34a;">Your Seller Account is Approved!</h2>
                        <p>Hi {seller_name},</p>
                        <p>Great news! Your seller application on <strong>Pranjay</strong> has been approved. Here are your login credentials:</p>
                        <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 24px; margin: 20px 0; border-radius: 8px;">
                            <p style="margin: 0 0 12px;"><strong>Login Page:</strong> <a href="https://pranjay.com/admin/login">pranjay.com/admin/login</a></p>
                            <p style="margin: 0 0 12px;"><strong>Login Email:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">{seller_username}</code></p>
                            <p style="margin: 0;"><strong>Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-size: 14px;">{plain_password}</code></p>
                        </div>
                        <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 13px;">⚠️ Please change your password after your first login. Keep these credentials safe.</p>
                        </div>
                        <p>Welcome to the Pranjay seller family! You can now log in and start listing your products.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">&copy; 2024 Pranjay. All rights reserved.</p>
                    </div>
                """
            }
            return await self._send(params)
        except Exception as e:
            print(f"Error sending seller approved credentials email: {e}")
            return False


# Singleton instance
email_service = EmailService()
