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
from app.config import settings
from app.services.storage_service import storage_service

TWOPLACES = Decimal("0.01")
STATE_GST_CODES = {
    "JAMMU AND KASHMIR": "01",
    "HIMACHAL PRADESH": "02",
    "PUNJAB": "03",
    "CHANDIGARH": "04",
    "UTTARAKHAND": "05",
    "HARYANA": "06",
    "DELHI": "07",
    "RAJASTHAN": "08",
    "UTTAR PRADESH": "09",
    "BIHAR": "10",
    "SIKKIM": "11",
    "ARUNACHAL PRADESH": "12",
    "NAGALAND": "13",
    "MANIPUR": "14",
    "MIZORAM": "15",
    "TRIPURA": "16",
    "MEGHALAYA": "17",
    "ASSAM": "18",
    "WEST BENGAL": "19",
    "JHARKHAND": "20",
    "ODISHA": "21",
    "CHHATTISGARH": "22",
    "MADHYA PRADESH": "23",
    "GUJARAT": "24",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26",
    "MAHARASHTRA": "27",
    "ANDHRA PRADESH": "37",
    "KARNATAKA": "29",
    "GOA": "30",
    "LAKSHADWEEP": "31",
    "KERALA": "32",
    "TAMIL NADU": "33",
    "PUDUCHERRY": "34",
    "ANDAMAN AND NICOBAR ISLANDS": "35",
    "TELANGANA": "36",
    "LADAKH": "38",
}


def money(value: Decimal) -> str:
    return f"Rs. {value.quantize(TWOPLACES):.2f}"


def gst_state_code(gst_number: str | None, state: str | None = None) -> str | None:
    if gst_number and len(gst_number) >= 2 and gst_number[:2].isdigit():
        return gst_number[:2]
    if state:
        return STATE_GST_CODES.get(state.strip().upper())
    return None


class InvoicePDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 18)
        self.cell(0, 8, settings.invoice_company_name, align='C', ln=True)
        self.set_font('helvetica', '', 9)
        if settings.invoice_company_gst:
            self.cell(0, 5, f'GSTIN: {settings.invoice_company_gst}', align='C', ln=True)
        if settings.invoice_company_address:
            self.cell(0, 5, settings.invoice_company_address, align='C', ln=True)
        self.ln(4)

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
            order_query = (
                select(Order)
                .options(selectinload(Order.items), selectinload(Order.user))
                .where(Order.id == order_id)
            )
            result = await session.execute(order_query)
            order = result.scalar_one_or_none()
            
            if not order:
                print(f"InvoiceService: Order {order_id} not found.")
                return None

            if order.invoice_url:
                print(f"InvoiceService: Order {order_id} already has an invoice.")
                return order.invoice_url

            # Fetch products to get seller info
            from app.models.product import Product
            product_ids = [item.product_id for item in order.items if item.product_id]
            products = {}
            if product_ids:
                prod_result = await session.execute(select(Product).where(Product.id.in_(product_ids)))
                products = {p.id: p for p in prod_result.scalars().all()}

            seller_ids = {p.seller_id for p in products.values() if p.seller_id}
            seller_users: dict[uuid.UUID, User] = {}
            if seller_ids:
                seller_result = await session.execute(select(User).where(User.id.in_(seller_ids)))
                seller_users = {seller.id: seller for seller in seller_result.scalars().all()}

            # Group items by seller
            seller_groups = {}
            for item in order.items:
                prod = products.get(item.product_id)
                seller = seller_users.get(prod.seller_id) if prod and prod.seller_id else None

                if seller:
                    seller_name = seller.business_name or seller.full_name or prod.seller_name or settings.invoice_company_name
                    seller_gst = seller.gst_number or ""
                    seller_address = "Registered seller on Pranjay"
                else:
                    seller_name = prod.seller_name if prod and prod.seller_name else settings.invoice_company_name
                    seller_gst = settings.invoice_company_gst or ""
                    seller_address = settings.invoice_company_address
                
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
                if seller_gst:
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
                buyer = order.user
                cust_name = buyer.business_name or shipping_data.get('full_name', 'Customer')
                pdf.cell(0, 6, cust_name, ln=True)
                if buyer and buyer.gst_number:
                    pdf.cell(0, 6, f'Buyer GSTIN: {buyer.gst_number}', ln=True)
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

                col_widths = [8, 52, 12, 30, 22, 22, 22, 22]
                headers = ['#', 'Item', 'Qty', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Invoice Amt']
                for i in range(len(headers)):
                    pdf.cell(col_widths[i], 7, headers[i], border=1, align='C', fill=True)
                pdf.ln()

                pdf.set_fill_color(224, 235, 255)
                pdf.set_text_color(0)
                pdf.set_font('helvetica', '', 9)

                fill = False
                seller_gross_total = Decimal("0")
                seller_discount = Decimal("0")
                seller_taxable = Decimal("0")
                seller_cgst = Decimal("0")
                seller_sgst = Decimal("0")
                seller_igst = Decimal("0")
                order_subtotal = Decimal(str(order.subtotal or 0))
                order_discount = Decimal(str(order.discount_amount or 0))
                buyer_state_code = gst_state_code(
                    buyer.gst_number if buyer else None,
                    shipping_data.get('state'),
                )
                seller_state_code = gst_state_code(seller_gst, None) or gst_state_code(settings.invoice_company_gst, None)
                is_interstate = bool(seller_state_code and buyer_state_code and seller_state_code != buyer_state_code)
                
                for idx, item in enumerate(items, 1):
                    pdf.cell(col_widths[0], 6, str(idx), border='LR', align='C', fill=fill)
                    
                    name = item.product_name
                    if len(name) > 32:
                        name = name[:29] + '...'
                        
                    pdf.cell(col_widths[1], 6, name, border='LR', align='L', fill=fill)
                    pdf.cell(col_widths[2], 6, str(item.quantity), border='LR', align='C', fill=fill)
                    prod = products.get(item.product_id)
                    gst_rate = Decimal(str(getattr(prod, 'gst_percentage', 18))) if prod else Decimal("18")
                    gross_line_total = Decimal(str(item.total_price))
                    line_discount = (
                        (order_discount * gross_line_total / order_subtotal)
                        if order_subtotal > 0 and order_discount > 0
                        else Decimal("0")
                    )
                    paid_line_total = max(Decimal("0"), gross_line_total - line_discount)
                    taxable_value = paid_line_total / (Decimal("1") + gst_rate / Decimal("100"))
                    gst_amount = paid_line_total - taxable_value
                    if is_interstate:
                        cgst_amount = Decimal("0")
                        sgst_amount = Decimal("0")
                        igst_amount = gst_amount
                    else:
                        cgst_amount = gst_amount / Decimal("2")
                        sgst_amount = gst_amount / Decimal("2")
                        igst_amount = Decimal("0")

                    pdf.cell(col_widths[3], 6, money(taxable_value), border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[4], 6, money(cgst_amount), border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[5], 6, money(sgst_amount), border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[6], 6, money(igst_amount), border='LR', align='R', fill=fill)
                    pdf.cell(col_widths[7], 6, money(paid_line_total), border='LR', align='R', fill=fill)
                    pdf.ln()
                    fill = not fill
                    seller_gross_total += gross_line_total
                    seller_discount += line_discount
                    seller_taxable += taxable_value
                    seller_cgst += cgst_amount
                    seller_sgst += sgst_amount
                    seller_igst += igst_amount

                pdf.cell(sum(col_widths), 0, '', border='T', ln=True)
                pdf.ln(5)

                # --- Totals ---
                pdf.set_font('helvetica', 'B', 10)
                invoice_amount = seller_taxable + seller_cgst + seller_sgst + seller_igst

                pdf.cell(140, 6, 'Item Total (GST Inclusive):', align='R')
                pdf.cell(50, 6, money(seller_gross_total), align='R', ln=True)

                if seller_discount > 0:
                    pdf.cell(140, 6, f'Discount ({order.promo_code or "Promo"}):', align='R')
                    pdf.cell(50, 6, f"-{money(seller_discount)}", align='R', ln=True)

                pdf.cell(140, 6, 'Taxable Value:', align='R')
                pdf.cell(50, 6, money(seller_taxable), align='R', ln=True)

                pdf.cell(140, 6, 'CGST:', align='R')
                pdf.cell(50, 6, money(seller_cgst), align='R', ln=True)

                pdf.cell(140, 6, 'SGST:', align='R')
                pdf.cell(50, 6, money(seller_sgst), align='R', ln=True)

                pdf.cell(140, 6, 'IGST:', align='R')
                pdf.cell(50, 6, money(seller_igst), align='R', ln=True)

                pdf.set_font('helvetica', 'B', 12)
                pdf.cell(140, 8, 'Invoice Amount:', align='R')
                pdf.cell(50, 8, money(invoice_amount), align='R', ln=True)

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
