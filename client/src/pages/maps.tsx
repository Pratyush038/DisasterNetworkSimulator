import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import type { NetworkNode, NetworkConnection, NetworkStats } from "@/types/network";
import { locationService } from "@/lib/location-service";
import { 
  MapPin, 
  Signal, 
  Activity,
  Search,
  Network,
  Info,
  Layers,
  Zap,
  Shield,
  Satellite,
  Navigation,
  Users,
  Battery,
  Wifi,
  AlertTriangle
} from "lucide-react";

// Import Mapbox GL dynamically
let mapboxgl: any;

export default function Maps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { data: nodes = [] } = useQuery<NetworkNode[]>({
    queryKey: ["/api/nodes"],
    refetchInterval: 5000,
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/connections"],
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery<NetworkStats>({
    queryKey: ["/api/network/stats"],
    refetchInterval: 2000,
  });

  // Initialize Mapbox map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      
      try {
        // Import Mapbox CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        document.head.appendChild(link);
        
        // Import Mapbox GL
        const mapbox = await import('mapbox-gl');
        mapboxgl = mapbox.default;
        
        // Set access token
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_API_KEY;
        
        // Use current GPS location or fallback to RV College
        const centerLng = gpsLocation?.longitude || 77.4996;
        const centerLat = gpsLocation?.latitude || 12.9249;
        
        // Create map centered on user's location
        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [centerLng, centerLat],
          zoom: 15,
          pitch: 0,
          bearing: 0,
          antialias: true
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Add geolocate control
        const geolocateControl = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        });
        map.addControl(geolocateControl, 'top-right');

        // Wait for map to load
        map.on('load', () => {
          setMapLoaded(true);
          
          // Add 3D buildings layer
          if (!map.getLayer('3d-buildings')) {
            map.addLayer({
              'id': '3d-buildings',
              'source': 'composite',
              'source-layer': 'building',
              'filter': ['==', 'extrude', 'true'],
              'type': 'fill-extrusion',
              'minzoom': 14,
              'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  15,
                  0,
                  15.05,
                  ['get', 'min_height']
                ],
                'fill-extrusion-opacity': 0.6
              }
            });
          }
        });

        mapInstanceRef.current = map;
      } catch (error) {
        console.log('Mapbox failed to initialize, using fallback view');
        setMapLoaded(false);
      }
    };

    initMap();
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [gpsLocation]); // Re-initialize when GPS location changes

  // Switch map styles
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const map = mapInstanceRef.current;
      let styleUrl = '';
      
      switch (mapStyle) {
        case 'satellite':
          styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
          break;
        case 'dark':
          styleUrl = 'mapbox://styles/mapbox/dark-v11';
          break;
        default:
          styleUrl = 'mapbox://styles/mapbox/streets-v12';
      }
      
      map.setStyle(styleUrl);
    }
  }, [mapStyle, mapLoaded]);

  // Toggle 3D view
  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      const map = mapInstanceRef.current;
      map.easeTo({
        pitch: show3D ? 45 : 0,
        duration: 1000
      });
    }
  }, [show3D, mapLoaded]);

  // GPS location tracking and map centering
  useEffect(() => {
    const unsubscribe = locationService.subscribe((location) => {
      const newLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      };
      setGpsLocation(newLocation);
      
      // Update map center when location changes
      if (mapInstanceRef.current && mapLoaded) {
        mapInstanceRef.current.easeTo({
          center: [location.longitude, location.latitude],
          duration: 1000
        });
      }
    });

    locationService.getCurrentLocation().then((location) => {
      setGpsLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });
    }).catch(() => {
      // Set default to RV College location if GPS fails
      setGpsLocation({
        latitude: 12.9249,
        longitude: 77.4996,
        accuracy: 100,
      });
    });

    locationService.startWatching();
    
    return () => {
      unsubscribe();
      locationService.stopWatching();
    };
  }, []);

  // Update network markers
  useEffect(() => {
    if (!mapboxgl || !mapInstanceRef.current || !nodes.length || !mapLoaded) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add connection lines
    const connectionFeatures = connections.map(connection => {
      const fromNode = nodes.find(n => n.nodeId === connection.fromNodeId);
      const toNode = nodes.find(n => n.nodeId === connection.toNodeId);
      
      if (fromNode && toNode) {
        return {
          type: 'Feature',
          properties: {
            isActive: connection.isActive
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [fromNode.longitude, fromNode.latitude],
              [toNode.longitude, toNode.latitude]
            ]
          }
        };
      }
      return null;
    }).filter(Boolean);

    // Update or add connections source
    if (map.getSource('network-connections')) {
      map.getSource('network-connections').setData({
        type: 'FeatureCollection',
        features: connectionFeatures
      });
    } else {
      map.addSource('network-connections', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: connectionFeatures
        }
      });

      // Add connection layers
      map.addLayer({
        id: 'active-connections',
        type: 'line',
        source: 'network-connections',
        filter: ['==', ['get', 'isActive'], true],
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      map.addLayer({
        id: 'inactive-connections',
        type: 'line',
        source: 'network-connections',
        filter: ['==', ['get', 'isActive'], false],
        paint: {
          'line-color': '#6b7280',
          'line-width': 2,
          'line-opacity': 0.4,
          'line-dasharray': [2, 2]
        }
      });
    }

    // Add node markers
    nodes.forEach(node => {
      const markerEl = document.createElement('div');
      markerEl.className = 'network-marker';
      
      let iconColor = '#10b981';
      let iconEmoji = '📱';
      if (node.nodeId === "user") {
        iconColor = '#3b82f6';
        iconEmoji = '👤';
      } else if (node.name.includes("Emergency")) {
        iconColor = '#ef4444';
        iconEmoji = '🚨';
      } else if (node.name.includes("Relay")) {
        iconColor = '#8b5cf6';
        iconEmoji = '📡';
      }

      markerEl.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-lg" 
               style="background-color: ${node.isOnline ? iconColor : '#6b7280'}">
            ${iconEmoji}
          </div>
          ${node.isOnline ? `
            <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse"
                 style="background-color: ${node.signalStrength > 80 ? '#10b981' : 
                                          node.signalStrength > 50 ? '#eab308' : '#ef4444'}">
            </div>
          ` : ''}
          ${emergencyMode ? `
            <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">
              EMERGENCY
            </div>
          ` : ''}
        </div>
      `;

      const popupContent = `
        <div class="text-sm max-w-xs">
          <h3 class="font-bold text-blue-900 mb-2">${node.name}</h3>
          <div class="space-y-1">
            <div class="flex justify-between">
              <span>Status:</span>
              <span class="${node.isOnline ? 'text-green-600' : 'text-red-600'} font-semibold">
                ${node.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div class="flex justify-between">
              <span>Signal:</span>
              <span class="font-semibold">${node.signalStrength}%</span>
            </div>
            <div class="flex justify-between">
              <span>Coordinates:</span>
              <span class="text-gray-600 text-xs">${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}</span>
            </div>
            ${emergencyMode ? '<div class="mt-2 p-2 bg-red-100 rounded text-red-700 text-xs font-bold">🚨 Emergency Mode Active</div>' : ''}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([node.longitude, node.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
        .addTo(map);

      markersRef.current.set(node.nodeId, marker);
    });
  }, [nodes, connections, emergencyMode, mapLoaded]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Mapbox Container - Full height with proper z-index */}
      <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />

      {/* Fallback view if Mapbox fails */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <div className="text-lg font-semibold text-gray-700">Loading Map...</div>
            <div className="text-sm text-gray-600 mt-2">RV College of Engineering Area</div>
          </div>
        </div>
      )}

      {/* Emergency Mode Overlay */}
      {emergencyMode && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white p-2 text-center font-bold animate-pulse z-50">
          🚨 EMERGENCY MODE ACTIVE - Priority Routing & Location Broadcasting
        </div>
      )}

      {/* Control Panel - Top Left */}
      <Card className="absolute top-4 left-4 w-64 bg-white/95 backdrop-blur-sm shadow-xl z-40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Layers className="h-4 w-4 mr-2" />
            Map Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-medium">Map Style</label>
            <div className="grid grid-cols-3 gap-1">
              <Button 
                size="sm" 
                variant={mapStyle === 'streets' ? 'default' : 'outline'}
                onClick={() => setMapStyle('streets')}
                className="text-xs"
              >
                Streets
              </Button>
              <Button 
                size="sm" 
                variant={mapStyle === 'satellite' ? 'default' : 'outline'}
                onClick={() => setMapStyle('satellite')}
                className="text-xs"
              >
                <Satellite className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant={mapStyle === 'dark' ? 'default' : 'outline'}
                onClick={() => setMapStyle('dark')}
                className="text-xs"
              >
                Dark
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">3D Buildings</span>
            <Button 
              size="sm" 
              variant={show3D ? 'default' : 'outline'}
              onClick={() => setShow3D(!show3D)}
            >
              📦
            </Button>
          </div>

          <Button 
            size="sm" 
            variant={emergencyMode ? 'destructive' : 'outline'}
            onClick={() => setEmergencyMode(!emergencyMode)}
            className="w-full"
          >
            {emergencyMode ? (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Exit Emergency
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 mr-1" />
                Emergency Mode
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Network Status Panel - Top Right */}
      <Card className="absolute top-4 right-4 w-64 bg-white/95 backdrop-blur-sm shadow-xl z-40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Network Status
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md z-50" aria-describedby="network-concepts-description">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Network className="h-5 w-5 mr-2" />
                    Network Concepts
                  </DialogTitle>
                </DialogHeader>
                <div id="network-concepts-description" className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">🔄 Mesh Topology:</h4>
                    <p className="text-gray-700">Self-healing network where each device connects to multiple others, ensuring communication even when infrastructure fails.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">📊 Dijkstra's Algorithm:</h4>
                    <p className="text-gray-700">Smart pathfinding that automatically finds the best route for messages, adapting to network changes in real-time.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">📡 Packet Switching:</h4>
                    <p className="text-gray-700">Messages split into packets and sent via different paths, then reassembled - ensuring delivery even if some routes fail.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">🚨 Emergency Broadcasting:</h4>
                    <p className="text-gray-700">SOS messages use flooding protocol to reach all devices simultaneously for maximum coverage.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span>Network Health:</span>
            <div className="flex items-center gap-1">
              <Badge variant={stats && stats.connectedNodes > 8 ? "default" : "destructive"}>
                {stats?.connectedNodes || 0}/12
              </Badge>
              <span className="text-green-600">
                {stats && stats.connectedNodes > 8 ? 'Excellent' : 'Critical'}
              </span>
            </div>
          </div>
          <div className="flex justify-between">
            <span>Latency:</span>
            <span className="text-green-600">{stats?.averageLatency || 0}ms</span>
          </div>
          <div className="flex justify-between">
            <span>Algorithm:</span>
            <span className="text-purple-600">Dijkstra</span>
          </div>
        </CardContent>
      </Card>

      {/* Bottom panels with proper spacing for navigation */}
      <div className="absolute bottom-20 left-4 right-4 flex justify-between pointer-events-none z-40">
        {/* Quick Actions Panel - Bottom Left */}
        <Card className="w-64 bg-white/95 backdrop-blur-sm shadow-xl pointer-events-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center text-orange-700">
              <Users className="h-4 w-4 mr-2" />
              Disaster Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              <Button size="sm" variant="outline" className="justify-start text-xs">
                <Users className="h-3 w-3 mr-2" />
                Find Nearby Survivors
              </Button>
              <Button size="sm" variant="outline" className="justify-start text-xs">
                <MapPin className="h-3 w-3 mr-2" />
                Broadcast Location
              </Button>
              <Button size="sm" variant="outline" className="justify-start text-xs">
                <AlertTriangle className="h-3 w-3 mr-2" />
                Emergency Contacts
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Location Panel - Bottom Right */}
        <Card className="w-64 bg-white/95 backdrop-blur-sm shadow-xl pointer-events-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center text-red-700">
              <Navigation className="h-4 w-4 mr-2" />
              Location & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {gpsLocation ? (
              <>
                <div>
                  <p className="font-medium">GPS Coordinates:</p>
                  <p className="text-gray-600">{gpsLocation.latitude.toFixed(6)}°N, {gpsLocation.longitude.toFixed(6)}°E</p>
                </div>
                <div className="flex items-center justify-between">
                  <span>GPS Accuracy:</span>
                  <span className="text-green-600">{gpsLocation.accuracy.toFixed(0)}m</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-green-100 p-2 rounded">
                    <div className="text-sm">🔋 85%</div>
                  </div>
                  <div className="bg-green-100 p-2 rounded">
                    <div className="text-sm">📶 Strong</div>
                  </div>
                </div>
                <p className="text-blue-600 font-medium text-center">📍 RV College Area</p>
              </>
            ) : (
              <div className="flex items-center text-yellow-600">
                <Search className="h-3 w-3 mr-1" />
                Acquiring GPS signal...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        .network-marker {
          cursor: pointer;
          transition: transform 0.2s;
          z-index: 30;
        }
        .network-marker:hover {
          transform: scale(1.1);
        }
        .mapboxgl-popup-content {
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 45;
        }
        .mapboxgl-ctrl-group {
          z-index: 35;
        }
        .mapboxgl-ctrl-top-right {
          top: 120px;
          right: 280px;
        }
      `}</style>
    </div>
  );
}