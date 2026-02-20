import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width, height } = Dimensions.get('window');
import { useNavigation } from '@react-navigation/native';

// Define colors
const COLORS = {
  primary: '#afd826',
  primaryDark: '#8fb320',
  primaryLight: '#d4e99e',
  success: '#28a745',
  warning: '#f39c12',
  danger: '#dc3545',
  white: '#ffffff',
  black: '#111111',
  gray: '#6c757d',
  lightGray: '#f8f9fa',
  border: '#e0e0e0',
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME';

// API Base URL - Update this to your actual backend URL
const API_BASE_URL = 'http://172.21.247.218:3000/api';

// API Service Functions
const apiService = {
  // Generic API call function
  async apiCall(endpoint, options = {}) {
    try {
      const token = await this.getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        ...options,
        headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Call Error:', error);
      throw error;
    }
  },

  // Google Maps API functions
  async getRouteCoordinates(start, end) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const points = data.routes[0].overview_polyline.points;
        return this.decodePolyline(points);
      }
      return [];
    } catch (error) {
      console.error('Error fetching route:', error);
      return [];
    }
  },

  async getRouteWithWaypoints(waypoints) {
    try {
      if (waypoints.length < 2) return [];
      
      const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
      const destination = `${waypoints[waypoints.length-1].latitude},${waypoints[waypoints.length-1].longitude}`;
      
      let waypointsParam = '';
      if (waypoints.length > 2) {
        const viaPoints = waypoints.slice(1, -1).map(wp => `${wp.latitude},${wp.longitude}`).join('|');
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

  async getAddressFromCoordinates(lat, lng) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Unknown location';
    }
  },

  async getDistanceMatrix(origins, destinations) {
    try {
      const originsStr = origins.map(o => `${o.latitude},${o.longitude}`).join('|');
      const destinationsStr = destinations.map(d => `${d.latitude},${d.longitude}`).join('|');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`
      );
      
      const data = await response.json();
      
      if (data.rows) {
        return data.rows.map(row => row.elements);
      }
      return [];
    } catch (error) {
      console.error('Error fetching distance matrix:', error);
      return [];
    }
  },

  async getETA(from, to) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.latitude},${from.longitude}&destinations=${to.latitude},${to.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&departure_time=now`
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
      console.error('Error fetching ETA:', error);
      return null;
    }
  },

  // Decode Google Maps polyline
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

  async getToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async setToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // Auth APIs
  async login(email, password) {
    return this.apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getProfile() {
    return this.apiCall('/profile');
  },

  async updateProfile(profileData) {
    return this.apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Dashboard APIs
  async getStats() {
    return this.apiCall('/dashboard/stats');
  },

  // Poll APIs
  async getPolls() {
    return this.apiCall('/polls');
  },

  async createPoll(pollData) {
    return this.apiCall('/polls', {
      method: 'POST',
      body: JSON.stringify(pollData),
    });
  },

  // Driver APIs
  async getDrivers() {
    return this.apiCall('/drivers');
  },

  async getDriverRequests() {
    try {
      const response = await this.apiCall('/join-requests?type=driver');
      console.log('Driver Requests API Raw Response:', response);
      return response;
    } catch (error) {
      console.error('API Error in getDriverRequests:', error);
      return []; // Always return array on error
    }
  },

  async approveDriverRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/accept`, {
      method: 'PUT',
    });
  },

  async rejectDriverRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/reject`, {
      method: 'PUT',
    });
  },

  // Passenger APIs
  async getPassengers() {
    return this.apiCall('/passengers');
  },

  async getPassengerRequests() {
    try {
      const response = await this.apiCall('/join-requests?type=passenger');
      console.log('Passenger Requests API Raw Response:', response);
      return response;
    } catch (error) {
      console.error('API Error in getPassengerRequests:', error);
      return [];
    }
  },

  async approvePassengerRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/accept`, {
      method: 'PUT',
    });
  },

  async rejectPassengerRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/reject`, {
      method: 'PUT',
    });
  },

  // Route APIs
  async getRoutes() {
    return this.apiCall('/routes');
  },

  async createRoute(routeData) {
    return this.apiCall('/routes', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  },

  async assignDriver(assignmentData) {
    return this.apiCall(`/routes/${assignmentData.routeId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  },

  // Payment APIs
  async getDriverPayments() {
    return this.apiCall('/payments?type=driver');
  },

  async getPassengerPayments() {
    return this.apiCall('/payments?type=passenger');
  },

  async sendDriverPayment(paymentData) {
    return this.apiCall('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Complaint APIs
  async getComplaints() {
    return this.apiCall('/complaints');
  },

  async replyToComplaint(complaintId, replyData) {
    return this.apiCall(`/complaints/${complaintId}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData),
    });
  },

  async resolveComplaint(complaintId) {
    return this.apiCall(`/complaints/${complaintId}/resolve`, {
      method: 'PUT',
    });
  },

  // Notification APIs
  async getNotifications() {
    return this.apiCall('/notifications');
  },

  async markNotificationAsRead(notificationId) {
    return this.apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  async getTrips() {
    try {
      const response = await this.apiCall('/trips');
      
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray(response.trips)) {
        return response.trips;
      } else if (response && Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('Unexpected trips response format:', response);
        return [];
      }
    } catch (error) {
      console.error('Error in getTrips API:', error);
      return [];
    }
  },

  async updateTripLocation(tripId, locationData) {
    return this.apiCall(`/trips/${tripId}/location`, {
      method: 'PUT',
      body: JSON.stringify(locationData),
    });
  },

  // Auto Assignment API
  async generateAutoAssignments() {
    return this.apiCall('/auto-assign', {
      method: 'POST',
    });
  },
};

// Request location permission for Android
const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Error requesting location permission:', err);
      return false;
    }
  }
  return true;
};

const TransporterDashboard = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [paymentTab, setPaymentTab] = useState('driver');
  const [responseTab, setResponseTab] = useState('passenger');
  const [slideAnim] = useState(new Animated.Value(-250));
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVan, setSelectedVan] = useState(null);
  
  // Map related states
  const [region, setRegion] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routesData, setRoutesData] = useState({});
  const [stopCoordinates, setStopCoordinates] = useState({});
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);

  // Profile State
  const [profile, setProfile] = useState({
    name: 'Loading...',
    email: 'Loading...',
    phone: 'Loading...',
    company: 'Loading...',
    registrationDate: 'Loading...',
    address: 'Loading...',
    profileImage: '',
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState({
    activeDrivers: 0,
    totalPassengers: 0,
    completedTrips: 0,
    ongoingTrips: 0,
    complaints: 0,
    paymentsReceived: 0,
    paymentsPending: 0,
  });

  // Custom Time Slots for Polls
  const [customTimeSlots, setCustomTimeSlots] = useState(['07:00 AM', '07:30 AM', '08:00 AM']);
  const [newTimeSlot, setNewTimeSlot] = useState('');

  // Poll State
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({
    title: '',
    selectedSlots: [],
    closingTime: '',
  });

  // Passenger Responses
  const [passengerResponses, setPassengerResponses] = useState([]);

  // Driver Availability
  const [driverAvailability, setDriverAvailability] = useState([]);

  // Routes
  const [routes, setRoutes] = useState([]);
  const [newRoute, setNewRoute] = useState({ name: '', stops: '' });

  // Driver & Passenger Requests - FIXED VERSION
  const [driverRequests, setDriverRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);

  // Payments
  const [driverPayments, setDriverPayments] = useState([]);
  const [passengerPayments, setPassengerPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({ driver: '', amount: '', mode: 'Cash' });

  // Complaints
  const [complaints, setComplaints] = useState([]);
  const [newReply, setNewReply] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState([]);

  // Live Tracking
  const [vans, setVans] = useState([]);
  const [vanPositions, setVanPositions] = useState({});

  // Auto Assignment State
  const [autoAssignments, setAutoAssignments] = useState([]);
  const [unassignedInAuto, setUnassignedInAuto] = useState([]);
  const [selectedAutoRoute, setSelectedAutoRoute] = useState(null);
  const [viewMode, setViewMode] = useState('manual');

  // Initialize with location permission
  useEffect(() => {
    const initialize = async () => {
      await requestLocationPermission();
      loadAllData();
    };
    initialize();
  }, []);

  // Calculate routes when vans change
  useEffect(() => {
    if (vans.length > 0) {
      calculateRoutes();
    }
  }, [vans]);

  const calculateRoutes = async () => {
    try {
      const routePromises = vans.map(async (van) => {
        if (van.stops && van.stops.length >= 2) {
          // Convert stop addresses to coordinates using Google Maps API
          const coordinates = await Promise.all(
            van.stops.map(async (stop) => {
              if (stop.coordinates) {
                return stop.coordinates;
              } else {
                // Geocode the address
                const geocode = await apiService.getGeocodeFromAddress(stop);
                return geocode || { latitude: 33.6844, longitude: 73.0479 };
              }
            })
          );

          // Get route with all waypoints
          const route = await apiService.getRouteWithWaypoints(coordinates);
          return { vanId: van.id, route, coordinates };
        }
        return { vanId: van.id, route: [] };
      });

      const results = await Promise.all(routePromises);
      const routesMap = {};
      const stopsMap = {};
      
      results.forEach(({ vanId, route, coordinates }) => {
        routesMap[vanId] = route;
        if (coordinates) {
          vans.find(v => v.id === vanId)?.stops?.forEach((stop, index) => {
            stopsMap[stop] = coordinates[index];
          });
        }
      });
      
      setRoutesData(routesMap);
      setStopCoordinates(stopsMap);
    } catch (error) {
      console.error('Error calculating routes:', error);
    }
  };

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadProfile(),
        loadStats(),
        loadPolls(),
        loadPassengers(),
        loadDrivers(),
        loadRoutes(),
        loadDriverRequests(),
        loadPassengerRequests(),
        loadDriverPayments(),
        loadPassengerPayments(),
        loadComplaints(),
        loadNotifications(),
        loadTrips(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: loadDriverRequests function
  const loadDriverRequests = async () => {
    try {
      const requestsData = await apiService.getDriverRequests();
      
      console.log('Driver Requests Raw Data:', requestsData);
      
      // ✅ Simple safe check for all possible response formats
      const dataArray = 
        Array.isArray(requestsData) ? requestsData :
        requestsData?.data ? requestsData.data :
        requestsData?.requests ? requestsData.requests :
        requestsData?.result ? requestsData.result :
        [];
      
      console.log('Processed Driver Requests Array:', dataArray);
      
      const pendingRequests = dataArray.filter(req => req && req.status === 'pending');
      setDriverRequests(pendingRequests);
      
    } catch (error) {
      console.error('Error loading driver requests:', error);
      setDriverRequests([]);
    }
  };

  // FIXED: loadPassengerRequests function
  const loadPassengerRequests = async () => {
    try {
      const requestsData = await apiService.getPassengerRequests();
      
      console.log('Passenger Requests Raw Data:', requestsData);
      
      // ✅ Simple safe check for all possible response formats
      const dataArray = 
        Array.isArray(requestsData) ? requestsData :
        requestsData?.data ? requestsData.data :
        requestsData?.requests ? requestsData.requests :
        requestsData?.result ? requestsData.result :
        [];
      
      console.log('Processed Passenger Requests Array:', dataArray);
      
      const pendingRequests = dataArray.filter(req => req && req.status === 'pending');
      setPassengerRequests(pendingRequests);
      
    } catch (error) {
      console.error('Error loading passenger requests:', error);
      setPassengerRequests([]);
    }
  };

  const loadTrips = async () => {
    try {
      const tripsData = await apiService.getTrips();
      
      const tripsArray = Array.isArray(tripsData) ? tripsData : 
                        (tripsData.trips || tripsData.data || []);
      
      console.log('Total trips found:', tripsArray.length);
      
      // Convert trips to vans format with Google Maps API integration
      const vansData = await Promise.all(tripsArray.map(async (trip) => {
        const passengers = Array.isArray(trip.passengers) ? trip.passengers : [];
        const pickedPassengers = passengers.filter(p => p && (p.status === 'picked' || p.status === 'current'));
        
        // Get current location from Google Maps API if available
        let currentLocation;
        if (trip.currentLocation && trip.currentLocation.coordinates) {
          currentLocation = {
            latitude: trip.currentLocation.coordinates[1],
            longitude: trip.currentLocation.coordinates[0],
          };
        } else if (trip.currentLocation) {
          currentLocation = trip.currentLocation;
        } else if (trip.currentStop) {
          // Geocode current stop address
          const geocode = await apiService.getGeocodeFromAddress(trip.currentStop);
          currentLocation = geocode || { latitude: 33.6844, longitude: 73.0479 };
        } else {
          currentLocation = { latitude: 33.6844, longitude: 73.0479 };
        }

        // Process stops with Google Maps geocoding
        const stops = Array.isArray(trip.stops) ? trip.stops : [];
        const stopCoordinatesPromises = stops.map(async (stop) => {
          if (typeof stop === 'object' && stop.coordinates) {
            return stop;
          } else {
            const geocode = await apiService.getGeocodeFromAddress(stop);
            return {
              name: stop,
              coordinates: geocode || { latitude: 33.6844, longitude: 73.0479 },
              address: geocode?.address || stop
            };
          }
        });

        const processedStops = await Promise.all(stopCoordinatesPromises);

        // Calculate ETA using Google Maps API
        let eta = 'Unknown';
        if (processedStops.length > 0 && currentLocation) {
          const nextStop = processedStops.find(s => 
            !trip.completedStops?.includes(s.name)
          ) || processedStops[0];
          
          if (nextStop.coordinates) {
            const etaData = await apiService.getETA(currentLocation, nextStop.coordinates);
            eta = etaData?.durationInTraffic || etaData?.duration || 'Unknown';
          }
        }

        return {
          id: trip._id || trip.id,
          name: `Van ${trip.vehicleNumber || trip.driverName || 'Unknown'}`,
          driver: trip.driverName || 'Unknown Driver',
          route: trip.routeName || 'Unknown Route',
          timeSlot: trip.timeSlot || 'Not specified',
          status: trip.status || 'unknown',
          passengers: pickedPassengers.length,
          capacity: trip.capacity || 8,
          currentStop: trip.currentStop || 'Not specified',
          stops: processedStops,
          completedStops: Array.isArray(trip.completedStops) ? trip.completedStops : [],
          currentLocation,
          speed: trip.speed || 0,
          eta: eta,
          color: getVanColor(trip.status),
          passengersList: passengers,
          vehicle: trip.vehicleType || 'Van',
          vehicleNumber: trip.vehicleNumber || 'N/A',
          driverContact: trip.driverContact || 'N/A'
        };
      }));
      
      console.log('Processed vans:', vansData.length);
      setVans(vansData);
      
    } catch (error) {
      console.error('Error loading trips:', error);
      setVans([]);
    }
  };

  const getVanColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#28a745'; // Green
      case 'idle': return '#f39c12';   // Orange
      case 'offline': return '#dc3545'; // Red
      case 'completed': return '#17a2b8'; // Blue
      default: return '#6c757d'; // Gray
    }
  };

  // Other loading functions
  const loadProfile = async () => {
    try {
      const profileData = await apiService.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPolls = async () => {
    try {
      const pollsData = await apiService.getPolls();
      setPolls(pollsData);
    } catch (error) {
      console.error('Error loading polls:', error);
    }
  };

  const loadPassengers = async () => {
    try {
      const passengersData = await apiService.getPassengers();
      setPassengerResponses(passengersData);
    } catch (error) {
      console.error('Error loading passengers:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const driversData = await apiService.getDrivers();
      setDriverAvailability(driversData);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadRoutes = async () => {
    try {
      const routesData = await apiService.getRoutes();
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const loadDriverPayments = async () => {
    try {
      const paymentsData = await apiService.getDriverPayments();
      setDriverPayments(paymentsData);
    } catch (error) {
      console.error('Error loading driver payments:', error);
    }
  };

  const loadPassengerPayments = async () => {
    try {
      const paymentsData = await apiService.getPassengerPayments();
      setPassengerPayments(paymentsData);
    } catch (error) {
      console.error('Error loading passenger payments:', error);
    }
  };

  const loadComplaints = async () => {
    try {
      const complaintsData = await apiService.getComplaints();
      setComplaints(complaintsData);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsData = await apiService.getNotifications();
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Map functions
  const focusOnVan = (van) => {
    if (mapRef.current && van.currentLocation) {
      mapRef.current.animateToRegion({
        latitude: van.currentLocation.latitude,
        longitude: van.currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const showAllVans = () => {
    if (mapRef.current && vans.length > 0) {
      const coordinates = vans.map(van => van.currentLocation).filter(Boolean);
      if (coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  };

  const updateVanLocation = async (vanId, newLocation) => {
    try {
      await apiService.updateTripLocation(vanId, newLocation);
      
      setVans(prevVans =>
        prevVans.map(van =>
          van.id === vanId
            ? { ...van, currentLocation: newLocation }
            : van
        )
      );
    } catch (error) {
      console.error('Error updating van location:', error);
    }
  };

  // Add new stop using Google Maps API
  const addNewStop = async (stopName) => {
    try {
      const geocode = await apiService.getGeocodeFromAddress(stopName);
      if (geocode) {
        const newStop = {
          name: stopName,
          coordinates: geocode,
          address: geocode.address
        };
        
        // Update stop coordinates
        setStopCoordinates(prev => ({
          ...prev,
          [stopName]: geocode
        }));
        
        return newStop;
      }
    } catch (error) {
      console.error('Error adding new stop:', error);
    }
    return null;
  };

  // Render Map View
  const renderMapView = () => {
    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onMapReady={() => setIsMapReady(true)}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          initialRegion={region}
          customMapStyle={[]}
        >
          {/* Render van markers */}
          {vans.map((van) => (
            <Marker
              key={van.id}
              coordinate={van.currentLocation}
              title={van.name}
              description={`Driver: ${van.driver}\nRoute: ${van.route}\nStatus: ${van.status}`}
              onPress={() => setSelectedVan(van)}
            >
              <View style={[styles.vanMarker, { backgroundColor: van.color }]}>
                <Icon name="directions-bus" size={20} color="#fff" />
              </View>
            </Marker>
          ))}

          {/* Render stop markers from Google Maps API */}
          {Object.entries(stopCoordinates).map(([stopName, coords], index) => (
            <Marker
              key={`stop-${index}`}
              coordinate={coords}
              title={stopName}
              description="Bus Stop"
              pinColor="#f39c12"
            />
          ))}

          {/* Render routes from Google Maps API */}
          {Object.entries(routesData).map(([vanId, route]) => {
            if (route.length > 0) {
              return (
                <Polyline
                  key={`route-${vanId}`}
                  coordinates={route}
                  strokeColor="#3498DB"
                  strokeWidth={3}
                  lineDashPattern={[10, 10]}
                />
              );
            }
            return null;
          })}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={showAllVans}
          >
            <Icon name="zoom-out-map" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setRegion({
              latitude: 33.6844,
              longitude: 73.0479,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            })}
          >
            <Icon name="my-location" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Selected Van Info */}
        {selectedVan && (
          <View style={styles.selectedVanCard}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedVan(null)}
            >
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.vanTitle}>{selectedVan.name}</Text>
            <Text style={styles.vanInfo}>Driver: {selectedVan.driver}</Text>
            <Text style={styles.vanInfo}>Route: {selectedVan.route}</Text>
            <Text style={styles.vanInfo}>Status: {selectedVan.status}</Text>
            <Text style={styles.vanInfo}>Passengers: {selectedVan.passengers}/{selectedVan.capacity}</Text>
            <Text style={styles.vanInfo}>Current Stop: {selectedVan.currentStop}</Text>
            <Text style={styles.vanInfo}>ETA to next: {selectedVan.eta}</Text>
            
            <TouchableOpacity
              style={styles.focusButton}
              onPress={() => focusOnVan(selectedVan)}
            >
              <Icon name="center-focus-strong" size={16} color="#fff" />
              <Text style={styles.focusButtonText}>Focus on Van</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Van List */}
        <ScrollView 
          horizontal 
          style={styles.vanList}
          showsHorizontalScrollIndicator={false}
        >
          {vans.map(van => (
            <TouchableOpacity
              key={van.id}
              style={[styles.vanCard, { borderLeftColor: van.color }]}
              onPress={() => {
                setSelectedVan(van);
                focusOnVan(van);
              }}
            >
              <View style={styles.vanCardHeader}>
                <View style={[styles.vanStatus, { backgroundColor: van.color }]} />
                <Text style={styles.vanName}>{van.name}</Text>
              </View>
              <Text style={styles.vanDriver}>{van.driver}</Text>
              <Text style={styles.vanRoute}>{van.route}</Text>
              <View style={styles.vanStats}>
                <Text style={styles.vanStat}>
                  <Icon name="people" size={12} /> {van.passengers}/{van.capacity}
                </Text>
                <Text style={styles.vanStat}>
                  <Icon name="speed" size={12} /> {van.speed} km/h
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Main render function
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Icon name="menu" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transporter Dashboard</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadAllData}
        >
          <Icon name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content}>
        {renderMapView()}
        
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Live Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="directions-bus" size={24} color={COLORS.primary} />
              <Text style={styles.statNumber}>{vans.length}</Text>
              <Text style={styles.statLabel}>Active Vans</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="people" size={24} color={COLORS.success} />
              <Text style={styles.statNumber}>{stats.totalPassengers}</Text>
              <Text style={styles.statLabel}>Total Passengers</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="check-circle" size={24} color={COLORS.warning} />
              <Text style={styles.statNumber}>{stats.completedTrips}</Text>
              <Text style={styles.statLabel}>Completed Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Icon name="warning" size={24} color={COLORS.danger} />
              <Text style={styles.statNumber}>{stats.complaints}</Text>
              <Text style={styles.statLabel}>Pending Complaints</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  refreshButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: height * 0.6,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  mapControlButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedVanCard: {
    position: 'absolute',
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 5,
  },
  vanInfo: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 3,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  focusButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  vanList: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  vanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    width: 150,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  vanCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  vanStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  vanName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    flex: 1,
  },
  vanDriver: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 3,
  },
  vanRoute: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 8,
  },
  vanStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vanStat: {
    fontSize: 10,
    color: COLORS.gray,
  },
  vanMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statsContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
  },
});

export default TransporterDashboard;