"""
Loads a realistic demo account so you can show the dashboard to an
exporter without typing everything in by hand.

    python -m scripts.seed_demo

Creates organization "Demo Cocoa Exports Ltd" with login
    demo@eudr.ng / demo-password-2026
and fills it with farmers in Ondo, Osun and Cross River, mapped and
unmapped plots, harvests, collections, three batches and three shipments:
one ready, one blocked by an unmapped farm, one not yet assessed. If
deforestation screening is switched on (EUDR_SCREENING_PROVIDER=demo or
whisp) the mapped farms are screened too. All names are invented. Run it on an empty or test database —
it refuses to run twice for the same email.
"""
import math
import random
import sys

from fastapi.testclient import TestClient

from app.main import app

EMAIL = "demo@eudr.ng"
PASSWORD = "demo-password-2026"

FARMERS = [
    ("Adebayo Ogunleye", "Idanre", "Ondo", 7.112, 5.110),
    ("Funmilayo Akinola", "Idanre", "Ondo", 7.121, 5.128),
    ("Oluwaseun Adeyemi", "Ondo Town", "Ondo", 7.093, 4.835),
    ("Bisi Olatunji", "Ile-Oluji", "Ondo", 7.201, 4.867),
    ("Kehinde Afolabi", "Ife", "Osun", 7.482, 4.560),
    ("Tunde Bakare", "Ilesa", "Osun", 7.628, 4.742),
    ("Ngozi Eke", "Ikom", "Cross River", 5.962, 8.711),
    ("Effiong Bassey", "Etung", "Cross River", 5.881, 8.802),
]


def square(lat, lon, hectares):
    side_m = math.sqrt(hectares * 10_000)
    dlat = side_m / 111_320
    dlon = side_m / (111_320 * math.cos(math.radians(lat)))
    return [[lon, lat], [lon + dlon, lat], [lon + dlon, lat + dlat], [lon, lat + dlat]]


def main():
    random.seed(7)
    c = TestClient(app)
    r = c.post(
        "/api/v1/auth/register",
        json={"organization_name": "Demo Cocoa Exports Ltd", "name": "Demo Admin", "email": EMAIL, "password": PASSWORD},
    )
    if r.status_code == 409:
        print(f"{EMAIL} already exists — demo data is already loaded.")
        return 0
    r.raise_for_status()
    c.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    post = lambda path, body: (lambda resp: (resp.raise_for_status(), resp.json())[1])(c.post(path, json=body))

    agents = [
        post("/api/v1/users", {"name": n, "email": e, "role": "field_agent"})["id"]
        for n, e in [("Segun Field", "segun@demo.ng"), ("Amaka Field", "amaka@demo.ng")]
    ]
    collections = []
    for i, (name, community, state, lat, lon) in enumerate(FARMERS):
        farmer = post(
            "/api/v1/farmers",
            {
                "full_name": name,
                "phone_number": f"+23480{30000000 + i * 1111:08d}",
                "national_id_number": f"NIN{9000000000 + i}" if i != 6 else None,
                "community": community,
                "state": state,
            },
        )
        ha = round(random.uniform(0.8, 3.5), 2)
        unmapped = i == 7
        farm = post(
            "/api/v1/farms",
            {"farmer_id": farmer["id"], "name": f"{community} plot {i + 1}", "polygon_ring": None if unmapped else square(lat, lon, ha), "area_hectares": ha if unmapped else None},
        )
        kg = round(ha * random.uniform(380, 650))
        post("/api/v1/harvests", {"farm_id": farm["id"], "harvest_date": "2026-09-1%d" % (i % 9), "quantity_kg": kg})
        ce = post(
            "/api/v1/collection-events",
            {"farm_id": farm["id"], "agent_user_id": agents[i % 2], "weight_kg": round(kg * 0.96), "quality_grade": "Grade 1", "location_recorded": True},
        )
        collections.append((ce["id"], round(kg * 0.96)))

    groups = [collections[0:3], collections[3:6], collections[6:8]]
    batches = []
    for g in groups:
        total = sum(w for _, w in g)
        batches.append(post("/api/v1/batches", {"output_kg": total, "inputs": [{"collection_event_id": cid, "quantity_kg": w} for cid, w in g]})["id"])

    s1 = post("/api/v1/shipments", {"reference": "LOS-RTM-0412", "destination_country": "Netherlands", "buyer_name": "Rotterdam Cocoa Trading BV", "batch_ids": [batches[0]]})
    s2 = post("/api/v1/shipments", {"reference": "LOS-HAM-0413", "destination_country": "Germany", "buyer_name": "Hamburg Kakao GmbH", "batch_ids": [batches[2]]})
    post("/api/v1/shipments", {"reference": "LOS-ANR-0414", "destination_country": "Belgium", "buyer_name": "Antwerp Chocolate NV", "batch_ids": [batches[1]]})

    screening = c.get("/api/v1/screening/status").json()
    if screening["enabled"]:
        c.post("/api/v1/screening/jobs", json={}).raise_for_status()
        print(f"Screened mapped farms with provider: {screening['provider']}"
              + (" (DEMO results, not real)" if screening["demo"] else ""))
    else:
        print("Deforestation screening is off (EUDR_SCREENING_PROVIDER=none) — plots left unscreened.")

    for s in (s1, s2):
        r = c.post(
            "/api/v1/documents/upload",
            data={"document_type": "export_certificate", "linked_to_type": "shipment", "linked_to_id": s["id"]},
            files={"file": ("export_certificate.pdf", b"%PDF-1.4\n% demo export certificate\n", "application/pdf")},
        )
        r.raise_for_status()
        c.post(f"/api/v1/shipments/{s['id']}/assess").raise_for_status()

    print(f"Demo data loaded. Sign in with {EMAIL} / {PASSWORD}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
