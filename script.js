// (function() {

/* == START MAP == */

var map = L.map('map',{
  minZoom:10
}).setView([51.0486, -114.0708], 11);

// 'labels' pane on top (z-index 650)
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;

var darkmatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19
}).addTo(map);

var darklabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  pane: 'labels', // adds to 'labels' pane
}).addTo(map);

/* == ADD LAYERS == */

var color = function(density) {
  return (density > 100) ? '#ff0000' :
         (density >  50) ? '#fe006f' :
         (density >  20) ? '#c500c3' :
         (density >  10) ? '#8935e2' :
         (density >   1) ? '#7160e1' :
         (density >   0) ? '#9992be' :
                           '#aaaaaa' ;
}

$.when(

  // restaurant points
  $.getJSON('yelp.geojson'),

  // Census polygons
  $.getJSON('nbhd.geojson')

).then(function(ajax1,ajax2) {

  var yelpjson = ajax1[0];
  var nbhdjson = ajax2[0];

  let icon = L.divIcon({className: 'icon'})
  var yelp = L.geoJson(yelpjson,{
    pointToLayer: function(feature, latlng) {
      let mk = L.marker(latlng,{icon:icon});

      let r = feature.properties;
      mk.bindPopup(`
        <h3 style="border:1px solid #aaa; color:#000;">${r.name.replace(/,|- /g, '<br>')}</h3>
        <p><strong>${r.stars} stars</strong> (${r.review_count} reviews)</p>
        <p>
          ${r.address.replace(/,|- /g, '<br>')}<br>
          ${r.city}, ${r.state} ${r.postal_code}
        </p>
      `);

      return mk;
    }
  });

  // make clusters
  var cluster = L.markerClusterGroup({

    spiderfyOnMaxZoom:false,
    disableClusteringAtZoom: 16,
    polygonOptions: {
      color: '#aaa',
      weight: 4,
      opacity: 1,
      fillOpacity: 0.5
    },

    iconCreateFunction: function (cluster) {
      var markers = cluster.getAllChildMarkers();
      var n = 0;
      for (let i = 0; i < markers.length; i++) {
        n += 1;
      }
      return L.divIcon({
        html: n,
        className: 'cluster',
        iconSize: L.point(40, 40)
      });
    }

  }).addLayer(yelp
  ).addTo(map);

  // generate heatmap
  latlngs = [];
  yelp.eachLayer(function(e) {latlngs.push(e._latlng);});
  var heat = L.heatLayer(latlngs,{
    radius: 50,
    useLocalExtrema: true
  });

  // Census communities
  var nbhd = L.geoJson(nbhdjson,{

    onEachFeature: function(feature,layer) {
      let c = feature.properties
      layer.bindPopup(`
        <p style="margin-bottom:0 !important;">Census community ${c.comm_code}</p>
        <h3 style="
          background-color:${color(c.density)};
          color:#fff;
          border: 1px solid #aaa;
          margin-top:0;
        ">${c.name}</h3>
        <p>
          ${c.count} restaurants<br>
          (${Math.round(c.density*100)/100} per sq km)
        </p>
      `)
    },

    style: function(feature) {
      let density = feature.properties.density;
      let fillColor = color(density);
      return {
        color: "#AAA",
        weight: 1,
        fillColor: fillColor,
        fillOpacity: 0.5
      }
    }

  }).addTo(map);

  // add controls

  L.control.layers({
    'Hide all'          : L.tileLayer(''),
    'Restaurants'       : yelp,
    'Clusters'          : cluster,
    'Heatmap'           : heat
  },
  {
    'Map labels'        : darklabels,
    'Census communities': nbhd
  }).addTo(map);

  var legend = L.control({position:'bottomright'});

  legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend leaflet-control-layers leaflet-bar'),
        grades = [0,1,10,20,50,100],
        labels = [];

    div.innerHTML = `
    <h4 style="margin-top:0;">
      Density of restaurants <br>
      in Census communities
    </h4>`;

    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        '<div style="background:' + color(grades[i] + 1) + '"></div> ' +
        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + ' per sq km<br>' : '+ per sq km');
    }

    return div;
  };

  legend.addTo(map);

  map.setMaxBounds(nbhd.getBounds());

});

// })();
