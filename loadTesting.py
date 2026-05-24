from locust import HttpUser, task, between

class HermapWebsiteUser(HttpUser):
    """
    Locust load test for the Hermap Flask website.

    Run example:
    locust -f locustfile.py --host=https://hermap.live

    If testing the underdevelopment version, keep BASE_PREFIX as "/underdevelopment".
    If testing locally, change BASE_PREFIX to "".
    """

    wait_time = between(1, 3)

    BASE_PREFIX = "/underdevelopment"

    SITE_PASSWORD = "ADMIN"

    def path(self, route: str) -> str:
        """
        Adds /underdevelopment before each route.
        Example:
        /dashboard becomes /underdevelopment/dashboard
        """
        return f"{self.BASE_PREFIX}{route}"

    def on_start(self):
        """
        Runs once for each simulated user.

        Step 1: Login
        Step 2: Submit profile form so dashboard and protected pages work
        """

        self.client.post(
            self.path("/login"),
            data={
                "password": self.SITE_PASSWORD
            },
            name="Login"
        )

        self.client.post(
            self.path("/profile_builder"),
            data={
                "age": "22",
                "state": "Victoria",
                "locality": "Melbourne",
                "postcode": "3000",
                "living": "Living alone",
                "rent": "376",
                "work": "Casual or part-time",
                "industry": "Retail trade",
                "income": "650",
                "study": "University student"
            },
            name="Submit Profile Builder"
        )

    @task(5)
    def dashboard(self):
        self.client.get(
            self.path("/dashboard"),
            name="Dashboard"
        )

    @task(4)
    def rent_comparison(self):
        self.client.get(
            self.path("/rent_comparison"),
            name="Rent Comparison"
        )

    @task(4)
    def income_comparison(self):
        self.client.get(
            self.path("/income_comparison"),
            name="Income Comparison"
        )

    @task(3)
    def spending_tracker(self):
        self.client.get(
            self.path("/spending_tracker"),
            name="Spending Tracker"
        )

    @task(3)
    def spending_page_iteration_3(self):
        self.client.get(
            self.path("/spending"),
            name="Spending Input"
        )

    @task(3)
    def spending_result(self):
        self.client.get(
            self.path("/spending/result"),
            name="Spending Result"
        )

    @task(2)
    def spending_results_old_route(self):
        self.client.get(
            self.path("/spending_results"),
            name="Spending Results Old Route"
        )

    @task(3)
    def debt_awareness(self):
        self.client.get(
            self.path("/debt_awareness"),
            name="Debt Awareness"
        )

    @task(3)
    def debt_projection(self):
        self.client.get(
            self.path("/debt_projection"),
            name="Debt Projection"
        )

    @task(3)
    def career_aspirations(self):
        self.client.get(
            self.path("/career_aspirations"),
            name="Career Aspirations"
        )

    @task(3)
    def knowledge_hub(self):
        self.client.get(
            self.path("/knowledge_hub"),
            name="Knowledge Hub"
        )

    @task(2)
    def tax_payslip_module(self):
        self.client.get(
            self.path("/tax_payslip_module"),
            name="Tax Payslip Module"
        )

    @task(2)
    def superannuation_explaination(self):
        self.client.get(
            self.path("/superannuation_explaination"),
            name="Superannuation Explanation"
        )

    @task(2)
    def smart_budgeting(self):
        self.client.get(
            self.path("/smart_budgeting"),
            name="Smart Budgeting"
        )

    @task(2)
    def tenancy_guide(self):
        self.client.get(
            self.path("/tenancy_guide"),
            name="Tenancy Guide"
        )

    @task(2)
    def safe_employment(self):
        self.client.get(
            self.path("/safe_employment"),
            name="Safe Employment"
        )

    @task(2)
    def credit_bnpl(self):
        self.client.get(
            self.path("/credit_bnpl"),
            name="Credit and BNPL"
        )

    @task(4)
    def save_spending_session_api(self):
        """
        Tests your POST API:
        /api/save-spending-session
        """

        payload = {
            "income": 650,
            "rent": 376,
            "essential": 120,
            "nonessential": 80,
            "total": 576,
            "surplus": 74,
            "living": "Living alone",
            "locality": "Melbourne",
            "items": [
                {
                    "name": "Groceries",
                    "value": 80,
                    "type": "essential"
                },
                {
                    "name": "Transport",
                    "value": 40,
                    "type": "essential"
                },
                {
                    "name": "Eating out",
                    "value": 50,
                    "type": "nonessential"
                }
            ],
            "savedAt": "2026-05-19T00:00:00"
        }

        self.client.post(
            self.path("/api/save-spending-session"),
            json=payload,
            name="API - Save Spending Session"
        )

    @task(1)
    def static_dashboard_image(self):
        """
        Useful because you previously had static file path issues
        under /underdevelopment/static/...
        """

        self.client.get(
            self.path("/static/img/dashboard/financial-position.png"),
            name="Static - Dashboard Image"
        )