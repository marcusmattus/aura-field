import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { DEFAULT_REGION } from './MapView.types';
import type {
  MapViewProps,
  MapMarker,
  MapRegion,
  MapPolyline,
  MapPolygon,
  MapCircle,
  MapType,
} from './MapView.types';

export type {
  MapViewProps,
  MapRegion,
  MapMarker,
  MapPolyline,
  MapPolygon,
  MapCircle,
  LatLng,
  MapPressEvent,
  MapType,
  MarkerColor,
} from './MapView.types';

type RNMaps = typeof import('react-native-maps');

function useNativeMaps() {
  const [maps, setMaps] = useState<RNMaps | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('react-native-maps')
      .then((m) => {
        if (mounted && m?.default && m?.Marker) setMaps(m);
        else if (mounted) setFailed(true);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { maps, failed };
}

// ---------------------------------------------------------------------------
// Marker color → Leaflet icon URL mapping
// ---------------------------------------------------------------------------
const MARKER_ICON_COLORS: Record<string, string> = {
  red: 'red',
  blue: 'blue',
  green: 'green',
  orange: 'orange',
  yellow: 'gold',
  purple: 'violet',
  cyan: 'blue',
};

function markerIconUrl(color?: string) {
  const c = MARKER_ICON_COLORS[color ?? 'red'] ?? 'red';
  return `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${c}.png`;
}

// ---------------------------------------------------------------------------
// Leaflet map type → tile URL
// ---------------------------------------------------------------------------
function tileUrl(mapType?: MapType) {
  switch (mapType) {
    case 'satellite':
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    case 'hybrid':
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    case 'terrain':
      return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
    default:
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
}

// ---------------------------------------------------------------------------
// Build the Leaflet HTML for the WebView fallback (Expo Go)
// ---------------------------------------------------------------------------
function buildLeafletHtml(
  region: MapRegion,
  markers: MapMarker[],
  polylines: MapPolyline[],
  polygons: MapPolygon[],
  circles: MapCircle[],
  options: {
    mapType?: MapType;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    minZoomLevel?: number;
    maxZoomLevel?: number;
  },
) {
  const zoom = Math.round(Math.log2(360 / region.latitudeDelta));

  const markersJs = markers
    .map((m, i) => {
      const icon = `L.icon({iconUrl:'${markerIconUrl(m.color)}',iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',shadowSize:[41,41]})`;
      const popup = m.title
        ? `.bindPopup(${JSON.stringify(m.title + (m.description ? '<br/>' + m.description : ''))})`
        : '';
      const drag = m.draggable ? ',draggable:true' : '';
      const opacity = m.opacity != null ? `,opacity:${m.opacity}` : '';
      return `var mk${i}=L.marker([${m.coordinate.latitude},${m.coordinate.longitude}],{icon:${icon}${drag}${opacity}})${popup}.addTo(map);
mk${i}.on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',index:${i}}))});
${m.draggable ? `mk${i}.on('dragend',function(e){var ll=e.target.getLatLng();window.ReactNativeWebView.postMessage(JSON.stringify({type:'dragEnd',index:${i},lat:ll.lat,lng:ll.lng}))});` : ''}`;
    })
    .join('\n');

  const polylinesJs = polylines
    .map(
      (p) =>
        `L.polyline(${JSON.stringify(p.coordinates.map((c) => [c.latitude, c.longitude]))},{color:'${p.strokeColor ?? '#007AFF'}',weight:${p.strokeWidth ?? 3}${p.lineDashPattern ? `,dashArray:'${p.lineDashPattern.join(' ')}'` : ''}}).addTo(map);`,
    )
    .join('\n');

  const polygonsJs = polygons
    .map(
      (p) =>
        `L.polygon(${JSON.stringify(p.coordinates.map((c) => [c.latitude, c.longitude]))},{color:'${p.strokeColor ?? '#007AFF'}',weight:${p.strokeWidth ?? 2},fillColor:'${p.fillColor ?? 'rgba(0,122,255,0.2)'}',fillOpacity:0.4}).addTo(map);`,
    )
    .join('\n');

  const circlesJs = circles
    .map(
      (c) =>
        `L.circle([${c.center.latitude},${c.center.longitude}],{radius:${c.radius},color:'${c.strokeColor ?? '#007AFF'}',weight:${c.strokeWidth ?? 2},fillColor:'${c.fillColor ?? 'rgba(0,122,255,0.2)'}',fillOpacity:0.4}).addTo(map);`,
    )
    .join('\n');

  const mapOptions = [
    !options.scrollEnabled ? 'dragging:false' : '',
    !options.zoomEnabled
      ? 'zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,boxZoom:false'
      : '',
    options.minZoomLevel != null ? `minZoom:${options.minZoomLevel}` : '',
    options.maxZoomLevel != null ? `maxZoom:${options.maxZoomLevel}` : '',
  ]
    .filter(Boolean)
    .join(',');

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body>
<div id="map"></div>
<script>
var map = L.map('map',{${mapOptions}}).setView([${region.latitude},${region.longitude}],${zoom});
L.tileLayer('${tileUrl(options.mapType)}',{attribution:'© OpenStreetMap'}).addTo(map);
map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'press',lat:e.latlng.lat,lng:e.latlng.lng}))});
map.on('contextmenu',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:'longPress',lat:e.latlng.lat,lng:e.latlng.lng}))});
${markersJs}
${polylinesJs}
${polygonsJs}
${circlesJs}
</script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Native MapView type mapping
// ---------------------------------------------------------------------------
const NATIVE_MAP_TYPE: Record<MapType, string> = {
  standard: 'standard',
  satellite: 'satellite',
  hybrid: 'hybrid',
  terrain: 'terrain',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MapView({
  initialRegion = DEFAULT_REGION,
  region,
  onRegionChange,
  onRegionChangeComplete,
  mapType = 'standard',
  showsTraffic = false,
  showsBuildings = true,
  showsIndoors = true,
  showsPointsOfInterest = true,
  showsUserLocation = false,
  followsUserLocation = false,
  scrollEnabled = true,
  zoomEnabled = true,
  rotateEnabled = true,
  pitchEnabled = true,
  markers = [],
  polylines = [],
  polygons = [],
  circles = [],
  onPress,
  onLongPress,
  onMarkerPress,
  minZoomLevel,
  maxZoomLevel,
  style,
  className,
}: MapViewProps) {
  const { maps, failed } = useNativeMaps();
  const activeRegion = region ?? initialRegion;

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'press' && onPress) {
        onPress({ coordinate: { latitude: data.lat, longitude: data.lng } });
      } else if (data.type === 'longPress' && onLongPress) {
        onLongPress({
          coordinate: { latitude: data.lat, longitude: data.lng },
        });
      } else if (data.type === 'markerPress' && onMarkerPress && markers[data.index]) {
        onMarkerPress(markers[data.index]);
      } else if (data.type === 'dragEnd' && markers[data.index]?.onDragEnd) {
        markers[data.index].onDragEnd!({
          latitude: data.lat,
          longitude: data.lng,
        });
      }
    } catch {
      // ignore malformed messages
    }
  };

  const leafletHtml = useMemo(
    () =>
      buildLeafletHtml(activeRegion, markers, polylines, polygons, circles, {
        mapType,
        scrollEnabled,
        zoomEnabled,
        minZoomLevel,
        maxZoomLevel,
      }),
    [
      activeRegion,
      markers,
      polylines,
      polygons,
      circles,
      mapType,
      scrollEnabled,
      zoomEnabled,
      minZoomLevel,
      maxZoomLevel,
    ],
  );

  // Fallback: WebView with Leaflet (works in Expo Go)
  if (failed || !maps) {
    return (
      <View style={style} className={className}>
        <WebView
          style={{ flex: 1 }}
          originWhitelist={['*']}
          source={{ html: leafletHtml }}
          scrollEnabled={false}
          onMessage={handleWebViewMessage}
        />
      </View>
    );
  }

  // Native maps (requires dev build)
  const RNMapView = maps.default;
  const { Marker, Polyline, Polygon, Circle } = maps;

  return (
    <View style={style} className={className}>
      <RNMapView
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        region={region}
        // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
        mapType={NATIVE_MAP_TYPE[mapType] as never}
        showsTraffic={showsTraffic}
        showsBuildings={showsBuildings}
        showsIndoors={showsIndoors}
        showsPointsOfInterest={showsPointsOfInterest}
        showsUserLocation={showsUserLocation}
        followsUserLocation={followsUserLocation}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        minZoomLevel={minZoomLevel}
        maxZoomLevel={maxZoomLevel}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={
          onPress
            ? (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
                onPress({ coordinate: e.nativeEvent.coordinate })
            : undefined
        }
        onLongPress={
          onLongPress
            ? (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
                onLongPress({ coordinate: e.nativeEvent.coordinate })
            : undefined
        }
      >
        {markers.map((marker, index) => (
          <Marker
            key={marker.id ?? index}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.color}
            draggable={marker.draggable}
            opacity={marker.opacity}
            onDragEnd={
              marker.onDragEnd
                ? (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) =>
                    marker.onDragEnd!(e.nativeEvent.coordinate)
                : undefined
            }
            onPress={onMarkerPress ? () => onMarkerPress(marker) : undefined}
          />
        ))}
        {polylines.map((polyline, index) => (
          <Polyline
            key={polyline.id ?? `polyline-${index}`}
            coordinates={polyline.coordinates}
            strokeColor={polyline.strokeColor ?? '#007AFF'}
            strokeWidth={polyline.strokeWidth ?? 3}
            lineDashPattern={polyline.lineDashPattern}
          />
        ))}
        {polygons.map((polygon, index) => (
          <Polygon
            key={polygon.id ?? `polygon-${index}`}
            coordinates={polygon.coordinates}
            strokeColor={polygon.strokeColor ?? '#007AFF'}
            strokeWidth={polygon.strokeWidth ?? 2}
            fillColor={polygon.fillColor ?? 'rgba(0,122,255,0.2)'}
          />
        ))}
        {circles.map((circle, index) => (
          <Circle
            key={circle.id ?? `circle-${index}`}
            center={circle.center}
            radius={circle.radius}
            strokeColor={circle.strokeColor ?? '#007AFF'}
            strokeWidth={circle.strokeWidth ?? 2}
            fillColor={circle.fillColor ?? 'rgba(0,122,255,0.2)'}
          />
        ))}
      </RNMapView>
    </View>
  );
}
