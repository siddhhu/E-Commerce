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

            # Default Pranjay details
            DEFAULT_COMPANY_NAME = "Mahaganpati PVT LTD"
            DEFAULT_COMPANY_GST = "09AAECM0123C1Z5" # Generic Placeholder, user mentioned it's in code
            DEFAULT_COMPANY_ADDRESS = "123 Commerce St, Startup Hub, India"

            # Fetch products to get seller info
            from app.models.product import Product
            product_ids = [item.product_id for item in order.items if item.product_id]
            products = {}
            if product_ids:
                prod_result = await session.execute(select(Product).where(Product.id.in_(product_ids)))
                products = {p.id: p for p in prod_result.scalars().all()}

            # Group items by seller
            seller_groups = {}
            for item in order.items:
                prod = products.get(item.product_id)
                seller_name = prod.seller_name if prod and prod.seller_name else DEFAULT_COMPANY_NAME
                
                # We could also fetch seller GST if we linked to User table, 
                # but for now we'll use the default Pranjay GST for Pranjay, or a generic one for others.
                seller_gst = DEFAULT_COMPANY_GST if seller_name == DEFAULT_COMPANY_NAME else "SELLER-GST-PENDING"
                seller_address = DEFAULT_COMPANY_ADDRESS if seller_name == DEFAULT_COMPANY_NAME else "Seller Address"
                
                key = (seller_name, seller_gst, seller_address)
                if key not in seller_groups:
                    seller_groups[key] = []
                seller_groups[key].append(item)

            pdf = InvoicePDF()
            pdf.alias_nb_pages()

            # Generate a separate page/invoice for each seller
            for (seller_name, seller_gst, seller_address), items in seller_groups.items():
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
                pdf.set_fill_color(200, 220, 255)
                pdf.set_draw_color(50, 50, 100)
                pdf.set_line_width(0.3)
                pdf.set_font('helvetica', 'B', 9)

                col_widths = [10, 80, 20, 30, 25, 25]
                headers = ['#', 'Item Description', 'Qty', 'Unit Price', 'Total', 'Tax Inc.']
                for i in range(len(headers)):
                    pdf.cell(col_widths[i], 7, headers[i], border=1, align='C', fill=True)
                pdf.ln()

                pdf.set_fill_color(224, 235, 255)
                pdf.set_text_color(0)
                pdf.set_font('helvetica', '', 9)

                fill = False
                seller_subtotal = Decimal("0")
                seller_tax = Decimal("0") # Approximate, assuming 18% generic if we don't have exact
                
                for idx, item in enumerate(items, 1):
                    pdf.cell(col_widths[0], 6, str(idx), border='LR', align='C', fill=fill)
                    
                    name = item.product_name
                    if len(name) > 40:
                        name = name[:37] + '...'
                        
                    pdf.cell(col_widths[1], 6, name, border='LR', align='L', fill=fill)
                    pdf.cell(col_widths[2], 6, str(item.quantity), border='LR', align='C', fill=fill)
                    pdf.cell(col_widths[3], 6, f"Rs. {item.unit_price:.2f}", border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[4], 6, f"Rs. {item.total_price:.2f}", border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[5], 6, "Yes", border='LR', align='C', fill=fill)
                    pdf.ln()
                    fill = not fill
                    seller_subtotal += item.total_price
                    
                    # Approximating tax for the seller's portion based on the order's global tax ratio
                    # Since total_price is tax inclusive, base = total / 1.18, tax = total - base
                    prod = products.get(item.product_id)
                    gst_rate = Decimal(str(getattr(prod, 'gst_percentage', 18))) if prod else Decimal("18")
                    base_price = item.total_price / (Decimal("1") + gst_rate / Decimal("100"))
                    seller_tax += (item.total_price - base_price)

                pdf.cell(sum(col_widths), 0, '', border='T', ln=True)
                pdf.ln(5)

                # --- Totals ---
                pdf.set_font('helvetica', 'B', 10)
                pdf.cell(140, 6, 'Subtotal:', align='R')
                pdf.cell(50, 6, f"Rs. {seller_subtotal:.2f}", align='R', ln=True)

                pdf.cell(140, 6, 'Tax (Included):', align='R')
                pdf.cell(50, 6, f"Rs. {seller_tax:.2f}", align='R', ln=True)

                pdf.set_font('helvetica', 'B', 12)
                pdf.cell(140, 8, 'Grand Total:', align='R')
                pdf.cell(50, 8, f"Rs. {seller_subtotal:.2f}", align='R', ln=True)

                pdf.ln(10)
                pdf.set_font('helvetica', 'I', 9)
                pdf.cell(0, 6, f'Thank you for shopping with {seller_name}!', align='C')

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
