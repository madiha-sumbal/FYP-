import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    StyleSheet,
    Dimensions,
    Modal,
    ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline } from "react-native-maps";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

// Google Maps API Service
const googleMapsService = {
    // Decode polyline from Google Maps
    decodePolyline(encoded) {
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({
                latitude: lat * 1e-5,
                longitude: lng * 1e-5,
            });
        }
        
        return points;
    },

    // Get route between multiple points using Google Maps Directions API
    async getRouteWithWaypoints(waypoints) {
        try {
            if (waypoints.length < 2) return [];

            const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
            const destination = `${waypoints[waypoints.length-1].latitude},${waypoints[waypoints.length-1].longitude}`;
            
            let waypointsParam = '';
            if (waypoints.length > 2) {
                const viaPoints = waypoints.slice(1, -1).map(wp => 
                    `${wp.latitude},${wp.longitude}`
                ).join('|');
                waypointsParam = `&waypoints=${viaPoints}`;
            }
            
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`
            );
            
            const data = await response.json();
            
            if (data.routes && data.routes[0]) {
                const points = data.routes[0].overview_polyline.points;
                return this.decodePolyline(points);
            }
            return [];
        } catch (error) {
            console.error('Error fetching route with waypoints:', error);
            return [];
        }
    },

    // Geocode address to coordinates
    async getGeocodeFromAddress(address) {
        try {
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`
            );
            
            const data = await response.json();
            
            if (data.results && data.results[0]) {
                const location = data.results[0].geometry.location;
                return {
                    latitude: location.lat,
                    longitude: location.lng,
                    address: data.results[0].formatted_address,
                };
            }
            return null;
        } catch (error) {
            console.error('Error geocoding address:', error);
            return null;
        }
    },

    // Get distance and ETA between two points
    async getDistanceAndETA(origin, destination) {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&departure_time=now`
            );
            
            const data = await response.json();
            
            if (data.rows && data.rows[0] && data.rows[0].elements[0]) {
                const element = data.rows[0].elements[0];
                if (element.status === 'OK') {
                    return {
                        distance: element.distance?.text || 'Unknown',
                        duration: element.duration?.text || 'Unknown',
                        durationInTraffic: element.duration_in_traffic?.text || element.duration?.text || 'Unknown'
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error fetching distance matrix:', error);
            return null;
        }
    },

    // Get optimized route between multiple points
    async getOptimizedRoute(waypoints, optimize = true) {
        try {
            if (waypoints.length < 2) return { route: [], distance: '0 km', duration: '0 min' };

            const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
            const destination = `${waypoints[waypoints.length-1].latitude},${waypoints[waypoints.length-1].longitude}`;
            
            let waypointsParam = '';
            if (waypoints.length > 2) {
                const viaPoints = waypoints.slice(1, -1).map(wp => 
                    `${wp.latitude},${wp.longitude}`
                ).join('|');
                waypointsParam = `&waypoints=${optimize ? 'optimize:true|' : ''}${viaPoints}`;
            }
            
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`
            );
            
            const data = await response.json();
            
            if (data.routes && data.routes[0]) {
                const points = data.routes[0].overview_polyline.points;
                const route = this.decodePolyline(points);
                
                // Calculate total distance and duration
                let totalDistance = 0;
                let totalDuration = 0;
                
                if (data.routes[0].legs) {
                    data.routes[0].legs.forEach(leg => {
                        totalDistance += leg.distance?.value || 0;
                        totalDuration += leg.duration?.value || 0;
                    });
                }
                
                return {
                    route,
                    distance: `${(totalDistance / 1000).toFixed(1)} km`,
                    duration: `${Math.ceil(totalDuration / 60)} min`
                };
            }
            return { route: [], distance: '0 km', duration: '0 min' };
        } catch (error) {
            console.error('Error fetching optimized route:', error);
            return { route: [], distance: '0 km', duration: '0 min' };
        }
    }
};

export default function AssignRoutesScreen({ navigation }) {
    const [selectedTab, setSelectedTab] = useState("drivers");
    const [selectedShift, setSelectedShift] = useState("morning");
    const [assignments, setAssignments] = useState({});
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [driverLocations, setDriverLocations] = useState({});
    const [estimatedTimes, setEstimatedTimes] = useState({});
    const [showDriverRouteModal, setShowDriverRouteModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [driverRoutes, setDriverRoutes] = useState({});
    const [optimizedRoutes, setOptimizedRoutes] = useState({});

    // Riphah University coordinates from Google Maps API
    const [riphahUniversity, setRiphahUniversity] = useState({
        latitude: 33.6462,
        longitude: 72.9834,
        name: "Riphah International University",
        address: "Al-Mizan II, I-14, Islamabad"
    });

    // Initial map region (Islamabad)
    const ISLAMABAD_REGION = {
        latitude: 33.6844,
        longitude: 73.0479,
        latitudeDelta: 0.3,
        longitudeDelta: 0.3,
    };

    // Load Riphah University coordinates from Google Maps on mount
    useEffect(() => {
        loadRiphahCoordinates();
    }, []);

    const loadRiphahCoordinates = async () => {
        try {
            const geocode = await googleMapsService.getGeocodeFromAddress("Riphah International University I-14 Islamabad");
            if (geocode) {
                setRiphahUniversity({
                    ...geocode,
                    name: "Riphah International University",
                    address: geocode.address
                });
            }
        } catch (error) {
            console.error('Error loading Riphah coordinates:', error);
        }
    };

    // Drivers data with areas to geocode
    const drivers = useMemo(() => [
        { 
            id: "driver-1", 
            name: "Ahmed Khan", 
            vehicle: "Toyota Hiace", 
            capacity: 12,
            currentLoad: 0,
            routeSector: "Blue Area Sector",
            routeRadius: ["F-7 Markaz Islamabad", "F-8 Markaz Islamabad", "Blue Area Islamabad", "Jinnah Super Market Islamabad"],
            color: "#3498DB",
            startLocation: null, // Will be geocoded
            routeColor: "#3498DB",
            contact: "+92-300-1234567",
            rating: 4.8
        },
        { 
            id: "driver-2", 
            name: "Hassan Ali", 
            vehicle: "Suzuki Every", 
            capacity: 8,
            currentLoad: 0,
            routeSector: "Gulberg Sector",
            routeRadius: ["Gulberg III Lahore", "Gulberg IV Lahore", "Main Boulevard Gulberg Lahore", "Kalma Chowk Lahore"],
            color: "#27AE60",
            startLocation: null, // Will be geocoded
            routeColor: "#27AE60",
            contact: "+92-300-2345678",
            rating: 4.6
        },
        { 
            id: "driver-3", 
            name: "Ali Raza", 
            vehicle: "Suzuki Bolan", 
            capacity: 6,
            currentLoad: 0,
            routeSector: "DHA Sector", 
            routeRadius: ["DHA Phase 1 Lahore", "DHA Phase 2 Lahore", "DHA Phase 3 Lahore", "Y-Block DHA Lahore"],
            color: "#E74C3C",
            startLocation: null, // Will be geocoded
            routeColor: "#E74C3C",
            contact: "+92-300-3456789",
            rating: 4.9
        },
        { 
            id: "driver-4", 
            name: "Usman Malik", 
            vehicle: "Toyota Corolla", 
            capacity: 4,
            currentLoad: 0,
            routeSector: "Johar Town Sector",
            routeRadius: ["Johar Town Lahore", "Wapda Town Lahore", "Model Town Lahore", "Faisal Town Lahore"],
            color: "#F39C12",
            startLocation: null, // Will be geocoded
            routeColor: "#F39C12",
            contact: "+92-300-4567890",
            rating: 4.7
        },
    ], []);

    // Passengers with addresses to geocode
    const passengers = useMemo(() => [
        // Blue Area Sector Passengers
        { 
            id: "blue-p1", 
            name: "Ahmad Ali", 
            address: "F-8 Markaz Islamabad", 
            sector: "Blue Area Sector",
            university: "Riphah University",
            pickupTime: "8:15 AM",
            driverSector: "Blue Area Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 1
        },
        { 
            id: "blue-p2", 
            name: "Sara Khan", 
            address: "Blue Area Islamabad", 
            sector: "Blue Area Sector",
            university: "Riphah University", 
            pickupTime: "8:00 AM",
            driverSector: "Blue Area Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 2
        },
        { 
            id: "blue-p3", 
            name: "Bilal Ahmed", 
            address: "Jinnah Super Market Islamabad", 
            sector: "Blue Area Sector",
            university: "Riphah University",
            pickupTime: "8:30 AM",
            driverSector: "Blue Area Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 3
        },

        // Gulberg Sector Passengers
        { 
            id: "gulberg-p1", 
            name: "Faisal Khan", 
            address: "Gulberg III Lahore", 
            sector: "Gulberg Sector",
            university: "Riphah University",
            pickupTime: "8:30 AM",
            driverSector: "Gulberg Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 1
        },
        { 
            id: "gulberg-p2", 
            name: "Hina Shah", 
            address: "Main Boulevard Gulberg Lahore", 
            sector: "Gulberg Sector", 
            university: "Riphah University",
            pickupTime: "8:45 AM",
            driverSector: "Gulberg Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 2
        },
        { 
            id: "gulberg-p3", 
            name: "Kamran Ali", 
            address: "Kalma Chowk Lahore", 
            sector: "Gulberg Sector",
            university: "Riphah University",
            pickupTime: "8:15 AM",
            driverSector: "Gulberg Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 3
        },

        // DHA Sector Passengers
        { 
            id: "dha-p1", 
            name: "Zainab Noor", 
            address: "DHA Phase 2 Lahore", 
            sector: "DHA Sector",
            university: "Riphah University",
            pickupTime: "8:20 AM",
            driverSector: "DHA Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 1
        },
        { 
            id: "dha-p2", 
            name: "Omar Farooq", 
            address: "Y-Block DHA Lahore", 
            sector: "DHA Sector",
            university: "Riphah University",
            pickupTime: "8:35 AM",
            driverSector: "DHA Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 2
        },
        { 
            id: "dha-p3", 
            name: "Fatima Raza", 
            address: "DHA Phase 1 Lahore", 
            sector: "DHA Sector",
            university: "Riphah University",
            pickupTime: "8:10 AM",
            driverSector: "DHA Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 3
        },

        // Johar Town Sector Passengers
        { 
            id: "johar-p1", 
            name: "Usman Sheikh", 
            address: "Johar Town Lahore", 
            sector: "Johar Town Sector",
            university: "Riphah University",
            pickupTime: "8:25 AM",
            driverSector: "Johar Town Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 1
        },
        { 
            id: "johar-p2", 
            name: "Ayesha Malik", 
            address: "Wapda Town Lahore", 
            sector: "Johar Town Sector",
            university: "Riphah University",
            pickupTime: "8:40 AM",
            driverSector: "Johar Town Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 2
        },
        { 
            id: "johar-p3", 
            name: "Haris Ahmed", 
            address: "Model Town Lahore", 
            sector: "Johar Town Sector",
            university: "Riphah University",
            pickupTime: "8:50 AM",
            driverSector: "Johar Town Sector",
            coordinates: null, // Will be geocoded
            stopOrder: 3
        },
    ], []);

    // Load all coordinates on component mount
    useEffect(() => {
        loadAllCoordinates();
    }, []);

    const loadAllCoordinates = async () => {
        setIsLoading(true);
        try {
            // Load driver start locations
            const driverPromises = drivers.map(async (driver) => {
                if (driver.routeRadius.length > 0) {
                    const geocode = await googleMapsService.getGeocodeFromAddress(driver.routeRadius[0]);
                    return { driverId: driver.id, location: geocode };
                }
                return null;
            });

            const driverResults = await Promise.all(driverPromises);
            const newDriverLocations = {};
            driverResults.forEach(result => {
                if (result && result.location) {
                    newDriverLocations[result.driverId] = result.location;
                }
            });

            // Load passenger coordinates
            const passengerPromises = passengers.map(async (passenger) => {
                const geocode = await googleMapsService.getGeocodeFromAddress(passenger.address);
                return { passengerId: passenger.id, coordinates: geocode };
            });

            const passengerResults = await Promise.all(passengerPromises);
            const updatedPassengers = passengers.map(passenger => {
                const result = passengerResults.find(r => r?.passengerId === passenger.id);
                return {
                    ...passenger,
                    coordinates: result?.coordinates || { latitude: 33.6844, longitude: 73.0479 }
                };
            });

            // Update state with loaded coordinates
            setDriverLocations(newDriverLocations);
            // Note: In a real app, you'd update passengers state with coordinates
            // For now, we'll use the geocoded coordinates dynamically

        } catch (error) {
            console.error('Error loading coordinates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const shifts = useMemo(() => [
        { id: "shift-morning", name: "Morning", time: "8:00 - 10:00 AM" },
        { id: "shift-afternoon", name: "Afternoon", time: "1:00 - 3:00 PM" },
        { id: "shift-evening", name: "Evening", time: "4:00 - 6:00 PM" },
    ], []);

    const getAssignedPassengersForDriver = useCallback((driverId) => {
        const assigned = passengers.filter(p => assignments[p.id] === driverId);
        return assigned.sort((a, b) => a.stopOrder - b.stopOrder);
    }, [assignments, passengers]);

    // Calculate optimized routes when assignments change
    useEffect(() => {
        const calculateRoutes = async () => {
            const newRoutes = {};
            const newOptimizedRoutes = {};

            for (const driver of drivers) {
                const assignedPassengers = getAssignedPassengersForDriver(driver.id);
                if (assignedPassengers.length > 0) {
                    const startLocation = driverLocations[driver.id] || { latitude: 33.6844, longitude: 73.0479 };
                    const waypoints = [
                        startLocation,
                        ...assignedPassengers.map(p => p.coordinates || { latitude: 33.6844, longitude: 73.0479 }),
                        riphahUniversity
                    ];

                    // Get optimized route from Google Maps
                    const routeData = await googleMapsService.getOptimizedRoute(waypoints, true);
                    newRoutes[driver.id] = routeData.route;
                    newOptimizedRoutes[driver.id] = {
                        distance: routeData.distance,
                        duration: routeData.duration
                    };
                } else {
                    newRoutes[driver.id] = [];
                    newOptimizedRoutes[driver.id] = { distance: '0 km', duration: '0 min' };
                }
            }

            setDriverRoutes(newRoutes);
            setOptimizedRoutes(newOptimizedRoutes);
        };

        calculateRoutes();
    }, [assignments, drivers, getAssignedPassengersForDriver, driverLocations, riphahUniversity]);

    // Simulate real-time driver locations
    useEffect(() => {
        const interval = setInterval(() => {
            const newLocations = {};
            drivers.forEach(driver => {
                const assignedPassengers = getAssignedPassengersForDriver(driver.id);
                if (assignedPassengers.length > 0 && driverRoutes[driver.id]?.length > 0) {
                    const progress = Math.min((Date.now() % 60000) / 60000, 0.8);
                    const routeIndex = Math.floor(progress * driverRoutes[driver.id].length);
                    
                    if (driverRoutes[driver.id][routeIndex]) {
                        newLocations[driver.id] = {
                            ...driverRoutes[driver.id][routeIndex],
                            heading: `En route to ${assignedPassengers[0]?.name || 'destination'}`,
                            speed: "25 km/h"
                        };
                    }
                } else {
                    newLocations[driver.id] = {
                        ...(driverLocations[driver.id] || { latitude: 33.6844, longitude: 73.0479 }),
                        heading: "Waiting for assignments",
                        speed: "0 km/h"
                    };
                }
            });
            setDriverLocations(newLocations);
        }, 3000);

        return () => clearInterval(interval);
    }, [assignments, drivers, getAssignedPassengersForDriver, driverRoutes, driverLocations]);

    // Calculate estimated times using Google Maps API
    useEffect(() => {
        const calculateEstimatedTimes = async () => {
            const newEstimatedTimes = {};
            
            for (const driver of drivers) {
                const assignedPassengers = getAssignedPassengersForDriver(driver.id);
                if (assignedPassengers.length > 0) {
                    const startLocation = driverLocations[driver.id] || { latitude: 33.6844, longitude: 73.0479 };
                    const lastPassenger = assignedPassengers[assignedPassengers.length - 1];
                    
                    if (lastPassenger?.coordinates) {
                        const etaData = await googleMapsService.getDistanceAndETA(
                            startLocation,
                            lastPassenger.coordinates
                        );
                        
                        if (etaData) {
                            // Add time for each stop (2 minutes per stop)
                            const stopTime = assignedPassengers.length * 2;
                            const totalMinutes = parseInt(etaData.duration) + stopTime;
                            const arrivalHour = 8 + Math.floor(totalMinutes / 60);
                            const arrivalMinute = totalMinutes % 60;
                            
                            newEstimatedTimes[driver.id] = {
                                totalTime: `${totalMinutes} min`,
                                arrivalTime: `~${arrivalHour}:${arrivalMinute.toString().padStart(2, '0')} AM`,
                                distance: etaData.distance
                            };
                        } else {
                            newEstimatedTimes[driver.id] = {
                                totalTime: "Calculating...",
                                arrivalTime: "Calculating...",
                                distance: "Unknown"
                            };
                        }
                    }
                } else {
                    newEstimatedTimes[driver.id] = {
                        totalTime: "0 min",
                        arrivalTime: "Not assigned",
                        distance: "0 km"
                    };
                }
            }
            
            setEstimatedTimes(newEstimatedTimes);
        };

        calculateEstimatedTimes();
    }, [assignments, drivers, getAssignedPassengersForDriver, driverLocations]);

    const getDriverAssignments = useCallback((driverId) => {
        return Object.values(assignments).filter(id => id === driverId).length;
    }, [assignments]);

    const getPassengersForDriverSector = useCallback((driverSector) => {
        return passengers.filter(p => p.sector === driverSector && !assignments[p.id]);
    }, [assignments, passengers]);

    const unassignedPassengers = useMemo(() => 
        passengers.filter(p => !assignments[p.id]), 
    [assignments, passengers]);

    const quickAssign = useCallback(async (passengerId, driverId) => {
        const passenger = passengers.find(p => p.id === passengerId);
        const driver = drivers.find(d => d.id === driverId);
        
        if (passenger && driver && passenger.sector === driver.routeSector) {
            setAssignments(prev => ({
                ...prev,
                [passengerId]: driverId
            }));
        } else {
            alert(`❌ Cannot assign! ${passenger.name} is not in ${driver.routeSector}`);
        }
    }, [drivers, passengers]);

    const removeAssignment = useCallback((passengerId) => {
        setAssignments(prev => {
            const newAssignments = { ...prev };
            delete newAssignments[passengerId];
            return newAssignments;
        });
    }, []);

    const autoAssignAll = useCallback(async () => {
        setIsLoading(true);
        try {
            const newAssignments = {};
            
            drivers.forEach(driver => {
                const sectorPassengers = getPassengersForDriverSector(driver.routeSector);
                sectorPassengers.forEach(passenger => {
                    if (getDriverAssignments(driver.id) < driver.capacity) {
                        newAssignments[passenger.id] = driver.id;
                    }
                });
            });
            
            setAssignments(newAssignments);
            setShowActionsMenu(false);
            alert("🚀 All passengers auto-assigned to their sector drivers!");
        } catch (error) {
            console.error('Error in auto assign:', error);
            alert("Error in auto assignment");
        } finally {
            setIsLoading(false);
        }
    }, [drivers, getDriverAssignments, getPassengersForDriverSector]);

    const clearAllAssignments = useCallback(() => {
        setAssignments({});
        setShowActionsMenu(false);
        alert("🗑️ All assignments cleared!");
    }, []);

    const handleSave = useCallback(() => {
        console.log("Assignments saved:", assignments);
        setShowActionsMenu(false);
        alert("✅ Routes saved successfully!");
    }, [assignments]);

    const getSectorStats = useCallback(() => {
        const stats = {};
        drivers.forEach(driver => {
            const sectorPassengers = passengers.filter(p => p.sector === driver.routeSector);
            const assignedInSector = sectorPassengers.filter(p => assignments[p.id]).length;
            stats[driver.routeSector] = {
                total: sectorPassengers.length,
                assigned: assignedInSector,
                unassigned: sectorPassengers.length - assignedInSector,
                color: driver.color
            };
        });
        return stats;
    }, [assignments, drivers, passengers]);

    const getDriverRoute = useCallback((driverId) => {
        return driverRoutes[driverId] || [];
    }, [driverRoutes]);

    const handleViewLiveTracking = useCallback(() => {
        setShowActionsMenu(false);
        
        const driversData = drivers.map(driver => ({
            ...driver,
            assignedPassengers: getAssignedPassengersForDriver(driver.id),
            currentLocation: driverLocations[driver.id] || { latitude: 33.6844, longitude: 73.0479 },
            route: driverRoutes[driver.id] || []
        }));
        
        console.log("Navigating with drivers data:", driversData);
        navigation.navigate('VanTracking', { 
            drivers: driversData,
            riphahUniversity
        });
    }, [navigation, drivers, getAssignedPassengersForDriver, driverLocations, driverRoutes, riphahUniversity]);

    const handleViewDriverRoute = useCallback((driver) => {
        setSelectedDriver(driver);
        setShowDriverRouteModal(true);
    }, []);

    const handleCloseDriverRouteModal = useCallback(() => {
        setShowDriverRouteModal(false);
        setTimeout(() => {
            setSelectedDriver(null);
        }, 100);
    }, []);

    const handleRemoveAssignmentFromModal = useCallback((passengerId) => {
        removeAssignment(passengerId);
    }, [removeAssignment]);

    const sectorStats = getSectorStats();

    // Optimize route for a specific driver
    const handleOptimizeRoute = useCallback(async (driverId) => {
        setIsLoading(true);
        try {
            const driver = drivers.find(d => d.id === driverId);
            const assignedPassengers = getAssignedPassengersForDriver(driverId);
            
            if (assignedPassengers.length > 0) {
                const startLocation = driverLocations[driverId] || { latitude: 33.6844, longitude: 73.0479 };
                const waypoints = [
                    startLocation,
                    ...assignedPassengers.map(p => p.coordinates || { latitude: 33.6844, longitude: 73.0479 }),
                    riphahUniversity
                ];

                const routeData = await googleMapsService.getOptimizedRoute(waypoints, true);
                setDriverRoutes(prev => ({
                    ...prev,
                    [driverId]: routeData.route
                }));
                
                alert(`✅ Route optimized! New distance: ${routeData.distance}, Duration: ${routeData.duration}`);
            }
        } catch (error) {
            console.error('Error optimizing route:', error);
            alert('Error optimizing route');
        } finally {
            setIsLoading(false);
        }
    }, [drivers, getAssignedPassengersForDriver, driverLocations, riphahUniversity]);

    // Individual Driver Route Modal
    const DriverRouteModal = () => (
        <Modal
            visible={showDriverRouteModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseDriverRouteModal}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleCloseDriverRouteModal}
                    >
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                        {selectedDriver?.name}'s Route
                    </Text>
                    <TouchableOpacity 
                        style={styles.optimizeButton}
                        onPress={() => handleOptimizeRoute(selectedDriver?.id)}
                    >
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.optimizeButtonText}>Optimize</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        initialRegion={ISLAMABAD_REGION}
                        showsUserLocation={false}
                    >
                        {/* Destination Marker */}
                        <Marker
                            key="destination-university"
                            coordinate={riphahUniversity}
                            title="Riphah University"
                            description="Final Destination"
                        >
                            <View style={styles.destinationMarker}>
                                <Ionicons name="school" size={20} color="#fff" />
                            </View>
                        </Marker>

                        {/* Driver Route from Google Maps */}
                        {selectedDriver && driverRoutes[selectedDriver.id] && (
                            <Polyline
                                key={`polyline-${selectedDriver.id}`}
                                coordinates={driverRoutes[selectedDriver.id]}
                                strokeColor={selectedDriver.routeColor}
                                strokeWidth={4}
                            />
                        )}

                        {/* Start Point */}
                        {selectedDriver && driverLocations[selectedDriver.id] && (
                            <Marker
                                key={`start-${selectedDriver.id}`}
                                coordinate={driverLocations[selectedDriver.id]}
                                title="Start Point"
                                description={`${selectedDriver.name}'s starting location`}
                            >
                                <View style={[styles.startMarker, { backgroundColor: selectedDriver.color }]}>
                                    <Ionicons name="play" size={16} color="#fff" />
                                </View>
                            </Marker>
                        )}

                        {/* Passenger Stops */}
                        {selectedDriver && getAssignedPassengersForDriver(selectedDriver?.id).map((passenger, index) => (
                            <Marker
                                key={`marker-${selectedDriver.id}-${passenger.id}-${index}`}
                                coordinate={passenger.coordinates || { latitude: 33.6844, longitude: 73.0479 }}
                                title={`Stop ${index + 1}: ${passenger.name}`}
                                description={`Pickup: ${passenger.pickupTime}`}
                            >
                                <View style={[styles.stopMarker, { backgroundColor: selectedDriver?.color }]}>
                                    <Text style={styles.stopNumber}>{index + 1}</Text>
                                </View>
                            </Marker>
                        ))}

                        {/* Current Driver Location */}
                        {selectedDriver && driverLocations[selectedDriver.id] && (
                            <Marker
                                key={`current-${selectedDriver.id}`}
                                coordinate={driverLocations[selectedDriver.id]}
                                title={`${selectedDriver.name} - Current Location`}
                                description={driverLocations[selectedDriver.id].heading}
                            >
                                <View style={[styles.driverMarker, { backgroundColor: selectedDriver.color }]}>
                                    <Ionicons name="car-sport" size={16} color="#fff" />
                                </View>
                            </Marker>
                        )}
                    </MapView>
                </View>

                <ScrollView style={styles.modalContent}>
                    <View style={styles.routeDetails}>
                        <Text style={styles.routeSectionTitle}>Route Information</Text>
                        <View style={styles.routeInfo}>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="car" size={20} color="#3498DB" />
                                <Text style={styles.routeInfoText}>
                                    {selectedDriver?.vehicle}
                                </Text>
                            </View>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="people" size={20} color="#27AE60" />
                                <Text style={styles.routeInfoText}>
                                    {getDriverAssignments(selectedDriver?.id)}/{selectedDriver?.capacity} passengers
                                </Text>
                            </View>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="time" size={20} color="#F39C12" />
                                <Text style={styles.routeInfoText}>
                                    {optimizedRoutes[selectedDriver?.id]?.duration || estimatedTimes[selectedDriver?.id]?.totalTime}
                                </Text>
                            </View>
                            <View style={styles.routeInfoItem}>
                                <Ionicons name="navigate" size={20} color="#9B59B6" />
                                <Text style={styles.routeInfoText}>
                                    {optimizedRoutes[selectedDriver?.id]?.distance || estimatedTimes[selectedDriver?.id]?.distance}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.stopsList}>
                        <Text style={styles.routeSectionTitle}>Pickup Stops Sequence</Text>
                        <View style={styles.stopItem}>
                            <View style={[styles.stopNumber, styles.startStop]}>
                                <Ionicons name="play" size={16} color="#fff" />
                            </View>
                            <View style={styles.stopInfo}>
                                <Text style={styles.stopName}>Start Point</Text>
                                <Text style={styles.stopAddress}>{selectedDriver?.routeSector}</Text>
                                <Text style={styles.stopTime}>🕒 8:00 AM</Text>
                            </View>
                        </View>

                        {getAssignedPassengersForDriver(selectedDriver?.id).map((passenger, index) => (
                            <View key={`stop-${passenger.id}-${index}`} style={styles.stopItem}>
                                <View style={[styles.stopNumber, { backgroundColor: selectedDriver?.color }]}>
                                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                                </View>
                                <View style={styles.stopInfo}>
                                    <Text style={styles.stopName}>{passenger.name}</Text>
                                    <Text style={styles.stopAddress}>{passenger.address}</Text>
                                    <Text style={styles.stopTime}>🕒 {passenger.pickupTime}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.removeStopButton}
                                    onPress={() => handleRemoveAssignmentFromModal(passenger.id)}
                                >
                                    <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View style={styles.stopItem}>
                            <View style={[styles.stopNumber, styles.endStop]}>
                                <Ionicons name="school" size={16} color="#fff" />
                            </View>
                            <View style={styles.stopInfo}>
                                <Text style={styles.stopName}>Riphah University</Text>
                                <Text style={styles.stopAddress}>Final Destination</Text>
                                <Text style={styles.stopTime}>🕒 {estimatedTimes[selectedDriver?.id]?.arrivalTime}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    // Actions Menu Modal
    const ActionsMenuModal = () => (
        <Modal
            visible={showActionsMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowActionsMenu(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowActionsMenu(false)}
            >
                <View style={styles.actionsMenu}>
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleSave}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                        <Text style={styles.menuItemText}>Save Routes</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={autoAssignAll}
                        disabled={isLoading}
                    >
                        <Ionicons name="rocket" size={20} color="#3498DB" />
                        <Text style={styles.menuItemText}>
                            {isLoading ? 'Auto-Assigning...' : 'Auto-Assign All'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={clearAllAssignments}
                    >
                        <Ionicons name="trash" size={20} color="#E74C3C" />
                        <Text style={styles.menuItemText}>Clear All</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleViewLiveTracking}
                    >
                        <Ionicons name="locate" size={20} color="#F39C12" />
                        <Text style={styles.menuItemText}>Live Tracking</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.menuItem, styles.cancelMenuItem]}
                        onPress={() => setShowActionsMenu(false)}
                    >
                        <Ionicons name="close" size={20} color="#7F8C8D" />
                        <Text style={[styles.menuItemText, styles.cancelMenuItemText]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Assign Routes</Text>
                <TouchableOpacity 
                    style={styles.actionsButton}
                    onPress={() => setShowActionsMenu(true)}
                >
                    <Ionicons name="ellipsis-vertical" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3498DB" />
                    <Text style={styles.loadingText}>Loading map data...</Text>
                </View>
            )}

            {/* Shifts Tabs */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.shiftsContainer}
            >
                {shifts.map(shift => (
                    <TouchableOpacity
                        key={shift.id}
                        style={[
                            styles.shiftTab,
                            selectedShift === shift.id && styles.selectedShiftTab
                        ]}
                        onPress={() => setSelectedShift(shift.id)}
                    >
                        <Text style={[
                            styles.shiftName,
                            selectedShift === shift.id && styles.selectedShiftName
                        ]}>
                            {shift.name}
                        </Text>
                        <Text style={[
                            styles.shiftTime,
                            selectedShift === shift.id && styles.selectedShiftTime
                        ]}>
                            {shift.time}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Main Content */}
            <ScrollView style={styles.content}>
                {/* Sector Statistics */}
                <View style={styles.statsContainer}>
                    <Text style={styles.sectionTitle}>Sector Overview</Text>
                    <View style={styles.statsGrid}>
                        {Object.entries(sectorStats).map(([sector, stats]) => (
                            <View key={sector} style={styles.statCard}>
                                <View style={[styles.statColor, { backgroundColor: stats.color }]} />
                                <Text style={styles.statSector}>{sector}</Text>
                                <Text style={styles.statNumbers}>
                                    {stats.assigned}/{stats.total} assigned
                                </Text>
                                <Text style={styles.statUnassigned}>
                                    {stats.unassigned} unassigned
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Drivers List */}
                <View style={styles.driversContainer}>
                    <Text style={styles.sectionTitle}>Available Drivers</Text>
                    {drivers.map(driver => {
                        const assignedCount = getDriverAssignments(driver.id);
                        const assignedPassengers = getAssignedPassengersForDriver(driver.id);
                        const availableSeats = driver.capacity - assignedCount;
                        
                        return (
                            <View key={driver.id} style={styles.driverCard}>
                                <View style={styles.driverHeader}>
                                    <View style={[styles.driverColor, { backgroundColor: driver.color }]} />
                                    <View style={styles.driverInfo}>
                                        <Text style={styles.driverName}>{driver.name}</Text>
                                        <Text style={styles.driverDetails}>
                                            {driver.vehicle} • {driver.routeSector}
                                        </Text>
                                        <Text style={styles.driverRating}>
                                            ⭐ {driver.rating} • {driver.contact}
                                        </Text>
                                    </View>
                                    <View style={styles.driverStats}>
                                        <Text style={[
                                            styles.seatCount,
                                            availableSeats === 0 ? styles.seatFull : styles.seatAvailable
                                        ]}>
                                            {assignedCount}/{driver.capacity}
                                        </Text>
                                        <Text style={styles.seatLabel}>Seats</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.driverActions}>
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => handleViewDriverRoute(driver)}
                                    >
                                        <Ionicons name="map" size={16} color="#3498DB" />
                                        <Text style={styles.actionButtonText}>View Route</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.actionButton}
                                        onPress={() => handleOptimizeRoute(driver.id)}
                                        disabled={assignedCount === 0}
                                    >
                                        <Ionicons name="refresh" size={16} color="#27AE60" />
                                        <Text style={styles.actionButtonText}>Optimize</Text>
                                    </TouchableOpacity>
                                    
                                    <View style={styles.routeInfo}>
                                        <Text style={styles.routeTime}>
                                            ⏱️ {optimizedRoutes[driver.id]?.duration || '0 min'}
                                        </Text>
                                        <Text style={styles.routeDistance}>
                                            📍 {optimizedRoutes[driver.id]?.distance || '0 km'}
                                        </Text>
                                    </View>
                                </View>
                                
                                {/* Assigned Passengers */}
                                {assignedPassengers.length > 0 && (
                                    <View style={styles.assignedPassengers}>
                                        <Text style={styles.assignedTitle}>Assigned Passengers:</Text>
                                        {assignedPassengers.map(passenger => (
                                            <View key={passenger.id} style={styles.passengerItem}>
                                                <View style={[styles.passengerDot, { backgroundColor: driver.color }]} />
                                                <Text style={styles.passengerName}>{passenger.name}</Text>
                                                <Text style={styles.passengerArea}>{passenger.address}</Text>
                                                <Text style={styles.passengerTime}>{passenger.pickupTime}</Text>
                                                <TouchableOpacity 
                                                    style={styles.removeButton}
                                                    onPress={() => removeAssignment(passenger.id)}
                                                >
                                                    <Ionicons name="close-circle" size={18} color="#ff6b6b" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Unassigned Passengers */}
                <View style={styles.passengersContainer}>
                    <Text style={styles.sectionTitle}>
                        Unassigned Passengers ({unassignedPassengers.length})
                    </Text>
                    {unassignedPassengers.map(passenger => (
                        <View key={passenger.id} style={styles.passengerCard}>
                            <View style={styles.passengerInfo}>
                                <Text style={styles.passengerName}>{passenger.name}</Text>
                                <Text style={styles.passengerArea}>{passenger.address}</Text>
                                <Text style={styles.passengerSector}>{passenger.sector}</Text>
                                <Text style={styles.passengerTime}>🕒 {passenger.pickupTime}</Text>
                            </View>
                            <View style={styles.quickAssignButtons}>
                                {drivers
                                    .filter(driver => 
                                        driver.routeSector === passenger.sector && 
                                        getDriverAssignments(driver.id) < driver.capacity
                                    )
                                    .map(driver => (
                                        <TouchableOpacity
                                            key={driver.id}
                                            style={[styles.assignButton, { backgroundColor: driver.color }]}
                                            onPress={() => quickAssign(passenger.id, driver.id)}
                                        >
                                            <Text style={styles.assignButtonText}>
                                                Assign to {driver.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                }
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Modals */}
            {ActionsMenuModal()}
            {DriverRouteModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    actionsButton: {
        padding: 4,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    shiftsContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    shiftTab: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginHorizontal: 8,
    },
    selectedShiftTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#3498DB',
    },
    shiftName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        textAlign: 'center',
    },
    selectedShiftName: {
        color: '#3498DB',
        fontWeight: '600',
    },
    shiftTime: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 2,
    },
    selectedShiftTime: {
        color: '#3498DB',
    },
    content: {
        flex: 1,
    },
    statsContainer: {
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    statColor: {
        width: 16,
        height: 4,
        borderRadius: 2,
        marginBottom: 8,
    },
    statSector: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    statNumbers: {
        fontSize: 16,
        fontWeight: '700',
        color: '#27AE60',
        marginBottom: 2,
    },
    statUnassigned: {
        fontSize: 12,
        color: '#E74C3C',
    },
    driversContainer: {
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 8,
    },
    driverCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    driverHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    driverColor: {
        width: 8,
        height: 40,
        borderRadius: 4,
        marginRight: 12,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    driverDetails: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    driverRating: {
        fontSize: 12,
        color: '#999',
    },
    driverStats: {
        alignItems: 'center',
    },
    seatCount: {
        fontSize: 18,
        fontWeight: '700',
    },
    seatFull: {
        color: '#E74C3C',
    },
    seatAvailable: {
        color: '#27AE60',
    },
    seatLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    driverActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        marginRight: 8,
    },
    actionButtonText: {
        fontSize: 12,
        color: '#333',
        marginLeft: 4,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeTime: {
        fontSize: 12,
        color: '#F39C12',
        marginRight: 8,
    },
    routeDistance: {
        fontSize: 12,
        color: '#9B59B6',
    },
    assignedPassengers: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    assignedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    passengerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    passengerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    passengerName: {
        fontSize: 14,
        color: '#333',
        marginRight: 8,
        minWidth: 100,
    },
    passengerArea: {
        fontSize: 12,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    passengerTime: {
        fontSize: 12,
        color: '#999',
        marginRight: 8,
    },
    removeButton: {
        padding: 2,
    },
    passengersContainer: {
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 8,
        marginBottom: 20,
    },
    passengerCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    passengerInfo: {
        marginBottom: 12,
    },
    passengerSector: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    quickAssignButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    assignButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
        marginBottom: 8,
    },
    assignButtonText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsMenu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: screenWidth * 0.8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
        flex: 1,
    },
    cancelMenuItem: {
        borderBottomWidth: 0,
        justifyContent: 'center',
    },
    cancelMenuItemText: {
        color: '#7F8C8D',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    optimizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27AE60',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    optimizeButtonText: {
        fontSize: 12,
        color: '#fff',
        marginLeft: 4,
        fontWeight: '500',
    },
    mapContainer: {
        height: screenHeight * 0.4,
    },
    map: {
        flex: 1,
    },
    destinationMarker: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#9B59B6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    startMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    stopMarker: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    stopNumber: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    driverMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    routeDetails: {
        marginBottom: 20,
    },
    routeSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    routeInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    routeInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '48%',
        marginBottom: 12,
    },
    routeInfoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    stopsList: {
        marginBottom: 20,
    },
    stopItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
    },
    stopInfo: {
        flex: 1,
        marginLeft: 12,
    },
    stopName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    stopAddress: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    stopTime: {
        fontSize: 12,
        color: '#999',
    },
    startStop: {
        backgroundColor: '#3498DB',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    endStop: {
        backgroundColor: '#9B59B6',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    removeStopButton: {
        padding: 4,
    }
});
