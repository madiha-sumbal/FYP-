import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import styles from "../../styles/PassengerDashboardStyle";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== API BASE URL ====================
const API_BASE_URL = "http://172.21.243.83:3000/api";
const GOOGLE_MAPS_API_KEY = "AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME";

export default function PassengerDashboard({ navigation }) {
  // ==================== STATE VARIABLES ====================
  
  // Poll & Response States
  const [activePolls, setActivePolls] = useState([]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [travelResponse, setTravelResponse] = useState(''); // 'yes' or 'no'
  
  // Morning Confirmation States
  const [showMorningConfirmation, setShowMorningConfirmation] = useState(false);
  const [morningConfirmationTrip, setMorningConfirmationTrip] = useState(null);
  
  // Route & Trip States
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [tripStatus, setTripStatus] = useState('pending'); // pending, started, picked, completed
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState('Calculating...');
  
  // UI States
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Auth States
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Driver Info
  const [driverInfo, setDriverInfo] = useState({
    name: "Driver",
    rating: 4.8,
    vehicleNumber: "N/A",
    vehicleModel: "Van",
    phone: "N/A"
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapMarkerAnim = useRef(new Animated.Value(0)).current;
  const callRingAnim = useRef(new Animated.Value(0)).current;
  const pollAlertSlideAnim = useRef(new Animated.Value(-100)).current;
  const morningConfirmSlideAnim = useRef(new Animated.Value(-100)).current;
  const pollAlertPulseAnim = useRef(new Animated.Value(1)).current;
  const morningConfirmPulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

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
        setUserToken(token);
        setUserId(userId);
        
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserProfile(userData);
          setPickupPoint(userData.pickupPoint || '');
        }
        
        console.log("✅ Auth data loaded for passenger");
        console.log("  - User ID:", userId);
        console.log("  - Token:", token ? "Present" : "Missing");
        
        // Load all data
        await fetchActivePolls();
        await fetchNotifications();
        await fetchCurrentTrip();
        
        // Set up polling for real-time updates - every 5 seconds
        const pollInterval = setInterval(() => {
          fetchActivePolls();
          fetchNotifications();
          fetchCurrentTrip();
        }, 5000);
        
        return () => clearInterval(pollInterval);
      } else {
        console.log("⚠️ No auth data found, redirecting to login");
        // ✅ FIXED: Changed from 'PassengerLogin' to 'PassengerLoginScreen'
        navigation.reset({
          index: 0,
          routes: [{ name: 'PassengerLoginScreen' }],
        });
      }
    } catch (error) {
      console.error("❌ Error loading auth data:", error);
    }
  };

  // ==================== API CALLS ====================
  
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  });

  // Fetch Active Polls
  const fetchActivePolls = async () => {
    try {
      console.log("📊 Fetching active polls...");
      const response = await fetch(`${API_BASE_URL}/polls/active`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      console.log("📊 Active Polls Response:", data);
      
      if (data.success && data.polls && data.polls.length > 0) {
        setActivePolls(data.polls);
        
        // Find polls that need response
        const pollsNeedingResponse = data.polls.filter(poll => {
          const userResponse = poll.responses?.find(r => 
            r.passengerId === userId || 
            r.passengerId?._id === userId ||
            r.passengerId?.toString() === userId
          );
          return !userResponse && poll.status === 'active';
        });
        
        console.log("📊 Polls needing response:", pollsNeedingResponse.length);
        
        if (pollsNeedingResponse.length > 0 && !showPollModal) {
          const firstPoll = pollsNeedingResponse[0];
          setSelectedPoll(firstPoll);
          setShowPollModal(true);
          
          // Animate poll alert
          Animated.parallel([
            Animated.timing(pollAlertSlideAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.loop(
              Animated.sequence([
                Animated.timing(pollAlertPulseAnim, { 
                  toValue: 1.05, 
                  duration: 800, 
                  useNativeDriver: true 
                }),
                Animated.timing(pollAlertPulseAnim, { 
                  toValue: 1, 
                  duration: 800, 
                  useNativeDriver: true 
                }),
              ])
            )
          ]).start();
        }
      } else {
        console.log("📊 No active polls found");
        setActivePolls([]);
      }
    } catch (error) {
      console.error("❌ Error fetching active polls:", error);
      setActivePolls([]);
    }
  };

  // Submit Poll Response
  const submitPollResponse = async () => {
    if (!selectedPoll) {
      console.log("❌ No poll selected");
      return;
    }
    
    if (travelResponse === 'yes' && (!selectedTimeSlot || !pickupPoint)) {
      Alert.alert("Missing Information", "Please select a time slot and confirm your pickup point");
      return;
    }
    
    if (!travelResponse) {
      Alert.alert("Please Choose", "Please select whether you will travel or not");
      return;
    }
    
    try {
      setLoading(true);
      
      console.log("📤 Submitting poll response:", {
        pollId: selectedPoll._id,
        response: travelResponse,
        selectedTimeSlot: travelResponse === 'yes' ? selectedTimeSlot : null,
        pickupPoint: travelResponse === 'yes' ? pickupPoint : null
      });
      
      const response = await fetch(`${API_BASE_URL}/polls/${selectedPoll._id}/respond`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          response: travelResponse,
          selectedTimeSlot: travelResponse === 'yes' ? selectedTimeSlot : null,
          pickupPoint: travelResponse === 'yes' ? pickupPoint : null
        })
      });
      
      const data = await response.json();
      
      console.log("✅ Poll Response Result:", data);
      
      if (data.success) {
        Alert.alert(
          "Response Submitted", 
          travelResponse === 'yes' 
            ? `Thank you! You've confirmed travel for tomorrow at ${selectedTimeSlot}.` 
            : "You've confirmed that you won't be traveling tomorrow.",
          [{ 
            text: "OK", 
            onPress: () => {
              setShowPollModal(false);
              setSelectedPoll(null);
              setTravelResponse('');
              setSelectedTimeSlot('');
              dismissPollAlert();
              fetchActivePolls();
              fetchNotifications();
            }
          }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to submit response");
      }
    } catch (error) {
      console.error("❌ Error submitting poll response:", error);
      Alert.alert("Error", "Failed to submit your response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Current Trip
  const fetchCurrentTrip = async () => {
    try {
      console.log("🚐 Fetching current trip...");
      const response = await fetch(`${API_BASE_URL}/trips`, {
        headers: getHeaders()
      });
      const data = await response.json();
      
      console.log("🚐 Trips Response:", data);
      
      if (data.success && data.trips && data.trips.length > 0) {
        const myTrips = data.trips.filter(trip => 
          trip.passengers && trip.passengers.some(p => {
            const pId = p._id?._id || p._id;
            return pId?.toString() === userId || pId === userId;
          })
        );
        
        console.log("🚐 My Trips:", myTrips.length);
        
        const activeTrip = myTrips.find(t => 
          t.status === 'Scheduled' || t.status === 'En Route' || t.status === 'Ready'
        );
        
        if (activeTrip) {
          console.log("🚐 Active Trip Found:", activeTrip.status);
          setCurrentTrip(activeTrip);
          setTripStatus(activeTrip.status);
          
          const myPassenger = activeTrip.passengers.find(p => {
            const pId = p._id?._id || p._id;
            return pId?.toString() === userId || pId === userId;
          });
          
          if (myPassenger) {
            console.log("👤 My Passenger Status:", myPassenger.status);
            
            if (myPassenger.status === 'picked') {
              setTripStatus('picked');
            }
            
            if (activeTrip.status === 'Ready' && !myPassenger.confirmedMorning) {
              console.log("⏰ Morning confirmation needed");
              setShowMorningConfirmation(true);
              setMorningConfirmationTrip(activeTrip);
              
              Animated.parallel([
                Animated.timing(morningConfirmSlideAnim, {
                  toValue: 0,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.loop(
                  Animated.sequence([
                    Animated.timing(morningConfirmPulseAnim, { 
                      toValue: 1.05, 
                      duration: 800, 
                      useNativeDriver: true 
                    }),
                    Animated.timing(morningConfirmPulseAnim, { 
                      toValue: 1, 
                      duration: 800, 
                      useNativeDriver: true 
                    }),
                  ])
                )
              ]).start();
            }
          }
          
          if (activeTrip.driverId) {
            setDriverInfo({
              name: activeTrip.driverName || "Driver",
              vehicleNumber: activeTrip.vehicleNumber || "N/A",
              vehicleModel: activeTrip.vehicleType || "Van",
              rating: 4.8,
              phone: activeTrip.driverId.phone || "N/A"
            });
          }
          
          if (activeTrip.currentLocation) {
            setDriverLocation(activeTrip.currentLocation);
            calculateETA(activeTrip.currentLocation);
          }
        } else {
          console.log("🚐 No active trip found");
          setCurrentTrip(null);
        }
      } else {
        console.log("🚐 No trips in response");
        setCurrentTrip(null);
      }
    } catch (error) {
      console.error("❌ Error fetching current trip:", error);
    }
  };

  // Submit Morning Confirmation
  const submitMorningConfirmation = async (willTravel) => {
    if (!morningConfirmationTrip) {
      console.log("❌ No morning confirmation trip");
      return;
    }
    
    try {
      setLoading(true);
      
      console.log("📤 Submitting morning confirmation:", {
        tripId: morningConfirmationTrip._id,
        traveling: willTravel
      });
      
      const response = await fetch(
        `${API_BASE_URL}/trips/${morningConfirmationTrip._id}/confirm-passenger`, 
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            traveling: willTravel
          })
        }
      );
      
      const data = await response.json();
      
      console.log("✅ Morning Confirmation Result:", data);
      
      if (data.success) {
        Alert.alert(
          "Confirmation Submitted",
          willTravel 
            ? "Thank you! Your driver has been notified that you're traveling." 
            : "You've confirmed that you won't be traveling today.",
          [{ 
            text: "OK", 
            onPress: () => {
              setShowMorningConfirmation(false);
              setMorningConfirmationTrip(null);
              dismissMorningConfirmAlert();
              fetchCurrentTrip();
              fetchNotifications();
            }
          }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to submit confirmation");
      }
    } catch (error) {
      console.error("❌ Error submitting morning confirmation:", error);
      Alert.alert("Error", "Failed to submit confirmation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate ETA
  const calculateETA = (driverLocation) => {
    if (!userProfile || !userProfile.latitude || !userProfile.longitude) {
      setEstimatedArrival("Calculating...");
      return;
    }
    
    const distance = Math.sqrt(
      Math.pow(driverLocation.latitude - userProfile.latitude, 2) +
      Math.pow(driverLocation.longitude - userProfile.longitude, 2)
    );
    
    const estimatedMinutes = Math.max(1, Math.round(distance * 100 * 2));
    setEstimatedArrival(`${estimatedMinutes} min`);
  };

  // Fetch Notifications - FIXED VERSION
  const fetchNotifications = async () => {
    try {
      console.log("🔔 Fetching notifications for user:", userId);
      
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      console.log("🔔 Notifications API Response:", data);
      
      if (data.success) {
        const notifs = data.notifications || data.data || [];
        console.log("🔔 Total notifications received:", notifs.length);
        
        // Filter notifications for current user
        const userNotifications = notifs.filter(n => {
          const notifUserId = n.userId?._id || n.userId;
          const matches = notifUserId?.toString() === userId;
          console.log(`  Notification ${n._id}: userId=${notifUserId}, matches=${matches}`);
          return matches;
        });
        
        console.log("🔔 User notifications after filter:", userNotifications.length);
        
        setNotifications(userNotifications);
        
        const unread = userNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        console.log("🔔 Unread notifications:", unread);
        
        // Check for poll notifications that need immediate attention
        const pollNotifications = userNotifications.filter(n => 
          n.type === 'poll' && !n.read && n.actionRequired
        );
        
        if (pollNotifications.length > 0 && !showPollModal) {
          console.log("🔔 Found", pollNotifications.length, "poll notifications requiring action");
          // Poll will be shown from fetchActivePolls
        }
      } else {
        console.log("🔔 Notifications fetch failed:", data.message);
      }
    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    }
  };

  // Mark Notification as Read
  const markNotificationAsRead = async (notificationId) => {
    try {
      console.log("✅ Marking notification as read:", notificationId);
      
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      fetchNotifications();
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
    }
  };

  // Mark All Notifications as Read
  const markAllNotificationsAsRead = async () => {
    try {
      console.log("✅ Marking all notifications as read");
      
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      fetchNotifications();
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
    }
  };

  // ==================== UI HELPER FUNCTIONS ====================
  
  const dismissPollAlert = () => {
    pollAlertPulseAnim.stopAnimation();
    Animated.timing(pollAlertPulseAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(pollAlertSlideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const dismissMorningConfirmAlert = () => {
    morningConfirmPulseAnim.stopAnimation();
    Animated.timing(morningConfirmPulseAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(morningConfirmSlideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMsg = {
        id: Date.now(),
        text: inputText,
        fromDriver: false,
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      
      setChatMessages(prev => [...prev, newMsg]);
      setInputText("");
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleAlertNavigation = () => {
    navigation.navigate('AlertScreen', { 
      notifications,
      onMarkAsRead: markNotificationAsRead,
      onMarkAllAsRead: markAllNotificationsAsRead
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchActivePolls(),
      fetchNotifications(),
      fetchCurrentTrip()
    ]);
    setRefreshing(false);
  };

  // ==================== ANIMATIONS ====================
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(mapMarkerAnim, { toValue: -10, duration: 500, useNativeDriver: true }),
        Animated.timing(mapMarkerAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (callModalVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(callRingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(callRingAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      callRingAnim.setValue(0);
    }
  }, [callModalVisible]);

  const blinkOpacity = blinkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const ringScale = callRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  // ==================== RENDER ====================
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity 
          style={styles.notificationWrapper}
          onPress={handleAlertNavigation} 
        >
          <Icon name="notifications" size={26} color="#fff" />
          {(unreadCount > 0 || showPollModal || showMorningConfirmation) && (
            <Animated.View style={[styles.blinkDot, { opacity: blinkOpacity }]} />
          )}
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A1D826']}
            tintColor={'#A1D826'}
          />
        }
      >
        {/* Poll Response Alert */}
        {showPollModal && selectedPoll && (
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [
              { translateY: pollAlertSlideAnim },
              { translateY: cardTranslateY },
              { scale: pollAlertPulseAnim }
            ],
            marginTop: 20
          }}>
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.alertBox}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Icon name="help-circle" size={26} color="#fff" />
              </Animated.View>
              <View style={styles.alertTextBox}>
                <Text style={styles.alertTitle}>{selectedPoll.title}</Text>
                <Text style={styles.alertText}>
                  {selectedPoll.question || "Will you travel tomorrow?"}
                </Text>
                <Text style={styles.alertText}>
                  Closes at: {selectedPoll.closesAt}
                </Text>
                <View style={styles.alertButtons}>
                  <TouchableOpacity 
                    style={styles.confirmBtn} 
                    onPress={() => {
                      setTravelResponse('yes');
                    }}
                  >
                    <Icon name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>Yes, I'll Travel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallCancelBtn}
                    onPress={() => {
                      setTravelResponse('no');
                      submitPollResponse();
                    }}
                  >
                    <Icon name="close-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>No</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Time Slot Selection (if Yes) */}
                {travelResponse === 'yes' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.alertText, { fontWeight: '700', marginBottom: 8 }]}>
                      Select Time Slot:
                    </Text>
                    {selectedPoll.timeSlots?.map((slot, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.timeSlotBtn,
                          selectedTimeSlot === slot && styles.timeSlotBtnSelected
                        ]}
                        onPress={() => setSelectedTimeSlot(slot)}
                      >
                        <Text style={[
                          styles.timeSlotText,
                          selectedTimeSlot === slot && styles.timeSlotTextSelected
                        ]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    
                    <Text style={[styles.alertText, { fontWeight: '700', marginTop: 12, marginBottom: 8 }]}>
                      Pickup Point:
                    </Text>
                    <TextInput
                      style={styles.pickupInput}
                      placeholder="Enter pickup point"
                      placeholderTextColor="#ccc"
                      value={pickupPoint}
                      onChangeText={setPickupPoint}
                    />
                    
                    <TouchableOpacity
                      style={[styles.confirmBtn, { marginTop: 12 }]}
                      onPress={submitPollResponse}
                      disabled={loading || !selectedTimeSlot || !pickupPoint}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon name="checkmark-done" size={18} color="#fff" />
                          <Text style={styles.btnText}>Confirm Response</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Morning Confirmation Alert */}
        {showMorningConfirmation && morningConfirmationTrip && (
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [
              { translateY: morningConfirmSlideAnim },
              { translateY: cardTranslateY },
              { scale: morningConfirmPulseAnim }
            ],
            marginTop: showPollModal ? 15 : 20
          }}>
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.alertBox}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Icon name="bus" size={26} color="#fff" />
              </Animated.View>
              <View style={styles.alertTextBox}>
                <Text style={styles.alertTitle}>Final Travel Confirmation</Text>
                <Text style={styles.alertText}>
                  Are you still traveling today? Van will start soon!
                </Text>
                <View style={styles.alertButtons}>
                  <TouchableOpacity 
                    style={styles.confirmBtn} 
                    onPress={() => submitMorningConfirmation(true)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.btnText}>Yes, Traveling</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallCancelBtn}
                    onPress={() => submitMorningConfirmation(false)}
                    disabled={loading}
                  >
                    <Icon name="close-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Notifications Alert on Dashboard - NEW */}
        {notifications.filter(n => !n.read && n.type === 'route').slice(0, 1).map((notification) => (
          <Animated.View 
            key={notification._id}
            style={{ 
              opacity: fadeAnim,
              transform: [{ translateY: cardTranslateY }],
              marginTop: (showPollModal || showMorningConfirmation) ? 15 : 20
            }}
          >
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.alertBox}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Icon name={notification.icon || "information-circle"} size={26} color="#fff" />
              </Animated.View>
              <View style={styles.alertTextBox}>
                <Text style={styles.alertTitle}>{notification.title}</Text>
                <Text style={styles.alertText}>{notification.message}</Text>
                <View style={styles.alertButtons}>
                  <TouchableOpacity 
                    style={styles.confirmBtn}
                    onPress={() => {
                      markNotificationAsRead(notification._id);
                      handleAlertNavigation();
                    }}
                  >
                    <Icon name="eye" size={18} color="#fff" />
                    <Text style={styles.btnText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallCancelBtn}
                    onPress={() => markNotificationAsRead(notification._id)}
                  >
                    <Icon name="close-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ))}

        {/* Today's Trip Details */}
        <Animated.View style={{ 
          transform: [{ translateY: cardTranslateY }],
          marginTop: (!showPollModal && !showMorningConfirmation) ? 20 : 15
        }}>
          <View style={styles.sectionCard}>
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="car" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Today's Trip Status</Text>
              </View>
            </LinearGradient>

            {currentTrip ? (
              <View style={styles.tripCardContainer}>
                <View style={styles.tripCard}>
                  <Icon name="information-circle" size={24} color="#A1D826" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.tripCardTitle}>Status</Text>
                    <Text style={styles.tripCardText}>
                      {tripStatus === 'picked' ? 'On Board' : 
                       tripStatus === 'En Route' ? 'Van En Route' :
                       tripStatus === 'Ready' ? 'Ready to Start' :
                       'Scheduled'}
                    </Text>
                  </View>
                </View>

                <View style={styles.tripCard}>
                  <Icon name="time" size={24} color="#A1D826" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.tripCardTitle}>Pickup Time</Text>
                    <Text style={styles.tripCardText}>{currentTrip.timeSlot || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.tripCard}>
                  <Icon name="navigate" size={24} color="#A1D826" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.tripCardTitle}>Route</Text>
                    <Text style={styles.tripCardText}>{currentTrip.routeName || 'N/A'}</Text>
                  </View>
                </View>

                {tripStatus === 'En Route' && (
                  <View style={styles.tripCard}>
                    <Icon name="location" size={24} color="#FF9800" />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.tripCardTitle}>Estimated Arrival</Text>
                      <Text style={styles.tripCardText}>{estimatedArrival}</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.tripCard}>
                <Icon name="information-circle" size={24} color="#999" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tripCardTitle}>No Trip Scheduled</Text>
                  <Text style={styles.tripCardText}>
                    You don't have any trips scheduled for today
                  </Text>
                </View>
              </View>
            )}

            {/* Live Map */}
            {currentTrip && driverLocation && tripStatus === 'En Route' && (
              <View style={styles.mapWrapper}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker
                    coordinate={driverLocation}
                    title="Your Van"
                    description={`Driver: ${driverInfo.name}`}
                  >
                    <Animated.View style={{ 
                      transform: [
                        { translateY: mapMarkerAnim },
                        { scale: pulseAnim }
                      ] 
                    }}>
                      <Icon name="car" size={32} color="#A1D826" />
                    </Animated.View>
                  </Marker>
                  
                  {userProfile && userProfile.latitude && userProfile.longitude && (
                    <Marker
                      coordinate={{
                        latitude: userProfile.latitude,
                        longitude: userProfile.longitude
                      }}
                      title="Your Location"
                      description={pickupPoint}
                      pinColor="#FF6B6B"
                    />
                  )}
                </MapView>
                <View style={styles.mapNote}>
                  <Icon name="information-circle" size={18} color="#FFA726" />
                  <Text style={styles.noteText}>
                    Van arriving in {estimatedArrival}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Your Driver */}
        <Animated.View style={{ transform: [{ translateY: cardTranslateY }] }}>
          <View style={styles.sectionCard}>
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sectionHeaderGradient}
            >
              <View style={styles.sectionTitleContainer}>
                <Icon name="person" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.cardTitle}>Your Driver</Text>
              </View>
            </LinearGradient>

            <View style={styles.driverBox}>
              <View style={styles.driverCircle}>
                <Text style={styles.driverInitials}>
                  {driverInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>{driverInfo.name}</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={styles.driverSub}> {driverInfo.rating}</Text>
                </View>
                <Text style={styles.driverSub}>{driverInfo.vehicleModel}</Text>
                <Text style={styles.driverSub}>{driverInfo.vehicleNumber}</Text>
              </View>
              {currentTrip && (
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => setCallModalVisible(true)}
                  >
                    <Icon name="call" size={20} color="#A1D826" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => setChatModalVisible(true)}
                  >
                    <Icon name="chatbubble" size={20} color="#A1D826" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Call Modal */}
      <Modal visible={callModalVisible} transparent animationType="fade">
        <View style={styles.callModalOverlay}>
          <Animated.View style={[styles.callModalContent, { transform: [{ scale: ringScale }] }]}>
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              style={styles.callerAvatar}
            >
              <Text style={styles.callerInitials}>
                {driverInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </LinearGradient>

            <Text style={styles.callerName}>{driverInfo.name}</Text>
            <Text style={styles.callerInfo}>Driver • {driverInfo.vehicleNumber}</Text>
            <Text style={styles.callingText}>Calling...</Text>

            <View style={styles.callActions}>
              <TouchableOpacity onPress={() => setCallModalVisible(false)}>
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A52']}
                  style={styles.endCallBtn}
                >
                  <Icon name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity>
                <LinearGradient
                  colors={['#A1D826', '#8BC220']}
                  style={styles.answerCallBtn}
                >
                  <Icon name="call" size={32} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={chatModalVisible} animationType="slide">
        <View style={styles.chatContainer}>
          <LinearGradient
            colors={['#A1D826', '#8BC220']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.chatHeader}
          >
            <TouchableOpacity onPress={() => setChatModalVisible(false)}>
              <Icon name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.chatDriverCircle}>
              <Text style={styles.chatDriverInitials}>
                {driverInfo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatHeaderTitle}>{driverInfo.name}</Text>
              <Text style={styles.chatHeaderSubtitle}>Driver</Text>
            </View>
            <TouchableOpacity>
              <Icon name="videocam" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.messageWrapper}>
                <View
                  style={[
                    styles.chatBubble,
                    item.fromDriver ? styles.driverBubble : styles.userBubble,
                  ]}
                >
                  <Text style={styles.chatText}>{item.text}</Text>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ padding: 15 }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={80}
          >
            <View style={styles.chatInputBox}>
              <TouchableOpacity style={styles.attachBtn}>
                <Icon name="add-circle" size={28} color="#A1D826" />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity onPress={sendMessage}>
                <LinearGradient
                  colors={['#A1D826', '#8BC220']}
                  style={styles.sendButton}
                >
                  <Icon name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#A1D826" />
          <Text style={{ color: "#fff", marginTop: 10, fontSize: 16 }}>Loading...</Text>
        </View>
      )}
    </View>
  );
}