# Import necessary Dependencies
from flask import Blueprint, request, jsonify
import json
from sqlalchemy import or_, func, cast, String
from models import (
    LocationData,
    PostcodeLGACodeVIC,
    LGABoundaryVIC,
    MedianRentVIC1BR,
    MedianRentVIC,
    SuburbBoundaryVIC,
    SA3BoundaryVIC,
    SA3IncomeVIC
)
from models import db

# Identifier for the API
api = Blueprint("api", __name__, url_prefix="/api")

# Obtain the list of localities from the Database for the selected state
@api.route("/locations", methods=["GET"])
def get_locations():
    search_term = request.args.get("q", "").strip()

    # Avoid unnecessary database calls until user inputs at least 2 characters.
    if len(search_term) < 2:
        return jsonify([])

    like_term = f"{search_term}%"

    rows = (
        LocationData.query
        .with_entities(LocationData.locality, LocationData.postcode)
        .filter(
            or_(
                LocationData.locality.like(like_term),
                LocationData.postcode.like(like_term)
            )
        )
        .distinct()
        .order_by(LocationData.locality)
        .limit(10)
        .all()
    )

    locations = [
        {
            "locality": row.locality,
            "postcode": row.postcode
        }
        for row in rows
    ]

    return jsonify(locations)
        
@api.route("/lga-from-location", methods=["GET"])
def get_lga_from_location():
    postcode = request.args.get("postcode", "").strip()
    locality = request.args.get("locality", "").strip()

    if not postcode and not locality:
        return jsonify({})

    row = (
        db.session.query(
            PostcodeLGACodeVIC.lgacode,
            LGABoundaryVIC.lga_name
        )
        .join(
            LGABoundaryVIC,
            PostcodeLGACodeVIC.lgacode == LGABoundaryVIC.lgacode
        )
        .filter(
            or_(
                PostcodeLGACodeVIC.postcode == postcode,
                PostcodeLGACodeVIC.locality == locality
            )
        )
        .distinct()
        .limit(1)
        .first()
    )

    if not row:
        return jsonify({})

    return jsonify({
        "lgacode": row.lgacode,
        "lga_name": row.lga_name
    })

@api.route("/lgas", methods=["GET"])
def get_lgas():
    search_term = request.args.get("q", "").strip()

    if len(search_term) < 2:
        return jsonify([])

    like_term = f"{search_term}%"

    rows = (
        LGABoundaryVIC.query
        .with_entities(LGABoundaryVIC.lgacode, LGABoundaryVIC.lga_name)
        .filter(LGABoundaryVIC.lga_name.like(like_term))
        .distinct()
        .order_by(LGABoundaryVIC.lga_name)
        .limit(10)
        .all()
    )

    return jsonify([
        {
            "lgacode": row.lgacode,
            "lga_name": row.lga_name
        }
        for row in rows
    ])

@api.route("/suburbs-by-lga", methods=["GET"])
def get_suburbs_by_lga():
    lgacode = request.args.get("lgacode", "").strip()

    if not lgacode:
        return jsonify([])

    rows = (
        MedianRentVIC1BR.query
        .with_entities(
            MedianRentVIC1BR.locality,
            MedianRentVIC1BR.postcode,
            MedianRentVIC1BR.rent_09_25
        )
        .filter(
            MedianRentVIC1BR.lgacode == lgacode,
            MedianRentVIC1BR.rent_09_25.isnot(None)
        )
        .order_by(MedianRentVIC1BR.rent_09_25.asc())
        .all()
    )

    suburbs = [
        {
            "name": row.locality,
            "postcode": row.postcode,
            "rent": float(row.rent_09_25) if row.rent_09_25 is not None else None
        }
        for row in rows
    ]

    return jsonify(suburbs)

@api.route("/suburb-rent-map", methods=["GET"])
def get_suburb_rent_map():
    lgacode = request.args.get("lgacode", "").strip()

    if not lgacode:
        return jsonify({"type": "FeatureCollection", "features": []})

    rows = (
        db.session.query(
            SuburbBoundaryVIC.sal_code,
            SuburbBoundaryVIC.suburb_name,
            MedianRentVIC.postcode,
            MedianRentVIC.rent_09_25.label("weekly_rent"),
            func.ST_AsGeoJSON(SuburbBoundaryVIC.boundary).label("geometry")
        )
        .join(
            SuburbBoundaryVIC,
            func.lower(func.trim(MedianRentVIC.locality))
            == func.lower(
                func.trim(
                    func.replace(SuburbBoundaryVIC.suburb_name, " (Vic.)", "")
                )
            )
        )
        .filter(
            MedianRentVIC.lgacode == lgacode,
            MedianRentVIC.rent_09_25.isnot(None)
        )
        .order_by(MedianRentVIC.rent_09_25.asc())
        .all()
    )

    features = []

    for row in rows:
        if not row.geometry:
            continue

        features.append({
            "type": "Feature",
            "properties": {
                "sal_code": row.sal_code,
                "suburb_name": row.suburb_name,
                "postcode": row.postcode,
                "rent": float(row.weekly_rent) if row.weekly_rent is not None else None
            },
            "geometry": json.loads(row.geometry)
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@api.route("/lga-boundary", methods=["GET"])
def get_lga_boundary():
    lgacode = request.args.get("lgacode", "").strip()

    if not lgacode:
        return jsonify({"type": "FeatureCollection", "features": []})

    row = (
        db.session.query(
            LGABoundaryVIC.lgacode,
            LGABoundaryVIC.lga_name,
            func.ST_AsGeoJSON(LGABoundaryVIC.boundary).label("geometry")
        )
        .filter(LGABoundaryVIC.lgacode == lgacode)
        .limit(1)
        .first()
    )

    if not row:
        return jsonify({"type": "FeatureCollection", "features": []})

    return jsonify({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "lgacode": row.lgacode,
                    "lga_name": row.lga_name
                },
                "geometry": json.loads(row.geometry)
            }
        ]
    })

@api.route("/all-lgas", methods=["GET"])
def get_all_lgas():
    rows = (
        LGABoundaryVIC.query
        .with_entities(LGABoundaryVIC.lgacode, LGABoundaryVIC.lga_name)
        .distinct()
        .order_by(LGABoundaryVIC.lga_name)
        .all()
    )

    return jsonify([
        {
            "lgacode": row.lgacode,
            "lga_name": row.lga_name
        }
        for row in rows
    ])

@api.route("/lga-rent-map", methods=["GET"])
def get_lga_rent_map():
    rows = (
        db.session.query(
            LGABoundaryVIC.lgacode,
            LGABoundaryVIC.lga_name,

            func.avg(MedianRentVIC.rent_03_21).label("rent_03_21"),
            func.avg(MedianRentVIC.rent_06_21).label("rent_06_21"),
            func.avg(MedianRentVIC.rent_09_21).label("rent_09_21"),
            func.avg(MedianRentVIC.rent_12_21).label("rent_12_21"),

            func.avg(MedianRentVIC.rent_03_22).label("rent_03_22"),
            func.avg(MedianRentVIC.rent_06_22).label("rent_06_22"),
            func.avg(MedianRentVIC.rent_09_22).label("rent_09_22"),
            func.avg(MedianRentVIC.rent_12_22).label("rent_12_22"),

            func.avg(MedianRentVIC.rent_03_23).label("rent_03_23"),
            func.avg(MedianRentVIC.rent_06_23).label("rent_06_23"),
            func.avg(MedianRentVIC.rent_09_23).label("rent_09_23"),
            func.avg(MedianRentVIC.rent_12_23).label("rent_12_23"),

            func.avg(MedianRentVIC.rent_03_24).label("rent_03_24"),
            func.avg(MedianRentVIC.rent_06_24).label("rent_06_24"),
            func.avg(MedianRentVIC.rent_09_24).label("rent_09_24"),
            func.avg(MedianRentVIC.rent_12_24).label("rent_12_24"),

            func.avg(MedianRentVIC.rent_03_25).label("rent_03_25"),
            func.avg(MedianRentVIC.rent_06_25).label("rent_06_25"),
            func.avg(MedianRentVIC.rent_09_25).label("rent_09_25"),

            func.ST_AsGeoJSON(LGABoundaryVIC.boundary).label("geometry")
        )
        .outerjoin(
            MedianRentVIC,
            LGABoundaryVIC.lgacode == MedianRentVIC.lgacode
        )
        .group_by(
            LGABoundaryVIC.lgacode,
            LGABoundaryVIC.lga_name,
            LGABoundaryVIC.boundary
        )
        .all()
    )

    quarters = [
        "03-21", "06-21", "09-21", "12-21",
        "03-22", "06-22", "09-22", "12-22",
        "03-23", "06-23", "09-23", "12-23",
        "03-24", "06-24", "09-24", "12-24",
        "03-25", "06-25", "09-25"
    ]

    features = []

    for row in rows:
        if not row.geometry:
            continue

        history = [
            row.rent_03_21,
            row.rent_06_21,
            row.rent_09_21,
            row.rent_12_21,

            row.rent_03_22,
            row.rent_06_22,
            row.rent_09_22,
            row.rent_12_22,

            row.rent_03_23,
            row.rent_06_23,
            row.rent_09_23,
            row.rent_12_23,

            row.rent_03_24,
            row.rent_06_24,
            row.rent_09_24,
            row.rent_12_24,

            row.rent_03_25,
            row.rent_06_25,
            row.rent_09_25
        ]

        history = [
            round(float(value), 2) if value is not None else None
            for value in history
        ]

        latest_rent = history[-1] if history else None

        features.append({
            "type": "Feature",
            "properties": {
                "lgacode": row.lgacode,
                "lga_name": row.lga_name,
                "rent": latest_rent,
                "history_labels": quarters,
                "history": history
            },
            "geometry": json.loads(row.geometry)
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@api.route("/sa3-income-map", methods=["GET"])
def get_sa3_income_map():
    rows = (
        db.session.query(
            SA3BoundaryVIC.sa3_code,
            SA3BoundaryVIC.sa3_name,
            SA3IncomeVIC.income_2018_19,
            SA3IncomeVIC.income_2019_20,
            SA3IncomeVIC.income_2020_21,
            SA3IncomeVIC.income_2021_22,
            SA3IncomeVIC.income_2022_23,
            func.ST_AsGeoJSON(SA3BoundaryVIC.boundary).label("geometry")
        )
        .outerjoin(
            SA3IncomeVIC,
            func.trim(func.cast(SA3IncomeVIC.SA3, db.String))
            == func.trim(func.cast(SA3BoundaryVIC.sa3_code, db.String))
        )
        .all()
    )

    features = []

    for row in rows:
        if not row.geometry:
            continue

        history = [
            float(row.income_2018_19) if row.income_2018_19 is not None else None,
            float(row.income_2019_20) if row.income_2019_20 is not None else None,
            float(row.income_2020_21) if row.income_2020_21 is not None else None,
            float(row.income_2021_22) if row.income_2021_22 is not None else None,
            float(row.income_2022_23) if row.income_2022_23 is not None else None
        ]

        features.append({
            "type": "Feature",
            "properties": {
                "sa3_code": str(row.sa3_code),
                "sa3_name": row.sa3_name,
                "income_2022_23": history[-1],
                "history_labels": [
                    "2018-19",
                    "2019-20",
                    "2020-21",
                    "2021-22",
                    "2022-23"
                ],
                "history": history
            },
            "geometry": json.loads(row.geometry)
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@api.route("/sa3-from-location", methods=["GET"])
def get_sa3_from_location():
    postcode = request.args.get("postcode", "").strip()
    locality = request.args.get("locality", "").strip()

    if not postcode and not locality:
        return jsonify({})

    row = (
        PostcodeLGACodeVIC.query
        .with_entities(
            PostcodeLGACodeVIC.sa3_code,
            PostcodeLGACodeVIC.sa3_name
        )
        .filter(
            or_(
                cast(PostcodeLGACodeVIC.postcode, String) == postcode,
                func.lower(func.trim(PostcodeLGACodeVIC.locality))
                == func.lower(func.trim(locality))
            ),
            PostcodeLGACodeVIC.sa3_code.isnot(None),
            PostcodeLGACodeVIC.sa3_name.isnot(None)
        )
        .distinct()
        .limit(1)
        .first()
    )

    if not row:
        return jsonify({})

    return jsonify({
        "sa3_code": str(row.sa3_code),
        "sa3_name": row.sa3_name
    })