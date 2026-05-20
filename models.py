import os

from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy


# Load environment variables before checking DATABASE_URL.
# This allows schema settings to behave correctly in local and deployed environments.
load_dotenv()


# Main SQLAlchemy database object.
# This is initialized later inside app/__init__.py using db.init_app(app).
db = SQLAlchemy()


def _schema_args(*, extend_existing=False):
    """
    Return table arguments that work in both production and local SQLite.

    In production, your database uses the `hermap` schema.
    SQLite does not support schemas, so we skip the schema when DATABASE_URL
    starts with sqlite.

    extend_existing=True is useful when keeping backward-compatible aliases
    or when SQLAlchemy may see the same table mapping more than once.
    """
    use_schema = not os.getenv("DATABASE_URL", "").startswith("sqlite")
    args = {"schema": "hermap"} if use_schema else {}

    if extend_existing:
        args["extend_existing"] = True

    return args


# Default schema configuration used by most models.
SCHEMA_ARGS = _schema_args()

# Extended schema configuration used when SQLAlchemy may need to reuse
# an existing table definition safely.
SCHEMA_ARGS_EXTEND_EXISTING = _schema_args(extend_existing=True)


class LocationData(db.Model):
    """
    Stores postcode and locality lookup data.

    This model is useful when matching user-entered suburbs or postcodes
    to known Victorian locations.
    """

    __tablename__ = "locations_data"
    __table_args__ = SCHEMA_ARGS

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)


class PostcodeLGACodeVIC(db.Model):
    """
    Maps Victorian postcodes and localities to LGA and SA3 identifiers.

    This is commonly used when converting a user's postcode or suburb
    into the geographic area needed for rent, income, or boundary queries.
    """

    __tablename__ = "postcode_lgacode_vic"
    __table_args__ = SCHEMA_ARGS

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)

    lgacode = db.Column(db.String(20))
    sa3_code = db.Column(db.String(20))
    sa3_name = db.Column(db.String(100))


class LGABoundaryVIC(db.Model):
    """
    Stores binary geometry data for Victorian LGA boundaries.

    The boundary column stores geometry data as binary, which can be decoded
    by backend logic if map boundaries are needed.
    """

    __tablename__ = "lga_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    lgacode = db.Column(db.String(20), primary_key=True)
    lga_name = db.Column(db.String(100))
    boundary = db.Column(db.LargeBinary)


class MedianRentVIC1BR(db.Model):
    """
    Stores median rent values for 1-bedroom Victorian rentals by quarter.

    The database columns use quarter names like `03-21`, which are not valid
    Python attribute names. Therefore, each column is mapped to a cleaner
    Python attribute such as rent_03_21.
    """

    __tablename__ = "median_rent_vic_1br"
    __table_args__ = SCHEMA_ARGS

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)
    lgacode = db.Column(db.String(20), primary_key=True)

    rent_03_21 = db.Column("03-21", db.Float)
    rent_06_21 = db.Column("06-21", db.Float)
    rent_09_21 = db.Column("09-21", db.Float)
    rent_12_21 = db.Column("12-21", db.Float)

    rent_03_22 = db.Column("03-22", db.Float)
    rent_06_22 = db.Column("06-22", db.Float)
    rent_09_22 = db.Column("09-22", db.Float)
    rent_12_22 = db.Column("12-22", db.Float)

    rent_03_23 = db.Column("03-23", db.Float)
    rent_06_23 = db.Column("06-23", db.Float)
    rent_09_23 = db.Column("09-23", db.Float)
    rent_12_23 = db.Column("12-23", db.Float)

    rent_03_24 = db.Column("03-24", db.Float)
    rent_06_24 = db.Column("06-24", db.Float)
    rent_09_24 = db.Column("09-24", db.Float)
    rent_12_24 = db.Column("12-24", db.Float)

    rent_03_25 = db.Column("03-25", db.Float)
    rent_06_25 = db.Column("06-25", db.Float)
    rent_09_25 = db.Column("09-25", db.Float)


class SuburbBoundaryVIC(db.Model):
    """
    Stores binary geometry data for Victorian suburb boundaries.

    This can be used for map features where suburb-level boundaries are shown.
    """

    __tablename__ = "suburb_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    sal_code = db.Column(db.String(20), primary_key=True)
    suburb_name = db.Column(db.String(100))
    boundary = db.Column(db.LargeBinary)


class SA3BoundaryVIC(db.Model):
    """
    Stores binary geometry data for Victorian SA3 boundaries.

    SA3 areas are useful for showing broader regional data such as income.
    """

    __tablename__ = "sa3_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    sa3_code = db.Column(db.String(20), primary_key=True)
    sa3_name = db.Column(db.String(100))
    boundary = db.Column(db.LargeBinary)


class SA3IncomeVIC(db.Model):
    """
    Stores average income values by Victorian SA3 area and financial year.

    The database contains financial-year columns such as `2018-19`.
    These are mapped to Python-friendly attributes such as income_2018_19.
    """

    __tablename__ = "sa3_income_vic"
    __table_args__ = SCHEMA_ARGS

    # Kept as `SA3` to avoid breaking existing route or API code
    # that may already reference SA3IncomeVIC.SA3.
    SA3 = db.Column(db.String(20), primary_key=True)

    income_2018_19 = db.Column("2018-19", db.Float)
    income_2019_20 = db.Column("2019-20", db.Float)
    income_2020_21 = db.Column("2020-21", db.Float)
    income_2021_22 = db.Column("2021-22", db.Float)
    income_2022_23 = db.Column("2022-23", db.Float)


class IndustryBasedAverageEarnings(db.Model):
    """
    Stores average earnings by industry for selected financial years.

    This model can support comparisons between industries and years.
    """

    __tablename__ = "industry_based_average_earnings"
    __table_args__ = SCHEMA_ARGS

    industry = db.Column(db.String(150), primary_key=True)

    year_2021_22 = db.Column("2021-22", db.Float)
    year_2022_23 = db.Column("2022-23", db.Float)


class OSMPOIVIC(db.Model):
    """
    Stores OpenStreetMap points of interest for Victoria.

    These records can support nearby-place features, for example shops,
    public transport, amenities, recreation, and other map markers.
    """

    __tablename__ = "osm_pois_vic"
    __table_args__ = SCHEMA_ARGS

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Original OpenStreetMap ID.
    # unique=True prevents duplicate OSM records from being stored.
    osm_id = db.Column(db.BigInteger, unique=True)

    name = db.Column(db.String(255))
    category = db.Column(db.String(100))

    amenity = db.Column(db.String(100))
    shop = db.Column(db.String(100))
    leisure = db.Column(db.String(100))
    railway = db.Column(db.String(100))
    highway = db.Column(db.String(100))

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    # Kept as Text because location may contain a longer structured value.
    location = db.Column(db.Text)

    suburb_name = db.Column(db.String(100))


class ABSHouseholdSpending(db.Model):
    """
    Stores household spending categories from ABS data.

    This is the preferred model for the `spending_categories_ABS` table.

    Earlier versions of the code had another model called SpendingCategoriesABS
    pointing to the same table. To avoid duplicate model definitions while still
    keeping old imports working, SpendingCategoriesABS is now added as an alias
    after this class.
    """

    __tablename__ = "spending_categories_ABS"
    __table_args__ = SCHEMA_ARGS_EXTEND_EXISTING

    # The database column is named `Month`, but the Python attribute is lowercase
    # for cleaner code.
    month = db.Column("Month", db.DateTime, primary_key=True)

    services = db.Column("Services", db.Float)
    food = db.Column("Food", db.Float)
    clothing_and_footwear = db.Column("Clothing and footwear", db.Float)

    furnishings_and_household_equipment = db.Column(
        "Furnishings and household equipment",
        db.Float,
    )

    health = db.Column("Health", db.Float)
    transport = db.Column("Transport", db.Float)
    recreation_and_culture = db.Column("Recreation and culture", db.Float)

    hotels_cafes_and_restaurants = db.Column(
        "Hotels, cafes and restaurants",
        db.Float,
    )

    miscellaneous_goods_and_services = db.Column(
        "Miscellaneous goods and services",
        db.Float,
    )

    def to_spending_items(self):
        """
        Convert the spending row into a frontend-friendly list.

        This method is useful when the UI needs to render spending cards without
        manually formatting each database column inside the route or API file.
        """
        return [
            {
                "label": "Food",
                "value": self.food,
                "type": "essential",
                "description": "Groceries and food spending.",
            },
            {
                "label": "Health",
                "value": self.health,
                "type": "essential",
                "description": "Medical, health, and wellbeing costs.",
            },
            {
                "label": "Transport",
                "value": self.transport,
                "type": "essential",
                "description": "Transport, fuel, and getting around.",
            },
            {
                "label": "Services",
                "value": self.services,
                "type": "essential",
                "description": "Regular services households rely on.",
            },
            {
                "label": "Clothing & footwear",
                "value": self.clothing_and_footwear,
                "type": "non_essential",
                "description": "Clothes, shoes, and related spending.",
            },
            {
                "label": "Furnishings & household equipment",
                "value": self.furnishings_and_household_equipment,
                "type": "non_essential",
                "description": "Furniture, homeware, and equipment.",
            },
            {
                "label": "Hotels, cafés & restaurants",
                "value": self.hotels_cafes_and_restaurants,
                "type": "non_essential",
                "description": "Eating out, cafés, restaurants, and hotels.",
            },
            {
                "label": "Recreation & culture",
                "value": self.recreation_and_culture,
                "type": "non_essential",
                "description": "Entertainment, hobbies, and recreation.",
            },
            {
                "label": "Miscellaneous goods & services",
                "value": self.miscellaneous_goods_and_services,
                "type": "non_essential",
                "description": "Other flexible household spending.",
            },
        ]


# Backward-compatible alias.
# New code should use ABSHouseholdSpending.
# Existing code that imports SpendingCategoriesABS will still work.
SpendingCategoriesABS = ABSHouseholdSpending


class GenderPayGapIndustrySummary(db.Model):
    """
    Stores industry-level gender pay gap summary values.

    This model is designed for API responses used by the gender pay gap
    visualisations and industry comparison pages.
    """

    __tablename__ = "pay_gap_by_industry"
    __table_args__ = SCHEMA_ARGS

    id = db.Column(db.Integer, primary_key=True)

    industry = db.Column(db.String(255), nullable=False)

    average_total_gpg_percent = db.Column(db.Float)
    average_base_salary_gpg_percent = db.Column(db.Float)
    median_total_gpg_percent = db.Column(db.Float)
    median_base_salary_gpg_percent = db.Column(db.Float)

    women_workforce_percent = db.Column(db.Float)
    women_to_men_pay_ratio_percent = db.Column(db.Float)
    female_cents_per_male_dollar = db.Column(db.Float)

    average_total_remuneration = db.Column(db.Float)
    estimated_men_annual_income = db.Column(db.Float)
    estimated_women_annual_income = db.Column(db.Float)
    estimated_women_weekly_income = db.Column(db.Float)

    def to_dict(self):
        """
        Convert the model object into a dictionary for JSON API responses.

        Keeping this formatting inside the model prevents the API file from
        becoming cluttered with repeated field mapping logic.
        """
        return {
            "id": self.id,
            "industry": self.industry,
            "average_total_gpg_percent": self.average_total_gpg_percent,
            "average_base_salary_gpg_percent": self.average_base_salary_gpg_percent,
            "median_total_gpg_percent": self.median_total_gpg_percent,
            "median_base_salary_gpg_percent": self.median_base_salary_gpg_percent,
            "women_workforce_percent": self.women_workforce_percent,
            "women_to_men_pay_ratio_percent": self.women_to_men_pay_ratio_percent,
            "female_cents_per_male_dollar": self.female_cents_per_male_dollar,
            "average_total_remuneration": self.average_total_remuneration,
            "estimated_men_annual_income": self.estimated_men_annual_income,
            "estimated_women_annual_income": self.estimated_women_annual_income,
            "estimated_women_weekly_income": self.estimated_women_weekly_income,
        }