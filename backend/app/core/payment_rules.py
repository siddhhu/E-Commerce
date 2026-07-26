"""Payment eligibility rules by delivery state."""

COD_ALLOWED_STATES = {"bihar"}

COD_RESTRICTED_MESSAGE = (
    "We are not accepting COD orders outside Bihar. "
    "We are expanding and will enable this soon."
)


def is_cod_allowed_for_state(state: str) -> bool:
    """Return True when COD is available for the given delivery state."""
    return state.strip().lower() in COD_ALLOWED_STATES
