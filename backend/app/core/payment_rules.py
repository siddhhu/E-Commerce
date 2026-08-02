"""Payment eligibility rules — COD limited to select PIN codes."""

COD_ALLOWED_PIN_CODES = frozenset({
    "846001",
    "846002",
    "846003",
    "846004",
    "846005",
    "846008",
    "846009",
    "847101",
    "847103",
    "847104",
    "847105",
    "847121",
    "847201",
    "847239",
    "848213",
})

COD_RESTRICTED_MESSAGE = (
    "Cash on delivery is available only for select PIN codes. "
    "Please use online payment for other delivery areas."
)


def normalize_pin_code(postal_code: str) -> str:
    """Extract the first 6 digits from a postal code string."""
    digits = "".join(ch for ch in postal_code if ch.isdigit())
    return digits[:6]


def is_cod_allowed(postal_code: str, state: str = "") -> bool:
    """Return True when COD is available for the delivery PIN code."""
    _ = state  # kept for call-site compatibility
    pin = normalize_pin_code(postal_code)
    return len(pin) == 6 and pin in COD_ALLOWED_PIN_CODES


def is_cod_allowed_for_state(state: str) -> bool:
    """Deprecated: use is_cod_allowed with postal_code. Always False without PIN."""
    _ = state
    return False
