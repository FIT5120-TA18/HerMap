import os
from dotenv import load_dotenv
load_dotenv()
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Helper: use schema only when not using sqlite (local dev)
USE_SCHEMA = True
if os.getenv("DATABASE_URL", "").startswith("sqlite"):
    USE_SCHEMA = False

SCHEMA_ARGS = {"schema": "hermap"} if USE_SCHEMA else {}

class LocationData(db.Model):
    __tablename__ = "locations_data"
    __table_args__ = SCHEMA_ARGS

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)

class PostcodeLGACodeVIC(db.Model):
    __tablename__ = "postcode_lgacode_vic"
    __table_args__ = SCHEMA_ARGS

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)
    lgacode = db.Column(db.String(20))
    sa3_code = db.Column(db.String(20))
    sa3_name = db.Column(db.String(100))

class LGABoundaryVIC(db.Model):
    __tablename__ = "lga_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    lgacode = db.Column(db.String(20), primary_key=True)
    lga_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class MedianRentVIC1BR(db.Model):
    __tablename__ = "median_rent_vic_1br"
    __table_args__ = {"schema": "hermap"}
# class MedianRentVIC(db.Model):
#     __tablename__ = "median_rent_vic"
#     __table_args__ = SCHEMA_ARGS

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

# class MedianRentVIC1BR(db.Model):
#     __tablename__ = "median_rent_vic_1br"
#     __table_args__ = {"schema": "hermap"}
# class MedianRentVIC1BR(db.Model):
#     __tablename__ = "median_rent_vic_1br"
#     __table_args__ = SCHEMA_ARGS

#     id = db.Column(db.String(10), primary_key=True)
#     locality = db.Column(db.String(100))
#     postcode = db.Column(db.String(10))
#     lgacode = db.Column(db.String(20))
#     rent_09_25 = db.Column("09-25", db.Float)

class SuburbBoundaryVIC(db.Model):
    __tablename__ = "suburb_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    sal_code = db.Column(db.String(20), primary_key=True)
    suburb_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class SA3BoundaryVIC(db.Model):
    __tablename__ = "sa3_boundaries_vic"
    __table_args__ = SCHEMA_ARGS

    sa3_code = db.Column(db.String(20), primary_key=True)
    sa3_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class SA3IncomeVIC(db.Model):
    __tablename__ = "sa3_income_vic"
    __table_args__ = SCHEMA_ARGS

    SA3 = db.Column(db.String(20), primary_key=True)

    income_2018_19 = db.Column("2018-19", db.Float)
    income_2019_20 = db.Column("2019-20", db.Float)
    income_2020_21 = db.Column("2020-21", db.Float)
    income_2021_22 = db.Column("2021-22", db.Float)
    income_2022_23 = db.Column("2022-23", db.Float)

class IndustryBasedAverageEarnings(db.Model):
    __tablename__ = "industry_based_average_earnings"
    __table_args__ = SCHEMA_ARGS

    industry = db.Column(db.String(150), primary_key=True)

    year_2021_22 = db.Column("2021-22", db.Float)
    year_2022_23 = db.Column("2022-23", db.Float)

class OSMPOIVIC(db.Model):
    __tablename__ = "osm_pois_vic"
    __table_args__ = {"schema": "hermap"}

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

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

    location = db.Column(db.Text)

    suburb_name = db.Column(db.String(100))


class SpendingCategoriesABS(db.Model):
    __tablename__ = "spending_categories_ABS"
    __table_args__ = {"schema": "hermap","extend_existing": True}

    month = db.Column("Month", db.DateTime, primary_key=True)

    services = db.Column("Services", db.Float)
    food = db.Column("Food", db.Float)
    clothing_and_footwear = db.Column("Clothing and footwear", db.Float)

    furnishings_and_household_equipment = db.Column(
        "Furnishings and household equipment",
        db.Float
    )

    health = db.Column("Health", db.Float)
    transport = db.Column("Transport", db.Float)

    recreation_and_culture = db.Column(
        "Recreation and culture",
        db.Float
    )

    hotels_cafes_and_restaurants = db.Column(
        "Hotels, cafes and restaurants",
        db.Float
    )

    miscellaneous_goods_and_services = db.Column(
        "Miscellaneous goods and services",
        db.Float
    )
class GenderPayGapIndustrySummary(db.Model):
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

class ABSHouseholdSpending(db.Model):
    __tablename__ = "spending_categories_ABS"
    __table_args__ = {"schema": "hermap","extend_existing": True}

    month = db.Column("Month", db.DateTime, primary_key=True)

    clothing_and_footwear = db.Column("Clothing and footwear", db.Float)
    food = db.Column("Food", db.Float)
    furnishings_and_household_equipment = db.Column(
        "Furnishings and household equipment",
        db.Float,
    )
    health = db.Column("Health", db.Float)
    hotels_cafes_and_restaurants = db.Column(
        "Hotels, cafes and restaurants",
        db.Float,
    )
    miscellaneous_goods_and_services = db.Column(
        "Miscellaneous goods and services",
        db.Float,
    )
    recreation_and_culture = db.Column("Recreation and culture", db.Float)
    services = db.Column("Services", db.Float)
    transport = db.Column("Transport", db.Float)

    def to_spending_items(self):
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
