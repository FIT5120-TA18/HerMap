# Importing dependencies
import os
from functools import wraps
from flask import Blueprint, render_template, request, session, redirect, url_for
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

# @main.route("/review")
# @access_required
# def review():
#     profile_data = session.get("profile", {})

#     if not profile_data:
#         return redirect(url_for("main.quick_profile"))

#     return render_template("review.html", profile_data=profile_data)

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