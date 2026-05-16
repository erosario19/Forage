import requests
import json
import webbrowser
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

print("Fetching city-owned vacant properties in Chicago...")

# City of Chicago owned vacant land
url = "https://data.cityofchicago.org/resource/aksk-kvfp.json"
params = {
    "$limit": 5000,
    "$where": "ward IS NOT NULL",
}
response = requests.get(url, params=params, timeout=30)
city_land = response.json() if response.status_code == 200 else []
print(f"Got {len(city_land)} city-owned properties")

features = []

for p in city_land:
    try:
        loc = p.get('location', {})
        lat = float(loc.get('latitude') or p.get('latitude', 0))
        lon = float(loc.get('longitude') or p.get('longitude', 0))
        if lat and lon and 41.64 < lat < 42.02 and -87.94 < lon < -87.52:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
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

print(f"✅ Found {len(features)} city-owned vacant spaces!")

geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open('chicago_city_vacant.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f)

# Generate map
html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Forage — City-Owned Vacant Spaces</title>
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
            background: #2d6a4f;
            color: white;
            border: none;
            padding: 7px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            width: 100%;
            text-align: center;
        }}
        .popup-btn.secondary {{
            background: #52b788;
        }}
    </style>
</head>
<body>
    <div class="info-box">Forage — {len(features)} City-Owned Vacant Spaces in Chicago</div>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([41.83, -87.73], 11);

        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '© OpenStreetMap contributors'
        }}).addTo(map);

        var geojson = {json.dumps(geojson)};

        L.geoJSON(geojson, {{
            pointToLayer: function(feature, latlng) {{
                return L.circleMarker(latlng, {{
                    radius: 7,
                    fillColor: '#1b4332',
                    color: 'white',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.9
                }});
            }},
            onEachFeature: function(feature, layer) {{
                var p = feature.properties;
                layer.bindPopup(`
                    <div style="min-width:210px">
                        <b style="font-size:14px">${{p.type}}</b><br>
                        <small style="color:#666">${{p.address}}</small><br><br>
                        <table style="font-size:12px;width:100%">
                            <tr><td><b>Owner</b></td><td>${{p.owner}}</td></tr>
                            <tr><td><b>Ward</b></td><td>${{p.ward}}</td></tr>
                            <tr><td><b>ZIP</b></td><td>${{p.zip}}</td></tr>
                        </table>
                        <br>
                        
                    </div>
                `);
            }}
        }}).addTo(map);

        var legend = L.control({{position: 'bottomright'}});
        legend.onAdd = function() {{
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <b>Forage</b><br>
                <span class="legend-dot" style="background:#1b4332"></span> City-Owned Vacant Land
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
print("Map opened in your browser!")

# Push to Supabase
print("Pushing to Supabase...")
seen = set()
rows = []
for f in features:
    lon, lat = f["geometry"]["coordinates"]
    p = f["properties"]
    addr = p["address"]
    if addr in seen:
        continue
    seen.add(addr)
    rows.append({
        "address": addr,
        "owner_name": p["owner"],
        "source": "City of Chicago Open Data",
        "geometry": f"SRID=4326;POINT({lon} {lat})",
    })

# batch in chunks of 500 to stay under payload limits
for i in range(0, len(rows), 500):
    supabase.table("candidate_plots").upsert(rows[i:i+500], on_conflict="address").execute()

print(f"✅ Pushed {len(rows)} plots to Supabase")