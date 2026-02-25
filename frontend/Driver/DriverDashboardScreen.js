import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal, 
  Dimensions, 
  TextInput, 
  Switch,
  ActivityIndicator,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { driverStyles } from "./driverStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

const API_BASE_URL = "http://192.168.10.12:3000/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

const UnifiedDriverDashboard = ({ navigation, route }) => {
  const { driver } = route.params || {};
  
  // Auth & User States
  const [authToken, setAuthToken] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);

  // ✅ KEY FIX: Refs use karo — React state async hoti hai
  // Jab loadAuthData mein setDriverId call hoti hai, state turant nahi badalti
  // isliye fetchAvailabilityHistory ko null milta tha
  // Refs synchronous hain — turant updated value milti hai
  const driverIdRef = useRef(null);
  const authTokenRef = useRef(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("Dashboard");
  const [loading, setLoading] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    completedTrips: 0,
    activeTrips: 0,
    pendingTrips: 0,
    monthlyEarnings: 0
  });

  const [available, setAvailable] = useState(false);
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [startTime, setStartTime] = useState("07:00 AM");
  const [endTime, setEndTime] = useState("06:00 PM");
  const [availabilityHistory, setAvailabilityHistory] = useState([]);
  const [showAvailabilityAlert, setShowAvailabilityAlert] = useState(false);
  // ✅ DB se aaya hua active record store karo
  const [activeAvailabilityRecord, setActiveAvailabilityRecord] = useState(null);

  const [assignedRoutes, setAssignedRoutes] = useState([]);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeStops, setRouteStops] = useState([]);
  const [completedStops, setCompletedStops] = useState([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  
  const [showMorningConfirmAlert, setShowMorningConfirmAlert] = useState(false);
  const [morningConfirmationNeeded, setMorningConfirmationNeeded] = useState(false);
  
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 33.6844,
    longitude: 73.0479
  });
  const [locationUpdateInterval, setLocationUpdateInterval] = useState(null);

  const [paymentData, setPaymentData] = useState([]);
  const [paymentDetailsVisible, setPaymentDetailsVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailsVisible, setTripDetailsVisible] = useState(false);

  const [supportTickets, setSupportTickets] = useState([]);
  const [newTicketVisible, setNewTicketVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("Payment Issue");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  // ==================== LOAD AUTH DATA ====================
  
  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (token && userId) {
        // ✅ CRITICAL: Pehle refs set karo — ye synchronous hain
        // Baaki sare functions inhe use karenge, state ka wait nahi karenge
        driverIdRef.current = userId;
        authTokenRef.current = token;
        
        // State bhi set karo (UI rendering ke liye)
        setAuthToken(token);
        setDriverId(userId);
        
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setDriverProfile(userData);
        }
        
        console.log("✅ Auth loaded — driverId:", userId);
        
        // ✅ userId aur token directly pass karo — state ka intezaar nahi
        await loadAllData(userId, token);
        
        checkAvailabilityReminder();
        
        const pollInterval = setInterval(() => {
          fetchCurrentTrip(driverIdRef.current, authTokenRef.current);
          fetchNotifications(driverIdRef.current, authTokenRef.current);
          fetchAssignedRoutes(driverIdRef.current, authTokenRef.current);  // ✅ yeh add karo
        }, 10000);
        
        return () => clearInterval(pollInterval);
      } else {
        console.log("⚠️ No auth data found");
        navigation.reset({ index: 0, routes: [{ name: 'DriverLogin' }] });
      }
    } catch (error) {
      console.error("❌ Error loading auth data:", error);
    }
  };

  // ==================== API HELPER ====================
  // ✅ FIXED: token parameter leta hai
  const getHeaders = (token = null) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || authTokenRef.current || authToken}`
  });

  // ==================== LOAD ALL DATA ====================
  // ✅ FIXED: userId aur token directly parameters mein
  const loadAllData = async (userId, token) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDashboardStats(userId, token),
        fetchAssignedRoutes(userId, token),
        fetchCurrentTrip(userId, token),
        fetchPayments(userId, token),
        fetchTrips(userId, token),
        fetchSupportTickets(userId, token),
        fetchNotifications(userId, token),
        fetchAvailabilityHistory(userId, token)
      ]);
    } catch (error) {
      console.error("❌ Error loading all data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== AVAILABILITY REMINDER ====================
  const checkAvailabilityReminder = () => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 18 && currentHour < 21) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const tomorrowAvailability = availabilityHistory.find(avail => 
        new Date(avail.date).toISOString().split('T')[0] === tomorrowStr
      );
      if (!tomorrowAvailability) {
        setShowAvailabilityAlert(true);
        addLocalNotification("Confirm Tomorrow's Availability", "Please confirm if you'll be available for tomorrow's routes", "warning");
      }
    }
  };
  
  // ==================== API CALLS ====================

  const fetchDashboardStats = async (userId = null, token = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success || data.stats) {
        setDashboardStats({
          completedTrips: data.stats?.completedTrips || 0,
          activeTrips: data.stats?.activeTrips || 0,
          pendingTrips: data.stats?.pendingTrips || 0,
          monthlyEarnings: data.stats?.monthlyEarnings || 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
    }
  };

  const fetchAssignedRoutes = useCallback(async (userId = null, token = null) => {
      try {
        const uid = userId || driverIdRef.current;
        const response = await fetch(`${API_BASE_URL}/routes?assignedDriver=${uid}`, {
          headers: getHeaders(token)
        });
        const result = await response.json();
        const routesArray = result.routes || result.data || [];
  
        if (JSON.stringify(routesArray) !== JSON.stringify(assignedRoutes)) {
          setAssignedRoutes(routesArray);
          if (routesArray.length > 0) {
            setCurrentRoute(prev => prev?._id === routesArray[0]._id ? prev : routesArray[0]);
          }
        }
  
        if (routesArray.length > 0) {
          const newStops = (routesArray[0].passengers || []).map((p, i) => ({
            _id: p._id?.$oid || p._id || `stop-${i}`,
            name: p.pickupPoint || 'Pickup Point',
            passengerName: p.passengerName,
            status: p.status || 'pending',
            coordinate: { latitude: 33.6844 + (i * 0.003), longitude: 73.0479 + (i * 0.003) }
          }));
          if (JSON.stringify(newStops) !== JSON.stringify(routeStops)) setRouteStops(newStops);
        }
      } catch (e) { console.error("❌ Fetch Assigned Routes:", e); }
    }, [assignedRoutes, routeStops, getHeaders]);
  

  const fetchCurrentTrip = async (userId = null, token = null) => {
    try {
      const uid = userId || driverIdRef.current;
      const response = await fetch(`${API_BASE_URL}/trips`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success) {
        const myTrips = (data.trips || []).filter(trip => 
          trip.driverId?.toString() === uid || trip.driverId?._id?.toString() === uid
        );
        const activeTrip = myTrips.find(t => 
          t.status === 'Scheduled' || t.status === 'En Route' || t.status === 'Ready'
        );
        if (activeTrip) {
          setCurrentTrip(activeTrip);
          if (activeTrip.status === 'En Route') {
            setRouteStarted(true);
            if (!locationUpdateInterval) startLocationTracking(activeTrip._id);
          }
          if (activeTrip.status === 'Scheduled' && !morningConfirmationNeeded) {
            const now = new Date();
            const tripDate = new Date(activeTrip.createdAt);
            if (now.toDateString() === tripDate.toDateString() && now.getHours() >= 6 && now.getHours() < 8) {
              setShowMorningConfirmAlert(true);
              setMorningConfirmationNeeded(true);
              addLocalNotification("Morning Confirmation", "Are you ready to start today's route?", "alert");
            }
          }
          if (activeTrip.passengers) {
            setRouteStops(prev => prev.map(stop => {
              const passenger = activeTrip.passengers.find(p => p._id?.toString() === stop._id || p._id?._id?.toString() === stop._id);
              if (passenger) return { ...stop, status: passenger.status || stop.status };
              return stop;
            }));
            const completed = activeTrip.passengers.filter(p => p.status === 'picked' || p.status === 'completed');
            setCompletedStops(completed.map(p => p._id?.toString() || p._id?._id?.toString()));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching current trip:', error);
    }
  };

  // ✅ ASLI FIX: fetchAvailabilityHistory
  // Problem: pehle ye function sirf state se driverId leta tha
  // State async hai — login ke baad bhi null reh sakti hai
  // Solution: userId directly parameter se lo, ref se lo, last mein state se
  const fetchAvailabilityHistory = async (userId = null, token = null) => {
    try {
      const uid = userId || driverIdRef.current || driverId;
      const tok = token || authTokenRef.current || authToken;
      
      if (!uid) {
        console.error('❌ driverId nahi mila — availability fetch nahi ho sakti');
        return;
      }

      console.log('📡 Availability fetch ho rahi hai — driverId:', uid);

      // ✅ driverId query mein bhejo
      const response = await fetch(`${API_BASE_URL}/availability?driverId=${uid}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        }
      });
      const data = await response.json();
      
      console.log('📊 Availability API response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        const allAvailability = data.availability || [];
        setAvailabilityHistory(allAvailability);

        // ✅ Aaj aur future ki SAARI available records dekho
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const activeRecords = allAvailability.filter(avail => {
          const availDateStr = new Date(avail.date).toISOString().split('T')[0];
          return availDateStr >= todayStr && avail.status === 'available';
        });

        if (activeRecords.length > 0) {
          // Nearest record pehle
          activeRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
          const nearestActive = activeRecords[0];
          
          console.log('✅ Active availability mili:', nearestActive);
          
          // ✅ available = true — DB mein record hai
          setAvailable(true);
          setActiveAvailabilityRecord(nearestActive);
          
          // Existing times se fields fill karo
          if (nearestActive.startTime) setStartTime(nearestActive.startTime);
          if (nearestActive.endTime) setEndTime(nearestActive.endTime);
          
          // Alert band karo — driver ne pehle se confirm kar rakha hai
          setShowAvailabilityAlert(false);
        } else {
          // Unavailable check karo
          const recentUnavailable = allAvailability.find(avail => {
            const availDateStr = new Date(avail.date).toISOString().split('T')[0];
            return availDateStr >= todayStr && avail.status === 'unavailable';
          });

          setAvailable(false);
          setActiveAvailabilityRecord(recentUnavailable || null);

          // Reminder time mein alert dikhao
          const currentHour = now.getHours();
          if (currentHour >= 18 && currentHour < 21) {
            setShowAvailabilityAlert(true);
          }
        }
      } else {
        console.error('❌ Availability API fail hua:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching availability:', error);
    }
  };

  const confirmAvailability = async () => {
    if (!startTime || !endTime) {
      Alert.alert("Error", "Please set your start and end times");
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/availability`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ date: tomorrowStr, startTime, endTime, status: 'available' })
      });
      const data = await response.json();
      if (data.success) {
        setAvailable(true);
        setShowAvailabilityAlert(false);
        setAvailabilityModalVisible(false);
        const newRecord = { date: tomorrowStr, startTime, endTime, status: 'available', ...(data.availability || {}) };
        setActiveAvailabilityRecord(newRecord);
        // ✅ Fresh data DB se — refs use karke
        await fetchAvailabilityHistory(driverIdRef.current, authTokenRef.current);
        addLocalNotification("Availability Confirmed", `You're confirmed for ${formatDisplayDate(tomorrowStr)} (${startTime} - ${endTime})`, "success");
        Alert.alert("Success", "Your availability has been confirmed and sent to the transporter!");
      } else {
        Alert.alert("Error", data.message || "Failed to confirm availability");
      }
    } catch (error) {
      console.error('❌ Error confirming availability:', error);
      Alert.alert("Error", "Failed to confirm availability");
    } finally {
      setLoading(false);
    }
  };
  
  const markUnavailable = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    Alert.alert("Mark Unavailable", "Are you sure you want to mark yourself as unavailable for tomorrow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Unavailable",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/availability`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({ date: tomorrowStr, startTime: '', endTime: '', status: 'unavailable' })
            });
            const data = await response.json();
            if (data.success) {
              setAvailable(false);
              setShowAvailabilityAlert(false);
              setActiveAvailabilityRecord(null);
              await fetchAvailabilityHistory(driverIdRef.current, authTokenRef.current);
              addLocalNotification("Marked Unavailable", `You've been marked unavailable for ${formatDisplayDate(tomorrowStr)}`, "warning");
              Alert.alert("Updated", "You have been marked as unavailable for tomorrow.");
            }
          } catch (error) {
            console.error('❌ Error marking unavailable:', error);
            Alert.alert("Error", "Failed to update availability");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const startRoute = async () => {
    if (!currentRoute) { Alert.alert("Error", "No route assigned"); return; }
    Alert.alert("Start Route", "Are you ready to start this route? GPS tracking will begin and passengers will be notified.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start Route",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/routes/${currentRoute._id}/start`, { method: 'POST', headers: getHeaders() });
            const data = await response.json();
            if (data.success) {
              setRouteStarted(true);
              setCurrentStopIndex(0);
              if (data.trip) { setCurrentTrip(data.trip); startLocationTracking(data.trip._id); }
              addLocalNotification("Route Started", "GPS tracking is active. Drive safely!", "success");
              Alert.alert("Success", "Route started! All passengers have been notified.");
              await fetchCurrentTrip();
            } else {
              Alert.alert("Error", data.message || "Failed to start route");
            }
          } catch (error) {
            console.error('❌ Error starting route:', error);
            Alert.alert("Error", "Failed to start route");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const startLocationTracking = (tripId) => {
    const interval = setInterval(() => {
      if (currentStopIndex < routeStops.length) {
        const nextStop = routeStops[currentStopIndex];
        if (nextStop && nextStop.coordinate) {
          setCurrentLocation(prev => ({
            latitude: prev.latitude + (nextStop.coordinate.latitude - prev.latitude) * 0.1,
            longitude: prev.longitude + (nextStop.coordinate.longitude - prev.longitude) * 0.1
          }));
          updateLocationOnBackend(tripId, currentLocation);
        }
      }
    }, 8000);
    setLocationUpdateInterval(interval);
  };

  const updateLocationOnBackend = async (tripId, location) => {
    try {
      await fetch(`${API_BASE_URL}/live-tracking/location`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ routeId: currentRoute?._id, latitude: location.latitude, longitude: location.longitude, speed: 40, heading: 0 })
      });
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  };

  const pickupPassenger = async (stop) => {
    if (!routeStarted) { Alert.alert("Route Not Started", "Please start the route first"); return; }
    Alert.alert("Confirm Pickup", `Confirm pickup for ${stop.passengerName} at ${stop.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm Pickup",
        onPress: async () => {
          try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/routes/${currentRoute._id}/stops/${stop._id}/status`, {
              method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status: 'picked-up' })
            });
            const data = await response.json();
            if (data.success) {
              setRouteStops(prev => prev.map(s => s._id === stop._id ? { ...s, status: 'picked' } : s));
              setCompletedStops(prev => [...prev, stop._id]);
              setCurrentStopIndex(prev => prev + 1);
              addLocalNotification("Passenger Picked Up", `${stop.passengerName} has been picked up`, "success");
              Alert.alert("Success", "Passenger marked as picked up");
              await fetchCurrentTrip();
            }
          } catch (error) {
            console.error('❌ Error picking up passenger:', error);
            Alert.alert("Error", "Failed to mark passenger as picked up");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const completeRoute = async () => {
    const allPickedUp = routeStops.every(s => s.status === 'picked' || s.status === 'completed');
    if (!allPickedUp) {
      Alert.alert("Incomplete Route", "Some passengers haven't been picked up. Are you sure you want to complete?", [
        { text: "Cancel", style: "cancel" },
        { text: "Complete Anyway", style: "destructive", onPress: () => finalizeRouteCompletion() }
      ]);
    } else {
      finalizeRouteCompletion();
    }
  };

  const finalizeRouteCompletion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/routes/${currentRoute._id}/end`, { method: 'POST', headers: getHeaders() });
      const data = await response.json();
      if (data.success) {
        if (locationUpdateInterval) { clearInterval(locationUpdateInterval); setLocationUpdateInterval(null); }
        setRouteStarted(false);
        setCurrentStopIndex(0);
        setCompletedStops([]);
        setShowFeedbackModal(true);
        addLocalNotification("Route Completed", "Great job! Route completed successfully.", "success");
        await fetchCurrentTrip();
        await fetchTrips();
      }
    } catch (error) {
      console.error('❌ Error completing route:', error);
      Alert.alert("Error", "Failed to complete route");
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (feedbackRating === 0) { Alert.alert("Rating Required", "Please provide a rating"); return; }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ tripId: currentTrip?._id, rating: feedbackRating, comment: feedbackComment, givenBy: 'driver' })
      });
      const data = await response.json();
      if (data.success) {
        setShowFeedbackModal(false); setFeedbackRating(0); setFeedbackComment("");
        Alert.alert("Success", "Thank you for your feedback!");
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      Alert.alert("Error", "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (userId = null, token = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success) setPaymentData(data.payments || []);
    } catch (error) { console.error('❌ Error fetching payments:', error); }
  };

  const fetchTrips = async (userId = null, token = null) => {
    try {
      const uid = userId || driverIdRef.current;
      const response = await fetch(`${API_BASE_URL}/trips`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success) {
        const myTrips = (data.trips || []).filter(trip => trip.driverId?.toString() === uid || trip.driverId?._id?.toString() === uid);
        setTrips(myTrips);
      }
    } catch (error) { console.error('❌ Error fetching trips:', error); }
  };

  const fetchSupportTickets = async (userId = null, token = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success) setSupportTickets(data.complaints || []);
    } catch (error) { console.error('❌ Error fetching support tickets:', error); }
  };

  const submitSupportTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) { Alert.alert("Error", "Please fill in all fields"); return; }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ title: ticketSubject, description: ticketDescription, category: ticketCategory })
      });
      const data = await response.json();
      if (data.success) {
        setNewTicketVisible(false); setTicketSubject(""); setTicketDescription("");
        await fetchSupportTickets();
        addLocalNotification("Support Ticket Created", "Your request has been submitted", "info");
        Alert.alert("Success", "Your support ticket has been submitted");
      }
    } catch (error) {
      console.error('❌ Error submitting ticket:', error);
      Alert.alert("Error", "Failed to submit ticket");
    } finally { setLoading(false); }
  };

  const fetchNotifications = async (userId = null, token = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, { headers: getHeaders(token) });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadNotifications((data.notifications || []).filter(n => !n.read).length);
      }
    } catch (error) { console.error('❌ Error fetching notifications:', error); }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: 'PUT', headers: getHeaders() });
      await fetchNotifications();
    } catch (error) { console.error('❌ Error marking notification as read:', error); }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, { method: 'PUT', headers: getHeaders() });
      await fetchNotifications();
    } catch (error) { console.error('❌ Error marking all as read:', error); }
  };

  const addLocalNotification = (title, message, type) => {
    const newNotif = { _id: Date.now().toString(), title, message, time: "Just now", type, read: false, createdAt: new Date().toISOString() };
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadNotifications(prev => prev + 1);
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const navigateTo = (view) => { setCurrentView(view); setSidebarOpen(false); };

  const completedCount = completedStops.length;
  const totalStops = routeStops.length;
  const progress = totalStops > 0 ? (completedCount / totalStops) * 100 : 0;

  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.routeName?.toLowerCase().includes(search.toLowerCase()) || trip.driverName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" ? true : trip.status?.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const styles = driverStyles;

  const StatusBadge = ({ status }) => {
    let bgColor = "#FFF3E0", textColor = "#FF9800";
    const statusLower = status?.toLowerCase();
    if (statusLower === "completed" || statusLower === "picked" || statusLower === "resolved" || statusLower === "available") { bgColor = "#E8F5E9"; textColor = "#4CAF50"; }
    else if (statusLower === "cancelled" || statusLower === "unavailable") { bgColor = "#FFEBEE"; textColor = "#F44336"; }
    else if (statusLower === "in progress" || statusLower === "en route" || statusLower === "started") { bgColor = "#E3F2FD"; textColor = "#2196F3"; }
    return (
      <View style={{ backgroundColor: bgColor, paddingVertical: 6, paddingHorizontal: 12, minWidth: 90, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ fontWeight: "600", fontSize: 12, color: textColor }}>{status}</Text>
      </View>
    );
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>

        {showAvailabilityAlert && (
          <View style={[styles.card, { backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="time" size={24} color="#FF9800" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 }}>⏰ Confirm Tomorrow's Availability</Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Please confirm if you'll be available for tomorrow's routes</Text>
                <TouchableOpacity style={styles.button} onPress={() => setAvailabilityModalVisible(true)}>
                  <Ionicons name="calendar" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Confirm Availability</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {showMorningConfirmAlert && currentTrip && (
          <View style={[styles.card, { backgroundColor: '#E3F2FD', borderLeftWidth: 4, borderLeftColor: '#2196F3' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="sunny" size={24} color="#2196F3" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 }}>🚐 Ready to Start Route?</Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Route: {currentTrip.routeName} • {routeStops.length} passengers</Text>
                <TouchableOpacity style={styles.button} onPress={() => { setShowMorningConfirmAlert(false); Alert.alert("Confirmed", "You're ready! You can start the route now."); }}>
                  <Text style={styles.buttonText}>I'm Ready</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#f5f5f5', marginTop: 8 }]} onPress={() => setShowMorningConfirmAlert(false)}>
                  <Text style={[styles.buttonText, { color: '#666' }]}>Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={28} color="#A1D826" />
            <Text style={styles.statValue}>{dashboardStats.completedTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#FF9800" />
            <Text style={styles.statValue}>{dashboardStats.activeTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={28} color="#2196F3" />
            <Text style={styles.statValue}>{dashboardStats.pendingTrips ?? 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {currentRoute ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Assigned Route</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#333', marginTop: 8, marginBottom: 8 }}>{currentRoute.name}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, color: '#666' }}>🕐 {currentRoute.timeSlot}</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>👥 {routeStops.length} passengers</Text>
            </View>
            <Text style={{ fontSize: 14, color: routeStarted ? '#2196F3' : '#FF9800' }}>Status: {routeStarted ? "In Progress" : "Not Started"}</Text>
            <TouchableOpacity onPress={() => navigateTo("Routes")} style={[styles.button, { marginTop: 12 }]}>
              <Text style={styles.buttonText}>View Full Route Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No Route Assigned</Text>
            <Text style={styles.cardText}>You don't have any routes assigned for today.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Access</Text>
        {[
          { title: "Confirm Availability", icon: "calendar-outline", view: "Availability" },
          { title: "Assigned Routes", icon: "map", view: "Routes" },
          { title: "Trip History", icon: "time", view: "History" },
          { title: "Payments", icon: "card", view: "Payments" },
          { title: "Support", icon: "help-circle", view: "Support" },
          { title: "Notifications", icon: "notifications", view: "Notifications", badge: unreadNotifications }
        ].map((item, index) => (
          <TouchableOpacity key={index} onPress={() => navigateTo(item.view)} style={styles.menuCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={item.icon} size={22} color="#A1D826" style={{ marginRight: 14 }} />
              <Text style={styles.menuCardText}>{item.title}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {item.badge > 0 && (
                <View style={{ backgroundColor: "#F44336", width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#A1D826" />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderAvailability = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        {loading && <ActivityIndicator size="large" color="#A1D826" style={{ marginVertical: 10 }} />}
        
        {/* ✅ Current Status — DB ka data dikhao */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Availability Status</Text>
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Ionicons name={available ? "checkmark-circle" : "close-circle"} size={64} color={available ? "#4CAF50" : "#999"} />
            <Text style={{ fontSize: 18, fontWeight: "700", color: available ? "#4CAF50" : "#999", marginTop: 12 }}>
              {available ? "Available" : "Not Available"}
            </Text>

            {/* ✅ Existing DB record ki details dikhao */}
            {available && activeAvailabilityRecord && (
              <View style={{ marginTop: 16, backgroundColor: '#F0F9D9', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center' }}>
                {activeAvailabilityRecord.date && (
                  <Text style={{ fontSize: 15, color: '#555', marginBottom: 6 }}>
                    📅 {formatDisplayDate(activeAvailabilityRecord.date)}
                  </Text>
                )}
                {activeAvailabilityRecord.startTime ? (
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 4 }}>
                    🕐 {activeAvailabilityRecord.startTime} – {activeAvailabilityRecord.endTime}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 13, color: '#4CAF50', marginTop: 6 }}>
                  ✅ Transporter ko visible hai
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Update / Confirm */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{available ? "Update Availability" : "Confirm Tomorrow's Availability"}</Text>
          <Text style={styles.cardText}>
            {available ? "Apni timings update kar sakte hain ya unavailable mark kar sakte hain" : "Transporter ko kal ki apni timing batayein"}
          </Text>
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>Start Time</Text>
            <View style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <Ionicons name="time-outline" size={20} color="#A1D826" style={{ marginRight: 10 }} />
              <TextInput style={{ flex: 1, fontSize: 15, color: "#333" }} placeholder="07:00 AM" value={startTime} onChangeText={setStartTime} placeholderTextColor="#999" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>End Time</Text>
            <View style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <Ionicons name="time-outline" size={20} color="#A1D826" style={{ marginRight: 10 }} />
              <TextInput style={{ flex: 1, fontSize: 15, color: "#333" }} placeholder="06:00 PM" value={endTime} onChangeText={setEndTime} placeholderTextColor="#999" />
            </View>
          </View>
          <TouchableOpacity style={styles.button} onPress={confirmAvailability} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>{available ? "Update Availability" : "Confirm Availability"}</Text>
              </>
            )}
          </TouchableOpacity>
          {available && (
            <TouchableOpacity style={[styles.button, { backgroundColor: "#F44336", marginTop: 12 }]} onPress={markUnavailable} disabled={loading}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Mark Unavailable</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Recent History</Text>
        {availabilityHistory.length === 0 ? (
          <View style={styles.card}><Text style={styles.cardText}>No history found</Text></View>
        ) : (
          availabilityHistory.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#333" }}>{formatDisplayDate(item.date)}</Text>
                <StatusBadge status={item.status === "available" ? "Available" : "Unavailable"} />
              </View>
              {item.startTime ? (
                <Text style={{ fontSize: 14, color: "#666", marginTop: 6 }}>🕐 {item.startTime} – {item.endTime}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderRoutes = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        {loading && <ActivityIndicator size="large" color="#A1D826" style={{ marginVertical: 10 }} />}
        {currentRoute ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{currentRoute.name}</Text>
              <View style={styles.routeInfo}>
                <View style={styles.infoRow}><Ionicons name="time" size={20} color="#A1D826" /><Text style={[styles.cardText, { marginLeft: 10 }]}>{currentRoute.timeSlot}</Text></View>
                <View style={styles.infoRow}><Ionicons name="people" size={20} color="#A1D826" /><Text style={[styles.cardText, { marginLeft: 10 }]}>{routeStops.length} Passengers</Text></View>
              </View>
              {!routeStarted ? (
                <TouchableOpacity style={[styles.button, { backgroundColor: "#4CAF50" }]} onPress={startRoute} disabled={loading}>
                  <Ionicons name="play-circle" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.buttonText}>Start Route</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.button, { backgroundColor: "#F44336" }]} onPress={completeRoute} disabled={loading}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.buttonText}>Complete Route</Text>
                </TouchableOpacity>
              )}
            </View>
            {routeStarted && (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>Route Progress</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#A1D826' }}>{Math.round(progress)}%</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#A1D826', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 13, color: '#666', marginTop: 6 }}>{completedCount} of {totalStops} passengers picked up</Text>
              </View>
            )}
            {routeStops.length > 0 && (
              <View style={{ height: 300, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                <MapView provider={PROVIDER_GOOGLE} style={{ flex: 1 }} initialRegion={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
                  <Polyline coordinates={routeStops.map(s => s.coordinate)} strokeColor="#A1D826" strokeWidth={4} />
                  {routeStops.map((stop, index) => (
                    <Marker key={stop._id} coordinate={stop.coordinate} title={stop.passengerName} description={stop.name} pinColor={stop.status === 'picked' ? '#4CAF50' : '#FF9800'} />
                  ))}
                  {routeStarted && (
                    <Marker coordinate={currentLocation} title="Your Van">
                      <View style={{ backgroundColor: '#A1D826', padding: 8, borderRadius: 20 }}>
                        <Ionicons name="car" size={24} color="#fff" />
                      </View>
                    </Marker>
                  )}
                </MapView>
              </View>
            )}
            <Text style={styles.sectionTitle}>Passengers</Text>
            {routeStops.map((stop, index) => (
              <View key={stop._id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#A1D826', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{index + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>{stop.passengerName}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#666', marginLeft: 38 }}>📍 {stop.name}</Text>
                    <Text style={{ fontSize: 13, color: '#999', marginLeft: 38, marginTop: 2 }}>🕐 {stop.time}</Text>
                  </View>
                  <StatusBadge status={stop.status} />
                </View>
                {routeStarted && stop.status !== 'picked' && stop.status !== 'completed' && (
                  <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => pickupPassenger(stop)} disabled={loading}>
                    <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.buttonText}>Mark as Picked Up</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.card}><Text style={styles.cardTitle}>No Route Assigned</Text><Text style={styles.cardText}>You don't have any routes for today</Text></View>
        )}
      </View>
    </ScrollView>
  );

  const renderHistory = useMemo(() => (
    <ScrollView style={driverStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={driverStyles.contentPadding}>
        <Text style={driverStyles.sectionTitle}>Trip History</Text>
        
        <View style={driverStyles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput 
            style={driverStyles.searchInput} 
            placeholder="Search trips..." 
            value={search} 
            onChangeText={setSearch} 
            placeholderTextColor="#999" 
          />
        </View>

        <View style={driverStyles.tabContainer}>
          {["All", "Completed", "Cancelled"].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[driverStyles.tab, filter === tab && driverStyles.tabActive]} 
              onPress={() => setFilter(tab)}
            >
              <Text style={[driverStyles.tabText, filter === tab && driverStyles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
            <View key={trip._id} style={driverStyles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>
                    {trip.routeName || 'Route'}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <StatusBadge status={trip.status} />
              </View>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={{ fontSize: 13, color: '#666', marginLeft: 6 }}>
                    {trip.passengers?.length || 0} passengers
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={{ fontSize: 13, color: '#666', marginLeft: 6 }}>{trip.timeSlot}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={driverStyles.card}>
            <Text style={driverStyles.cardText}>No trips found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  ), [filteredTrips, filter, search]);
  useEffect(() => {
      if (currentView === "History") {
        fetchTrips();
      }
    }, [currentView]);
  const renderPayments = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <Text style={styles.sectionTitle}>Payments</Text>
        <View style={[styles.card, { backgroundColor: '#F0F9D9' }]}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>This Month</Text>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#A1D826', marginBottom: 4 }}>Rs. {paymentData.reduce((sum, p) => sum + (p.amount || 0), 0)}</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{trips.filter(t => t.status === 'Completed').length} trips completed</Text>
        </View>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paymentData.length > 0 ? (
          paymentData.map((payment) => (
            <View key={payment._id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#333' }}>{payment.month}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#A1D826' }}>Rs. {payment.amount}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#999' }}>{new Date(payment.date).toLocaleDateString()}</Text>
                <StatusBadge status={payment.status} />
              </View>
            </View>
          ))
        ) : (
          <View style={styles.card}><Text style={styles.cardText}>No payment history</Text></View>
        )}
      </View>
    </ScrollView>
  );

  const renderSupport = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.button} onPress={() => setNewTicketVisible(true)}>
          <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Submit New Complaint</Text>
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>My Complaints</Text>
        {supportTickets.length > 0 ? (
          supportTickets.map((ticket) => (
            <View key={ticket._id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', flex: 1 }}>{ticket.title}</Text>
                <StatusBadge status={ticket.status} />
              </View>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{ticket.description}</Text>
              <Text style={{ fontSize: 12, color: '#999' }}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        ) : (
          <View style={styles.card}><Text style={styles.cardText}>No complaints submitted</Text></View>
        )}
        <Modal visible={newTicketVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Complaint</Text>
                <TouchableOpacity onPress={() => setNewTicketVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
              </View>
              <ScrollView>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>Subject</Text>
                <TextInput style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 15 }} placeholder="Enter subject" value={ticketSubject} onChangeText={setTicketSubject} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>Description</Text>
                <TextInput style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 15, height: 120, textAlignVertical: 'top' }} placeholder="Describe your complaint..." value={ticketDescription} onChangeText={setTicketDescription} multiline />
                <TouchableOpacity style={styles.button} onPress={submitSupportTicket} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );

  const renderNotifications = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {unreadNotifications > 0 && (
            <TouchableOpacity onPress={markAllNotificationsAsRead}>
              <Text style={{ color: '#A1D826', fontSize: 14, fontWeight: '600' }}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity key={notification._id} style={[styles.card, { backgroundColor: notification.read ? '#fff' : '#F0F9D9' }]} onPress={() => { if (!notification.read) markNotificationAsRead(notification._id); }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name={notification.icon || 'notifications'} size={24} color="#A1D826" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 }}>{notification.title}</Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>{notification.message}</Text>
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>{notification.time || new Date(notification.createdAt).toLocaleString()}</Text>
                </View>
                {!notification.read && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F44336' }} />}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.card}><Text style={styles.cardText}>No notifications</Text></View>
        )}
      </View>
    </ScrollView>
  );

  const FeedbackModal = () => (
    <Modal visible={showFeedbackModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Your Trip</Text>
            <TouchableOpacity onPress={() => setShowFeedbackModal(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={{ fontSize: 15, textAlign: 'center', color: '#666', marginBottom: 20 }}>How was your experience today?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)} style={{ marginHorizontal: 8 }}>
                  <Ionicons name={star <= feedbackRating ? "star" : "star-outline"} size={40} color={star <= feedbackRating ? "#FFD700" : "#ccc"} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 10 }}>Comments (Optional)</Text>
            <TextInput style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, marginBottom: 20, height: 100, textAlignVertical: 'top' }} placeholder="Share your experience..." value={feedbackComment} onChangeText={setFeedbackComment} multiline />
            <TouchableOpacity style={styles.button} onPress={submitFeedback} disabled={loading || feedbackRating === 0}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Submit Feedback</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const AvailabilityModal = () => (
    <Modal visible={availabilityModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Availability</Text>
            <TouchableOpacity onPress={() => setAvailabilityModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Set your available timings for tomorrow</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 10 }}>Start Time</Text>
            <TextInput style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, marginBottom: 16 }} placeholder="07:00 AM" value={startTime} onChangeText={setStartTime} />
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 10 }}>End Time</Text>
            <TextInput style={{ backgroundColor: "#f9f9f9", borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 12, padding: 14, marginBottom: 20 }} placeholder="06:00 PM" value={endTime} onChangeText={setEndTime} />
            <TouchableOpacity style={styles.button} onPress={confirmAvailability} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Confirm</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ==================== MAIN RENDER ====================
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarOpen(!sidebarOpen)}>
          <Ionicons name={sidebarOpen ? "close" : "menu"} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{currentView}</Text>
          <Text style={styles.headerSubtitle}>Driver Portal</Text>
        </View>
        {currentView === "Dashboard" && (
          <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={async () => { setLoading(true); await loadAllData(driverIdRef.current, authTokenRef.current); setLoading(false); }}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {currentView === "Notifications" && unreadNotifications > 0 && (
          <View style={{ backgroundColor: "#F44336", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unreadNotifications}</Text>
          </View>
        )}
      </View>

      {sidebarOpen && (
        <>
          <TouchableOpacity style={styles.sidebarOverlay} onPress={() => setSidebarOpen(false)} activeOpacity={1} />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarHeaderText}>Driver Portal</Text>
              <Text style={styles.sidebarHeaderSubtext}>{driverProfile?.name || "Driver"}</Text>
            </View>
            <ScrollView style={styles.sidebarMenu}>
              {[
                { view: "Dashboard", title: "Dashboard", icon: "home" },
                { view: "Availability", title: "Availability", icon: "calendar-outline" },
                { view: "Routes", title: "Routes", icon: "map" },
                { view: "History", title: "History", icon: "time" },
                { view: "Payments", title: "Payments", icon: "card" },
                { view: "Support", title: "Support", icon: "help-circle" },
                { view: "Notifications", title: "Notifications", icon: "notifications", badge: unreadNotifications },
              ].map((item) => (
                <TouchableOpacity key={item.view} style={[styles.sidebarItem, currentView === item.view && styles.sidebarItemActive]} onPress={() => navigateTo(item.view)}>
                  <Ionicons name={item.icon} size={20} color={currentView === item.view ? "#A1D826" : "#666"} />
                  <Text style={[styles.sidebarItemText, currentView === item.view && styles.sidebarItemTextActive]}>{item.title}</Text>
                  {item.badge > 0 && (
                    <View style={{ backgroundColor: "#F44336", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: "auto" }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{item.badge}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutButton} onPress={() => { Alert.alert("Logout", "Are you sure?", [{ text: "Cancel", style: "cancel" }, { text: "Logout", style: "destructive", onPress: () => { navigation.reset({ index: 0, routes: [{ name: 'DriverLogin' }] }); } }]); }}>
                <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {currentView === "Dashboard" && renderDashboard()}
      {currentView === "Availability" && renderAvailability()}
      {currentView === "Routes" && renderRoutes()}
      {currentView === "History" && renderHistory()}
      {currentView === "Payments" && renderPayments()}
      {currentView === "Support" && renderSupport()}
      {currentView === "Notifications" && renderNotifications()}
      
      <FeedbackModal />
      <AvailabilityModal />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#A1D826" />
          <Text style={{ color: "#fff", marginTop: 10, fontSize: 16 }}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

export default UnifiedDriverDashboard;