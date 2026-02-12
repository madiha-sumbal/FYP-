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
  RefreshControl
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MapView, { Marker } from "react-native-maps";
import styles from "../../styles/PassengerDashboardStyle";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your actual IP address
const API_BASE_URL = "http://192.168.10.6:3000/api";

export default function PassengerDashboard({ navigation }) {
  const [showTravelAlert, setShowTravelAlert] = useState(true);
  const [showArrivalAlert, setShowArrivalAlert] = useState(true);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userToken, setUserToken] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapMarkerAnim = useRef(new Animated.Value(0)).current;
  const callRingAnim = useRef(new Animated.Value(0)).current;
  const travelAlertSlideAnim = useRef(new Animated.Value(-100)).current;
  const arrivalAlertSlideAnim = useRef(new Animated.Value(-100)).current;
  const travelAlertPulseAnim = useRef(new Animated.Value(1)).current;
  const arrivalAlertPulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);

  // Sample data
  const nextTrip = {
    startTime: "7:30 AM",
    route: "DHA Phase 5 → Saddar",
    pickupPoint: "Main Gate, DHA Phase 5",
    estimatedArrival: "5 mins",
  };

  const driver = {
    name: "Muhammad Hassan",
    rating: 4.8,
    vehicleNumber: "KHI-2024",
    vehicleModel: "Toyota Hiace 2022",
    totalTrips: 1250,
    phone: "+92 300 1234567",
  };

  // Load token on mount
  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        setUserToken(token);
        console.log("✅ Token loaded for dashboard");
      } else {
        console.log("⚠️ No token found");
      }
    } catch (error) {
      console.error("❌ Error loading token:", error);
    }
  };

  // API Functions
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`);
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.counts.unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const sendChatMessage = async (message) => {
    try {
      const newMsg = {
        id: Date.now(),
        text: message,
        fromDriver: false,
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      
      setChatMessages(prev => [...prev, newMsg]);
      
      setTimeout(() => {
        const driverMsg = {
          id: Date.now() + 1,
          text: "I'll be there in 5 minutes!",
          fromDriver: true,
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
        };
        setChatMessages(prev => [...prev, driverMsg]);
      }, 2000);
      
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const confirmTravel = async () => {
    try {
      if (userToken) {
        const response = await fetch(`${API_BASE_URL}/travel/confirm`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tripDate: new Date().toISOString().split('T')[0],
            confirmed: true
          })
        });

        if (response.ok) {
          console.log("Travel confirmed successfully");
        }
      }

      travelAlertPulseAnim.stopAnimation();
      Animated.timing(travelAlertPulseAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(travelAlertSlideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowTravelAlert(false));
      
      Alert.alert("Success", "Travel confirmed for tomorrow!");
    } catch (error) {
      console.error("Error confirming travel:", error);
      Alert.alert("Error", "Failed to confirm travel");
    }
  };

  // Enhanced Animations
  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Card slide up animation
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Alert slide in animations
    Animated.timing(travelAlertSlideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.timing(arrivalAlertSlideAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Alert pulse animations
    if (showTravelAlert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(travelAlertPulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(travelAlertPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }

    if (showArrivalAlert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrivalAlertPulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(arrivalAlertPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }

    // Blink animation for alerts
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();

    // Pulse animation for map marker
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Map marker bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(mapMarkerAnim, { toValue: -10, duration: 500, useNativeDriver: true }),
        Animated.timing(mapMarkerAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Load initial data
    fetchNotifications();
  }, []);

  // Call ring animation
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

  const dismissTravelAlert = () => {
    travelAlertPulseAnim.stopAnimation();
    Animated.timing(travelAlertPulseAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(travelAlertSlideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTravelAlert(false));
  };

  const dismissArrivalAlert = () => {
    arrivalAlertPulseAnim.stopAnimation();
    Animated.timing(arrivalAlertPulseAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(arrivalAlertSlideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowArrivalAlert(false));
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      sendChatMessage(inputText);
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
      fetchNotifications()
    ]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
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
          {(unreadCount > 0 || showTravelAlert || showArrivalAlert) && (
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
        {/* Enhanced Alerts with Independent Animations */}
        {showTravelAlert && (
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [
              { translateY: travelAlertSlideAnim },
              { translateY: cardTranslateY },
              { scale: travelAlertPulseAnim }
            ] 
          }}>
            <LinearGradient
              colors={['#FF6B6B', '#EE5A52']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.alertBox}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Icon name="time" size={26} color="#fff" />
              </Animated.View>
              <View style={styles.alertTextBox}>
                <Text style={styles.alertTitle}>Tomorrow Travel Confirmation</Text>
                <Text style={styles.alertText}>Will you travel tomorrow?</Text>
                <View style={styles.alertButtons}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmTravel}>
                    <Icon name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>Yes, Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallCancelBtn}
                    onPress={dismissTravelAlert}
                  >
                    <Icon name="close-circle" size={18} color="#fff" />
                    <Text style={styles.btnText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {showArrivalAlert && (
          <Animated.View style={{ 
            opacity: fadeAnim, 
            transform: [
              { translateY: arrivalAlertSlideAnim },
              { translateY: cardTranslateY },
              { scale: arrivalAlertPulseAnim }
            ],
            marginTop: showTravelAlert ? 15 : 20
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
                <Text style={styles.alertTitle}>Van Arriving Soon!</Text>
                <Text style={styles.alertText}>
                  Your van is {nextTrip.estimatedArrival} away. Please be ready!
                </Text>
                <TouchableOpacity
                  style={styles.smallConfirmBtn}
                  onPress={dismissArrivalAlert}
                >
                  <Icon name="checkmark-done" size={18} color="#fff" />
                  <Text style={styles.btnText}>I'm Ready</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Today's Trip Details */}
        <Animated.View style={{ 
          transform: [{ translateY: cardTranslateY }],
          marginTop: (!showTravelAlert && !showArrivalAlert) ? 20 : 15
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
                <Text style={styles.cardTitle}>Today's Trip Details</Text>
              </View>
            </LinearGradient>

            <View style={styles.tripCardContainer}>
              <View style={styles.tripCard}>
                <Icon name="time" size={24} color="#A1D826" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tripCardTitle}>Start Time</Text>
                  <Text style={styles.tripCardText}>{nextTrip.startTime}</Text>
                </View>
              </View>

              <View style={styles.tripCard}>
                <Icon name="navigate" size={24} color="#A1D826" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tripCardTitle}>Route</Text>
                  <Text style={styles.tripCardText}>{nextTrip.route}</Text>
                </View>
              </View>

              <View style={styles.tripCard}>
                <Icon name="pin" size={24} color="#A1D826" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tripCardTitle}>Pickup Point</Text>
                  <Text style={styles.tripCardText}>{nextTrip.pickupPoint}</Text>
                </View>
              </View>

              <View style={styles.tripCard}>
                <Icon name="people" size={24} color="#A1D826" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.tripCardTitle}>Total Passengers Today</Text>
                  <Text style={styles.tripCardText}>20 Passengers</Text>
                </View>
              </View>
            </View>

            {/* Map section */}
            <View style={styles.mapWrapper}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: 24.8607,
                  longitude: 67.0011,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{ latitude: 24.8607, longitude: 67.0011 }}
                  title="Your Van"
                  description="On route to Saddar"
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
              </MapView>
              <View style={styles.mapNote}>
                <Icon name="information-circle" size={18} color="#FFA726" />
                <Text style={styles.noteText}>
                  Van arriving in {nextTrip.estimatedArrival}
                </Text>
              </View>
            </View>
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
                <Text style={styles.driverInitials}>MH</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#FFD700" />
                  <Text style={styles.driverSub}> {driver.rating} • {driver.totalTrips} trips</Text>
                </View>
                <Text style={styles.driverSub}>{driver.vehicleModel}</Text>
                <Text style={styles.driverSub}>{driver.vehicleNumber}</Text>
              </View>
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
            </View>
          </View>
        </Animated.View>

      </ScrollView>

      {/* Enhanced Call Modal */}
      <Modal visible={callModalVisible} transparent animationType="fade">
        <View style={styles.callModalOverlay}>
          <Animated.View style={[styles.callModalContent, { transform: [{ scale: ringScale }] }]}>
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              style={styles.callerAvatar}
            >
              <Text style={styles.callerInitials}>MH</Text>
            </LinearGradient>

            <Text style={styles.callerName}>{driver.name}</Text>
            <Text style={styles.callerInfo}>Driver • {driver.vehicleNumber}</Text>
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

      {/* Enhanced Chat Modal */}
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
              <Text style={styles.chatDriverInitials}>MH</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatHeaderTitle}>{driver.name}</Text>
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
    </View>
  );
}