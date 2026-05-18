# Importing dependencies
import os
from functools import wraps
from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify
from google import genai

main = Blueprint("main", __name__)

# Access Required for all the pages
def access_required(route_function):
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if not session.get("access_granted"):
            return redirect(url_for("main.login"))
        return route_function(*args, **kwargs)
    return wrapper

# Manage Login
@main.route("/login", methods=["GET", "POST"])
def login():
    if session.get("access_granted"):
        return redirect(url_for("main.landing"))

    if request.method == "POST":
        password = request.form.get("password", "").strip()
        correct_password = os.getenv("SITE_PASSWORD")

        if password == correct_password:
            session["access_granted"] = True
            return redirect(url_for("main.landing"))

        return render_template("login.html", error="Incorrect password")

    return render_template("login.html", error="")

# Landing Page
@main.route("/")
@access_required
def landing():
    return render_template("landing_page.html")

# Step 1 profile page
@main.route("/profile_builder", methods=["GET", "POST"])
@access_required
def quick_profile():

    # Add the form data to the session storage
    if request.method == "POST":
        data = request.form.to_dict()
        session["profile"] = data

        # LOCAL DEBUG
        # print("FORM DATA:", data)
        # print("SESSION DATA:", dict(session))
        # print(session)
        # print(session.get("profile"))
    
        # Move to next page
        return redirect(url_for("main.dashboard"))

    # Check for existing data in the session storage and add it
    profile_data = session.get("profile", {})
    return render_template("profile_build_1.html", profile_data=profile_data)

# Google Gemini API
def generate_financial_fact(profile_data):
    api_key = os.getenv("GEMINI_API_KEY")

    # In case the API is down or Fails
    if not api_key:
        age = profile_data.get("age", "not provided")
        return f"At {age}, your weekly choices matter more than you think. Even small savings or budgeting habits can significantly improve your financial flexibility over time."

    # Dynamic Prompt for the API. Gets data from the Session (User Enterred Data)
    prompt = f"""
    You are writing for a young Australian woman aged 18-22 using a financial literacy web app.

    User details:
    Age: {profile_data.get("age", "not provided")}
    State: {profile_data.get("state", "not provided")}
    Work status: {profile_data.get("work", "not provided")}
    Weekly income: {profile_data.get("income", "not provided")}
    Living arrangement: {profile_data.get("living", "not provided")}
    Study status: {profile_data.get("study", "not provided")}

    Write a personalised 2-3 line financial literacy insight.
    Make it warm, practical, and easy to understand.
    Do not use markdown.
    Do not mention AI.
    """

    # Gemini Configuration
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text.strip()

    # Fallback in case of error
    except Exception as error:
        age = profile_data.get("age", "not provided")
        return f"At {age}, your weekly choices matter more than you think. Even small savings or budgeting habits can significantly improve your financial flexibility over time."

# Route to Dashboard
@main.route("/dashboard")
@access_required
def dashboard():
    profile_data = session.get("profile", {})

    if not profile_data:
        return redirect(url_for("main.quick_profile"))

    financial_fact = generate_financial_fact(profile_data)

    return render_template(
        "dashboard.html",
        profile_data=profile_data,
        financial_fact=financial_fact
    )

# Route to the Rent Comparison Map
@main.route("/rent_comparison")
@access_required
def rent_comparison():
    profile_data = session.get("profile", {})

    if not profile_data:
        return redirect(url_for("main.quick_profile"))

    return render_template("rent_comparison.html", profile_data=profile_data)

# Route to the Income Comparison Map
@main.route("/income_comparison")
@access_required
def income_comparison():
    profile_data = session.get("profile", {})

    if not profile_data:
        return redirect(url_for("main.quick_profile"))

    return render_template("income_comparison.html", profile_data=profile_data)

@main.route("/forecast")
@access_required
def forecast():
    profile_data = session.get("profile", {})

    if not profile_data:
        return redirect(url_for("main.quick_profile"))

    return render_template("forecast.html", profile_data=profile_data)

@main.route("/spending_tracker")
@access_required
def spending_tracker():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("spending_tracker.html", profile_data=profile_data)


@main.route("/spending_results")
@access_required
def spending_results():
    spending_data = session.get("spending_data", {})

    spending_insight = ""

    if spending_data:
        spending_insight = generate_spending_insight(spending_data)

    return render_template(
        "spending_results.html",
        spending_data=spending_data,
        spending_insight=spending_insight,
    )

@main.route("/api/save-spending-session", methods=["POST"])
@access_required
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
        "message": "Spending data saved",
    })

def generate_spending_insight(spending_data):
    api_key = os.getenv("GEMINI_API_KEY")

    income = spending_data.get("income", 0)
    rent = spending_data.get("rent", 0)
    essential = spending_data.get("essential", 0)
    nonessential = spending_data.get("nonessential", 0)
    total = spending_data.get("total", 0)
    surplus = spending_data.get("surplus", 0)
    living = spending_data.get("living", "not provided")
    locality = spending_data.get("locality", "not provided")
    items = spending_data.get("items", [])

    item_lines = []
    for item in items:
        item_lines.append(
            f"- {item.get('name', 'Unknown expense')}: "
            f"${item.get('value', 0)} per week "
            f"({item.get('type', 'unknown')})"
        )

    item_text = "\n".join(item_lines) if item_lines else "No itemised expenses provided."

    if not api_key:
        if surplus < 0:
            return "Your weekly spending is currently higher than your income. A helpful first step is to review your largest flexible costs and reduce one category slightly this week."
        if surplus == 0:
            return "Your weekly income is fully used by your current spending. This means there may be little room for emergencies, so building even a small weekly buffer could help."
        return "You currently have some money left over each week. A small regular saving habit could help you build more independence and confidence over time."

    prompt = f"""
    You are writing for a young Australian woman aged 18-22 using a financial literacy web app.

    User spending details:
    Weekly income: ${income}
    Weekly rent: ${rent}
    Essential expenses: ${essential}
    Non-essential expenses: ${nonessential}
    Total weekly spending: ${total}
    Weekly surplus or deficit: ${surplus}
    Living arrangement: {living}
    Locality: {locality}

    Expense breakdown:
    {item_text}

    Write a personalised financial insight in 4-6 short sentences.

    Requirements:
    - Use a warm, supportive, non-judgmental tone.
    - Explain what her weekly position means.
    - Mention whether her spending pattern looks manageable, tight, or risky.
    - Suggest one realistic next step.
    - Do not use markdown.
    - Do not mention AI.
    - Do not give formal financial advice.
    """

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return response.text.strip()

    except Exception:
        if surplus < 0:
            return "Your weekly spending is currently higher than your income. A helpful first step is to review your largest flexible costs and reduce one category slightly this week."
        if surplus == 0:
            return "Your weekly income is fully used by your current spending. This means there may be little room for emergencies, so building even a small weekly buffer could help."
        return "You currently have some money left over each week. A small regular saving habit could help you build more independence and confidence over time."

# ─── Iteration 3 Routes ────────────────────────────────────────────────────────

# Epic 5 – Spending Input
@main.route("/spending")
@access_required
def spending_input():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("spending_tracker.html", profile_data=profile_data)

# Epic 5 – Spending Results
@main.route("/spending/result")
@access_required
def spending_result():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("spending_results.html", profile_data=profile_data)

# Epic 6 – Debt Awareness
@main.route("/debt_awareness")
@access_required
def debt_awareness():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("debt_awareness.html", profile_data=profile_data)

# Epic 6 – Debt Projection
@main.route("/debt_projection")
@access_required
def debt_projection():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("debt_projection.html", profile_data=profile_data)

# Epic 7 – Career Aspirations
@main.route("/career_aspirations")
@access_required
def career_aspirations():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("career_aspirations.html", profile_data=profile_data)

# Epic 8 – Knowledge Hub
@main.route("/knowledge_hub")
@access_required
def knowledge_hub():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("knowledge_hub.html", profile_data=profile_data)

@main.route("/tax_payslip_module")
@access_required
def tax_payslip():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("tax_payslip_module.html", profile_data=profile_data)

@main.route("/superannuation_explaination")
@access_required
def super_explained():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("superannuation_explaination.html", profile_data=profile_data)

@main.route("/smart_budgeting")
@access_required
def smart_budget():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("smart_budgeting.html", profile_data=profile_data)

@main.route("/tenancy_guide")
@access_required
def tenancy_guide():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("tenancy_guide.html", profile_data=profile_data)

@main.route("/safe_employment")
@access_required
def safe_employment():
    profile_data = session.get("profile", {})
    if not profile_data:
        return redirect(url_for("main.quick_profile"))
    return render_template("safe_employment.html", profile_data=profile_data)

@main.route("/credit_bnpl")
@access_required
def credit_bnpl():
    return render_template("credit_bnpl.html")
