import pandas as pd
import geopandas as gpd
from shapely.geometry import Point



## yelp restaurants in Calgary

json = pd.read_json(
    "yelp_dataset/business.json",
    lines = True
).query('city == "Calgary" & is_open == 1'
)

json = json[json['categories'].str.contains("Restaurants", na = False)]

yelp = gpd.GeoDataFrame(
    json.drop(['longitude','latitude'], axis = 1),
    crs = {'init': 'epsg:4326'},
    geometry = [Point(xy) for xy in zip(json.longitude, json.latitude)]
)



## count of businesses in each Census community

calgary = gpd.read_file(
    "https://data.calgary.ca/api/geospatial/ab7m-fwn6?method=export&format=GeoJSON"
)[['comm_code','name','geometry']]

counts = pd.DataFrame(
    gpd.sjoin(calgary,yelp
    ).groupby('comm_code'
    ).count(
    )
).reset_index(
)[['comm_code','index_right'
]].rename(
    index = str,
    columns={"index_right": "count"}
)

nbhd = calgary.merge(
    counts,
    how = 'left',
    on = 'comm_code'
).fillna(0
)

nbhd['density'] = nbhd['count'] / nbhd.to_crs({'init': 'epsg:3403'}).geometry.area * 1000000


## save to file

yelp.to_file("yelp.geojson", driver = 'GeoJSON')
nbhd.to_file("nbhd.geojson", driver = 'GeoJSON')
