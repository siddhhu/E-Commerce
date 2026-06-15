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


def short_text(value: str | None, max_len: int) -> str:
    text = (value or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def gst_state_code(gst_number: str | None, state: str | None = None) -> str | None:
    if gst_number and len(gst_number) >= 2 and gst_number[:2].isdigit():
        return gst_number[:2]
    if state:
        return STATE_GST_CODES.get(state.strip().upper())
    return None


class InvoicePDF(FPDF):
    def header(self):
        self.set_fill_color(17, 24, 39)
        self.rect(10, 8, 190, 20, 'F')
        self.set_text_color(255, 255, 255)
        self.set_xy(14, 11)
        self.set_font('helvetica', 'B', 15)
        self.cell(90, 7, settings.invoice_company_name)
        self.set_font('helvetica', 'B', 14)
        self.cell(92, 7, 'TAX INVOICE', align='R', ln=True)

        self.set_x(14)
        self.set_font('helvetica', '', 9)
        if settings.invoice_company_gst:
            self.cell(90, 5, f'GSTIN: {settings.invoice_company_gst}')
        self.cell(92, 5, 'Original for Recipient', align='R', ln=True)
        self.set_text_color(0, 0, 0)
        self.ln(8)

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
            for group_index, ((seller_name, seller_gst, seller_address), items) in enumerate(seller_groups.items()):
                pdf.add_page()

                shipping_data = order.shipping_address_data or {}
                buyer = order.user
                cust_name = buyer.business_name or shipping_data.get('full_name', 'Customer')
                city = shipping_data.get('city', '')
                state = shipping_data.get('state', '')
                pincode = shipping_data.get('postal_code', '')

                # --- Seller and invoice summary cards ---
                card_y = pdf.get_y()
                pdf.set_draw_color(226, 232, 240)
                pdf.set_fill_color(248, 250, 252)
                pdf.rect(10, card_y, 92, 38, 'DF')
                pdf.rect(108, card_y, 92, 38, 'DF')

                pdf.set_xy(14, card_y + 4)
                pdf.set_font('helvetica', 'B', 9)
                pdf.set_text_color(71, 85, 105)
                pdf.cell(84, 5, 'SOLD BY', ln=True)
                pdf.set_x(14)
                pdf.set_font('helvetica', 'B', 11)
                pdf.set_text_color(15, 23, 42)
                pdf.cell(84, 6, short_text(seller_name, 36), ln=True)
                pdf.set_x(14)
                pdf.set_font('helvetica', '', 9)
                if seller_gst:
                    pdf.cell(84, 5, f'GSTIN: {seller_gst}', ln=True)
                    pdf.set_x(14)
                if seller_address:
                    pdf.cell(84, 5, short_text(seller_address, 45), ln=True)

                pdf.set_xy(112, card_y + 4)
                pdf.set_font('helvetica', 'B', 9)
                pdf.set_text_color(71, 85, 105)
                pdf.cell(84, 5, 'INVOICE DETAILS', ln=True)
                pdf.set_text_color(15, 23, 42)
                pdf.set_font('helvetica', '', 9)
                invoice_rows = [
                    ('Invoice No.', f'INV-{order.order_number}'),
                    ('Order No.', order.order_number),
                    ('Date', order.created_at.strftime('%d %b %Y, %I:%M %p')),
                    ('Payment', order.payment_method.value.upper() if order.payment_method else 'N/A'),
                ]
                for label, value in invoice_rows:
                    pdf.set_x(112)
                    pdf.set_font('helvetica', 'B', 8)
                    pdf.cell(24, 5, label)
                    pdf.set_font('helvetica', '', 8)
                    pdf.cell(60, 5, short_text(value, 34), ln=True)

                pdf.set_y(card_y + 44)

                # --- Bill / Ship To card ---
                addr_y = pdf.get_y()
                pdf.set_fill_color(255, 255, 255)
                pdf.rect(10, addr_y, 190, 34, 'D')
                pdf.set_xy(14, addr_y + 4)
                pdf.set_font('helvetica', 'B', 9)
                pdf.set_text_color(71, 85, 105)
                pdf.cell(0, 5, 'BILL TO / SHIP TO', ln=True)
                pdf.set_x(14)
                pdf.set_text_color(15, 23, 42)
                pdf.set_font('helvetica', 'B', 10)
                pdf.cell(90, 5, short_text(cust_name, 42))
                pdf.set_font('helvetica', '', 9)
                if buyer and buyer.gst_number:
                    pdf.cell(86, 5, f'Buyer GSTIN: {buyer.gst_number}', align='R', ln=True)
                else:
                    pdf.ln(5)
                pdf.set_x(14)
                address_line = ", ".join(
                    part for part in [
                        shipping_data.get('address_line1', ''),
                        shipping_data.get('address_line2', ''),
                        city,
                        state,
                        pincode,
                    ] if part
                )
                pdf.cell(176, 5, short_text(address_line, 100), ln=True)
                pdf.set_x(14)
                pdf.cell(176, 5, f'Phone: {shipping_data.get("phone", "")}', ln=True)
                pdf.ln(8)

                # --- Items Table ---
                pdf.set_fill_color(31, 41, 55)
                pdf.set_draw_color(203, 213, 225)
                pdf.set_line_width(0.2)
                pdf.set_font('helvetica', 'B', 8)
                pdf.set_text_color(255, 255, 255)

                col_widths = [8, 34, 22, 10, 28, 20, 20, 20, 28]
                headers = ['#', 'Item', 'HSN Code', 'Qty', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Invoice Amt']
                for i in range(len(headers)):
                    pdf.cell(col_widths[i], 7, headers[i], border=1, align='C', fill=True)
                pdf.ln()

                pdf.set_text_color(15, 23, 42)
                pdf.set_font('helvetica', '', 8)

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
                    pdf.set_fill_color(248, 250, 252) if fill else pdf.set_fill_color(255, 255, 255)
                    pdf.cell(col_widths[0], 7, str(idx), border=1, align='C', fill=True)
                    
                    name = item.product_name
                    if len(name) > 22:
                        name = name[:19] + '...'
                        
                    hsn_code = item.product_sku or '-'
                    if len(hsn_code) > 12:
                        hsn_code = hsn_code[:12]

                    pdf.cell(col_widths[1], 7, name, border=1, align='L', fill=True)
                    pdf.cell(col_widths[2], 7, hsn_code, border=1, align='C', fill=True)
                    pdf.cell(col_widths[3], 7, str(item.quantity), border=1, align='C', fill=True)
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

                    pdf.cell(col_widths[4], 7, money(taxable_value), border=1, align='R', fill=True)
                    pdf.cell(col_widths[5], 7, money(cgst_amount), border=1, align='R', fill=True)
                    pdf.cell(col_widths[6], 7, money(sgst_amount), border=1, align='R', fill=True)
                    pdf.cell(col_widths[7], 7, money(igst_amount), border=1, align='R', fill=True)
                    pdf.cell(col_widths[8], 7, money(paid_line_total), border=1, align='R', fill=True)
                    pdf.ln()
                    fill = not fill
                    seller_gross_total += gross_line_total
                    seller_discount += line_discount
                    seller_taxable += taxable_value
                    seller_cgst += cgst_amount
                    seller_sgst += sgst_amount
                    seller_igst += igst_amount

                # --- Totals ---
                delivery_fee = Decimal(str(order.shipping_amount or 0)) if group_index == 0 else Decimal("0")
                invoice_amount = seller_taxable + seller_cgst + seller_sgst + seller_igst + delivery_fee
                pdf.ln(6)

                totals = [
                    ('Item Total (GST Inclusive)', money(seller_gross_total)),
                ]
                if seller_discount > 0:
                    totals.append((f'Discount ({order.promo_code or "Promo"})', f"-{money(seller_discount)}"))
                if delivery_fee > 0:
                    totals.append(('Delivery Fee', money(delivery_fee)))
                totals.extend([
                    ('Taxable Value', money(seller_taxable)),
                    ('CGST', money(seller_cgst)),
                    ('SGST', money(seller_sgst)),
                    ('IGST', money(seller_igst)),
                ])

                totals_x = 112
                pdf.set_x(totals_x)
                pdf.set_font('helvetica', 'B', 9)
                pdf.set_fill_color(248, 250, 252)
                pdf.cell(88, 7, 'PRICE SUMMARY', border=1, fill=True, ln=True)
                pdf.set_font('helvetica', '', 9)
                for label, value in totals:
                    pdf.set_x(totals_x)
                    pdf.cell(52, 6, label, border=1)
                    pdf.cell(36, 6, value, border=1, align='R', ln=True)

                pdf.set_x(totals_x)
                pdf.set_font('helvetica', 'B', 11)
                pdf.set_fill_color(17, 24, 39)
                pdf.set_text_color(255, 255, 255)
                pdf.cell(52, 8, 'Invoice Amount', border=1, fill=True)
                pdf.cell(36, 8, money(invoice_amount), border=1, align='R', fill=True, ln=True)
                pdf.set_text_color(0, 0, 0)

                pdf.ln(10)
                pdf.set_draw_color(226, 232, 240)
                pdf.line(10, pdf.get_y(), 200, pdf.get_y())
                pdf.ln(5)
                pdf.set_font('helvetica', '', 8)
                pdf.multi_cell(
                    112,
                    5,
                    'Declaration: This invoice is generated from the Pranjay marketplace system. '
                    'Prices are GST inclusive unless stated otherwise.',
                )
                signature_y = pdf.get_y() - 10
                pdf.set_xy(145, signature_y)
                pdf.set_font('helvetica', 'B', 9)
                pdf.cell(50, 5, 'For ' + short_text(settings.invoice_company_name, 28), align='C', ln=True)
                pdf.set_x(145)
                pdf.set_font('helvetica', '', 8)
                pdf.cell(50, 14, '', border='B', ln=True)
                pdf.set_x(145)
                pdf.cell(50, 5, 'Authorized Signatory', align='C')

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
