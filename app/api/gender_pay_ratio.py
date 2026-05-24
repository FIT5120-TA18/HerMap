# Import necessary dependencies
from flask import Blueprint, jsonify
from models import GenderPayGapIndustrySummary

# Identifier for the API
gender_api = Blueprint("gender_pay_gap_api", __name__, url_prefix="/api")

@gender_api.route("/gender-pay-gap-industries", methods=["GET"])
def get_gender_pay_gap_industries():
    rows = (
        GenderPayGapIndustrySummary.query
        .order_by(GenderPayGapIndustrySummary.estimated_women_weekly_income.desc())
        .all()
    )

    return jsonify([row.to_dict() for row in rows])