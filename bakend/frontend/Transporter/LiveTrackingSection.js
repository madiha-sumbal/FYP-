import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Animated, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME';

/**
 * Live Tracking Component with Real-time Google Maps API Integration
 * Same functionality as before but powered by real GPS and Google APIs
 */
const LiveTrackingSection = ({
  vans = [],
  setVans,
  selectedVan,
  setSelectedVan,
  setStats,
  passengerResponses = [],
  stopCoordinates = {},
  styles,
  COLORS,
}) => {
  const currentVans = Array.isArray(vans) ? vans : [];
  const [isPlaying, setIsPlaying] = useState(false);
  const mapRef = useRef(null);
  
  // Real-time location tracking
  const locationWatchers = useRef({});
  
  // Google Maps route data
  const [routeData, setRouteData] = useState({});
  
  // Progress tracking for simulation fallback
  const [vanProgress, setVanProgress] = useState(() =>
    (currentVans || []).reduce((acc, van) => ({ ...acc, [van.id]: 0 }), {})
  );

  // Animated positions
  const vanPositions = useRef({});

  // ==================== INITIALIZE ANIMATED VALUES ====================
  useEffect(() => {
    currentVans.forEach((van) => {
      if (!vanPositions.current[van.id]) {
        vanPositions.current[van.id] = {
          latitude: new Animated.Value(
            (van.currentLocation && van.currentLocation.latitude) || 33.6844
          ),
          longitude: new Animated.Value(
            (van.currentLocation && van.currentLocation.longitude) || 73.0479
          ),
          rotation: new Animated.Value(0),
          scale: new Animated.Value(1),
        };
      }
    });

    // Cleanup
    Object.keys(vanPositions.current).forEach((id) => {
      if (!currentVans.find((v) => String(v.id) === String(id))) {
        delete vanPositions.current[id];
      }
    });
  }, [vans]);

  // ==================== GOOGLE POLYLINE DECODER ====================
  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  // ==================== FETCH ROUTE FROM GOOGLE DIRECTIONS API ====================
  const fetchRouteFromGoogle = useCallback(async (van) => {
    if (!van || !van.stops || van.stops.length < 2) return null;

    const stops = van.stops
      .map((s) => stopCoordinates[s])
      .filter((c) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number');

    if (stops.length < 2) return null;

    try {
      const origin = `${stops[0].latitude},${stops[0].longitude}`;
      const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
      
      const waypoints = stops
        .slice(1, -1)
        .map((s) => `${s.latitude},${s.longitude}`)
        .join('|');

      const waypointParam = waypoints ? `&waypoints=${waypoints}` : '';
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointParam}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

      console.log('🗺️ Fetching route for van:', van.name);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeCoordinates = decodePolyline(route.overview_polyline.points);
        
        console.log('✅ Route fetched:', routeCoordinates.length, 'points');
        
        return {
          coordinates: routeCoordinates,
          distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
          duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
          legs: route.legs,
        };
      } else {
        console.warn('⚠️ Google API error:', data.status);
      }
    } catch (error) {
      console.error('❌ Route fetch error:', error);
    }
    return null;
  }, [stopCoordinates]);

  // ==================== START REAL-TIME GPS TRACKING ====================
  const startRealTimeTracking = useCallback((van) => {
    if (locationWatchers.current[van.id]) return;

    console.log('📍 Starting GPS for:', van.name);

    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        
        console.log(`🚐 ${van.name}:`, latitude.toFixed(4), longitude.toFixed(4));

        const pos = vanPositions.current[van.id];
        if (pos) {
          Animated.parallel([
            Animated.timing(pos.latitude, {
              toValue: latitude,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(pos.longitude, {
              toValue: longitude,
              duration: 1000,
              useNativeDriver: false,
            }),
            Animated.timing(pos.rotation, {
              toValue: heading || 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        }

        setVans((prevVans) =>
          prevVans.map((v) =>
            v.id === van.id
              ? {
                  ...v,
                  currentLocation: { latitude, longitude },
                  speed: speed ? Math.round(speed * 3.6) : v.speed,
                  heading: heading || v.heading,
                }
              : v
          )
        );

        if (selectedVan && selectedVan.id === van.id && mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            500
          );
        }
      },
      (error) => {
        console.error('❌ GPS error:', error);
        Alert.alert('Location Error', `GPS unavailable for ${van.name}`);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 3000,
      }
    );

    locationWatchers.current[van.id] = watchId;
  }, [selectedVan, setVans]);

  // ==================== STOP GPS TRACKING ====================
  const stopRealTimeTracking = useCallback((vanId) => {
    if (locationWatchers.current[vanId]) {
      console.log('⏹️ Stopping GPS for:', vanId);
      Geolocation.clearWatch(locationWatchers.current[vanId]);
      delete locationWatchers.current[vanId];
    }
  }, []);

  // ==================== CALCULATE ETA WITH GOOGLE DISTANCE MATRIX ====================
  const calculateETA = useCallback(async (currentLocation, destination) => {
    try {
      const origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      const dest = `${destination.latitude},${destination.longitude}`;
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&departure_time=now`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const duration = data.rows[0].elements[0].duration_in_traffic || data.rows[0].elements[0].duration;
        const etaMinutes = Math.round(duration.value / 60);
        console.log('⏱️ ETA calculated:', etaMinutes, 'min');
        return etaMinutes;
      }
    } catch (error) {
      console.error('❌ ETA error:', error);
    }
    return null;
  }, []);

  // ==================== LOAD ROUTES FOR ALL VANS ====================
  useEffect(() => {
    const loadRoutes = async () => {
      console.log('🔄 Loading routes...');
      const routes = {};
      for (const van of currentVans) {
        if (van.status === 'En Route') {
          const route = await fetchRouteFromGoogle(van);
          if (route) {
            routes[van.id] = route;
          }
        }
      }
      setRouteData(routes);
      console.log('✅ Routes loaded:', Object.keys(routes).length);
    };

    if (currentVans.length > 0) {
      loadRoutes();
    }
  }, [currentVans.length, fetchRouteFromGoogle]);

  // ==================== START/STOP TRACKING ====================
  useEffect(() => {
    if (isPlaying) {
      console.log('▶️ Starting live tracking');
      currentVans.forEach((van) => {
        if (van.status === 'En Route') {
          startRealTimeTracking(van);
        }
      });
    } else {
      console.log('⏸️ Pausing tracking');
      Object.keys(locationWatchers.current).forEach((vanId) => {
        stopRealTimeTracking(vanId);
      });
    }

    return () => {
      Object.keys(locationWatchers.current).forEach((vanId) => {
        stopRealTimeTracking(vanId);
      });
    };
  }, [isPlaying, currentVans, startRealTimeTracking, stopRealTimeTracking]);

  // ==================== UPDATE ETAs PERIODICALLY ====================
  useEffect(() => {
    if (!isPlaying) return;

    const updateETAs = async () => {
      console.log('🔄 Updating ETAs...');
      for (const van of currentVans) {
        if (van.status === 'En Route' && van.currentLocation && van.stops) {
          const nextStopName = van.stops.find(s => !van.completedStops?.includes(s));
          if (nextStopName && stopCoordinates[nextStopName]) {
            const eta = await calculateETA(van.currentLocation, stopCoordinates[nextStopName]);
            if (eta !== null) {
              setVans((prevVans) =>
                prevVans.map((v) =>
                  v.id === van.id ? { ...v, eta: `${eta} min` } : v
                )
              );
            }
          }
        }
      }
    };

    updateETAs();
    const interval = setInterval(updateETAs, 30000);

    return () => clearInterval(interval);
  }, [isPlaying, currentVans, calculateETA, stopCoordinates, setVans]);

  // ==================== HELPER FUNCTIONS ====================
  const stopsToCoords = useCallback(
    (stops = []) =>
      (stops || [])
        .map((s) => stopCoordinates[s])
        .filter((c) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number'),
    [stopCoordinates]
  );

  const fitToRoute = useCallback(
    (van) => {
      if (!mapRef.current || !van) return;
      const coords = stopsToCoords(van.stops);
      if (coords.length > 1) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      } else if (coords.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: coords[0].latitude,
            longitude: coords[0].longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          1000
        );
      }
    },
    [stopsToCoords]
  );

  useEffect(() => {
    if (selectedVan) fitToRoute(selectedVan);
  }, [selectedVan, fitToRoute]);

  // ==================== RENDER ====================
  return (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Live Driver Tracking</Text>
      
      <View style={styles.controlPanel}>
        <TouchableOpacity
          style={[styles.controlButton, isPlaying ? styles.pauseButton : styles.playButton]}
          onPress={() => {
            setIsPlaying(!isPlaying);
            if (!isPlaying && selectedVan) fitToRoute(selectedVan);
          }}
        >
          <Icon name={isPlaying ? "pause" : "play-arrow"} size={20} color={COLORS.white} />
          <Text style={styles.controlButtonText}>
            {isPlaying ? "Pause" : "Start"} Live Tracking
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.activeVansText}>
          Active Vans: <Text style={styles.activeVansCount}>
            {vans.filter(v => v.status === 'En Route').length}
          </Text>
        </Text>
      </View>

      {selectedVan ? (
        <View style={styles.trackingDetailCard}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedVan(null)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          
          <View style={[styles.vanHeader, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.vanDetailName}>
              {selectedVan.name} - {selectedVan.driver}
            </Text>
            <Text style={styles.vanDetailRoute}>
              {selectedVan.route} | {selectedVan.timeSlot}
            </Text>
          </View>
          
          <View style={styles.mapContainer}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapSimulationTitle}>Live Location</Text>
              {isPlaying && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>🔴 LIVE GPS</Text>
                </View>
              )}
            </View>
            
            <MapView
              provider={PROVIDER_GOOGLE}
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: selectedVan.currentLocation?.latitude || 33.6844,
                longitude: selectedVan.currentLocation?.longitude || 73.0479,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
            >
              {/* Google Directions API Route */}
              {routeData[selectedVan.id] && (
                <Polyline
                  coordinates={routeData[selectedVan.id].coordinates}
                  strokeColor={COLORS.primary}
                  strokeWidth={4}
                />
              )}

              {/* Van Marker */}
              <Marker
                coordinate={selectedVan.currentLocation || { latitude: 33.6844, longitude: 73.0479 }}
                title={selectedVan.name}
                description={`${selectedVan.currentStop} | ETA: ${selectedVan.eta}`}
              >
                <View style={[styles.vanMarker, { borderColor: COLORS.primary }]}>
                  <Icon name="directions-car" size={30} color={COLORS.primary} />
                </View>
              </Marker>
              
              {/* Stop Markers */}
              {selectedVan.stops?.map((stop, index) => (
                <Marker
                  key={index}
                  coordinate={stopCoordinates[stop] || { latitude: 33.6844, longitude: 73.0479 }}
                  title={stop}
                >
                  <View style={styles.stopMarker}>
                    <Icon
                      name={stop === selectedVan.stops[0] ? 'flag' : 'location-pin'}
                      size={stop === selectedVan.stops[0] ? 32 : 24}
                      color={selectedVan.completedStops?.includes(stop) ? COLORS.success : COLORS.primary}
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>

          <View style={styles.vanInfoCard}>
            <Text style={styles.cardTitle}>Van Details</Text>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>Route</Text>
              <Text style={styles.vanInfoValue}>{selectedVan.route}</Text>
            </View>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>Driver</Text>
              <Text style={styles.vanInfoValue}>{selectedVan.driver}</Text>
            </View>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>Speed</Text>
              <Text style={styles.vanInfoValue}>{selectedVan.speed || 0} km/h</Text>
            </View>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>ETA</Text>
              <Text style={styles.vanInfoValue}>{selectedVan.eta}</Text>
            </View>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>Capacity</Text>
              <Text style={styles.vanInfoValue}>
                {selectedVan.passengers}/{selectedVan.capacity}
              </Text>
            </View>
            <View style={styles.vanInfoRow}>
              <Text style={styles.vanInfoLabel}>Status</Text>
              <Text style={styles.vanInfoValue}>{selectedVan.status}</Text>
            </View>
            {routeData[selectedVan.id] && (
              <View style={styles.vanInfoRow}>
                <Text style={styles.vanInfoLabel}>Distance</Text>
                <Text style={styles.vanInfoValue}>
                  {(routeData[selectedVan.id].distance / 1000).toFixed(1)} km
                </Text>
              </View>
            )}
          </View>

          {/* Passenger List */}
          {selectedVan.passengersList && selectedVan.passengersList.length > 0 && (
            <View style={styles.passengerListCard}>
              <View style={styles.passengerListHeader}>
                <Text style={styles.cardTitle}>Passengers</Text>
                <View style={styles.passengerCountBadge}>
                  <Text style={styles.passengerCountText}>
                    {selectedVan.passengersList.filter(p => p.status === 'picked').length}/{selectedVan.passengersList.length}
                  </Text>
                </View>
              </View>
              
              {selectedVan.passengersList.map((passenger, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.passengerItem,
                    passenger.status === 'picked' && styles.passengerPicked,
                    passenger.status === 'current' && styles.passengerCurrent,
                    passenger.status === 'pending' && styles.passengerPending,
                  ]}
                >
                  <View>
                    <Text style={styles.passengerName}>{passenger.name}</Text>
                    <Text style={styles.passengerTime}>
                      {passenger.pickupTime || 'Pending'}
                    </Text>
                  </View>
                  <View style={[
                    styles.passengerStatusBadge,
                    passenger.status === 'picked' && styles.statusPicked,
                    passenger.status === 'current' && styles.statusCurrent,
                    passenger.status === 'pending' && styles.statusPending,
                  ]}>
                    <Text style={styles.passengerStatusText}>
                      {passenger.status === 'picked' ? '✓ Picked' : 
                       passenger.status === 'current' ? 'Current' : 'Pending'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.selectVanText}>Select a van to track live:</Text>
          
          <MapView
            provider={PROVIDER_GOOGLE}
            style={[styles.map, { height: 220, marginBottom: 18 }]}
            initialRegion={{
              latitude: 33.6,
              longitude: 73.1,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            }}
          >
            {/* All Routes */}
            {Object.entries(routeData).map(([vanId, route]) => {
              const van = currentVans.find((v) => v.id === vanId);
              return (
                <Polyline
                  key={`route-${vanId}`}
                  coordinates={route.coordinates}
                  strokeColor={van?.color || COLORS.primary}
                  strokeWidth={3}
                />
              );
            })}

            {/* All Van Markers */}
            {vans.map((van) => (
              <Marker
                key={van.id}
                coordinate={van.currentLocation || { latitude: 33.6844, longitude: 73.0479 }}
                title={van.name}
                description={van.currentStop}
                onPress={() => setSelectedVan(van)}
              >
                <View style={[styles.vanMarker, { borderColor: COLORS.primary }]}>
                  <Icon
                    name="directions-car"
                    size={24}
                    color={
                      van.status === 'Completed' ? COLORS.success : 
                      van.status === 'En Route' ? COLORS.warning : COLORS.gray
                    }
                  />
                </View>
              </Marker>
            ))}
          </MapView>
          
          {vans.length > 0 ? vans.map((van) => (
            <TouchableOpacity
              key={van.id}
              style={[styles.vanCard, { borderColor: COLORS.primary }]}
              onPress={() => setSelectedVan(van)}
            >
              <View style={styles.vanHeader}>
                <Text style={styles.vanName}>{van.name}</Text>
                <View
                  style={[
                    styles.vanStatusBadge,
                    van.status === 'Completed' && styles.vanStatusCompleted,
                    van.status === 'En Route' && styles.vanStatusEnRoute,
                    van.status === 'Paused' && styles.vanStatusPaused,
                  ]}
                >
                  <Text style={styles.vanStatusText}>{van.status}</Text>
                </View>
              </View>
              <Text style={styles.vanDriver}>Driver: {van.driver}</Text>
              <Text style={styles.vanRoute}>Route: {van.route}</Text>
              <Text style={styles.vanLocation}>Current: {van.currentStop}</Text>
              <Text style={styles.vanPassengers}>
                {van.passengers}/{van.capacity} passengers
              </Text>
              <Text style={styles.vanEta}>ETA: {van.eta}</Text>
              {routeData[van.id] && (
                <Text style={styles.vanRoute}>
                  Distance: {(routeData[van.id].distance / 1000).toFixed(1)} km
                </Text>
              )}
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyState}>
              <Icon name="directions-car" size={48} color="#999" />
              <Text style={styles.emptyText}>No vans available for tracking</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

// ==================== ADDITIONAL STYLES ====================
// Add these to your existing styles object:
const additionalStyles = {
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
};

export default LiveTrackingSection;

// ==================== INSTALLATION INSTRUCTIONS ====================
/*
📦 REQUIRED PACKAGES:
npm install @react-native-community/geolocation

🔧 iOS SETUP:
cd ios && pod install && cd ..

Add to ios/YourApp/Info.plist:
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track van positions</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We need your location for background tracking</string>

🤖 ANDROID SETUP:
Add to android/app/src/main/AndroidManifest.xml:
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

✅ FEATURES:
- Real-time GPS tracking from device
- Google Directions API for optimal routes
- Google Distance Matrix API for live ETAs with traffic
- Polyline rendering on map
- All original functionality preserved
- Same UI/UX as before
*/