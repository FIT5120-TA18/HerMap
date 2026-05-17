from flask import Blueprint, jsonify
from models import ABSHouseholdSpending

household_spending_api = Blueprint(
    "household_spending_api",
    __name__,
    url_prefix="/api",
)

@household_spending_api.route("/household-spending/latest", methods=["GET"])
def get_latest_household_spending():
    latest_row = (
        ABSHouseholdSpending.query
        .order_by(ABSHouseholdSpending.month.desc())
        .first()
    )

    if not latest_row:
        return jsonify({
            "error": "No household spending data found"
        }), 404

    items = latest_row.to_spending_items()

    # Remove empty/null values safely
    items = [
        item for item in items
        if item["value"] is not None
    ]

    total = sum(item["value"] for item in items)

    for item in items:
        item["percentage"] = round((item["value"] / total) * 100, 1) if total else 0

    return jsonify({
        "month": latest_row.month.strftime("%B %Y") if latest_row.month else None,
        "source": "ABS household spending benchmark",
        "source_url": "https://www.abs.gov.au/statistics/economy/finance/monthly-household-spending-indicator",
        "items": items,
        "totals": {
            "essential": round(
                sum(item["value"] for item in items if item["type"] == "essential"),
                2,
            ),
            "non_essential": round(
                sum(item["value"] for item in items if item["type"] == "non_essential"),
                2,
            ),
            "all": round(total, 2),
        },
    })