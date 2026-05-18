# Import necessary Dependencies
from flask import Blueprint, request, jsonify
import json
from sqlalchemy import or_, func, cast, String
from models import (
    LocationData,
    PostcodeLGACodeVIC,
    LGABoundaryVIC,
    MedianRentVIC1BR,
    SuburbBoundaryVIC,
    SA3BoundaryVIC,
    SA3IncomeVIC,
    OSMPOIVIC,
    SpendingCategoriesABS
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
            MedianRentVIC1BR.postcode,
            MedianRentVIC1BR.locality,
            MedianRentVIC1BR.rent_03_21,
            MedianRentVIC1BR.rent_06_21,
            MedianRentVIC1BR.rent_09_21,
            MedianRentVIC1BR.rent_12_21,
            MedianRentVIC1BR.rent_03_22,
            MedianRentVIC1BR.rent_06_22,
            MedianRentVIC1BR.rent_09_22,
            MedianRentVIC1BR.rent_12_22,
            MedianRentVIC1BR.rent_03_23,
            MedianRentVIC1BR.rent_06_23,
            MedianRentVIC1BR.rent_09_23,
            MedianRentVIC1BR.rent_12_23,
            MedianRentVIC1BR.rent_03_24,
            MedianRentVIC1BR.rent_06_24,
            MedianRentVIC1BR.rent_09_24,
            MedianRentVIC1BR.rent_12_24,
            MedianRentVIC1BR.rent_03_25,
            MedianRentVIC1BR.rent_06_25,
            MedianRentVIC1BR.rent_09_25,
            func.ST_AsGeoJSON(SuburbBoundaryVIC.boundary).label("geometry")
        )
        .join(
            SuburbBoundaryVIC,
            func.lower(func.trim(MedianRentVIC1BR.locality))
            == func.lower(
                func.trim(
                    func.replace(SuburbBoundaryVIC.suburb_name, " (Vic.)", "")
                )
            )
        )
        .filter(MedianRentVIC1BR.lgacode == lgacode)
        .all()
    )

    features = []

    for row in rows:
        if not row.geometry:
            continue

        rent_values = [
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
            row.rent_09_25,
        ]

        valid_rents = [
            float(rent)
            for rent in rent_values
            if rent is not None and float(rent) > 0
        ]

        if not valid_rents:
            continue

        avg_rent = sum(valid_rents) / len(valid_rents)

        features.append({
            "type": "Feature",
            "properties": {
                "sal_code": row.sal_code,
                "suburb_name": row.suburb_name,
                "postcode": row.postcode,
                "rent": round(avg_rent, 2)
            },
            "geometry": json.loads(row.geometry)
        })

    features.sort(key=lambda f: f["properties"]["rent"])

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

            func.avg(MedianRentVIC1BR.rent_03_21).label("rent_03_21"),
            func.avg(MedianRentVIC1BR.rent_06_21).label("rent_06_21"),
            func.avg(MedianRentVIC1BR.rent_09_21).label("rent_09_21"),
            func.avg(MedianRentVIC1BR.rent_12_21).label("rent_12_21"),

            func.avg(MedianRentVIC1BR.rent_03_22).label("rent_03_22"),
            func.avg(MedianRentVIC1BR.rent_06_22).label("rent_06_22"),
            func.avg(MedianRentVIC1BR.rent_09_22).label("rent_09_22"),
            func.avg(MedianRentVIC1BR.rent_12_22).label("rent_12_22"),

            func.avg(MedianRentVIC1BR.rent_03_23).label("rent_03_23"),
            func.avg(MedianRentVIC1BR.rent_06_23).label("rent_06_23"),
            func.avg(MedianRentVIC1BR.rent_09_23).label("rent_09_23"),
            func.avg(MedianRentVIC1BR.rent_12_23).label("rent_12_23"),

            func.avg(MedianRentVIC1BR.rent_03_24).label("rent_03_24"),
            func.avg(MedianRentVIC1BR.rent_06_24).label("rent_06_24"),
            func.avg(MedianRentVIC1BR.rent_09_24).label("rent_09_24"),
            func.avg(MedianRentVIC1BR.rent_12_24).label("rent_12_24"),

            func.avg(MedianRentVIC1BR.rent_03_25).label("rent_03_25"),
            func.avg(MedianRentVIC1BR.rent_06_25).label("rent_06_25"),
            func.avg(MedianRentVIC1BR.rent_09_25).label("rent_09_25"),

            func.ST_AsGeoJSON(LGABoundaryVIC.boundary).label("geometry")
        )
        .outerjoin(
            MedianRentVIC1BR,
            LGABoundaryVIC.lgacode == MedianRentVIC1BR.lgacode
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
@api.route("/suburb-comparison-data", methods=["GET"])
def get_suburb_comparison_data():
    lgacode = request.args.get("lgacode", "").strip()

    if not lgacode:
        return jsonify([])

    rent_rows = (
        MedianRentVIC1BR.query
        .filter(
            MedianRentVIC1BR.lgacode == lgacode
        )
        .all()
    )

    results = []

    for row in rent_rows:
        suburb_name = row.locality

        rent_values = [
            row.rent_03_21, row.rent_06_21, row.rent_09_21, row.rent_12_21,
            row.rent_03_22, row.rent_06_22, row.rent_09_22, row.rent_12_22,
            row.rent_03_23, row.rent_06_23, row.rent_09_23, row.rent_12_23,
            row.rent_03_24, row.rent_06_24, row.rent_09_24, row.rent_12_24,
            row.rent_03_25, row.rent_06_25, row.rent_09_25
        ]

        average_rent = calculate_average_rent(rent_values)

        if average_rent is None:
            continue

        first_rent = next((float(v) for v in rent_values if v is not None and float(v) > 0), None)
        latest_rent = next((float(v) for v in reversed(rent_values) if v is not None and float(v) > 0), None)

        rent_growth_pct = None
        if first_rent and latest_rent:
            rent_growth_pct = round(((latest_rent - first_rent) / first_rent) * 100, 2)

        suburb_variants = [
            name.lower()
            for name in get_suburb_variants(suburb_name)
        ]

        poi_counts = (
            db.session.query(
                OSMPOIVIC.category,
                func.count(OSMPOIVIC.id).label("poi_count")
            )
            .filter(
                func.lower(
                    func.trim(
                        func.replace(OSMPOIVIC.suburb_name, " (Vic.)", "")
                    )
                ).in_(suburb_variants)
            )
            .group_by(OSMPOIVIC.category)
            .all()
        )

        poi_dict = {
            poi.category: poi.poi_count
            for poi in poi_counts
        }

        results.append({
            "suburb_name": suburb_name,
            "postcode": row.postcode,
            "rent": average_rent,
            "rent_growth_pct": rent_growth_pct,

            "supermarket_count": poi_dict.get("supermarket", 0),
            "train_station_count": poi_dict.get("train_stations", 0),
            "hospital_count": poi_dict.get("hospitals", 0),
            "pharmacy_count": poi_dict.get("pharmacy", 0),

            "parks_count": poi_dict.get("parks", 0),
            "gyms_count": poi_dict.get("gyms", 0),
            "libraries_count": poi_dict.get("libraries", 0),
            "cafes_count": poi_dict.get("cafes", 0)
        })

    return jsonify(results)
@api.route("/suburb-comparison-one", methods=["GET"])
def suburb_comparison_one():
    locality = request.args.get("locality", "").strip()

    if not locality:
        return jsonify({"error": "Missing locality"}), 400

    search_locality = locality

    rent_row = (
        MedianRentVIC1BR.query
        .filter(
            func.lower(func.trim(MedianRentVIC1BR.locality))
            == func.lower(func.trim(search_locality))
        )
        .first()
    )

    if not rent_row:
        fallback_locality = get_parent_suburb_name(locality)

        if fallback_locality != locality:
            rent_row = (
                MedianRentVIC1BR.query
                .filter(
                    func.lower(func.trim(MedianRentVIC1BR.locality))
                    == func.lower(func.trim(fallback_locality))
                )
                .first()
            )

    if not rent_row:
        return jsonify({"error": "Suburb not found"}), 404

    suburb_name = rent_row.locality

    rent_values = [
        rent_row.rent_03_21, rent_row.rent_06_21, rent_row.rent_09_21, rent_row.rent_12_21,
        rent_row.rent_03_22, rent_row.rent_06_22, rent_row.rent_09_22, rent_row.rent_12_22,
        rent_row.rent_03_23, rent_row.rent_06_23, rent_row.rent_09_23, rent_row.rent_12_23,
        rent_row.rent_03_24, rent_row.rent_06_24, rent_row.rent_09_24, rent_row.rent_12_24,
        rent_row.rent_03_25, rent_row.rent_06_25, rent_row.rent_09_25
    ]

    average_rent = calculate_average_rent(rent_values)

    if average_rent is None:
        return jsonify({"error": "No valid rent data"}), 404

    first_rent = next((float(v) for v in rent_values if v is not None and float(v) > 0), None)
    latest_rent = next((float(v) for v in reversed(rent_values) if v is not None and float(v) > 0), None)

    rent_growth_pct = None
    if first_rent and latest_rent:
        rent_growth_pct = round(((latest_rent - first_rent) / first_rent) * 100, 2)

    suburb_variants = [
        name.lower()
        for name in get_suburb_variants(suburb_name)
    ]

    poi_counts = (
        db.session.query(
            OSMPOIVIC.category,
            func.count(OSMPOIVIC.id).label("poi_count")
        )
        .filter(
            func.lower(
                func.trim(
                    func.replace(OSMPOIVIC.suburb_name, " (Vic.)", "")
                )
            ).in_(suburb_variants)
        )
        .group_by(OSMPOIVIC.category)
        .all()
    )

    poi_dict = {
        row.category: row.poi_count
        for row in poi_counts
    }

    return jsonify({
        "suburb_name": suburb_name,
        "postcode": rent_row.postcode,
        "rent": average_rent,
        "rent_growth_pct": rent_growth_pct,

        "supermarket_count": poi_dict.get("supermarket", 0),
        "train_station_count": poi_dict.get("train_stations", 0),
        "hospital_count": poi_dict.get("hospitals", 0),
        "pharmacy_count": poi_dict.get("pharmacy", 0),

        "parks_count": poi_dict.get("parks", 0),
        "gyms_count": poi_dict.get("gyms", 0),
        "libraries_count": poi_dict.get("libraries", 0),
        "cafes_count": poi_dict.get("cafes", 0)
    })

def get_parent_suburb_name(suburb_name):

    directional_words = {
        "north",
        "south",
        "east",
        "west",
        "junction"
    }

    parts = suburb_name.strip().split()

    if len(parts) >= 2:
        last_word = parts[-1].lower()

        if last_word in directional_words:
            return " ".join(parts[:-1])

    return suburb_name

def get_suburb_variants(parent_name):
    directions = ["North", "South", "East", "West"]

    variants = [parent_name]

    for direction in directions:
        variants.append(f"{parent_name} {direction}")

    return variants

def calculate_average_rent(values):
    valid_values = [
        float(value)
        for value in values
        if value is not None and float(value) > 0
    ]

    if not valid_values:
        return None

    return round(sum(valid_values) / len(valid_values), 2)

@api.route("/abs-spending-benchmark", methods=["GET"])
def get_abs_spending_benchmark():
    row = (
        db.session.query(
            func.avg(SpendingCategoriesABS.services).label("services"),
            func.avg(SpendingCategoriesABS.food).label("food"),
            func.avg(SpendingCategoriesABS.clothing_and_footwear).label("clothing_and_footwear"),
            func.avg(SpendingCategoriesABS.furnishings_and_household_equipment).label("furnishings_and_household_equipment"),
            func.avg(SpendingCategoriesABS.health).label("health"),
            func.avg(SpendingCategoriesABS.transport).label("transport"),
            func.avg(SpendingCategoriesABS.recreation_and_culture).label("recreation_and_culture"),
            func.avg(SpendingCategoriesABS.hotels_cafes_and_restaurants).label("hotels_cafes_and_restaurants"),
            func.avg(SpendingCategoriesABS.miscellaneous_goods_and_services).label("miscellaneous_goods_and_services"),
            func.min(SpendingCategoriesABS.month).label("start_month"),
            func.max(SpendingCategoriesABS.month).label("end_month"),
        )
        .first()
    )

    if not row:
        return jsonify({
            "benchmark": {},
            "message": "No ABS spending benchmark data found."
        }), 404

    averaged_values = {
        "Services": row.services,
        "Food": row.food,
        "Clothing and footwear": row.clothing_and_footwear,
        "Furnishings and household equipment": row.furnishings_and_household_equipment,
        "Health": row.health,
        "Transport": row.transport,
        "Recreation and culture": row.recreation_and_culture,
        "Hotels, cafes and restaurants": row.hotels_cafes_and_restaurants,
        "Miscellaneous goods and services": row.miscellaneous_goods_and_services,
    }

    cleaned_values = {}

    for category, value in averaged_values.items():
        if value is None:
            continue

        value = float(value)

        if value > 0:
            cleaned_values[category] = value

    total = sum(cleaned_values.values())

    if total <= 0:
        return jsonify({
            "benchmark": {},
            "message": "ABS spending benchmark could not be calculated."
        }), 400

    benchmark_percentages = {
        category: round((value / total) * 100, 1)
        for category, value in cleaned_values.items()
    }

    return jsonify({
        "period": {
            "start": row.start_month.strftime("%Y-%m-%d") if row.start_month else None,
            "end": row.end_month.strftime("%Y-%m-%d") if row.end_month else None
        },
        "benchmark": benchmark_percentages,
        "note": "Benchmark percentages are calculated from the average Victorian spending pattern across all available periods."
    })