"""KYC document type validation helpers."""

import re
from datetime import datetime
from typing import Optional

from app.models.user import User

GST_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
PAN_REGEX = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$")
AADHAAR_REGEX = re.compile(r"^[0-9]{12}$")
VOTER_ID_REGEX = re.compile(r"^[A-Z0-9]{10,20}$")
UDYAM_REGEX = re.compile(r"^UDYAM-[A-Z]{2}-\d{2}-\d{7}$")
MIN_LICENSE_LEN = 5

KYC_DOCUMENT_TYPES = frozenset({
    "gst",
    "pan",
    "aadhaar",
    "voter_id",
    "shop_license",
    "msme",
    "shop_establishment",
    "udyog_aadhar",
})

DOC_TYPE_LABELS = {
    "gst": "GST Certificate",
    "pan": "PAN Card",
    "aadhaar": "Aadhaar Card",
    "voter_id": "Voter ID",
    "shop_license": "Shop License",
    "msme": "MSME Certificate",
    "shop_establishment": "Shop & Establishment License",
    "udyog_aadhar": "UDyog Aadhar (Udyam)",
}


def normalize_document_number(document_type: str, value: str) -> str:
    normalized = value.strip().upper().replace(" ", "")
    if document_type == "aadhaar":
        return normalized.replace("-", "")
    return normalized


def validate_kyc_document_number(document_type: str, value: str) -> bool:
    normalized = normalize_document_number(document_type, value)
    if document_type == "gst":
        return bool(GST_REGEX.match(normalized))
    if document_type == "pan":
        return bool(PAN_REGEX.match(normalized))
    if document_type == "aadhaar":
        return bool(AADHAAR_REGEX.match(normalized))
    if document_type == "voter_id":
        return bool(VOTER_ID_REGEX.match(normalized))
    if document_type in ("msme", "udyog_aadhar"):
        return bool(UDYAM_REGEX.match(normalized)) or len(normalized) >= MIN_LICENSE_LEN
    if document_type in ("shop_license", "shop_establishment"):
        return len(normalized) >= MIN_LICENSE_LEN
    return False


def document_number_field(document_type: str) -> Optional[str]:
    mapping = {
        "gst": "gst_number",
        "pan": "pan",
        "aadhaar": "aadhaar",
        "voter_id": "voter_id",
        "shop_license": "shop_license",
        "msme": "msme_number",
        "shop_establishment": "shop_establishment_license",
        "udyog_aadhar": "udyog_aadhar",
    }
    return mapping.get(document_type)


def is_kyc_complete(user: User) -> bool:
    return bool(user.kyc_verified_at and user.kyc_document_url and user.kyc_document_type)


def apply_kyc_to_user(user: User, document_type: str, document_number: str, document_url: str) -> None:
    field_name = document_number_field(document_type)
    if not field_name:
        raise ValueError(f"Unsupported document type: {document_type}")

    setattr(user, field_name, normalize_document_number(document_type, document_number))
    user.kyc_document_type = document_type
    user.kyc_document_url = document_url
    user.kyc_verified_at = datetime.utcnow()
