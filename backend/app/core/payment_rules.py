"""Payment eligibility rules by delivery state."""

SUPPORT_PHONE = "+91 78700 53331"
COD_ALLOWED_STATES = {"bihar"}

COD_RESTRICTED_MESSAGE = (
    "Cash on Delivery is limited to Bihar as we are expanding our business. "
    "We will enable COD in more states as soon as possible. "
    f"Please use online payment for orders outside Bihar, or call us at {SUPPORT_PHONE} if you have any doubts."
)


def is_cod_allowed_for_state(state: str) -> bool:
    """Return True when COD is available for the given delivery state."""
    return state.strip().lower() in COD_ALLOWED_STATES
