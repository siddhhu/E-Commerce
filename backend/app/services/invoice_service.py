"""
Invoice Service - Generate PDF invoices
"""
import io
import uuid
from decimal import Decimal
from typing import Optional

from fpdf import FPDF
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.models.order import Order
from app.models.user import User
from app.services.storage_service import storage_service

# Default Pranjay Details (Placeholder)
DEFAULT_COMPANY_NAME = "Pranjay Marketplace"
DEFAULT_COMPANY_GST = "29ABCDE1234F1Z5"
DEFAULT_COMPANY_ADDRESS = "123 Commerce St, Startup Hub, India"

class InvoicePDF(FPDF):
    def header(self):
        # Logo could be added here
        self.set_font('helvetica', 'B', 20)
        self.cell(0, 10, 'TAX INVOICE', align='C', ln=True)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

class InvoiceService:
    """Service for generating and uploading invoices."""

    @staticmethod
    async def generate_and_upload_invoice(order_id: uuid.UUID, session: AsyncSession) -> Optional[str]:
        """
        Background task to generate a PDF invoice for an order and upload it.
        Saves the URL to the order.
        """
        try:
            # Fetch order with items
            from sqlalchemy.orm import selectinload
            order_query = select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
            result = await session.execute(order_query)
            order = result.scalar_one_or_none()
            
            if not order:
                print(f"InvoiceService: Order {order_id} not found.")
                return None

            if order.invoice_url:
                print(f"InvoiceService: Order {order_id} already has an invoice.")
                return order.invoice_url

            # Fetch Seller Details (Assuming Marketplace Model - fallback to Default if no specific seller is set)
            seller_name = DEFAULT_COMPANY_NAME
            seller_gst = DEFAULT_COMPANY_GST
            seller_address = DEFAULT_COMPANY_ADDRESS
            
            # Note: For strict marketplace, we just use Pranjay defaults. 
            # If we wanted to use the specific seller's GST, we would fetch it from the first order item's product's seller_id.

            pdf = InvoicePDF()
            pdf.alias_nb_pages()
            pdf.add_page()

            # --- Company Header ---
            pdf.set_font('helvetica', 'B', 12)
            pdf.cell(0, 6, seller_name, ln=True)
            pdf.set_font('helvetica', '', 10)
            pdf.cell(0, 6, seller_address, ln=True)
            pdf.cell(0, 6, f'GSTIN: {seller_gst}', ln=True)
            pdf.ln(5)

            # --- Order Details ---
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(100, 6, f'Order Number: {order.order_number}')
            pdf.cell(90, 6, f'Date: {order.created_at.strftime("%Y-%m-%d %H:%M")}', ln=True)
            pdf.cell(0, 6, f'Payment Method: {order.payment_method.value.upper() if order.payment_method else "N/A"}', ln=True)
            pdf.ln(5)

            # --- Bill To ---
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(0, 6, 'Bill To / Ship To:', ln=True)
            pdf.set_font('helvetica', '', 10)
            
            shipping_data = order.shipping_address_data or {}
            cust_name = shipping_data.get('full_name', 'Customer')
            pdf.cell(0, 6, cust_name, ln=True)
            pdf.cell(0, 6, shipping_data.get('address_line1', ''), ln=True)
            if shipping_data.get('address_line2'):
                pdf.cell(0, 6, shipping_data.get('address_line2', ''), ln=True)
            city = shipping_data.get('city', '')
            state = shipping_data.get('state', '')
            pincode = shipping_data.get('postal_code', '')
            pdf.cell(0, 6, f'{city}, {state} {pincode}', ln=True)
            pdf.cell(0, 6, f'Phone: {shipping_data.get("phone", "")}', ln=True)
            pdf.ln(10)

            # --- Items Table ---
            # Colors, line width and bold font
            pdf.set_fill_color(200, 220, 255)
            pdf.set_draw_color(50, 50, 100)
            pdf.set_line_width(0.3)
            pdf.set_font('helvetica', 'B', 9)

            # Header
            col_widths = [10, 80, 20, 30, 25, 25]
            headers = ['#', 'Item Description', 'Qty', 'Unit Price', 'Total', 'Tax Inc.']
            for i in range(len(headers)):
                pdf.cell(col_widths[i], 7, headers[i], border=1, align='C', fill=True)
            pdf.ln()

            # Color and font restoration
            pdf.set_fill_color(224, 235, 255)
            pdf.set_text_color(0)
            pdf.set_font('helvetica', '', 9)

            fill = False
            for idx, item in enumerate(order.items, 1):
                pdf.cell(col_widths[0], 6, str(idx), border='LR', align='C', fill=fill)
                
                # Truncate long names
                name = item.product_name
                if len(name) > 40:
                    name = name[:37] + '...'
                    
                pdf.cell(col_widths[1], 6, name, border='LR', align='L', fill=fill)
                pdf.cell(col_widths[2], 6, str(item.quantity), border='LR', align='C', fill=fill)
                pdf.cell(col_widths[3], 6, f"Rs. {item.unit_price:.2f}", border='LR', align='R', fill=fill)
                pdf.cell(col_widths[4], 6, f"Rs. {item.total_price:.2f}", border='LR', align='R', fill=fill)
                # We assume prices are GST inclusive based on existing logic. Just a generic indicator here.
                pdf.cell(col_widths[5], 6, "Yes", border='LR', align='C', fill=fill)
                pdf.ln()
                fill = not fill

            # Closing line
            pdf.cell(sum(col_widths), 0, '', border='T', ln=True)
            pdf.ln(5)

            # --- Totals ---
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(140, 6, 'Subtotal:', align='R')
            pdf.cell(50, 6, f"Rs. {order.subtotal:.2f}", align='R', ln=True)
            
            if order.shipping_amount > 0:
                pdf.cell(140, 6, 'Shipping:', align='R')
                pdf.cell(50, 6, f"Rs. {order.shipping_amount:.2f}", align='R', ln=True)
                
            if order.discount_amount > 0:
                pdf.cell(140, 6, 'Discount:', align='R')
                pdf.cell(50, 6, f"- Rs. {order.discount_amount:.2f}", align='R', ln=True)

            pdf.cell(140, 6, 'Tax (Included):', align='R')
            pdf.cell(50, 6, f"Rs. {order.tax_amount:.2f}", align='R', ln=True)

            pdf.set_font('helvetica', 'B', 12)
            pdf.cell(140, 8, 'Grand Total:', align='R')
            pdf.cell(50, 8, f"Rs. {order.total_amount:.2f}", align='R', ln=True)

            pdf.ln(10)
            pdf.set_font('helvetica', 'I', 9)
            pdf.cell(0, 6, 'Thank you for your business!', align='C')

            # Get PDF bytes
            pdf_bytes = bytes(pdf.output())
            
            # Upload to Supabase
            file_name = f"invoice_{order.order_number}.pdf"
            public_url = await storage_service.upload_invoice(pdf_bytes, file_name)
            
            if public_url:
                order.invoice_url = public_url
                session.add(order)
                await session.commit()
                print(f"Invoice generated successfully for Order {order.order_number}")
                return public_url
            else:
                print(f"Failed to upload invoice for Order {order.order_number}")
                return None
                
        except Exception as e:
            print(f"Exception generating invoice for {order_id}: {e}")
            import traceback
            traceback.print_exc()
            return None
