# Importing Dependencies
from flask import Blueprint, jsonify
from models import IndustryBasedAverageEarnings

# API Identifier for Data Retrieval
industries_api = Blueprint("industries_api", __name__, url_prefix="/api")

# API for getting Industries list (Profile Builder Form)
@industries_api.route("/industries", methods=["GET"])
def get_industries():
    """Return all distinct industry names for the profile form dropdown."""

    rows = (
        IndustryBasedAverageEarnings.query
        .with_entities(IndustryBasedAverageEarnings.industry)
        .filter(
            IndustryBasedAverageEarnings.industry.isnot(None),
            IndustryBasedAverageEarnings.industry != ""
        )
        .distinct()
        .order_by(IndustryBasedAverageEarnings.industry)
        .all()
    )

    industries = [row.industry for row in rows]

    return jsonify(industries)

# API for getting Industries table (Dashboard Chart on load)
@industries_api.route("/industry-chart", methods=["GET"])
def get_industry_chart():
    """Return top 5 industries by 2022-23 average earnings for dashboard chart."""

    rows = (
        IndustryBasedAverageEarnings.query
        .with_entities(
            IndustryBasedAverageEarnings.industry,
            IndustryBasedAverageEarnings.year_2021_22,
            IndustryBasedAverageEarnings.year_2022_23
        )
        .filter(
            IndustryBasedAverageEarnings.industry.isnot(None),
            IndustryBasedAverageEarnings.industry != "",
            IndustryBasedAverageEarnings.year_2021_22.isnot(None),
            IndustryBasedAverageEarnings.year_2022_23.isnot(None)
        )
        .order_by(IndustryBasedAverageEarnings.year_2022_23.desc())
        .limit(5)
        .all()
    )

    chart_data = [
        {
            "industry": row.industry,
            "year_2021_22": float(row.year_2021_22),
            "year_2022_23": float(row.year_2022_23)
        }
        for row in rows
    ]

    return jsonify(chart_data)