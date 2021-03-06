var refinedStationLayerVoronoi = function(){
}

refinedStationLayerVoronoi.prototype.layer    = null;
refinedStationLayerVoronoi.prototype.features = null;
refinedStationLayerVoronoi.prototype.map      = null;
refinedStationLayerVoronoi.prototype.bounds   = null;

refinedStationLayerVoronoi.prototype.AddLayer = function(map) {
   $self = this;
   this.map = map;
   var renderer = OpenLayers.Util.getParameters(window.location.href).renderer;
   renderer = (renderer) ? [renderer] : OpenLayers.Layer.Vector.prototype.renderers;

   var context = {
      getRadius: function(feature) {
         ret = (map.zoom < 9) ? 2 : 3;
         return ret;
      },
      getLabel: function(feature){
         ret = (map.zoom < 9) ? "" : feature.data.temp_f;
         return ret; //(feature.data.isValid) ? "": "INVALID";;
      },
      getStrokeWidth: function(feature){
         ret = (map.zoom < 9) ? 0:1;
         return ret;
      },
      FillColor: function(feature) {
         c = ["green", "#FFE4C4", "#DEB887",,"#DAA520", "#CD853F",  "#A0522D", "#B22222", "yellow","pink" ];
         c = ["#333333","#4D4D4D","#666666","#808080","#999999","#B2B2B2","#CCCCCC" ,"#E6E6E6","#8B8989", "#ADACAC", "#D0CFCF","#CDC9C9"];

         r = Math.floor(Math.random() * c.length);

         //return (feature.data.isValid) ? c[r]: "red";
         return c[r];
      }
   };
   var template = {
      pointRadius: "${getRadius}",
      strokeColor: "#000000",
      fillColor: "${FillColor}",
      fillOpacity: 0.4,
      strokeWidth: "${getStrokeWidth}",
      strokeDashstyle: "da}" + "shdot",
      pointerEvents: "visiblePainted",
      label: "${getLabel}",
      fontSize: "12px",
      fontFamily: "Calibri",
      fontWeight: "",
      labelYOffset: "-4"
   };
   var style = new OpenLayers.Style(template, {context: context});
   var layer = new OpenLayers.Layer.Vector('Refined Voronoi', {
      styleMap: new OpenLayers.StyleMap(style),
      renderers: renderer
   });

   this.layer = layer;
   map.addLayer(layer);

   this.LayerUpdate()

   layer.events.register("visibilitychanged", layer, function(evt) {
      if ( layer.getVisibility() ) {
         //$self.LayerUpdate()
         map.zoomToExtent(layer.getDataExtent())
      }
   })
   map.events.register('moveend', map, function() {
      //$self.LayerUpdate()
   });
   layer.setVisibility(true);

   return layer;
}

refinedStationLayerVoronoi.prototype.AddFeatures = function (data, zoomToBounds){
   lyr = this.layer;
   eval(data);
   var locs = $rs["rows"]

   lyr.removeAllFeatures()
   lyr.destroyFeatures();

   bounds = null;
   //console.log("GOT: " + locs.length)
   for(var i=0; i<locs.length; ++i) {
      var lc = locs[i];
      eval("var $rss= " + eval(lc[0]));
      if ( !$rss.coordinates||$rss.coordinates[0].length <=0|| $rss.coordinates[0][0].length<=0) {
         return
      }
      var f1 = $rss.coordinates[0][0]
      var points = [];
      for (j=0; j < f1.length; j++) {
         var p = xPoint(f1[j][0], f1[j][1]);
         points.push(p);
      }
      var ring = new OpenLayers.Geometry.LinearRing(points);
      var polygon = new OpenLayers.Geometry.Polygon([ring]);

      attr=
      {
         label:   "", //lc[1],
         isValid: "", //(""+lc[2]).startsWith('f') ? false: true,
         temp_f:  "", // lc[3],
         weather: "W" // lc[4]
      }
      var feat = new OpenLayers.Feature.Vector(polygon,attr);
      lyr.addFeatures(feat);
      if (!bounds) {
         bounds = feat.geometry.getBounds();
      } else {
         bounds.extend(feat.geometry.getBounds());
      }
   }

   if (lyr.getVisibility() && locs.length >0) {
      var b1 = map.calculateBounds();
      if (!b1.contains(bounds)) {
         map.zoomToExtent(bounds);
      }
   }
   return bounds;
}

refinedStationLayerVoronoi.prototype.LayerUpdate = function() {
   var DB_URL= "http://localhost:8080/aura1/future/db.jsp?api_key=test&";
   var DB_URL= config.WEBS + "/aura/webroot/db.jsp?api_key=test&";
   var PROXY = "../cgi-bin/proxy.py?url=";

   var e = getMapBoundedBox(true);
   var q = "select concat('''',ST_AsGeoJSON(geom), '''') as geom " +
       "from refined_weather_voronoi";

//   q = "SELECT concat('''',ST_AsGeoJSON(voronoi_geom), '''') as geom, a.station_id ,is_valid, temp_f,  weather_json, DATE(time_gmt) as dt " +
//       "FROM weather_stations a LEFT OUTER JOIN  weather b ON a.station_id = b.station_id "+
//       "WHERE is_interested=TRUE and " +
//           " (time_gmt_unix) = (select max(time_gmt_unix) from weather) and a.state='MN'"

   var url = PROXY + DB_URL + "c=1&q=" + encodeURIComponent(q);

   //console.log( PROXY + DB_URL + "q=" + (q) + " \n\ne= where geom && ST_MakeEnvelope(" + e + ")")

   var myThis = this;
   $.ajax({
      type: "GET",
      url:  url,
      timeout: 2000,
      data: 	{},
      contentType: "",
      dataType: "text",
      processdata: true,
      cache: false,
      success: function (data) {
         //console.log(data)
         myThis.AddFeatures(data, true)
      },
      error: function(xhr, stat, err) {
         console.log(" ERR:  " + xhr + ": " + stat + " " + err + " ]" + xhr.responseText)
      }
   });
}


