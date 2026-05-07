from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class LocationData(db.Model):
    __tablename__ = "locations_data"
    __table_args__ = {"schema": "hermap"}

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)

class PostcodeLGACodeVIC(db.Model):
    __tablename__ = "postcode_lgacode_vic"
    __table_args__ = {"schema": "hermap"}

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)
    lgacode = db.Column(db.String(20))
    sa3_code = db.Column(db.String(20))
    sa3_name = db.Column(db.String(100))

class LGABoundaryVIC(db.Model):
    __tablename__ = "lga_boundaries_vic"
    __table_args__ = {"schema": "hermap"}

    lgacode = db.Column(db.String(20), primary_key=True)
    lga_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class MedianRentVIC(db.Model):
    __tablename__ = "median_rent_vic"
    __table_args__ = {"schema": "hermap"}

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

class MedianRentVIC1BR(db.Model):
    __tablename__ = "median_rent_vic_1br"
    __table_args__ = {"schema": "hermap"}

    locality = db.Column(db.String(100), primary_key=True)
    postcode = db.Column(db.String(10), primary_key=True)
    lgacode = db.Column(db.String(20), primary_key=True)
    rent_09_25 = db.Column("09-25", db.Float)

class SuburbBoundaryVIC(db.Model):
    __tablename__ = "suburb_boundaries_vic"
    __table_args__ = {"schema": "hermap"}

    sal_code = db.Column(db.String(20), primary_key=True)
    suburb_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class SA3BoundaryVIC(db.Model):
    __tablename__ = "sa3_boundaries_vic"
    __table_args__ = {"schema": "hermap"}

    sa3_code = db.Column(db.String(20), primary_key=True)
    sa3_name = db.Column(db.String(100))
    boundary = db.Column(db.Text)

class SA3IncomeVIC(db.Model):
    __tablename__ = "sa3_income_vic"
    __table_args__ = {"schema": "hermap"}

    SA3 = db.Column(db.String(20), primary_key=True)

    income_2018_19 = db.Column("2018-19", db.Float)
    income_2019_20 = db.Column("2019-20", db.Float)
    income_2020_21 = db.Column("2020-21", db.Float)
    income_2021_22 = db.Column("2021-22", db.Float)
    income_2022_23 = db.Column("2022-23", db.Float)

class IndustryBasedAverageEarnings(db.Model):
    __tablename__ = "industry_based_average_earnings"
    __table_args__ = {"schema": "hermap"}

    industry = db.Column(db.String(150), primary_key=True)

    year_2021_22 = db.Column("2021-22", db.Float)
    year_2022_23 = db.Column("2022-23", db.Float)