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

# --- Dataset 2: Existing community gardens (Chicago Data Portal) ---
print("Fetching existing community gardens...")
url2 = "https://data.cityofchicago.org/resource/asph-fmjv.json"
params2 = {"$limit": 2000}
response2 = requests.get(url2, params=params2, timeout=30)
gardens = response2.json() if response2.status_code == 200 else []
print(f"Got {len(gardens)} gardens from city data")

# --- Dataset 3: OSM community gardens ---
print("Fetching gardens from OpenStreetMap...")
osm_query = """
[out:json][timeout:60];
(
  node["leisure"="garden"](41.64,-87.94,42.02,-87.52);
  way["leisure"="garden"](41.64,-87.94,42.02,-87.52);
  node["landuse"="allotments"](41.64,-87.94,42.02,-87.52);
  way["landuse"="allotments"](41.64,-87.94,42.02,-87.52);
);
out center;
"""
osm_response = requests.post(
    'https://overpass-api.de/api/interpreter',
    data={'data': osm_query},
    headers={'User-Agent': 'ForageApp/1.0'},
    timeout=60
)
osm_data = osm_response.json() if osm_response.status_code == 200 else {'elements': []}
print(f"Got {len(osm_data['elements'])} gardens from OSM")

garden_features = []

# Process city garden data
for g in gardens:
    try:
        lat = float(g.get('latitude', 0))
        lon = float(g.get('longitude', 0))
        if not lat and 'location' in g:
            lat = float(g['location'].get('latitude', 0))
            lon = float(g['location'].get('longitude', 0))
        if lat and lon and 41.64 < lat < 42.02 and -87.94 < lon < -87.52:
            garden_features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "layer": "garden",
                    "name": g.get('site_name', g.get('name', 'Community Garden')),
                    "address": g.get('address', 'Unknown'),
                    "ward": g.get('ward', 'Unknown'),
                    "zip": g.get('zip', ''),
                    "source": "City of Chicago",
                    "status": "Active",
                }
            })
    except:
        continue

# Process OSM garden data
for el in osm_data['elements']:
    try:
        if el['type'] == 'node':
            lat, lon = el['lat'], el['lon']
        elif el['type'] == 'way' and 'center' in el:
            lat, lon = el['center']['lat'], el['center']['lon']
        else:
            continue
        tags = el.get('tags', {})
        garden_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "layer": "garden",
                "name": tags.get('name', 'Community Garden'),
                "address": tags.get('addr:street', 'Unknown'),
                "ward": "Unknown",
                "zip": tags.get('addr:postcode', ''),
                "source": "OpenStreetMap",
                "status": "Active",
            }
        })
    except:
        continue

print(f"✅ {len(garden_features)} existing gardens found!")

# --- Combine both ---
all_features = vacant_features + garden_features
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

# Push vacant plots
seen = set()
vacant_rows = []
for f in vacant_features:
    lon, lat = f["geometry"]["coordinates"]
    p = f["properties"]
    addr = p["address"]
    if addr in seen:
        continue
    seen.add(addr)
    vacant_rows.append({
        "address": addr,
        "owner_name": p["owner"],
        "layer": "vacant",
        "source": "City of Chicago Open Data",
        "geometry": f"SRID=4326;POINT({lon} {lat})",
    })

for i in range(0, len(vacant_rows), 500):
    supabase.table("candidate_plots").upsert(vacant_rows[i:i+500], on_conflict="address").execute()
print(f"✅ Pushed {len(vacant_rows)} vacant plots to Supabase")

# Push gardens
garden_rows = []
seen_gardens = set()
for f in garden_features:
    lon, lat = f["geometry"]["coordinates"]
    p = f["properties"]
    name = p["name"]
    if name in seen_gardens:
        continue
    seen_gardens.add(name)
    garden_rows.append({
        "address": p["address"],
        "owner_name": name,
        "layer": "garden",
        "source": p["source"],
        "geometry": f"SRID=4326;POINT({lon} {lat})",
    })

for i in range(0, len(garden_rows), 500):
    supabase.table("candidate_plots").upsert(garden_rows[i:i+500], on_conflict="address").execute()
print(f"✅ Pushed {len(garden_rows)} gardens to Supabase")