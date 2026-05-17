import requests
import json
import webbrowser
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

# --- Dataset 1: City-owned vacant land ---
print("Fetching city-owned vacant properties...")
url = "https://data.cityofchicago.org/resource/aksk-kvfp.json"
params = {"$limit": 5000, "$where": "ward IS NOT NULL"}
response = requests.get(url, params=params, timeout=30)
city_land = response.json() if response.status_code == 200 else []
print(f"Got {len(city_land)} city-owned properties")

vacant_features = []
for p in city_land:
    try:
        loc = p.get('location', {})
        lat = float(loc.get('latitude') or p.get('latitude', 0))
        lon = float(loc.get('longitude') or p.get('longitude', 0))
        if lat and lon and 41.64 < lat < 42.02 and -87.94 < lon < -87.52:
            vacant_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "layer": "vacant",
                    "type": p.get('property_type', 'Vacant Land'),
                    "owner": "City of Chicago",
                    "address": p.get('street_address', p.get('address', 'Unknown')),
                    "ward": p.get('ward', 'Unknown'),
                    "zip": p.get('zip_code', ''),
                    "approval": "Submit request to City of Chicago Dept of Planning & Development",
                }
            })
    except:
        continue
print(f"✅ {len(vacant_features)} vacant spaces")

# --- Dataset 2: Chicago Park District community gardens (scraped) ---
CPD_GARDENS = [
    ("Abbott Harvest Garden", "49 E 95th St, Chicago, IL 60628"),
    ("Anderson (Fred) Park Community Garden", "1611 S. Wabash Avenue, Chicago, IL 60601"),
    ("Anderson Park Harvest Garden", "3748 S Prairie Ave, Chicago, IL 60653"),
    ("Arcade Park Community Garden", "11132 S. St. Lawrence, Chicago, IL 60628"),
    ("Ashe Beach Park Community Gardens", "2701 E. 74th St., Chicago, IL 60649"),
    ("Austin Town Hall Harvest Garden", "5610 W Lake St, Chicago, IL 60644"),
    ("Berger Community Garden", "6205 N. Sheridan Rd., Chicago, IL 60660"),
    ("Brynford Park Community Gardens", "5636 N. Pulaski Rd., Chicago, IL 60646"),
    ("Chase Park Community Garden", "4701 N. Ashland Ave., Chicago, IL 60640"),
    ("Chicago Women's Park and Garden Community Garden", "1801 S. Indiana, Chicago, IL 60616"),
    ("Clara D. Schafer Park Community Garden", "8900 S. Green Bay Ave., Chicago, IL 60617"),
    ("Clarendon Community Garden", "4501 N. Clarendon Ave., Chicago, IL 60640"),
    ("Clark (Richard) Park Community Garden", "3400 N. Rockwell St., Chicago, IL 60618"),
    ("Clark Park Harvest Garden", "4615 W. Jackson Blvd., Chicago, IL 60644"),
    ("Commercial Club Community Garden", "1845 W. Rice St., Chicago, IL 60622"),
    ("Community Roots Community Garden at Skinner Park", "1331 W Adams St, Chicago, IL 60607"),
    ("Community Roots Demonstration Garden", "1331 W Monroe St., Chicago, IL 60607"),
    ("Cooper Park Harvest Garden", "11712 S. Ada Street, Chicago, IL 60643"),
    ("Cornell Garden Oasis", "4850 S. Cornell Dr, Chicago, IL 60615"),
    ("Dean Community Garden", "1344 N. Dean St., Chicago, IL 60622"),
    ("Diversey Harbor Community Garden", "2601 N Cannon Dr, Chicago, IL 60614"),
    ("Dubkin Park Community Garden", "7442 N. Ashland Ave., Chicago, IL 60626"),
    ("Eckhart Park Community Garden", "1330 W. Chicago Ave., Chicago, IL 60642"),
    ("Edgewater Beach Community Garden", "4921 N. Marine Drive, Chicago, IL 60640"),
    ("Edgewater Meadows Community Gardens", "4921 N. Marine Drive, Chicago, IL 60640"),
    ("Emerald City Gardens", "2021 N. Burling St., Chicago, IL 60614"),
    ("Fernwood Park Community Garden", "10436 S Wallace St, Chicago, IL 60628"),
    ("Flower Community Garden", "2554 W. Moffat St., Chicago, IL 60647"),
    ("Gage Harvest Garden", "2411 W. 55th St., Chicago, IL 60629"),
    ("Gladstone Park Community Gardens", "5421 N Menard Ave, Chicago, IL 60630"),
    ("Golden Gate Park Community Gardens", "131st St. and Vernon Ave., Chicago, IL 60628"),
    ("Gross Park Pollinator Rain Garden", "2708 W. Lawrence Ave., Chicago, IL 60625"),
    ("Haas Park Community Garden", "2402 N Washtenaw Ave, Chicago, IL 60647"),
    ("Harrison Park Harvest Garden", "1824 S Wood St, Chicago, IL 60608"),
    ("Hermitage Park Harvest Garden", "5839 S. Wood St., Chicago, IL 60636"),
    ("Howard Beach Park Gardens", "7519 N Eastlake Terrace, Chicago, IL 60626"),
    ("Humboldt Park Community Gardens", "1400 N Sacramento Ave, Chicago, IL 60622"),
    ("Independence Park Community Gardens", "3945 N Springfield Ave, Chicago, IL 60618"),
    ("Indian Boundary Community Gardens", "2500 W. Lunt Ave., Chicago, IL 60645"),
    ("Jackson Park Community Garden", "6401 S. Stony Island Ave., Chicago, IL 60637"),
    ("Jefferson Memorial Park Garden", "4822 N. Long Ave., Chicago, IL 60630"),
    ("Jefferson Playlot Park Community Garden", "1640 S Jefferson St, Chicago, IL 60616"),
    ("Jones Park Community Garden", "1240 S Plymouth Ct, Chicago, IL 60616"),
    ("Juneway Beach Park Garden", "7751 N Eastlake Terrace, Chicago, IL 60626"),
    ("Ken-Well Community Garden", "2945 N. Kenosha Ave., Chicago, IL 60641"),
    ("Ken-Well Harvest Garden", "2945 N. Kenosha Ave., Chicago, IL 60641"),
    ("Kenwood Park Ornamental Community Garden", "1330 E 50th St, Chicago, IL 60615"),
    ("Kenwood Park Permaculture Garden", "1330 E. 50th St., Chicago, IL 60615"),
    ("Kilbourn Community and Childrens Garden", "3501 N. Kilbourn Ave, Chicago, IL 60641"),
    ("Kosciuszko Harvest Garden", "2732 N. Avers Ave., Chicago, IL 60647"),
    ("Kosciuszko Park Community Garden", "2732 North Avers Avenue, Chicago, IL 60647"),
    ("La Guayabita Autonoma", "5100 N. Ridgeway Ave., Chicago, IL 60625"),
    ("Lake Shore Park Community Garden", "808 N. Lake Shore Drive, Chicago, IL 60611"),
    ("Lake Shore Park SOAR Gardens", "808 N. Lake Shore Drive, Chicago, IL 60611"),
    ("Lakeview Community Garden", "2845 N. Lake Shore Drive, Chicago, IL 60614"),
    ("Lindblom Harvest Garden", "6054 S. Damen Ave., Chicago, IL 60636"),
    ("Lunt Gardens", "2239 W. Lunt Ave., Chicago, IL 60645"),
    ("Mann Park Harvest Garden", "3035 E. 130th St., Chicago, IL 60633"),
    ("Mayfair Community Garden", "4550 W. Sunnyside Ave., Chicago, IL 60630"),
    ("McKiernan Garden", "10714 S. Sawyer Ave., Chicago, IL 60655"),
    ("McKinley Park Community Garden", "2210 W Pershing Rd, Chicago, IL 60609"),
    ("Meyering Park Community Garden", "7140 S. Martin Luther King Dr., Chicago, IL 60619"),
    ("Minuteman Park Harvest Garden", "5940 S. Central Ave., Chicago, IL 60638"),
    ("Moore Park Harvest Garden", "5085 W. Adams St., Chicago, IL 60644"),
    ("Moran Park Harvest Garden", "5727 S. Racine Ave., Chicago, IL 60621"),
    ("Morse Ave. Circles", "1200 W. Morse Ave., Chicago, IL 60626"),
    ("Neighbors' Garden Park Community Garden", "2533 N. Sacramento Ave., Chicago, IL 60647"),
    ("Nichols Park Chinese Garden", "1300 E. 55th St., Chicago, IL 60615"),
    ("Nichols Park Ornamental Community Garden", "1355 E 53rd St, Chicago, IL 60615"),
    ("O'Hallaren Community Garden", "8335 S. Honore St., Chicago, IL 60620"),
    ("Park 540 Community Garden", "2440 South Dearborn Street, Chicago, IL 60616"),
    ("Park No. 514 Community Garden", "1420 N. Monticello Ave., Chicago, IL 60651"),
    ("Pottawattomie Community Garden", "7340 N Rogers Ave, Chicago, IL 60626"),
    ("Printers Row Park Community Garden", "632 S. Dearborn, Chicago, IL 60605"),
    ("Rainbow Beach Victory Garden", "7900 S South Shore Drive, Chicago, IL 60617"),
    ("Ravenswood Manor Park Community Garden", "4604 N. Manor Ave., Chicago, IL 60625"),
    ("Rogers Beach Park Gardens", "7705 N Eastlake Terrace, Chicago, IL 60626"),
    ("Roscoe Community Garden", "3555 N Lake Shore Drive, Chicago, IL 60613"),
    ("Ruby Garden", "1552 W. Schreiber Ave., Chicago, IL 60626"),
    ("Rutherford Sayre Community Garden", "6871 W. Belden Ave., Chicago, IL 60707"),
    ("Senn Thorndale Garden", "1519 W. Thorndale Ave., Chicago, IL 60660"),
    ("Senn Unity Garden", "5900 N Greenview Ave, Chicago, IL 60660"),
    ("Skinner Park Harvest Garden", "1331 W Adams St, Chicago, IL 60607"),
    ("Skinner Park Tranquil Garden", "1331 W Adams St, Chicago, IL 60607"),
    ("Snowberry Park Community Garden", "1851 W. Huron St., Chicago, IL 60622"),
    ("South Lakeview Park Community Garden", "1300 W Wolfram St, Chicago, IL 60657"),
    ("South Shore Cultural Center Harvest Garden", "7059 S. South Shore Dr., Chicago, IL 60649"),
    ("The Buena Tunnel Gardens", "600 W Buena Ave, Chicago, IL 60613"),
    ("The Cooperation Operation at Park 573", "657 E 114th St, Chicago, IL 60628"),
    ("Trebes Community Garden", "2250 N. Clifton Ave, Chicago, IL 60614"),
    ("Triangle Park Community Orchard", "1750 W. Juneway Terrace, Chicago, IL 60626"),
    ("Union Park Harvest Garden", "1501 W. Randolph St., Chicago, IL 60607"),
    ("Valley Forge Harvest Garden", "7001 W. 59th St., Chicago, IL 60638"),
    ("Warren Park Community Garden", "6601 N. Western Ave., Chicago, IL 60645"),
    ("Washington Harvest Garden", "5531 S. Martin Luther King Dr., Chicago, IL 60637"),
    ("Wicker Park Community Garden", "1425 N. Damen Ave., Chicago, IL 60622"),
    ("Williams Park Harvest Garden", "2850 S State St., Chicago, IL 60616"),
    ("Winnemac Park Teaching Garden", "5100 N Leavitt St, Chicago, IL 60625"),
]

import time

def geocode(address):
    try:
        q = requests.utils.quote(address)
        r = requests.get(
            f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1&countrycodes=us",
            headers={"User-Agent": "ForageApp/1.0", "Accept-Language": "en"},
            timeout=10,
        )
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except:
        pass
    return None, None

print("Geocoding Chicago Park District gardens (this takes ~2 min)...")
garden_features = []
for name, address in CPD_GARDENS:
    lat, lon = geocode(address)
    time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
    garden_features.append({
        "properties": {"name": name, "address": address, "source": "Chicago Park District"},
        "lat": lat, "lon": lon,
    })
    status = f"  ✓ {name}" if lat else f"  ✗ {name} (no coords)"
    print(status)

print(f"✅ {len(garden_features)} CPD gardens processed")

# --- Combine both (only vacant features go on the map preview) ---
all_features = vacant_features
geojson = {"type": "FeatureCollection", "features": all_features}

with open('chicago_forage.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f)

# --- Generate map ---
html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Forage — Chicago</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: sans-serif; }}
        #map {{ height: 100vh; width: 100%; }}
        .legend {{
            background: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            line-height: 2;
            font-size: 13px;
        }}
        .legend-dot {{
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 6px;
        }}
        .info-box {{
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #2d6a4f;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
        }}
        .popup-btn {{
            display: block;
            margin-top: 6px;
            color: white;
            border: none;
            padding: 7px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            width: 100%;
            text-align: center;
        }}
    </style>
</head>
<body>
    <div class="info-box">
        Forage — {len(vacant_features)} Vacant Spaces · {len(garden_features)} Existing Gardens
    </div>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([41.83, -87.73], 11);

        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '© OpenStreetMap contributors'
        }}).addTo(map);

        var geojson = {json.dumps(geojson)};

        L.geoJSON(geojson, {{
            pointToLayer: function(feature, latlng) {{
                var isGarden = feature.properties.layer === 'garden';
                return L.circleMarker(latlng, {{
                    radius: isGarden ? 8 : 6,
                    fillColor: isGarden ? '#95d5b2' : '#1b4332',
                    color: 'white',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.9
                }});
            }},
            onEachFeature: function(feature, layer) {{
                var p = feature.properties;
                if (p.layer === 'vacant') {{
                    layer.bindPopup(`
                        <div style="min-width:210px">
                            <b style="color:#1b4332">Vacant Land</b><br>
                            <small style="color:#666">${{p.address}}</small><br><br>
                            <table style="font-size:12px;width:100%">
                                <tr><td><b>Owner</b></td><td>${{p.owner}}</td></tr>
                                <tr><td><b>Ward</b></td><td>${{p.ward}}</td></tr>
                                <tr><td><b>ZIP</b></td><td>${{p.zip}}</td></tr>
                            </table>
                            <br>
                            <div style="background:#f0f7f4;padding:8px;border-radius:4px;font-size:12px">
                                <b>Approval:</b> ${{p.approval}}
                            </div>
                            <button class="popup-btn" style="background:#1b4332;margin-top:8px"
                                onclick="alert('Start initiative feature coming soon!')">
                                Start Initiative Here
                            </button>
                        </div>
                    `);
                }} else {{
                    layer.bindPopup(`
                        <div style="min-width:210px">
                            <b style="color:#2d6a4f">${{p.name}}</b><br>
                            <small style="color:#666">${{p.address}}</small><br><br>
                            <table style="font-size:12px;width:100%">
                                <tr><td><b>Status</b></td><td>${{p.status}}</td></tr>
                                <tr><td><b>Ward</b></td><td>${{p.ward}}</td></tr>
                                <tr><td><b>Source</b></td><td>${{p.source}}</td></tr>
                            </table>
                            <button class="popup-btn" style="background:#52b788;margin-top:8px"
                                onclick="alert('Join initiative feature coming soon!')">
                                Join This Garden
                            </button>
                        </div>
                    `);
                }}
            }}
        }}).addTo(map);

        var legend = L.control({{position: 'bottomright'}});
        legend.onAdd = function() {{
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <b>Forage</b><br>
                <span class="legend-dot" style="background:#1b4332"></span> City-Owned Vacant Land<br>
                <span class="legend-dot" style="background:#95d5b2"></span> Existing Garden Initiative
            `;
            return div;
        }};
        legend.addTo(map);
    </script>
</body>
</html>
"""

with open('forage_map.html', 'w', encoding='utf-8') as f:
    f.write(html)

webbrowser.open('file://' + os.path.abspath('forage_map.html'))
print(f"Map opened! {len(vacant_features)} vacant spaces + {len(garden_features)} existing gardens")

# --- Push to Supabase ---
print("Pushing to Supabase...")

# Deduplicate by address, then drop true duplicates within ~25m
seen_addr = set()
seen_coords = []
vacant_rows = []
for f in vacant_features:
    lon, lat = f["geometry"]["coordinates"]
    p = f["properties"]
    addr = p["address"]
    if addr in seen_addr:
        continue
    # Skip if another point already exists within ~25m
    too_close = any(abs(lat - y) < 0.00025 and abs(lon - x) < 0.00025 for y, x in seen_coords)
    if too_close:
        continue
    seen_addr.add(addr)
    seen_coords.append((lat, lon))
    vacant_rows.append({
        "address": addr,
        "owner_name": p["owner"],
        "source": "City of Chicago Open Data",
        "geometry": f"SRID=4326;POINT({lon} {lat})",
    })

for i in range(0, len(vacant_rows), 500):
    supabase.table("candidate_plots").upsert(vacant_rows[i:i+500], on_conflict="address").execute()
print(f"✅ Pushed {len(vacant_rows)} vacant plots to Supabase")

# Push CPD gardens into the gardens table
garden_rows = []
seen_gardens = set()
for f in garden_features:
    p = f["properties"]
    name = p["name"]
    if name in seen_gardens:
        continue
    seen_gardens.add(name)
    garden_rows.append({
        "name": name,
        "address": p["address"],
        "lat": f["lat"],
        "lng": f["lon"],
        "description": "Chicago Park District community garden.",
    })

for i in range(0, len(garden_rows), 500):
    supabase.table("gardens").upsert(garden_rows[i:i+500], on_conflict="name").execute()
print(f"✅ Pushed {len(garden_rows)} gardens to Supabase")