# Standard library imports
import os
from functools import wraps

# Flask imports
from flask import (
    Blueprint,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)


# Gemini is used only for optional personalised insights.
# Keeping this import safe prevents the whole Flask app from crashing
# if the package is missing in a local development environment.
try:
    from google import genai
except ImportError:
    genai = None


# Main blueprint for page routes and small session-related APIs.
main = Blueprint("main", __name__)


# ---------------------------------------------------------------------------
# Access control helpers
# ---------------------------------------------------------------------------

def access_required(route_function):
    """
    Protect routes that require the user to enter the site password first.

    If the user has not passed the login screen, they are redirected to login.
    This keeps all protected pages behind the same session-based access check.
    """
    @wraps(route_function)
    def wrapper(*args, **kwargs):
        if not session.get("access_granted"):
            return redirect(url_for("main.login"))

        return route_function(*args, **kwargs)

    return wrapper


def get_profile_or_redirect():
    """
    Get profile data from the session.

    Many pages need the user profile before they can display personalised data.
    This helper avoids repeating the same profile-checking logic in every route.

    Returns:
        tuple:
            profile_data: dict or None
            redirect_response: Flask redirect response or None
    """
    profile_data = session.get("profile", {})

    if not profile_data:
        return None, redirect(url_for("main.quick_profile"))

    return profile_data, None


def render_profile_page(template_name, **extra_context):
    """
    Render a page that requires profile data.

    This keeps route functions clean and prevents repeated blocks like:
        profile_data = session.get("profile", {})
        if not profile_data:
            return redirect(...)

    Args:
        template_name: The HTML template to render.
        **extra_context: Any additional values needed by the template.
    """
    profile_data, redirect_response = get_profile_or_redirect()

    if redirect_response:
        return redirect_response

    return render_template(
        template_name,
        profile_data=profile_data,
        **extra_context,
    )


# ---------------------------------------------------------------------------
# Login and landing routes
# ---------------------------------------------------------------------------

@main.route("/login", methods=["GET", "POST"])
def login():
    """
    Display and process the site password login page.

    The actual password should be stored in the SITE_PASSWORD environment
    variable and should never be hardcoded in this file.
    """
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


@main.route("/")
@access_required
def landing():
    """
    Landing page shown after the user has entered the site password.
    """
    return render_template("landing_page.html")


# ---------------------------------------------------------------------------
# Profile builder
# ---------------------------------------------------------------------------

@main.route("/profile_builder", methods=["GET", "POST"])
@access_required
def quick_profile():
    """
    Collect and store the user's profile information in the Flask session.

    This profile data is reused across dashboard pages, calculators,
    comparison tools, and learning modules.
    """
    if request.method == "POST":
        profile_data = request.form.to_dict()

        # Store profile data in the session so other routes can personalise pages.
        session["profile"] = profile_data
        session.modified = True

        return redirect(url_for("main.dashboard"))

    # Pre-fill the form if the user comes back to the profile page.
    profile_data = session.get("profile", {})

    return render_template(
        "profile_build_1.html",
        profile_data=profile_data,
    )


# ---------------------------------------------------------------------------
# Gemini insight helpers
# ---------------------------------------------------------------------------

def generate_financial_fact(profile_data):
    """
    Generate a short personalised financial insight for the dashboard.

    If Gemini is unavailable, the API key is missing, or the API request fails,
    the function returns a safe fallback message instead of breaking the page.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    age = profile_data.get("age", "not provided")

    fallback_message = (
        f"At {age}, your weekly choices matter more than you think. "
        "Even small savings or budgeting habits can significantly improve "
        "your financial flexibility over time."
    )

    if not api_key or genai is None:
        return fallback_message

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

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        return response.text.strip()

    except Exception:
        return fallback_message


def generate_spending_insight(spending_data):
    """
    Generate a personalised spending summary for the spending results page.

    This uses the user's spending categories, weekly income, rent, total spending,
    and surplus/deficit to create:
    1. A short summary
    2. 3-4 practical next steps
    3. A safe fallback message if Gemini is unavailable
    """
    api_key = os.getenv("GEMINI_API_KEY")

    income = float(spending_data.get("income") or 0)
    rent = float(spending_data.get("rent") or 0)
    essential = float(spending_data.get("essential") or 0)
    nonessential = float(spending_data.get("nonessential") or 0)
    total = float(spending_data.get("total") or 0)
    surplus = float(spending_data.get("surplus") or 0)
    living = spending_data.get("living", "not provided")
    locality = spending_data.get("locality", "not provided")
    items = spending_data.get("items", [])

    def fallback_spending_message():
        """
        Return a useful fallback insight if Gemini is unavailable,
        the API key is missing, or the API request fails.
        """
        if surplus < 0:
            return (
                "Your weekly spending is currently higher than your income. "
                "This means your budget may become harder to manage if the same pattern continues.\n\n"
                "Suggested next steps:\n"
                "• Review your largest flexible spending category first.\n"
                "• Try reducing one non-essential cost for the next week.\n"
                "• Check whether rent or fixed costs are putting pressure on your income.\n"
                "• Revisit your spending plan after one week and compare the difference."
            )

        if surplus == 0:
            return (
                "Your weekly income is fully used by your current spending. "
                "This means you are breaking even, but there may be limited room for emergencies or unexpected costs.\n\n"
                "Suggested next steps:\n"
                "• Choose one small category where you can reduce spending.\n"
                "• Aim to create a small weekly buffer, even if it is only $10-$20.\n"
                "• Review any recurring payments or subscriptions.\n"
                "• Track your spending again next week to see if your position improves."
            )

        return (
            "Your spending is currently within your weekly income, which gives you some room to save, plan, or manage unexpected costs. "
            "The next step is to make sure your leftover amount is being used intentionally.\n\n"
            "Suggested next steps:\n"
            "• Set aside part of your leftover money for emergency savings.\n"
            "• Review your largest non-essential category to see if it still feels worthwhile.\n"
            "• Plan ahead for rent, bills, bond, or moving costs.\n"
            "• Keep tracking weekly spending so your surplus does not disappear unnoticed."
        )

    category_lines = []

    for item in items:
        name = item.get("name", "Unknown category")
        value = float(item.get("value") or 0)
        item_type = item.get("type", "unknown")

        if value > 0:
            category_lines.append(
                f"- {name}: ${value:.2f} per week ({item_type})"
            )

    category_text = (
        "\n".join(category_lines)
        if category_lines
        else "No individual spending categories were provided."
    )

    if not api_key or genai is None:
        return fallback_spending_message()

    prompt = f"""
You are writing for a young Australian woman aged 18-22 using a financial literacy web app.

The user has entered weekly spending across different categories.

User details:
- Locality: {locality}
- Living arrangement: {living}
- Weekly income: ${income:.2f}
- Weekly rent: ${rent:.2f}
- Essential spending total: ${essential:.2f}
- Non-essential spending total: ${nonessential:.2f}
- Total weekly spending: ${total:.2f}
- Weekly surplus or deficit: ${surplus:.2f}

Spending categories:
{category_text}

Write a personalised spending summary.

Output format:
Start with a short paragraph of 3-4 sentences explaining:
- what the user's weekly spending position means
- whether the situation looks manageable, tight, or risky
- which type of spending appears to be creating the most pressure
- how the user should think about their surplus or deficit

Then add this heading exactly:
Suggested next steps:

Then provide 3-4 bullet points.

Rules:
- Use clear, simple language.
- Be warm, supportive, and non-judgmental.
- Refer to the user's actual spending categories where useful.
- Keep the whole response concise.
- Use bullet points starting with this character: •
- Do not use markdown headings.
- Do not mention AI.
- Do not give formal financial advice.
- Do not say the user is wrong or irresponsible.
- Do not use Bold symbols or em dashes
- Keep it humanized
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        generated_text = response.text.strip()

        if not generated_text:
            return fallback_spending_message()

        return generated_text

    except Exception:
        return fallback_spending_message()


# ---------------------------------------------------------------------------
# Core dashboard and comparison routes
# ---------------------------------------------------------------------------

@main.route("/dashboard")
@access_required
def dashboard():
    """
    Dashboard page shown after the user completes the profile builder.
    """
    profile_data, redirect_response = get_profile_or_redirect()

    if redirect_response:
        return redirect_response

    financial_fact = generate_financial_fact(profile_data)

    return render_template(
        "dashboard.html",
        profile_data=profile_data,
        financial_fact=financial_fact,
    )


@main.route("/rent_comparison")
@access_required
def rent_comparison():
    """
    Rent comparison page.
    """
    return render_profile_page("rent_comparison.html")


@main.route("/income_comparison")
@access_required
def income_comparison():
    """
    Income comparison page.
    """
    return render_profile_page("income_comparison.html")


@main.route("/forecast")
@access_required
def forecast():
    """
    Forecast page.
    """
    return render_profile_page("forecast.html")


# ---------------------------------------------------------------------------
# Spending routes
# ---------------------------------------------------------------------------

@main.route("/spending_tracker")
@access_required
def spending_tracker():
    """
    Original spending tracker route.

    Kept to avoid breaking existing links that still point to /spending_tracker.
    """
    return render_profile_page("spending_tracker.html")


@main.route("/spending")
@access_required
def spending_input():
    """
    Iteration 3 spending input route.

    This points to the same template as /spending_tracker.
    """
    return render_profile_page("spending_tracker.html")


@main.route("/api/save-spending-session", methods=["POST"])
@access_required
def save_spending_session():
    """
    Save spending calculator results into the Flask session.

    This route is called by frontend JavaScript before the user is shown
    the spending results page.
    """
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

    return jsonify(
        {
            "status": "success",
            "message": "Spending data saved",
        }
    )


@main.route("/spending_results")
@access_required
def spending_results():
    """
    Original spending results route.

    This route uses spending_data from the session and generates an insight
    if spending data is available.
    """
    spending_data = session.get("spending_data", {})
    spending_insight = ""

    if spending_data:
        spending_insight = generate_spending_insight(spending_data)

    return render_template(
        "spending_results.html",
        spending_data=spending_data,
        spending_insight=spending_insight,
    )


@main.route("/spending/result")
@access_required
def spending_result():
    """
    Iteration 3 spending results route.

    Kept separate because existing frontend code may use /spending/result.
    """
    profile_data, redirect_response = get_profile_or_redirect()

    if redirect_response:
        return redirect_response

    spending_data = session.get("spending_data", {})
    spending_insight = ""

    if spending_data:
        spending_insight = generate_spending_insight(spending_data)

    return render_template(
        "spending_results.html",
        profile_data=profile_data,
        spending_data=spending_data,
        spending_insight=spending_insight,
    )


# ---------------------------------------------------------------------------
# Iteration 3 feature routes
# ---------------------------------------------------------------------------

@main.route("/debt_awareness")
@access_required
def debt_awareness():
    """
    Debt awareness learning module.
    """
    return render_profile_page("debt_awareness.html")


@main.route("/debt_projection")
@access_required
def debt_projection():
    """
    Debt projection page.
    """
    return render_profile_page("debt_projection.html")


@main.route("/career_aspirations")
@access_required
def career_aspirations():
    """
    Career aspirations module.
    """
    return render_profile_page("career_aspirations.html")


@main.route("/knowledge_hub")
@access_required
def knowledge_hub():
    """
    Knowledge hub page.
    """
    return render_profile_page("knowledge_hub.html")


@main.route("/tax_payslip_module")
@access_required
def tax_payslip():
    """
    Tax and payslip learning module.
    """
    return render_profile_page("tax_payslip_module.html")


@main.route("/superannuation_explaination")
@main.route("/superannuation_explanation")
@access_required
def super_explained():
    """
    Superannuation learning module.

    The route /superannuation_explaination is kept because it appears to be
    the existing project spelling. The correctly spelled route
    /superannuation_explanation is also supported for future links.

    The template name is kept unchanged to avoid breaking the current file.
    """
    return render_profile_page("superannuation_explaination.html")


@main.route("/smart_budgeting")
@access_required
def smart_budget():
    """
    Smart budgeting learning module.
    """
    return render_profile_page("smart_budgeting.html")


@main.route("/tenancy_guide")
@access_required
def tenancy_guide():
    """
    Tenancy guide learning module.
    """
    return render_profile_page("tenancy_guide.html")


@main.route("/safe_employment")
@access_required
def safe_employment():
    """
    Safe employment learning module.
    """
    return render_profile_page("safe_employment.html")


@main.route("/credit_bnpl")
@access_required
def credit_bnpl():
    """
    Credit and Buy Now Pay Later learning module.

    This now passes profile_data consistently, like the other module pages.
    If the template does not use profile_data, it will not cause any issue.
    """
    return render_profile_page("credit_bnpl.html")