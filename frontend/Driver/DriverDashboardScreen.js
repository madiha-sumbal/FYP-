import React, { useState, useEffect } from "react";
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

const { width, height } = Dimensions.get("window");

// API Base URL - Update this with your actual backend URL
const API_BASE_URL = "http://192.168.10.6:3000/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

const UnifiedDriverDashboard = ({ navigation, route }) => {
  const { driver } = route.params || {};
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("Dashboard");
  const [loading, setLoading] = useState(false);

  // Dashboard states
  const [available, setAvailable] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    completedTrips: 0,
    activeTrips: 0,
    pendingTrips: 0,
    monthlyEarnings: 0
  });

  // Availability states
  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [startTime, setStartTime] = useState("07:00 AM");
  const [endTime, setEndTime] = useState("06:00 PM");
  const [availabilityHistory, setAvailabilityHistory] = useState([]);

  // Routes states
  const [routeStarted, setRouteStarted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [assignedRoutes, setAssignedRoutes] = useState([]);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);

  // Payment states
  const [paymentDetailsVisible, setPaymentDetailsVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentData, setPaymentData] = useState([]);

  // Trip History states
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripDetailsVisible, setTripDetailsVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState("All");
  const [trips, setTrips] = useState([]);

  // Support states
  const [supportTickets, setSupportTickets] = useState([]);
  const [newTicketVisible, setNewTicketVisible] = useState(false);
  const [ticketCategory, setTicketCategory] = useState("Payment Issue");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  // Notification states
  const [notifications, setNotifications] = useState([]);

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");

  // API Headers
  const getHeaders = () => {
    const token = driver?.token;
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // ==================== API CALLS ====================

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setDashboardStats({
          completedTrips: data.stats.completedTrips || 0,
          activeTrips: data.stats.activeTrips || 0,
          pendingTrips: data.stats.pendingTrips || 0,
          monthlyEarnings: data.stats.monthlyEarnings || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Fetch Assigned Routes
  const fetchAssignedRoutes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/routes`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setAssignedRoutes(data.routes);
        
        // Find today's route
        const today = new Date().toDateString();
        const todaysRoute = data.routes.find(r => {
          const routeDate = new Date(r.scheduledDate);
          return routeDate.toDateString() === today;
        });
        
        if (todaysRoute) {
          setCurrentRoute(todaysRoute);
          // Map passengers to stops format
          const stops = todaysRoute.passengers.map((p, index) => ({
            _id: p.passengerId._id || p.passengerId,
            name: p.pickupPoint,
            passengerName: p.name,
            status: p.status || 'pending',
            time: todaysRoute.timeSlot,
            coordinate: {
              latitude: 33.6844 + (index * 0.01),
              longitude: 73.0479 + (index * 0.01)
            }
          }));
          setRouteStops(stops);
        }
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  // Fetch Payment History
  const fetchPayments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setPaymentData(data.payments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Fetch Trip History
  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/trips`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setTrips(data.trips);
        
        // Find active trip
        const activeTrip = data.trips.find(t => t.status === 'En Route');
        if (activeTrip) {
          setCurrentTrip(activeTrip);
        }
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  // Fetch Support Tickets
  const fetchSupportTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSupportTickets(data.complaints);
      }
    } catch (error) {
      console.error('Error fetching support tickets:', error);
    }
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch Availability History
  const fetchAvailabilityHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setAvailabilityHistory(data.availability);
        // Set current availability status
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const tomorrowAvailability = data.availability.find(avail => 
          new Date(avail.date).toISOString().split('T')[0] === tomorrowStr
        );
        setAvailable(tomorrowAvailability?.status === 'available');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  // Set Availability
  const setAvailabilityStatus = async (date, startTime, endTime, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          date,
          startTime,
          endTime,
          status
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setAvailable(status === 'available');
        fetchAvailabilityHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting availability:', error);
      return false;
    }
  };

  // Start Route
  const startRoute = async (routeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${routeId}/start`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setRouteStarted(true);
        setCurrentLocation(0);
        if (data.trip) {
          setCurrentTrip(data.trip);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error starting route:', error);
      return false;
    }
  };

  // Pickup Passenger
  const pickupPassenger = async (passengerId) => {
    try {
      if (!currentTrip) {
        Alert.alert("Error", "No active trip found");
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/trips/${currentTrip._id}/pickup/${passengerId}`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setRouteStops(prevStops => 
          prevStops.map(stop => 
            stop._id === passengerId ? { ...stop, status: 'picked' } : stop
          )
        );
        fetchTrips();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error picking up passenger:', error);
      return false;
    }
  };

  // Complete Trip
  const completeTrip = async () => {
    try {
      if (!currentTrip) {
        Alert.alert("Error", "No active trip found");
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/trips/${currentTrip._id}/complete`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setRouteStarted(false);
        setCurrentLocation(0);
        setShowFeedbackModal(true);
        fetchTrips();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error completing trip:', error);
      return false;
    }
  };

  // Submit Feedback
  const submitFeedback = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          tripId: currentTrip?._id,
          routeId: currentRoute?._id,
          rating: feedbackRating,
          comment: feedbackComment
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setShowFeedbackModal(false);
        setFeedbackRating(0);
        setFeedbackComment("");
        Alert.alert("Success", "Thank you for your feedback!");
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
  };

  // Submit Support Ticket (Complaint)
  const submitSupportTicket = async (category, subject, description) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          title: subject,
          description,
          category
        })
      });
      const data = await response.json();
      
      if (data.success) {
        fetchSupportTickets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      return false;
    }
  };

  // Mark Notification as Read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark All Notifications as Read
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Update Live Location
  const updateLiveLocation = async (location) => {
    try {
      if (!currentTrip) return;
      
      await fetch(`${API_BASE_URL}/trips/${currentTrip._id}/location`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          speed: 40,
          eta: '5 min',
          currentStop: routeStops[currentLocation]?.name || ''
        })
      });
    } catch (error) {
      console.error('Error updating live location:', error);
    }
  };

  // ==================== USE EFFECTS ====================

  // Load initial data
  useEffect(() => {
    if (driver?.token) {
      fetchDashboardStats();
      fetchAssignedRoutes();
      fetchPayments();
      fetchTrips();
      fetchSupportTickets();
      fetchNotifications();
      fetchAvailabilityHistory();
    }
  }, [driver]);

  // Auto-refresh dashboard every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (driver?.token) {
        fetchDashboardStats();
        fetchNotifications();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [driver]);

  // Vehicle movement simulation (GPS tracking - refreshes every 8 seconds)
  useEffect(() => {
    if (routeStarted && currentLocation < routeStops.length) {
      const timer = setTimeout(() => {
        setCurrentLocation(prev => prev + 1);
        
        // Update live location
        if (currentLocation < routeStops.length) {
          const currentStop = routeStops[currentLocation];
          if (currentStop && currentStop.coordinate) {
            updateLiveLocation(currentStop.coordinate);
          }
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [routeStarted, currentLocation, routeStops]);

  // ==================== HELPER FUNCTIONS ====================

  // Format date for tomorrow
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Navigation
  const navigateTo = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  // Route handlers
  const handleStartRoute = () => {
    if (!currentRoute) {
      Alert.alert("Error", "No route assigned for today");
      return;
    }

    Alert.alert(
      "Start Route", 
      "Are you ready to start this route? GPS tracking will begin.", 
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Start", 
          onPress: async () => {
            setLoading(true);
            const success = await startRoute(currentRoute._id);
            setLoading(false);
            
            if (success) {
              addNotification("Trip Started", "GPS tracking is now active. Drive safely!", "success");
              Alert.alert("Success", "Route started successfully!");
            } else {
              Alert.alert("Error", "Failed to start route");
            }
          } 
        }
      ]
    );
  };

  const handleCompleteRoute = () => {
    if (!currentRoute) return;

    const allPickedUp = routeStops.every(stop => stop.status === "picked" || stop.status === "completed");
    
    if (!allPickedUp) {
      Alert.alert(
        "Incomplete Route", 
        "Some passengers haven't been picked up yet. Are you sure you want to complete the route?", 
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Complete Anyway", 
            style: "destructive", 
            onPress: async () => {
              setLoading(true);
              const success = await completeTrip();
              setLoading(false);
              
              if (success) {
                addNotification("Trip Completed", "Route completed successfully!", "success");
              } else {
                Alert.alert("Error", "Failed to complete route");
              }
            } 
          }
        ]
      );
    } else {
      setLoading(true);
      completeTrip().then(success => {
        setLoading(false);
        if (success) {
          addNotification("Trip Completed", "All passengers have been dropped off successfully!", "success");
        } else {
          Alert.alert("Error", "Failed to complete route");
        }
      });
    }
  };

  const handlePickupPassenger = async (passengerId) => {
    if (!routeStarted) {
      Alert.alert("Route Not Started", "Please start the route first before picking up passengers.");
      return;
    }

    const stop = routeStops.find(s => s._id === passengerId);
    if (!stop) return;

    Alert.alert(
      'Confirm Pickup',
      `Confirm pickup for ${stop.passengerName} at ${stop.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            const success = await pickupPassenger(passengerId);
            setLoading(false);
            
            if (success) {
              addNotification(
                `Passenger Picked Up`,
                `${stop.passengerName} has been picked up at ${stop.name}`,
                "success"
              );
              Alert.alert("Success", "Passenger marked as picked up");
            } else {
              Alert.alert("Error", "Failed to mark passenger as picked up");
            }
          }
        }
      ]
    );
  };

  // Helper function to add notifications (local only)
  const addNotification = (title, message, type) => {
    const newNotif = {
      _id: Date.now().toString(),
      title,
      message,
      time: "Just now",
      type,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Handle availability confirmation
  const handleConfirmAvailability = async () => {
    const tomorrowDate = getTomorrowDate();
    
    Alert.alert(
      "Confirm Availability",
      `Confirming your availability for ${formatDisplayDate(tomorrowDate)} from ${startTime} to ${endTime}. This will be sent to the transporter.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            const success = await setAvailabilityStatus(tomorrowDate, startTime, endTime, 'available');
            setLoading(false);
            
            if (success) {
              addNotification(
                "Availability Confirmed",
                `Your availability for ${formatDisplayDate(tomorrowDate)} (${startTime} - ${endTime}) has been sent to the transporter.`,
                "success"
              );
              Alert.alert("Success", "Your availability has been confirmed and sent to the transporter!");
            } else {
              Alert.alert("Error", "Failed to confirm availability");
            }
          }
        }
      ]
    );
  };

  // Handle mark unavailable
  const handleMarkUnavailable = async () => {
    const tomorrowDate = getTomorrowDate();
    
    Alert.alert(
      "Mark Unavailable",
      "Are you sure you want to mark yourself as unavailable for tomorrow?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Unavailable",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const success = await setAvailabilityStatus(tomorrowDate, "", "", 'unavailable');
            setLoading(false);
            
            if (success) {
              addNotification(
                "Marked Unavailable",
                `You have marked yourself as unavailable for ${formatDisplayDate(tomorrowDate)}.`,
                "warning"
              );
              Alert.alert("Updated", "You have been marked as unavailable for tomorrow.");
            } else {
              Alert.alert("Error", "Failed to update availability");
            }
          }
        }
      ]
    );
  };

  // Support ticket submission
  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    const success = await submitSupportTicket(ticketCategory, ticketSubject, ticketDescription);
    setLoading(false);

    if (success) {
      setNewTicketVisible(false);
      setTicketSubject("");
      setTicketDescription("");
      addNotification("Support Ticket Created", "Your support request has been submitted successfully.", "info");
      Alert.alert("Success", "Your support ticket has been submitted. We'll get back to you soon.");
    } else {
      Alert.alert("Error", "Failed to submit support ticket");
    }
  };

  // Calculate stats
  const completedStops = routeStops.filter(s => s.status === "picked" || s.status === "completed").length;
  const progress = routeStops.length > 0 ? (completedStops / routeStops.length) * 100 : 0;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Filtered trips
  const filteredTrips = trips.filter((trip) => {
    const matchesSearch = trip.routeName?.toLowerCase().includes(search.toLowerCase()) || 
                          trip.driverName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "All" ? true : trip.status?.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  // Map data
  const routeCoordinates = routeStops.map(stop => stop.coordinate).filter(coord => coord);
  const vehiclePosition = routeStarted && currentLocation > 0 && routeStops.length > 0
    ? routeStops[Math.min(currentLocation - 1, routeStops.length - 1)].coordinate 
    : (routeStops[0]?.coordinate || { latitude: 33.6844, longitude: 73.0479 });

  const styles = driverStyles;

  const StatusBadge = ({ status }) => {
    let bgColor = "#FFF3E0";
    let textColor = "#FF9800";
    
    const statusLower = status?.toLowerCase();
    
    if (statusLower === "completed" || statusLower === "picked" || statusLower === "transferred" || statusLower === "resolved") {
      bgColor = "#E8F5E9";
      textColor = "#4CAF50";
    } else if (statusLower === "cancelled") {
      bgColor = "#FFEBEE";
      textColor = "#F44336";
    } else if (statusLower === "in progress" || statusLower === "en route") {
      bgColor = "#E3F2FD";
      textColor = "#2196F3";
    }

    return (
      <View style={{ 
        backgroundColor: bgColor, 
        paddingVertical: 6, 
        paddingHorizontal: 12, 
        minWidth: 90, 
        borderRadius: 12, 
        alignItems: "center" 
      }}>
        <Text style={{ fontWeight: "600", fontSize: 12, color: textColor }}>
          {status}
        </Text>
      </View>
    );
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        {loading && <ActivityIndicator size="large" color="#A1D826" style={{ marginVertical: 10 }} />}
        
        {/* Dashboard Statistics */}
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={28} color="#A1D826" />
            <Text style={styles.statValue}>{dashboardStats.completedTrips}</Text>
            <Text style={styles.statLabel}>Completed Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={28} color="#FF9800" />
            <Text style={styles.statValue}>{dashboardStats.activeTrips}</Text>
            <Text style={styles.statLabel}>Active Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="alert-circle" size={28} color="#2196F3" />
            <Text style={styles.statValue}>{dashboardStats.pendingTrips}</Text>
            <Text style={styles.statLabel}>Pending Trips</Text>
          </View>
        </View>

        {/* Assigned Route Information */}
        {currentRoute ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Today's Assigned Route</Text>
            <View style={styles.routeInfo}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="location" size={20} color="#A1D826" />
                </View>
                <Text style={styles.cardText}>{currentRoute.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="time" size={20} color="#A1D826" />
                </View>
                <Text style={styles.cardText}>Time: {currentRoute.timeSlot}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="people" size={20} color="#A1D826" />
                </View>
                <Text style={styles.cardText}>Passengers: {routeStops.length}</Text>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="navigate" size={20} color="#A1D826" />
                </View>
                <Text style={styles.cardText}>Status: {routeStarted ? "In Progress" : "Not Started"}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigateTo("Routes")}
              style={styles.button}
            >
              <Text style={styles.buttonText}>View Full Route Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No Route Assigned</Text>
            <Text style={styles.cardText}>You don't have any routes assigned for today.</Text>
          </View>
        )}

        {/* Quick Access Menu */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        {[
          { title: "Confirm Availability", icon: "calendar-outline", view: "Availability" },
          { title: "Assigned Routes", icon: "map", view: "Routes" },
          { title: "Trip History", icon: "time", view: "History" },
          { title: "Payment & Salary", icon: "card", view: "Payments" },
          { title: "Support & Complaints", icon: "help-circle", view: "Support" },
          { title: "Notifications", icon: "notifications", view: "Notifications", badge: unreadNotifications }
        ].map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigateTo(item.view)}
            style={styles.menuCard}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={item.icon} size={22} color="#A1D826" style={{ marginRight: 14 }} />
              <Text style={styles.menuCardText}>{item.title}</Text>
            </View>                                               
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {item.badge > 0 && (
                <View style={{
                  backgroundColor: "#F44336",
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10
                }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {item.badge}
                  </Text>
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
        
        {/* Current Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Availability Status</Text>
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Ionicons 
              name={available ? "checkmark-circle" : "close-circle"} 
              size={64} 
              color={available ? "#A1D826" : "#999"} 
            />
            <Text style={{ 
              fontSize: 18, 
              fontWeight: "700", 
              color: available ? "#A1D826" : "#999", 
              marginTop: 12 
            }}>
              {available ? "Available for Tomorrow" : "Not Available"}
            </Text>
            {available && (
              <View style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 14, color: "#666" }}>
                  Date: {formatDisplayDate(getTomorrowDate())}
                </Text>
                <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
                  Time: {startTime} - {endTime}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Confirm Availability Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Confirm Tomorrow's Availability</Text>
          <Text style={styles.cardText}>
            Let the transporter know your available timings for {formatDisplayDate(getTomorrowDate())}
          </Text>

          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
              Start Time
            </Text>
            <View style={{
              backgroundColor: "#f9f9f9",
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20
            }}>
              <Ionicons name="time-outline" size={20} color="#A1D826" style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: "#333" }}
                placeholder="07:00 AM"
                value={startTime}
                onChangeText={setStartTime}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
              End Time
            </Text>
            <View style={{
              backgroundColor: "#f9f9f9",
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 12,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20
            }}>
              <Ionicons name="time-outline" size={20} color="#A1D826" style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: "#333" }}
                placeholder="06:00 PM"
                value={endTime}
                onChangeText={setEndTime}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleConfirmAvailability}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Confirm Availability</Text>
              </>
            )}
          </TouchableOpacity>

          {available && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#F44336", marginTop: 12 }]}
              onPress={handleMarkUnavailable}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Mark Unavailable</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Information Card */}
        <View style={[styles.card, { backgroundColor: "#F0F9D9" }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Ionicons name="information-circle" size={24} color="#6B8E23" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#6B8E23", marginBottom: 8 }}>
                Important Information
              </Text>
              <Text style={{ fontSize: 14, color: "#6B8E23", lineHeight: 20 }}>
                • Please confirm your availability before 6:00 PM daily{"\n"}
                • Your availability will be sent to the transporter{"\n"}
                • You'll receive a notification once route is assigned{"\n"}
                • Update your timings if there are any changes
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Availability History */}
        <Text style={styles.sectionTitle}>Recent Availability History</Text>
        {availabilityHistory.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>No availability history found.</Text>
          </View>
        ) : (
          availabilityHistory.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#333" }}>
                  {formatDisplayDate(item.date)}
                </Text>
                <StatusBadge status={item.status === "available" ? "Available" : "Unavailable"} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <Ionicons name="time-outline" size={14} color="#999" />
                <Text style={{ fontSize: 14, color: "#666", marginLeft: 6 }}>
                  {item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : "-"}
                </Text>
              </View>
              {item.confirmed && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#A1D826" />
                  <Text style={{ fontSize: 13, color: "#A1D826", marginLeft: 6 }}>
                    Confirmed
                  </Text>
                </View>
              )}
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
            {/* Route Header */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{currentRoute.name}</Text>
              <View style={styles.routeInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color="#A1D826" />
                  <Text style={[styles.cardText, { marginLeft: 10 }]}>{currentRoute.timeSlot}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={20} color="#A1D826" />
                  <Text style={[styles.cardText, { marginLeft: 10 }]}>{routeStops.length} Passengers</Text>
                </View>
              </View>

              {!routeStarted ? (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#4CAF50" }]}
                  onPress={handleStartRoute}
                  disabled={loading}
                >
                  <Ionicons name="play-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Start Route</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#F44336" }]}
                  onPress={handleCompleteRoute}
                  disabled={loading}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Complete Route</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Progress */}
            {routeStarted && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Route Progress</Text>
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
              </View>
            )}

            {/* Map */}
            {routeCoordinates.length > 0 && (
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.mapView}
                  initialRegion={{
                    latitude: vehiclePosition.latitude,
                    longitude: vehiclePosition.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  {/* Route Line */}
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#A1D826"
                    strokeWidth={4}
                  />
                  
                  {/* Stop Markers */}
                  {routeStops.map((stop, index) => (
                    <Marker
                      key={stop._id}
                      coordinate={stop.coordinate}
                      title={stop.name}
                      description={stop.passengerName}
                      pinColor={stop.status === 'picked' ? '#4CAF50' : '#FF9800'}
                    />
                  ))}
                  
                  {/* Vehicle Marker */}
                  {routeStarted && (
                    <Marker
                      coordinate={vehiclePosition}
                      title="Your Van"
                      description="Current Location"
                    >
                      <View style={{
                        backgroundColor: '#A1D826',
                        padding: 8,
                        borderRadius: 20
                      }}>
                        <Ionicons name="car" size={24} color="#fff" />
                      </View>
                    </Marker>
                  )}
                </MapView>
              </View>
            )}

            {/* Passenger List */}
            <Text style={styles.sectionTitle}>Passengers</Text>
            {routeStops.map((stop, index) => (
              <View key={stop._id} style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.stopNumber}>
                      <Text style={styles.stopNumberText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopName}>{stop.passengerName}</Text>
                      <Text style={styles.stopPassenger}>📍 {stop.name}</Text>
                    </View>
                  </View>
                  <StatusBadge status={stop.status} />
                </View>
                
                <View style={styles.stopTime}>
                  <Ionicons name="time-outline" size={14} color="#999" />
                  <Text style={styles.stopTimeText}>{stop.time}</Text>
                </View>

                {routeStarted && stop.status !== 'picked' && stop.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.button, { marginTop: 12 }]}
                    onPress={() => handlePickupPassenger(stop._id)}
                    disabled={loading}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.buttonText}>Mark as Picked Up</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No Route Assigned</Text>
            <Text style={styles.cardText}>You don't have any routes assigned for today.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <Text style={styles.sectionTitle}>Trip History</Text>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search trips..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          {["All", "Completed", "Cancelled"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, filter === tab && styles.tabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trips List */}
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
            <View key={trip._id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeText}>{trip.routeName || 'Route'}</Text>
                  <Text style={styles.dateText}>
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <StatusBadge status={trip.status} />
              </View>
              
              <View style={styles.tripDetails}>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="people" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>
                    {trip.passengers?.length || 0} passengers
                  </Text>
                </View>
                <View style={styles.tripDetailItem}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.tripDetailText}>{trip.timeSlot}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No trips found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderPayments = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <Text style={styles.sectionTitle}>Payments & Salary</Text>
        
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryMonth}>This Month</Text>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>
                {new Date().toLocaleDateString('en-US', { month: 'long' })}
              </Text>
            </View>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Total Earned</Text>
            <Text style={styles.amountValue}>
              Rs. {paymentData.reduce((sum, p) => sum + (p.amount || 0), 0)}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Trips</Text>
              <Text style={styles.statValue}>
                {trips.filter(t => t.status === 'Completed').length}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statValue}>
                Rs. {paymentData.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paymentData.length > 0 ? (
          paymentData.map((payment) => (
            <View key={payment._id} style={styles.paymentCard}>
              <View style={styles.paymentCardHeader}>
                <Text style={styles.paymentMonth}>{payment.month}</Text>
                <Text style={styles.paymentAmount}>Rs. {payment.amount}</Text>
              </View>
              
              <View style={styles.paymentCardFooter}>
                <View style={styles.paymentDate}>
                  <Ionicons name="calendar-outline" size={14} color="#999" />
                  <Text style={{ fontSize: 12, color: "#999", marginLeft: 6 }}>
                    {new Date(payment.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.paymentStatus}>{payment.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No payment history</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderSupport = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.contentPadding}>
        <Text style={styles.sectionTitle}>Support & Complaints</Text>
        
        {/* New Ticket Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => setNewTicketVisible(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Submit New Complaint</Text>
        </TouchableOpacity>

        {/* Tickets List */}
        <Text style={styles.sectionTitle}>My Complaints</Text>
        {supportTickets.length > 0 ? (
          supportTickets.map((ticket) => (
            <View key={ticket._id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>{ticket.title}</Text>
                <StatusBadge status={ticket.status} />
              </View>
              <Text style={styles.cardText}>{ticket.description}</Text>
              <Text style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                {new Date(ticket.createdAt).toLocaleDateString()}
              </Text>
              {ticket.replies && ticket.replies.length > 0 && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 }}>
                    💬 {ticket.replies.length} {ticket.replies.length === 1 ? 'Reply' : 'Replies'}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No complaints submitted</Text>
          </View>
        )}

        {/* New Ticket Modal */}
        <Modal visible={newTicketVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Complaint</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setNewTicketVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
                  Category
                </Text>
                <View style={{
                  backgroundColor: "#f9f9f9",
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                  borderRadius: 12,
                  marginBottom: 16
                }}>
                  <TouchableOpacity
                    style={{
                      padding: 14,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      // Could add category picker here
                    }}
                  >
                    <Text style={{ fontSize: 15, color: "#333" }}>{ticketCategory}</Text>
                    <Ionicons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
                  Subject
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#f9f9f9",
                    borderWidth: 1,
                    borderColor: "#e5e5e5",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    fontSize: 15,
                    color: "#333"
                  }}
                  placeholder="Enter subject"
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  placeholderTextColor="#999"
                />

                <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
                  Description
                </Text>
                <TextInput
                  style={{
                    backgroundColor: "#f9f9f9",
                    borderWidth: 1,
                    borderColor: "#e5e5e5",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 20,
                    fontSize: 15,
                    color: "#333",
                    height: 120,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Describe your complaint..."
                  value={ticketDescription}
                  onChangeText={setTicketDescription}
                  placeholderTextColor="#999"
                  multiline
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmitTicket}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit Complaint</Text>
                  )}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {unreadNotifications > 0 && (
            <TouchableOpacity onPress={markAllNotificationsAsRead}>
              <Text style={{ color: '#A1D826', fontSize: 14, fontWeight: '600' }}>
                Mark all as read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification._id}
              style={[
                styles.card,
                { backgroundColor: notification.read ? '#fff' : '#F0F9D9' }
              ]}
              onPress={() => {
                if (!notification.read) {
                  markNotificationAsRead(notification._id);
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons 
                  name={notification.icon || 'notifications'} 
                  size={24} 
                  color={notification.color || '#A1D826'} 
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 }}>
                    {notification.title}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                    {notification.message}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                    {notification.time || new Date(notification.createdAt).toLocaleString()}
                  </Text>
                </View>
                {!notification.read && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#F44336'
                  }} />
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardText}>No notifications</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // Feedback Modal
  const FeedbackModal = () => (
    <Modal visible={showFeedbackModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Your Trip</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFeedbackModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 16, textAlign: 'center' }}>
              How was your experience today?
            </Text>

            {/* Star Rating */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setFeedbackRating(star)}
                  style={{ marginHorizontal: 8 }}
                >
                  <Ionicons
                    name={star <= feedbackRating ? "star" : "star-outline"}
                    size={40}
                    color={star <= feedbackRating ? "#FFD700" : "#ccc"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 10 }}>
              Comments (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: "#f9f9f9",
                borderWidth: 1,
                borderColor: "#e5e5e5",
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
                fontSize: 15,
                color: "#333",
                height: 100,
                textAlignVertical: 'top'
              }}
              placeholder="Share your experience..."
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholderTextColor="#999"
              multiline
            />

            <TouchableOpacity
              style={styles.button}
              onPress={submitFeedback}
              disabled={loading || feedbackRating === 0}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit Feedback</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setSidebarOpen(!sidebarOpen)}>
          <Ionicons name={sidebarOpen ? "close" : "menu"} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{currentView}</Text>
          <Text style={styles.headerSubtitle}>Driver Portal</Text>
        </View>
        <View style={{ width: 40 }}>
          {currentView === "Notifications" && unreadNotifications > 0 && (
            <View style={{
              backgroundColor: "#F44336",
              width: 20,
              height: 20,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                {unreadNotifications}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <TouchableOpacity 
            style={styles.sidebarOverlay}
            onPress={() => setSidebarOpen(false)}
            activeOpacity={1}
          />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarHeaderText}>Driver Portal</Text>
              <Text style={styles.sidebarHeaderSubtext}>
                {driver?.name || "Driver Name"}
              </Text>
            </View>
            
            <ScrollView style={styles.sidebarMenu}>
              {[
                { view: "Dashboard", title: "Dashboard", icon: "home" },
                { view: "Availability", title: "Confirm Availability", icon: "calendar-outline" },
                { view: "Routes", title: "Assigned Routes", icon: "map" },
                { view: "History", title: "Trip History", icon: "time" },
                { view: "Payments", title: "Payments & Salary", icon: "card" },
                { view: "Support", title: "Support & Complaints", icon: "help-circle" },
                { view: "Notifications", title: "Notifications", icon: "notifications", badge: unreadNotifications },
              ].map((item) => (
                <TouchableOpacity
                  key={item.view}
                  style={[styles.sidebarItem, currentView === item.view && styles.sidebarItemActive]}
                  onPress={() => navigateTo(item.view)}
                >
                  <Ionicons name={item.icon} size={20} color={currentView === item.view ? "#A1D826" : "#666"} />
                  <Text style={[styles.sidebarItemText, currentView === item.view && styles.sidebarItemTextActive]}>
                    {item.title}
                  </Text>
                  {item.badge > 0 && (
                    <View style={{
                      backgroundColor: "#F44336",
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: "auto"
                    }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                        {item.badge}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.sidebarFooter}>
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={() => {
                  Alert.alert(
                    "Logout", 
                    "Are you sure you want to logout?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Logout", 
                        style: "destructive", 
                        onPress: () => {
                          navigation.reset({
                            index: 0,
                            routes: [{ name: 'DriverLogin' }],
                          });
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Content Views */}
      {currentView === "Dashboard" && renderDashboard()}
      {currentView === "Availability" && renderAvailability()}
      {currentView === "Routes" && renderRoutes()}
      {currentView === "History" && renderHistory()}
      {currentView === "Payments" && renderPayments()}
      {currentView === "Support" && renderSupport()}
      {currentView === "Notifications" && renderNotifications()}
      
      {/* Feedback Modal */}
      <FeedbackModal />

      {/* Loading Overlay */}
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