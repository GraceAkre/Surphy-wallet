import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import uuid
import math
import json

np.random.seed(42)

N = 10_000
FRAUD_RATE = 0.05
N_FRAUD = int(N * FRAUD_RATE)
N_LEGIT = N - N_FRAUD

CAMPUSES = ["Paris", "Lyon", "Bordeaux", "Lille", "Nantes"]
CAMPUS_COORDS = {
    "Paris": (48.8566, 2.3522),
    "Lyon": (45.7640, 4.8357),
    "Bordeaux": (44.8378, -0.5792),
    "Lille": (50.6292, 3.0573),
    "Nantes": (47.2184, -1.5536),
}
COUNTRIES_FR = ["FR"]
COUNTRIES_EU = ["DE", "ES", "IT", "BE", "NL", "PT", "GB", "CH"]
COUNTRIES_OTHER = ["US", "MA", "TN", "CN", "BR"]
CITIES_FR = {
    "Paris": ["Paris", "Boulogne-Billancourt", "Saint-Denis", "Montreuil"],
    "Lyon": ["Lyon", "Villeurbanne", "Vénissieux"],
    "Bordeaux": ["Bordeaux", "Mérignac", "Pessac"],
    "Lille": ["Lille", "Roubaix", "Tourcoing"],
    "Nantes": ["Nantes", "Saint-Herblain", "Rezé"],
}
PROVIDERS = ["stripe", "paypal", "internal", "campus_pool"]
TX_TYPES = ["payment", "transfer", "withdrawal", "deposit"]
DIRECTIONS = ["outgoing", "incoming"]

MERCHANT_CATEGORIES = {
    "food": ["merchant_boulangerie_", "merchant_resto_u_", "merchant_mcdo_", "merchant_carrefour_", "merchant_franprix_"],
    "transport": ["merchant_sncf_", "merchant_ratp_", "merchant_uber_", "merchant_blablacar_"],
    "shopping": ["merchant_fnac_", "merchant_zara_", "merchant_amazon_", "merchant_decathlon_"],
    "education": ["merchant_epitech_", "merchant_amazon_books_", "merchant_apple_edu_"],
    "leisure": ["merchant_netflix_", "merchant_spotify_", "merchant_cinema_", "merchant_bar_"],
    "housing": ["merchant_loyer_", "merchant_edf_", "merchant_free_", "merchant_bouygues_"],
}

N_USERS = 200
users = []
for i in range(N_USERS):
    campus = np.random.choice(CAMPUSES, p=[0.35, 0.25, 0.15, 0.13, 0.12])
    account_age = np.random.randint(30, 730)
    kyc_valid = np.random.random() < 0.92
    kyc_expires = (datetime(2026, 1, 1) + timedelta(days=np.random.randint(-60, 365))) if kyc_valid else (datetime(2026, 1, 1) - timedelta(days=np.random.randint(1, 180)))
    users.append({
        "user_id": str(uuid.uuid4()),
        "campus": campus,
        "account_age_days": account_age,
        "kyc_expires_at": kyc_expires.isoformat(),
        "kyc_valid": kyc_valid,
        "avg_amount": np.random.uniform(15, 80),
        "std_amount": np.random.uniform(10, 40),
        "tx_per_day_avg": np.random.uniform(0.5, 4.0),
    })

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def gen_legit_transaction(user):
    campus = user["campus"]
    campus_lat, campus_lon = CAMPUS_COORDS[campus]
    cat = np.random.choice(list(MERCHANT_CATEGORIES.keys()), p=[0.30, 0.12, 0.18, 0.08, 0.17, 0.15])
    merchant_base = np.random.choice(MERCHANT_CATEGORIES[cat])
    merchant_id = merchant_base + str(np.random.randint(1, 20))

    if cat == "food":
        amount = round(np.random.lognormal(2.3, 0.5), 2)
        amount = min(amount, 80)
    elif cat == "transport":
        amount = round(np.random.lognormal(2.5, 0.7), 2)
        amount = min(amount, 200)
    elif cat == "shopping":
        amount = round(np.random.lognormal(3.0, 0.8), 2)
        amount = min(amount, 400)
    elif cat == "housing":
        amount = round(np.random.uniform(30, 500), 2)
    elif cat == "leisure":
        amount = round(np.random.lognormal(2.2, 0.5), 2)
        amount = min(amount, 100)
    else:
        amount = round(np.random.lognormal(2.5, 0.6), 2)
        amount = min(amount, 150)

    amount = max(1.0, amount)

    hour_probs = np.array([
        0.005, 0.003, 0.002, 0.002, 0.003, 0.005,
        0.015, 0.035, 0.06, 0.07, 0.08, 0.09,
        0.10, 0.08, 0.07, 0.06, 0.055, 0.05,
        0.05, 0.045, 0.04, 0.03, 0.025, 0.02,
    ])
    hour_probs = hour_probs / hour_probs.sum()
    hour = int(np.random.choice(range(24), p=hour_probs))
    base_date = datetime(2025, 6, 1) + timedelta(days=np.random.randint(0, 180))
    timestamp = base_date.replace(hour=hour, minute=np.random.randint(0, 59), second=np.random.randint(0, 59))

    is_france = np.random.random() < 0.92
    if is_france:
        country = "FR"
        city = np.random.choice(CITIES_FR.get(campus, ["Paris"]))
        declared_lat = campus_lat + np.random.uniform(-0.05, 0.05)
        declared_lon = campus_lon + np.random.uniform(-0.05, 0.05)
    else:
        country = np.random.choice(COUNTRIES_EU)
        city = country + "_city"
        declared_lat = np.random.uniform(36, 55)
        declared_lon = np.random.uniform(-5, 15)

    ip_lat = declared_lat + np.random.uniform(-0.5, 0.5)
    ip_lon = declared_lon + np.random.uniform(-0.5, 0.5)
    last_country = "FR" if np.random.random() < 0.95 else country
    recent_tx_count = np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
    daily_total = round(np.random.uniform(0, 100), 2)

    return {
        "amount": amount,
        "currency": "EPC",
        "country": country,
        "city": city,
        "ip_latitude": round(ip_lat, 6),
        "ip_longitude": round(ip_lon, 6),
        "declared_latitude": round(declared_lat, 6),
        "declared_longitude": round(declared_lon, 6),
        "merchant_id": merchant_id,
        "timestamp": timestamp.isoformat(),
        "hour_of_day": hour,
        "day_of_week": timestamp.weekday(),
        "provider": np.random.choice(PROVIDERS, p=[0.5, 0.25, 0.15, 0.10]),
        "transaction_type": np.random.choice(TX_TYPES, p=[0.55, 0.20, 0.15, 0.10]),
        "direction": "outgoing" if np.random.random() < 0.7 else "incoming",
        "user_id": user["user_id"],
        "campus": user["campus"],
        "account_age_days": user["account_age_days"],
        "kyc_valid": user["kyc_valid"],
        "last_transaction_country": last_country,
        "recent_transaction_count": recent_tx_count,
        "has_duplicate": False,
        "daily_total": daily_total,
        "ip_geo_distance_km": round(haversine(declared_lat, declared_lon, ip_lat, ip_lon), 2),
        "amount_vs_user_avg": round(amount / max(user["avg_amount"], 1), 4),
        "tx_frequency_ratio": round(recent_tx_count / max(user["tx_per_day_avg"], 0.1), 4),
        "is_fraud": 0,
    }


def gen_fraud_transaction(user):
    tx = gen_legit_transaction(user)
    fraud_type = np.random.choice([
        "high_amount", "velocity_burst", "geo_mismatch",
        "night_foreign", "duplicate_attack", "multi_signal"
    ], p=[0.15, 0.15, 0.20, 0.15, 0.10, 0.25])

    if fraud_type == "high_amount":
        tx["amount"] = round(np.random.uniform(2500, 10000), 2)
        tx["amount_vs_user_avg"] = round(tx["amount"] / max(users[0]["avg_amount"], 1), 4)
        tx["daily_total"] = round(np.random.uniform(750, 2500), 2)

    elif fraud_type == "velocity_burst":
        tx["recent_transaction_count"] = np.random.randint(3, 10)
        tx["tx_frequency_ratio"] = round(tx["recent_transaction_count"] / max(user["tx_per_day_avg"], 0.1), 4)
        tx["amount"] = round(np.random.uniform(20, 200), 2)

    elif fraud_type == "geo_mismatch":
        tx["ip_latitude"] = round(np.random.uniform(-30, 60), 6)
        tx["ip_longitude"] = round(np.random.uniform(-120, 120), 6)
        tx["ip_geo_distance_km"] = round(haversine(
            tx["declared_latitude"], tx["declared_longitude"],
            tx["ip_latitude"], tx["ip_longitude"]
        ), 2)
        tx["country"] = np.random.choice(COUNTRIES_OTHER)

    elif fraud_type == "night_foreign":
        tx["hour_of_day"] = np.random.randint(0, 6)
        tx["country"] = np.random.choice(COUNTRIES_EU + COUNTRIES_OTHER)
        tx["last_transaction_country"] = "FR"
        tx["amount"] = round(np.random.uniform(500, 4000), 2)

    elif fraud_type == "duplicate_attack":
        tx["has_duplicate"] = True
        tx["recent_transaction_count"] = np.random.randint(2, 6)
        tx["amount"] = round(np.random.choice([49.99, 99.99, 149.99, 199.99]), 2)

    elif fraud_type == "multi_signal":
        tx["amount"] = round(np.random.uniform(1500, 7500), 2)
        tx["hour_of_day"] = np.random.randint(0, 6)
        tx["ip_latitude"] = round(np.random.uniform(-30, 60), 6)
        tx["ip_longitude"] = round(np.random.uniform(-120, 120), 6)
        tx["ip_geo_distance_km"] = round(haversine(
            tx["declared_latitude"], tx["declared_longitude"],
            tx["ip_latitude"], tx["ip_longitude"]
        ), 2)
        tx["recent_transaction_count"] = np.random.randint(2, 8)
        tx["country"] = np.random.choice(COUNTRIES_EU + COUNTRIES_OTHER)
        tx["last_transaction_country"] = "FR"
        tx["daily_total"] = round(np.random.uniform(200, 600), 2)
        if np.random.random() < 0.3:
            tx["kyc_valid"] = False
        if np.random.random() < 0.2:
            tx["has_duplicate"] = True

    tx["is_fraud"] = 1
    return tx


# --- Règles R1-R9 comme features binaires ---
def apply_rules(tx):
    tx["flag_R1_amount_high"] = 1 if tx["amount"] > 2500 else 0
    tx["flag_R2_time_suspicious"] = 1 if 0 <= tx["hour_of_day"] < 6 else 0
    tx["flag_R3_location_change"] = 1 if tx["country"] != tx["last_transaction_country"] else 0
    tx["flag_R4_velocity_high"] = 1 if tx["recent_transaction_count"] >= 3 else 0
    tx["flag_R5_ip_geo_mismatch"] = 1 if tx["ip_geo_distance_km"] > 1000 else 0
    tx["flag_R6_kyc_expired"] = 1 if not tx["kyc_valid"] else 0
    tx["flag_R7_duplicate"] = 1 if tx["has_duplicate"] else 0
    tx["flag_R8_campus_blocked"] = 1 if tx["campus"] not in CAMPUSES else 0
    tx["flag_R9_sca_threshold"] = 1 if (tx["daily_total"] + tx["amount"]) > 750 else 0

    tx["rule_score"] = (
        tx["flag_R1_amount_high"] * 30 +
        tx["flag_R2_time_suspicious"] * 20 +
        tx["flag_R3_location_change"] * 25 +
        tx["flag_R4_velocity_high"] * 35 +
        tx["flag_R5_ip_geo_mismatch"] * 40 +
        tx["flag_R6_kyc_expired"] * 15 +
        tx["flag_R7_duplicate"] * 50 +
        tx["flag_R8_campus_blocked"] * 20 +
        tx["flag_R9_sca_threshold"] * 35
    )
    tx["rule_score"] = min(tx["rule_score"], 100)
    return tx


print("Generating legit transactions...")
legit_txs = []
for _ in range(N_LEGIT):
    user = users[np.random.randint(0, N_USERS)]
    tx = gen_legit_transaction(user)
    tx = apply_rules(tx)
    legit_txs.append(tx)

print("Generating fraud transactions...")
fraud_txs = []
for _ in range(N_FRAUD):
    user = users[np.random.randint(0, N_USERS)]
    tx = gen_fraud_transaction(user)
    tx = apply_rules(tx)
    fraud_txs.append(tx)

all_txs = legit_txs + fraud_txs
np.random.shuffle(all_txs)

df = pd.DataFrame(all_txs)

# Transaction IDs
df.insert(0, "transaction_id", [str(uuid.uuid4()) for _ in range(len(df))])

FEATURE_COLS = [
    "amount", "hour_of_day", "day_of_week",
    "ip_geo_distance_km", "recent_transaction_count", "daily_total",
    "account_age_days", "amount_vs_user_avg", "tx_frequency_ratio",
    "flag_R1_amount_high", "flag_R2_time_suspicious", "flag_R3_location_change",
    "flag_R4_velocity_high", "flag_R5_ip_geo_mismatch", "flag_R6_kyc_expired",
    "flag_R7_duplicate", "flag_R8_campus_blocked", "flag_R9_sca_threshold",
    "rule_score",
]

print(f"\nDataset: {len(df)} transactions")
print(f"Fraudes: {df['is_fraud'].sum()} ({df['is_fraud'].mean()*100:.1f}%)")
print(f"Légitimes: {(~df['is_fraud'].astype(bool)).sum()}")
print(f"\nFeatures pour XGBoost ({len(FEATURE_COLS)}):")
for f in FEATURE_COLS:
    print(f"  - {f}")

print(f"\nStats des montants:")
print(f"  Légitimes: mean={df[df['is_fraud']==0]['amount'].mean():.2f} EPC, median={df[df['is_fraud']==0]['amount'].median():.2f} EPC")
print(f"  Fraudes:   mean={df[df['is_fraud']==1]['amount'].mean():.2f} EPC, median={df[df['is_fraud']==1]['amount'].median():.2f} EPC")

print(f"\nFlags déclenchés (fraudes vs légitimes):")
for col in [c for c in df.columns if c.startswith("flag_")]:
    fraud_rate = df[df["is_fraud"]==1][col].mean()
    legit_rate = df[df["is_fraud"]==0][col].mean()
    print(f"  {col}: fraud={fraud_rate:.1%} vs legit={legit_rate:.1%}")

df.to_csv("ml/smart_wallet_training_data.csv", index=False)

features_meta = {
    "dataset_name": "Smart Wallet IA - Training Dataset",
    "version": "1.0",
    "n_samples": len(df),
    "fraud_rate": float(df["is_fraud"].mean()),
    "feature_columns": FEATURE_COLS,
    "target_column": "is_fraud",
    "context_columns": ["transaction_id", "user_id", "country", "city", "campus", "merchant_id", "timestamp", "provider", "transaction_type", "direction", "currency"],
    "description": {
        "amount": "Montant de la transaction en EPC",
        "hour_of_day": "Heure de la transaction (0-23)",
        "day_of_week": "Jour de la semaine (0=lundi, 6=dimanche)",
        "ip_geo_distance_km": "Distance Haversine entre IP et position déclarée (km)",
        "recent_transaction_count": "Nombre de transactions dans les 5 dernières minutes",
        "daily_total": "Cumul des transactions du jour en EPC",
        "account_age_days": "Ancienneté du compte en jours",
        "amount_vs_user_avg": "Ratio montant / moyenne habituelle de l'utilisateur",
        "tx_frequency_ratio": "Ratio fréquence actuelle / fréquence habituelle",
        "flag_R1_amount_high": "R1: Montant > 2500 EPC",
        "flag_R2_time_suspicious": "R2: Transaction entre 0h et 6h",
        "flag_R3_location_change": "R3: Pays différent de la dernière transaction",
        "flag_R4_velocity_high": "R4: >= 3 transactions en 5 min",
        "flag_R5_ip_geo_mismatch": "R5: Distance IP > 1000 km",
        "flag_R6_kyc_expired": "R6: KYC expiré",
        "flag_R7_duplicate": "R7: Transaction dupliquée (même montant+merchant < 2min)",
        "flag_R8_campus_blocked": "R8: Campus non autorisé",
        "flag_R9_sca_threshold": "R9: Cumul journalier > 750 EPC (PSD2)",
        "rule_score": "Score agrégé des 9 règles (0-100)",
    },
}

with open("ml/dataset_metadata.json", "w") as f:
    json.dump(features_meta, f, indent=2, ensure_ascii=False)

print("\nFichiers générés:")
print("  - smart_wallet_training_data.csv")
print("  - dataset_metadata.json")
print("\nDone!")
