from flask import Blueprint, request, jsonify, session

spending_session_api = Blueprint(
    "spending_session_api",
    __name__,
    url_prefix="/api",
)

@spending_session_api.route("/save-spending-session", methods=["POST"])
def save_spending_session():
    data = request.get_json(silent=True) or {}

    spending_data = {
        "income": float(data.get("income") or 0),
        "rent": float(data.get("rent") or 0),
        "essential": float(data.get("essential") or 0),
        "nonessential": float(data.get("nonessential") or 0),
        "total": float(data.get("total") or 0),
        "surplus": float(data.get("surplus") or 0),
        "living": data.get("living", ""),
        "locality": data.get("locality", ""),
        "items": data.get("items", []),
        "savedAt": data.get("savedAt"),
    }

    session["spending_data"] = spending_data
    session.modified = True

    return jsonify({
        "status": "success",
        "message": "Spending data saved to Flask session",
        "spending_data": spending_data,
    })