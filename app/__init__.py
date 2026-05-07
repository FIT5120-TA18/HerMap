# Dependencies
from flask import Flask
import os
from dotenv import load_dotenv
from app.routes import main
from app.api.locations import api
from app.api.industries import industries_api
from models import db

load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.getenv("sec_key")

    # Database values from .env
    db_host = os.getenv("host")
    db_name = os.getenv("name")
    db_user = os.getenv("user")
    db_pass = os.getenv("pass")

    # SQLAlchemy ORM database connection string
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"mysql+pymysql://{db_user}:{db_pass}@{db_host}/{db_name}"
    )

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Connect SQLAlchemy to this Flask app
    db.init_app(app)

    app.register_blueprint(main)
    app.register_blueprint(api)
    app.register_blueprint(industries_api)

    return app