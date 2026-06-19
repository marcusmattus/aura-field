import type { ViewStyle, StyleProp } from 'react-native';

// ---------------------------------------------------------------------------
// Core geometry
// ---------------------------------------------------------------------------

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// ---------------------------------------------------------------------------
// Map type
// ---------------------------------------------------------------------------

export type MapType = 'standard' | 'satellite' | 'hybrid' | 'terrain';

// ---------------------------------------------------------------------------
// Markers
// ---------------------------------------------------------------------------

export type MarkerColor = 'red' | 'blue' | 'green' | 'orange' | 'yellow' | 'purple' | 'cyan';

export interface MapMarker {
  /** Unique identifier for the marker */
  id?: string;
  coordinate: LatLng;
  title?: string;
  description?: string;
  /** Preset marker color */
  color?: MarkerColor;
  /** Whether the marker is draggable */
  draggable?: boolean;
  /** Opacity 0-1 */
  opacity?: number;
  /** Called when a draggable marker is released */
  onDragEnd?: (coordinate: LatLng) => void;
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

export interface MapPolyline {
  /** Unique identifier */
  id?: string;
  coordinates: LatLng[];
  /** Stroke color (CSS color string) */
  strokeColor?: string;
  /** Stroke width in points */
  strokeWidth?: number;
  /** Dashed line pattern — alternating dash/gap lengths */
  lineDashPattern?: number[];
}

export interface MapPolygon {
  /** Unique identifier */
  id?: string;
  coordinates: LatLng[];
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Fill color */
  fillColor?: string;
}

export interface MapCircle {
  /** Unique identifier */
  id?: string;
  center: LatLng;
  /** Radius in meters */
  radius: number;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Fill color */
  fillColor?: string;
}

// ---------------------------------------------------------------------------
// Press events
// ---------------------------------------------------------------------------

export interface MapPressEvent {
  coordinate: LatLng;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface MapViewProps {
  // --- Region -----------------------------------------------------------
  /** Initial region to display */
  initialRegion?: MapRegion;
  /** Controlled region */
  region?: MapRegion;
  /** Called while the region is changing (panning/zooming) */
  onRegionChange?: (region: MapRegion) => void;
  /** Called when region change completes */
  onRegionChangeComplete?: (region: MapRegion) => void;

  // --- Map appearance ----------------------------------------------------
  /** Map tile style */
  mapType?: MapType;
  /** Show traffic overlay */
  showsTraffic?: boolean;
  /** Show building footprints (where available) */
  showsBuildings?: boolean;
  /** Show indoor maps (where available) */
  showsIndoors?: boolean;
  /** Show points of interest */
  showsPointsOfInterest?: boolean;

  // --- User location -----------------------------------------------------
  /** Show the user's current location */
  showsUserLocation?: boolean;
  /** Keep the map centered on the user's location */
  followsUserLocation?: boolean;

  // --- Gesture controls --------------------------------------------------
  /** Enable scroll/pan gestures (default true) */
  scrollEnabled?: boolean;
  /** Enable zoom gestures (default true) */
  zoomEnabled?: boolean;
  /** Enable rotate gestures (default true) */
  rotateEnabled?: boolean;
  /** Enable pitch/tilt gestures (default true) */
  pitchEnabled?: boolean;

  // --- Overlays ----------------------------------------------------------
  /** Markers to display on the map */
  markers?: MapMarker[];
  /** Polylines (routes, paths) */
  polylines?: MapPolyline[];
  /** Polygons (areas, zones) */
  polygons?: MapPolygon[];
  /** Circles (radius around a point) */
  circles?: MapCircle[];

  // --- Events ------------------------------------------------------------
  /** Called when the map is tapped */
  onPress?: (event: MapPressEvent) => void;
  /** Called when the map is long-pressed */
  onLongPress?: (event: MapPressEvent) => void;
  /** Called when a marker is tapped */
  onMarkerPress?: (marker: MapMarker) => void;

  // --- Zoom (web) --------------------------------------------------------
  /** Map zoom level (web only, 1-20) */
  zoomLevel?: number;
  /** Minimum zoom level */
  minZoomLevel?: number;
  /** Maximum zoom level */
  maxZoomLevel?: number;

  // --- Style -------------------------------------------------------------
  /** Style for the container */
  style?: StyleProp<ViewStyle>;
  /** Additional class names */
  className?: string;
}

export const DEFAULT_REGION: MapRegion = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};
