import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME';

// Colors
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
  darkGray: '#495057',
  lightGray: '#f8f9fa',
  border: '#e0e0e0',
};

// API Base URL - Update this to your server IP
const API_BASE_URL = 'http://192.168.10.12:3000/api';

// ==================== API SERVICE ====================
const apiService = {
  async getAuthData() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const transporterId = await AsyncStorage.getItem('transporterId');
      const transporterData = await AsyncStorage.getItem('transporterData');
      
      return {
        token,
        transporterId,
        transporterData: transporterData ? JSON.parse(transporterData) : null
      };
    } catch (error) {
      console.error('❌ Error getting auth data:', error);
      return { token: null, transporterId: null, transporterData: null };
    }
  },

  async apiCall(endpoint, options = {}) {
    try {
      const { token } = await this.getAuthData();
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      const config = {
        ...options,
        headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const responseText = await response.text();
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = responseText ? JSON.parse(responseText) : {};
      return data;
    } catch (error) {
      console.error('❌ API Error:', endpoint, error);
      throw error;
    }
  },

  // Profile APIs
  async getProfile() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/transporter/profile/${transporterId}`);
      const profileData = response.data || response.transporter || response;
      
      return {
        id: profileData._id || profileData.id || transporterId,
        name: profileData.name || 'Transporter',
        email: profileData.email || 'email@example.com',
        phone: profileData.phone || profileData.phoneNumber || 'N/A',
        company: profileData.company || profileData.companyName || 'Transport Company',
        address: profileData.address || 'N/A',
        license: profileData.license || profileData.licenseNumber || 'N/A',
        registrationDate: profileData.registrationDate || new Date().toISOString(),
        location: profileData.location || 'N/A',
        status: profileData.status || 'active'
      };
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      return {
        id: 'unknown',
        name: 'Transporter',
        email: 'email@example.com',
        phone: 'N/A',
        company: 'Transport Company',
        address: 'N/A',
        license: 'N/A',
        registrationDate: new Date().toISOString(),
        location: 'N/A',
        status: 'active'
      };
    }
  },

  async updateProfile(profileData) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/transporter/profile/${transporterId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Stats
  async getStats() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/dashboard/stats?transporterId=${transporterId}`);
      const stats = response.stats || response.data || response;
      return {
        activeDrivers: parseInt(stats.activeDrivers) || 0,
        totalPassengers: parseInt(stats.totalPassengers) || 0,
        completedTrips: parseInt(stats.completedTrips) || 0,
        ongoingTrips: parseInt(stats.ongoingTrips) || 0,
        complaints: parseInt(stats.complaints) || 0,
        paymentsReceived: parseInt(stats.paymentsReceived) || 0,
        paymentsPending: parseInt(stats.paymentsPending) || 0,
      };
    } catch (error) {
      return {
        activeDrivers: 0,
        totalPassengers: 0,
        completedTrips: 0,
        ongoingTrips: 0,
        complaints: 0,
        paymentsReceived: 0,
        paymentsPending: 0,
      };
    }
  },

  // Polls
  async getPolls() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/polls?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.polls || response.data || []);
    } catch (error) {
      return [];
    }
  },

  async createPoll(pollData) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall('/polls', {
      method: 'POST',
      body: JSON.stringify({ ...pollData, transporterId }),
    });
  },

  async getPollResponses(pollId) {
    try {
      const response = await this.apiCall(`/polls/${pollId}/responses`);
      return response.summary || {};
    } catch (error) {
      return { total: 0, yes: 0, no: 0, yesResponses: [], noResponses: [] };
    }
  },

  async closePoll(pollId) {
    return this.apiCall(`/polls/${pollId}/close`, {
      method: 'PUT',
    });
  },

  // Driver Availability
  async getAvailableDrivers(date) {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/availability/drivers?date=${date}&transporterId=${transporterId}`);
      return response.drivers || [];
    } catch (error) {
      return [];
    }
  },

  // Route Assignment
  async assignRouteFromPoll(pollId, assignmentData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.apiCall('/routes/assign', {
      method: 'POST',
      body: JSON.stringify({
        pollId,
        driverId: assignmentData.driverId,
        routeName: assignmentData.routeName,
        startPoint: assignmentData.startPoint || 'Start Point',
        destination: assignmentData.destination || 'Destination',
        timeSlot: assignmentData.timeSlot,
        pickupTime: assignmentData.pickupTime || assignmentData.timeSlot,
        date: tomorrow.toISOString()
      }),
    });
  },

  // Drivers
  async getDrivers() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/drivers?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.drivers || response.data || []);
    } catch (error) {
      return [];
    }
  },

  // Driver Requests
  async getDriverRequests() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/join-requests?type=driver&transporterId=${transporterId}`);
      const requests = Array.isArray(response) ? response : (response.requests || response.data || []);
      return requests.filter(req => req.status === 'pending');
    } catch (error) {
      return [];
    }
  },

  async approveDriverRequest(requestId) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/join-requests/${requestId}/accept`, {
      method: 'PUT',
      body: JSON.stringify({ transporterId }),
    });
  },

  async rejectDriverRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/reject`, {
      method: 'PUT',
    });
  },

  // Passengers
  async getPassengers() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/passengers?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.passengers || response.data || []);
    } catch (error) {
      return [];
    }
  },

  // Passenger Requests
  async getPassengerRequests() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/join-requests?type=passenger&transporterId=${transporterId}`);
      const requests = Array.isArray(response) ? response : (response.requests || response.data || []);
      return requests.filter(req => req.status === 'pending');
    } catch (error) {
      return [];
    }
  },

  async approvePassengerRequest(requestId) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/join-requests/${requestId}/accept`, {
      method: 'PUT',
      body: JSON.stringify({ transporterId }),
    });
  },

  async rejectPassengerRequest(requestId) {
    return this.apiCall(`/join-requests/${requestId}/reject`, {
      method: 'PUT',
    });
  },

  // Routes
  async getRoutes() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/routes?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.routes || response.data || []);
    } catch (error) {
      return [];
    }
  },

  // Trips
  async getTrips() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/trips?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.trips || response.data || []);
    } catch (error) {
      return [];
    }
  },

  // Payments
  async getDriverPayments() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/payments?type=driver&transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.payments || response.data || []);
    } catch (error) {
      return [];
    }
  },

  async getPassengerPayments() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/payments?type=passenger&transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.payments || response.data || []);
    } catch (error) {
      return [];
    }
  },

  // Complaints
  async getComplaints() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/complaints?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.complaints || response.data || []);
    } catch (error) {
      return [];
    }
  },

  async replyToComplaint(complaintId, text) {
    return this.apiCall(`/complaints/${complaintId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async resolveComplaint(complaintId) {
    return this.apiCall(`/complaints/${complaintId}/resolve`, {
      method: 'PUT',
    });
  },

  // Notifications
  async getNotifications() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/notifications?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.notifications || response.data || []);
    } catch (error) {
      return [];
    }
  },

  async markNotificationAsRead(notificationId) {
    return this.apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
};

// ==================== MAIN COMPONENT ====================
const TransporterDashboard = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [slideAnim] = useState(new Animated.Value(-250));
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [profile, setProfile] = useState({
    id: '',
    name: 'Loading...',
    email: 'Loading...',
    phone: 'Loading...',
    company: 'Loading...',
    registrationDate: 'Loading...',
    address: 'Loading...',
    license: 'Loading...',
    location: 'Loading...',
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [stats, setStats] = useState({
    activeDrivers: 0,
    totalPassengers: 0,
    completedTrips: 0,
    ongoingTrips: 0,
    complaints: 0,
    paymentsReceived: 0,
    paymentsPending: 0,
  });

  const [customTimeSlots, setCustomTimeSlots] = useState(['07:00 AM', '07:30 AM', '08:00 AM']);
  const [newTimeSlot, setNewTimeSlot] = useState('');

  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({
    title: '',
    selectedSlots: [],
    closingTime: '',
  });

  const [passengerResponses, setPassengerResponses] = useState([]);
  const [driverAvailability, setDriverAvailability] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [driverRequests, setDriverRequests] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [driverPayments, setDriverPayments] = useState([]);
  const [passengerPayments, setPassengerPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [vans, setVans] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedPollForAssignment, setSelectedPollForAssignment] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { token, transporterId } = await apiService.getAuthData();
      
      if (!token || !transporterId) {
        Alert.alert(
          'Authentication Required',
          'Please login to continue',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TransporterLogin' }],
                });
              }
            }
          ]
        );
        return;
      }

      loadAllData();
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'TransporterLogin' }],
      });
    }
  };

  // Load all data
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

      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error loading data:', error);
      
      if (error.message === 'Authentication required' || error.message === 'Authentication failed') {
        Alert.alert(
          'Session Expired',
          'Please login again',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TransporterLogin' }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load data. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const profileData = await apiService.getProfile();
      
      setProfile({
        id: profileData.id || 'unknown',
        name: profileData.name || 'Transporter',
        email: profileData.email || 'email@example.com',
        phone: profileData.phone || 'N/A',
        company: profileData.company || 'Transport Company',
        address: profileData.address || 'N/A',
        license: profileData.license || 'N/A',
        location: profileData.location || 'N/A',
        registrationDate: profileData.registrationDate ?
          new Date(profileData.registrationDate).toLocaleDateString() : 'N/A'
      });
    } catch (error) {
      console.error('❌ Error loading profile:', error);
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

  const loadDriverRequests = async () => {
    try {
      const requestsData = await apiService.getDriverRequests();
      setDriverRequests(requestsData);
    } catch (error) {
      console.error('Error loading driver requests:', error);
    }
  };

  const loadPassengerRequests = async () => {
    try {
      const requestsData = await apiService.getPassengerRequests();
      setPassengerRequests(requestsData);
    } catch (error) {
      console.error('Error loading passenger requests:', error);
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

  const loadTrips = async () => {
    try {
      const tripsData = await apiService.getTrips();

      if (!tripsData || tripsData.length === 0) {
        setVans([]);
        return;
      }

      const vansData = tripsData.map(trip => {
        const passengers = Array.isArray(trip.passengers) ? trip.passengers : [];
        const pickedPassengers = passengers.filter(p => p && (p.status === 'picked' || p.status === 'current'));

        return {
          id: trip._id || trip.id,
          name: `Van ${trip.driverName || 'Unknown'}`,
          driver: trip.driverName || 'Unknown Driver',
          route: trip.routeName || 'Unknown Route',
          timeSlot: trip.timeSlot || 'Not specified',
          status: trip.status || 'Unknown',
          passengers: pickedPassengers.length,
          capacity: trip.capacity || 8,
          currentStop: trip.currentStop || 'Not specified',
          stops: Array.isArray(trip.stops) ? trip.stops : [],
          completedStops: Array.isArray(trip.completedStops) ? trip.completedStops : [],
          currentLocation: trip.currentLocation || { latitude: 33.6844, longitude: 73.0479 },
          speed: trip.speed || 0,
          eta: trip.eta || '0 min',
          color: '#3498DB',
          passengersList: passengers,
          vehicle: trip.vehicleType || 'Unknown Vehicle',
          vehicleNumber: trip.vehicleNumber || 'N/A'
        };
      });

      setVans(vansData);
    } catch (error) {
      console.error('Error loading trips:', error);
      setVans([]);
    }
  };

  // Sidebar animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: sidebarVisible ? 0 : -250,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => {
      setRefreshing(false);
    });
  }, []);

  // Poll Functions
  const toggleTimeSlot = slot => {
    setNewPoll(prev => ({
      ...prev,
      selectedSlots: prev.selectedSlots.includes(slot)
        ? prev.selectedSlots.filter(s => s !== slot)
        : [...prev.selectedSlots, slot],
    }));
  };

  const createPollWithNotification = async () => {
    if (!newPoll.title || !newPoll.selectedSlots.length || !newPoll.closingTime) {
      Alert.alert('Error', 'Please fill all fields and select at least one time slot');
      return;
    }

    try {
      setIsLoading(true);
      const pollData = {
        title: newPoll.title,
        timeSlots: newPoll.selectedSlots,
        closesAt: newPoll.closingTime,
        closingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const response = await apiService.createPoll(pollData);
      
      setNewPoll({ title: '', selectedSlots: [], closingTime: '' });
      await loadPolls();
      
      Alert.alert(
        'Success', 
        `Poll created successfully! ${response.notificationsSent || 0} passengers have been notified.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create poll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'authToken',
              'transporterId',
              'transporterData',
              'transporterEmail',
              'transporterName',
              'userRole'
            ]);
            navigation.reset({
              index: 0,
              routes: [{ name: "TransporterLogin" }],
            });
          },
        },
      ]
    );
  };

  // UI Components
  const StatCard = ({ label, value, iconName, color }) => (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Icon name={iconName} size={32} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const QuickActionCard = ({ iconName, title, onPress }) => (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Icon name={iconName} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  // ==================== SECTIONS ====================

  const ProfileSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        {isEditingProfile ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={profile.name}
              onChangeText={text => setProfile({ ...profile, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={profile.email}
              onChangeText={text => setProfile({ ...profile, email: text })}
              editable={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone"
              value={profile.phone}
              onChangeText={text => setProfile({ ...profile, phone: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Company"
              value={profile.company}
              onChangeText={text => setProfile({ ...profile, company: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={profile.address}
              onChangeText={text => setProfile({ ...profile, address: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="License"
              value={profile.license}
              onChangeText={text => setProfile({ ...profile, license: text })}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={async () => {
                try {
                  await apiService.updateProfile(profile);
                  setIsEditingProfile(false);
                  Alert.alert('Success', 'Profile updated');
                  await loadProfile();
                } catch (error) {
                  Alert.alert('Error', 'Failed to update profile');
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: COLORS.gray, marginTop: 8 }]}
              onPress={() => {
                setIsEditingProfile(false);
                loadProfile();
              }}
            >
              <Text style={styles.primaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Name:</Text>
              <Text style={styles.profileValue}>{profile.name}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Email:</Text>
              <Text style={styles.profileValue}>{profile.email}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <Text style={styles.profileValue}>{profile.phone}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Company:</Text>
              <Text style={styles.profileValue}>{profile.company}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Address:</Text>
              <Text style={styles.profileValue}>{profile.address}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>License:</Text>
              <Text style={styles.profileValue}>{profile.license}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Location:</Text>
              <Text style={styles.profileValue}>{profile.location}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Registered:</Text>
              <Text style={styles.profileValue}>{profile.registrationDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setIsEditingProfile(true)}
            >
              <Text style={styles.primaryBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );

  const OverviewSection = () => (
    <ScrollView
      style={styles.section}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.sectionTitle}>Dashboard Overview</Text>
      <Text style={styles.updateText}>
        Last Updated: {lastUpdated.toLocaleTimeString()}
      </Text>

      <View style={styles.statsGrid}>
        <StatCard
          label="Active Drivers"
          value={stats.activeDrivers}
          iconName="directions-car"
          color={COLORS.success}
        />
        <StatCard
          label="Total Passengers"
          value={stats.totalPassengers}
          iconName="people"
          color={COLORS.primary}
        />
        <StatCard
          label="Ongoing Trips"
          value={stats.ongoingTrips}
          iconName="autorenew"
          color={COLORS.warning}
        />
        <StatCard
          label="Completed Trips"
          value={stats.completedTrips}
          iconName="check-circle"
          color={COLORS.success}
        />
      </View>

      <Text style={styles.sectionSubtitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionCard
          iconName="poll"
          title="Create Poll"
          onPress={() => setActiveSection('poll')}
        />
        <QuickActionCard
          iconName="map"
          title="Routes"
          onPress={() => setActiveSection('routes')}
        />
        <QuickActionCard
          iconName="assignment-ind"
          title="Assign"
          onPress={() => setActiveSection('assign')}
        />
        <QuickActionCard
          iconName="my-location"
          title="Track"
          onPress={() => setActiveSection('tracking')}
        />
      </View>
    </ScrollView>
  );

  const PollSection = () => {
    const [pollResponses, setPollResponses] = useState([]);

    return (
      <ScrollView style={styles.section}>
        <Text style={styles.sectionTitle}>Create Travel Poll</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Poll Title (e.g., Tomorrow Travel Confirmation)"
            value={newPoll.title}
            onChangeText={text => setNewPoll({ ...newPoll, title: text })}
          />
          
          <Text style={styles.inputLabel}>Available Time Slots:</Text>
          {customTimeSlots.map((slot, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.timeSlotOption,
                newPoll.selectedSlots.includes(slot) && styles.timeSlotSelected
              ]}
              onPress={() => toggleTimeSlot(slot)}
            >
              <View style={[
                styles.checkbox,
                newPoll.selectedSlots.includes(slot) && styles.checkboxSelected
              ]}>
                {newPoll.selectedSlots.includes(slot) && (
                  <Icon name="check" size={16} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.timeSlotLabel}>{slot}</Text>
            </TouchableOpacity>
          ))}
          
          <TextInput
            style={styles.input}
            placeholder="Closing Time (e.g., 22:00)"
            value={newPoll.closingTime}
            onChangeText={text => setNewPoll({ ...newPoll, closingTime: text })}
          />
          
          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={createPollWithNotification}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Create Poll & Notify Passengers</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionSubtitle}>Active Polls & Responses</Text>
        {polls.length > 0 ? polls.map(poll => (
          <View key={poll._id} style={styles.card}>
            <Text style={styles.cardTitle}>{poll.title}</Text>
            <Text style={styles.pollSlots}>
              Time Slots: {poll.timeSlots?.join(', ') || 'None'}
            </Text>
            <Text style={styles.pollDate}>
              Created: {new Date(poll.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.pollDate}>
              Closes: {poll.closesAt}
            </Text>
            
            <View style={styles.responseSummary}>
              <Text style={styles.responseCount}>
                📊 {poll.responses?.length || 0} Responses
              </Text>
              <Text style={styles.responseCount}>
                ✅ {poll.responses?.filter(r => r.response === 'yes').length || 0} Will Travel
              </Text>
              <Text style={styles.responseCount}>
                ❌ {poll.responses?.filter(r => r.response === 'no').length || 0} Won't Travel
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 10, backgroundColor: COLORS.primaryDark }]}
              onPress={() => {
                setSelectedPoll(poll);
                setPollResponses(poll.responses || []);
              }}
            >
              <Text style={styles.primaryBtnText}>View All Responses</Text>
            </TouchableOpacity>

            {poll.responses?.filter(r => r.response === 'yes').length > 0 && (
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 8, backgroundColor: COLORS.success }]}
                onPress={() => {
                  setActiveSection('assign');
                  setSelectedPollForAssignment(poll);
                }}
              >
                <Text style={styles.primaryBtnText}>Create Route from Responses</Text>
              </TouchableOpacity>
            )}
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Icon name="poll" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No active polls</Text>
          </View>
        )}

        {/* Poll Responses Modal */}
        <Modal
          visible={selectedPoll !== null}
          animationType="slide"
          onRequestClose={() => setSelectedPoll(null)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPoll(null)}>
                <Icon name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Poll Responses</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {pollResponses.map((response, index) => (
                <View key={index} style={styles.responseCard}>
                  <View style={styles.responseHeader}>
                    <Text style={styles.responseName}>{response.passengerName}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: response.response === 'yes' ? COLORS.success : COLORS.danger }
                    ]}>
                      <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>
                        {response.response === 'yes' ? 'Will Travel' : 'Won\'t Travel'}
                      </Text>
                    </View>
                  </View>
                  
                  {response.response === 'yes' && (
                    <>
                      <Text style={styles.responseDetail}>
                        🕐 Selected Time: {response.selectedTimeSlot}
                      </Text>
                      <Text style={styles.responseDetail}>
                        📍 Pickup: {response.pickupPoint}
                      </Text>
                    </>
                  )}
                  
                  <Text style={styles.responseDate}>
                    Responded: {new Date(response.respondedAt).toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    );
  };
    
// Updated AssignSection with Google Maps Integration for Start Point & Destination

const AssignSection = () => {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [startPoint, setStartPoint] = useState('Office');
  const [destination, setDestination] = useState('Destination');
  const [isAssigning, setIsAssigning] = useState(false);

  // Map states
  const [showStartPointMap, setShowStartPointMap] = useState(false);
  const [showDestinationMap, setShowDestinationMap] = useState(false);
  const [startPointCoords, setStartPointCoords] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
  });
  const [destinationCoords, setDestinationCoords] = useState({
    latitude: 33.6844,
    longitude: 73.0479,
  });
  const [tempMarker, setTempMarker] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  useEffect(() => {
    if (selectedPollForAssignment) {
      loadAvailableDriversForTomorrow();
      setRouteName(selectedPollForAssignment.title);
    }
  }, [selectedPollForAssignment]);

  const loadAvailableDriversForTomorrow = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      const drivers = await apiService.getAvailableDrivers(dateStr);
      setAvailableDrivers(drivers);
    } catch (error) {
      console.error('Error loading available drivers:', error);
      setAvailableDrivers([]);
    }
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      setIsLoadingAddress(true);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting address:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarker({ latitude, longitude });
  };

  const confirmStartPoint = async () => {
    if (tempMarker) {
      setStartPointCoords(tempMarker);
      const address = await getAddressFromCoordinates(tempMarker.latitude, tempMarker.longitude);
      setStartPoint(address);
      setShowStartPointMap(false);
      setTempMarker(null);
    }
  };

  const confirmDestination = async () => {
    if (tempMarker) {
      setDestinationCoords(tempMarker);
      const address = await getAddressFromCoordinates(tempMarker.latitude, tempMarker.longitude);
      setDestination(address);
      setShowDestinationMap(false);
      setTempMarker(null);
    }
  };

  const handleAssignRoute = async () => {
    if (!selectedPollForAssignment || !selectedDriver || !routeName || !selectedTimeSlot) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsAssigning(true);
      
      const assignmentData = {
        driverId: selectedDriver,
        routeName,
        timeSlot: selectedTimeSlot,
        startPoint,
        destination,
        pickupTime: selectedTimeSlot
      };

      await apiService.assignRouteFromPoll(
        selectedPollForAssignment._id,
        assignmentData
      );

      Alert.alert(
        'Success',
        `Route "${routeName}" has been created and assigned! All passengers and driver have been notified.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRouteName('');
              setSelectedDriver(null);
              setSelectedTimeSlot('');
              setSelectedPollForAssignment(null);
              loadRoutes();
              loadTrips();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error assigning route:', error);
      Alert.alert('Error', 'Failed to assign route. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Assign Routes from Polls</Text>

      {/* Poll Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Step 1: Select Poll</Text>
        {polls.filter(p => p.status === 'active').length > 0 ? (
          polls.filter(p => p.status === 'active').map(poll => {
            const yesCount = poll.responses?.filter(r => r.response === 'yes').length || 0;
            return (
              <TouchableOpacity
                key={poll._id}
                style={[
                  styles.pollSelectOption,
                  selectedPollForAssignment?._id === poll._id && styles.pollSelectOptionActive
                ]}
                onPress={() => {
                  setSelectedPollForAssignment(poll);
                  setRouteName(poll.title);
                }}
              >
                <View style={styles.pollSelectContent}>
                  <Text style={styles.pollSelectTitle}>{poll.title}</Text>
                  <Text style={styles.pollSelectInfo}>
                    {yesCount} passengers will travel
                  </Text>
                  <Text style={styles.pollSelectInfo}>
                    Time slots: {poll.timeSlots?.join(', ')}
                  </Text>
                </View>
                {selectedPollForAssignment?._id === poll._id && (
                  <Icon name="check-circle" size={24} color={COLORS.success} />
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="poll" size={32} color={COLORS.gray} />
            <Text style={styles.emptyText}>No active polls available</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 12 }]}
              onPress={() => setActiveSection('poll')}
            >
              <Text style={styles.primaryBtnText}>Create Poll</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Route Details */}
      {selectedPollForAssignment && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 2: Route Details</Text>
            
            <Text style={styles.inputLabel}>Route Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter route name"
              value={routeName}
              onChangeText={setRouteName}
            />

            {/* Start Point Selection */}
            <Text style={styles.inputLabel}>Start Point</Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Select start point from map"
                value={startPoint}
                editable={false}
              />
              <TouchableOpacity
                style={styles.mapIconButton}
                onPress={() => {
                  setTempMarker(startPointCoords);
                  setShowStartPointMap(true);
                }}
              >
                <Icon name="map" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Destination Selection */}
            <Text style={styles.inputLabel}>Destination</Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Select destination from map"
                value={destination}
                editable={false}
              />
              <TouchableOpacity
                style={styles.mapIconButton}
                onPress={() => {
                  setTempMarker(destinationCoords);
                  setShowDestinationMap(true);
                }}
              >
                <Icon name="map" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Time Slot</Text>
            {selectedPollForAssignment.timeSlots?.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlotOption,
                  selectedTimeSlot === slot && styles.timeSlotSelected
                ]}
                onPress={() => setSelectedTimeSlot(slot)}
              >
                <View style={[
                  styles.checkbox,
                  selectedTimeSlot === slot && styles.checkboxSelected
                ]}>
                  {selectedTimeSlot === slot && (
                    <Icon name="check" size={16} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.timeSlotLabel}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Driver Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 3: Select Available Driver</Text>
            
            {availableDrivers.length > 0 ? (
              availableDrivers.map((avail, index) => {
                const driver = avail.driverId || avail;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.driverOption,
                      selectedDriver === driver._id && styles.driverOptionSelected
                    ]}
                    onPress={() => setSelectedDriver(driver._id)}
                  >
                    <View style={[
                      styles.checkbox,
                      selectedDriver === driver._id && styles.checkboxSelected
                    ]}>
                      {selectedDriver === driver._id && (
                        <Icon name="check" size={16} color={COLORS.white} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>
                        {driver.name || avail.driverName}
                      </Text>
                      <Text style={styles.driverDetail}>
                        📞 {driver.phone || 'N/A'}
                      </Text>
                      <Text style={styles.driverDetail}>
                        🚐 {driver.vehicle || 'Van'} - Capacity: {driver.capacity || 8}
                      </Text>
                      {avail.startTime && (
                        <Text style={styles.driverDetail}>
                          🕐 Available: {avail.startTime} - {avail.endTime}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="directions-car" size={32} color={COLORS.gray} />
                <Text style={styles.emptyText}>No drivers available for tomorrow</Text>
                <Text style={styles.emptySubtext}>
                  Ask drivers to confirm their availability
                </Text>
              </View>
            )}
          </View>

          {/* Assign Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!selectedDriver || !selectedTimeSlot || isAssigning) && styles.primaryBtnDisabled
            ]}
            onPress={handleAssignRoute}
            disabled={!selectedDriver || !selectedTimeSlot || isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.primaryBtnText}>
                Assign Route & Notify All
              </Text>
            )}
          </TouchableOpacity>

          {/* Summary */}
          <View style={[styles.card, { backgroundColor: '#F0F9D9' }]}>
            <Text style={styles.summaryTitle}>📋 Assignment Summary</Text>
            <Text style={styles.summaryText}>
              • Route: {routeName || 'Not set'}
            </Text>
            <Text style={styles.summaryText}>
              • Start Point: {startPoint}
            </Text>
            <Text style={styles.summaryText}>
              • Destination: {destination}
            </Text>
            <Text style={styles.summaryText}>
              • Driver: {selectedDriver ? 
                availableDrivers.find(d => (d.driverId?._id || d._id) === selectedDriver)?.driverName || 
                availableDrivers.find(d => (d.driverId?._id || d._id) === selectedDriver)?.driverId?.name || 
                'Selected' : 'Not selected'}
            </Text>
            <Text style={styles.summaryText}>
              • Time Slot: {selectedTimeSlot || 'Not selected'}
            </Text>
            <Text style={styles.summaryText}>
              • Passengers: {selectedPollForAssignment.responses?.filter(r => r.response === 'yes').length || 0}
            </Text>
          </View>
        </>
      )}

      {/* Start Point Map Modal */}
      <Modal
        visible={showStartPointMap}
        animationType="slide"
        onRequestClose={() => {
          setShowStartPointMap(false);
          setTempMarker(null);
        }}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowStartPointMap(false);
              setTempMarker(null);
            }}>
              <Icon name="close" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Select Start Point</Text>
            <View style={{ width: 28 }} />
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.fullMap}
            initialRegion={{
              latitude: startPointCoords.latitude,
              longitude: startPointCoords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
          >
            {tempMarker && (
              <Marker
                coordinate={tempMarker}
                title="Start Point"
                pinColor={COLORS.success}
              />
            )}
          </MapView>

          <View style={styles.mapModalFooter}>
            <Text style={styles.mapInstruction}>
              📍 Tap on the map to select start point
            </Text>
            {isLoadingAddress && (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            )}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !tempMarker && styles.primaryBtnDisabled
              ]}
              onPress={confirmStartPoint}
              disabled={!tempMarker || isLoadingAddress}
            >
              <Text style={styles.primaryBtnText}>
                {isLoadingAddress ? 'Getting Address...' : 'Confirm Start Point'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Destination Map Modal */}
      <Modal
        visible={showDestinationMap}
        animationType="slide"
        onRequestClose={() => {
          setShowDestinationMap(false);
          setTempMarker(null);
        }}
      >
        <SafeAreaView style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => {
              setShowDestinationMap(false);
              setTempMarker(null);
            }}>
              <Icon name="close" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Select Destination</Text>
            <View style={{ width: 28 }} />
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.fullMap}
            initialRegion={{
              latitude: destinationCoords.latitude,
              longitude: destinationCoords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
          >
            {tempMarker && (
              <Marker
                coordinate={tempMarker}
                title="Destination"
                pinColor={COLORS.danger}
              />
            )}
          </MapView>

          <View style={styles.mapModalFooter}>
            <Text style={styles.mapInstruction}>
              📍 Tap on the map to select destination
            </Text>
            {isLoadingAddress && (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            )}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !tempMarker && styles.primaryBtnDisabled
              ]}
              onPress={confirmDestination}
              disabled={!tempMarker || isLoadingAddress}
            >
              <Text style={styles.primaryBtnText}>
                {isLoadingAddress ? 'Getting Address...' : 'Confirm Destination'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

  const RoutesSection = () => {
    const [routeFilter, setRouteFilter] = useState('all');

    const filteredRoutes = routes.filter(route => {
      if (routeFilter === 'all') return true;
      return route.status === routeFilter;
    });

    return (
      <ScrollView style={styles.section}>
        <Text style={styles.sectionTitle}>Routes Management</Text>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          {['all', 'assigned', 'started', 'completed'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.tab, routeFilter === filter && styles.tabActive]}
              onPress={() => setRouteFilter(filter)}
            >
              <Text style={[
                styles.tabText,
                routeFilter === filter && styles.tabTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Routes List */}
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map(route => (
            <View key={route._id} style={styles.card}>
              <View style={styles.routeHeader}>
                <Text style={styles.cardTitle}>{route.name || route.routeName}</Text>
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: 
                      route.status === 'completed' ? COLORS.success :
                      route.status === 'started' ? COLORS.warning :
                      COLORS.primary
                  }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {route.status?.toUpperCase() || 'ASSIGNED'}
                  </Text>
                </View>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.routeInfoRow}>
                  <Icon name="person" size={16} color={COLORS.gray} />
                  <Text style={styles.routeInfoText}>
                    Driver: {route.driverName || 'Not assigned'}
                  </Text>
                </View>

                {route.timeSlot && (
                  <View style={styles.routeInfoRow}>
                    <Icon name="schedule" size={16} color={COLORS.gray} />
                    <Text style={styles.routeInfoText}>
                      Time: {route.timeSlot}
                    </Text>
                  </View>
                )}

                {route.date && (
                  <View style={styles.routeInfoRow}>
                    <Icon name="calendar-today" size={16} color={COLORS.gray} />
                    <Text style={styles.routeInfoText}>
                      Date: {new Date(route.date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {route.passengers && route.passengers.length > 0 && (
                  <View style={styles.routeInfoRow}>
                    <Icon name="people" size={16} color={COLORS.gray} />
                    <Text style={styles.routeInfoText}>
                      Passengers: {route.passengers.length}
                    </Text>
                  </View>
                )}

                {route.stops && route.stops.length > 0 && (
                  <View style={styles.routeInfoRow}>
                    <Icon name="location-on" size={16} color={COLORS.gray} />
                    <Text style={styles.routeInfoText}>
                      Stops: {route.stops.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="map" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No routes found</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const TrackingSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Live Tracking</Text>
      {vans.length > 0 ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: 33.6844,
              longitude: 73.0479,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {vans.map(van => (
              <Marker
                key={van.id}
                coordinate={van.currentLocation}
                title={van.name}
                description={`${van.driver} - ${van.currentStop}`}
              >
                <View style={styles.markerContainer}>
                  <Icon name="local-shipping" size={30} color={van.color} />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Van Details */}
          <View style={styles.vansList}>
            {vans.map(van => (
              <View key={van.id} style={styles.vanCard}>
                <View style={styles.vanHeader}>
                  <Text style={styles.vanName}>{van.name}</Text>
                  <View style={[
                    styles.vanStatus,
                    {
                      backgroundColor: 
                        van.status === 'Completed' ? COLORS.success :
                        van.status === 'En Route' ? COLORS.warning :
                        COLORS.primary
                    }
                  ]}>
                    <Text style={styles.vanStatusText}>{van.status}</Text>
                  </View>
                </View>
                <Text style={styles.vanDetail}>🚐 {van.driver}</Text>
                <Text style={styles.vanDetail}>📍 {van.currentStop}</Text>
                <Text style={styles.vanDetail}>👥 {van.passengers}/{van.capacity} passengers</Text>
                <Text style={styles.vanDetail}>⏱️ ETA: {van.eta}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="my-location" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No active trips</Text>
        </View>
      )}
    </ScrollView>
  );

  const DriverRequestsSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Driver Requests</Text>
      {driverRequests.length > 0 ? driverRequests.map(request => (
        <View key={request._id} style={styles.card}>
          <Text style={styles.cardTitle}>{request.name}</Text>
          <Text style={styles.requestDetail}>📧 {request.email}</Text>
          <Text style={styles.requestDetail}>📞 {request.phone}</Text>
          {request.vehicle && (
            <Text style={styles.requestDetail}>🚐 {request.vehicle}</Text>
          )}
          {request.license && (
            <Text style={styles.requestDetail}>🪪 License: {request.license}</Text>
          )}
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={async () => {
                try {
                  await apiService.approveDriverRequest(request._id);
                  await loadDriverRequests();
                  await loadDrivers();
                  Alert.alert('Success', 'Request approved');
                } catch (error) {
                  Alert.alert('Error', 'Failed to approve request');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={async () => {
                try {
                  await apiService.rejectDriverRequest(request._id);
                  await loadDriverRequests();
                  Alert.alert('Success', 'Request rejected');
                } catch (error) {
                  Alert.alert('Error', 'Failed to reject request');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )) : (
        <View style={styles.emptyState}>
          <Icon name="inbox" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      )}
    </ScrollView>
  );

  const PassengerRequestsSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Passenger Requests</Text>
      {passengerRequests.length > 0 ? passengerRequests.map(request => (
        <View key={request._id} style={styles.card}>
          <Text style={styles.cardTitle}>{request.name}</Text>
          <Text style={styles.requestDetail}>📧 {request.email}</Text>
          <Text style={styles.requestDetail}>📞 {request.phone}</Text>
          {request.pickupPoint && (
            <Text style={styles.requestDetail}>📍 {request.pickupPoint}</Text>
          )}
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={async () => {
                try {
                  await apiService.approvePassengerRequest(request._id);
                  await loadPassengerRequests();
                  await loadPassengers();
                  Alert.alert('Success', 'Request approved');
                } catch (error) {
                  Alert.alert('Error', 'Failed to approve request');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={async () => {
                try {
                  await apiService.rejectPassengerRequest(request._id);
                  await loadPassengerRequests();
                  Alert.alert('Success', 'Request rejected');
                } catch (error) {
                  Alert.alert('Error', 'Failed to reject request');
                }
              }}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )) : (
        <View style={styles.emptyState}>
          <Icon name="inbox" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      )}
    </ScrollView>
  );

  const PaymentsSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Payments</Text>
      <View style={styles.emptyState}>
        <Icon name="account-balance-wallet" size={48} color={COLORS.gray} />
        <Text style={styles.emptyText}>No payments yet</Text>
      </View>
    </ScrollView>
  );

  const ComplaintsSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Complaints</Text>
      {complaints.length > 0 ? complaints.map(complaint => (
        <View key={complaint._id} style={styles.card}>
          <Text style={styles.cardTitle}>{complaint.title}</Text>
          <Text style={styles.complaintDesc}>{complaint.description}</Text>
          <View style={styles.complaintMeta}>
            <Text style={styles.complaintDetail}>By: {complaint.byName}</Text>
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: 
                  complaint.status === 'Resolved' ? COLORS.success :
                  complaint.status === 'In Progress' ? COLORS.warning :
                  COLORS.danger
              }
            ]}>
              <Text style={styles.statusBadgeText}>{complaint.status}</Text>
            </View>
          </View>
          <Text style={styles.complaintDate}>
            {new Date(complaint.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )) : (
        <View style={styles.emptyState}>
          <Icon name="check-circle" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No complaints</Text>
        </View>
      )}
    </ScrollView>
  );

  const NotificationsSection = () => (
    <ScrollView style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      {notifications.length > 0 ? notifications.map(notification => (
        <TouchableOpacity
          key={notification._id}
          style={[styles.card, !notification.read && styles.unreadNotification]}
          onPress={async () => {
            try {
              await apiService.markNotificationAsRead(notification._id);
              await loadNotifications();
            } catch (error) {
              console.error('Error marking notification as read:', error);
            }
          }}
        >
          <View style={styles.notificationHeader}>
            <Icon 
              name={notification.icon || 'notifications'} 
              size={24} 
              color={notification.color || COLORS.primary} 
            />
            <Text style={styles.notificationTitle}>{notification.title}</Text>
          </View>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationDate}>
            {new Date(notification.createdAt).toLocaleString()}
          </Text>
        </TouchableOpacity>
      )) : (
        <View style={styles.emptyState}>
          <Icon name="notifications-none" size={48} color={COLORS.gray} />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      )}
    </ScrollView>
  );

  const Sidebar = () => (
    <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.sidebarHeader}>
        <View>
          <Text style={styles.sidebarTitle}>{profile.name}</Text>
          <Text style={styles.sidebarSubtitle}>{profile.company}</Text>
        </View>
        <TouchableOpacity onPress={() => setSidebarVisible(false)}>
          <Icon name="close" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.sidebarMenu}>
        {[
          { key: 'overview', label: 'Dashboard', icon: 'dashboard' },
          { key: 'profile', label: 'Profile', icon: 'account-circle' },
          { key: 'poll', label: 'Polls', icon: 'poll' },
          { key: 'routes', label: 'Routes', icon: 'map' },
          { key: 'assign', label: 'Assign', icon: 'assignment-ind' },
          { key: 'tracking', label: 'Tracking', icon: 'my-location' },
          { key: 'driver-req', label: 'Driver Requests', icon: 'group-add' },
          { key: 'pass-req', label: 'Passenger Requests', icon: 'person-add' },
          { key: 'payments', label: 'Payments', icon: 'account-balance-wallet' },
          { key: 'complaints', label: 'Complaints', icon: 'support-agent' },
          { key: 'notifications', label: 'Notifications', icon: 'notifications-active' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuItem, activeSection === item.key && styles.menuItemActive]}
            onPress={() => {
              setActiveSection(item.key);
              setSidebarVisible(false);
            }}
          >
            <Icon
              name={item.icon}
              size={22}
              color={activeSection === item.key ? COLORS.primary : COLORS.gray}
            />
            <Text
              style={[
                styles.menuItemText,
                activeSection === item.key && styles.menuItemTextActive
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.logoutMenuItem} onPress={handleLogout}>
          <Icon name="logout" size={22} color={COLORS.danger} />
          <Text style={styles.logoutMenuText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  const renderSection = () => {
    const sections = {
      overview: <OverviewSection />,
      profile: <ProfileSection />,
      poll: <PollSection />,
      routes: <RoutesSection />,
      assign: <AssignSection />,
      tracking: <TrackingSection />,
      'driver-req': <DriverRequestsSection />,
      'pass-req': <PassengerRequestsSection />,
      payments: <PaymentsSection />,
      complaints: <ComplaintsSection />,
      notifications: <NotificationsSection />,
    };
    return sections[activeSection] || <OverviewSection />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarVisible(true)}>
          <Icon name="menu" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transporter Dashboard</Text>
        <View style={styles.headerRight} />
      </View>

      {sidebarVisible && <Sidebar />}
      {sidebarVisible && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setSidebarVisible(false)}
        />
      )}

      {renderSection()}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
    elevation: 4,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerRight: {
    width: 40,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: COLORS.white,
    elevation: 20,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.primary,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  sidebarSubtitle: {
    fontSize: 13,
    color: COLORS.white,
    marginTop: 4,
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: '#F0F9D9',
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.gray,
    marginLeft: 12,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
    marginHorizontal: 24,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffebee',
  },
  logoutMenuText: {
    fontSize: 15,
    color: COLORS.danger,
    marginLeft: 12,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  section: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 20,
    marginBottom: 12,
  },
  updateText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: COLORS.white,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
    marginTop: 8,
  },
  timeSlotOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeSlotSelected: {
    backgroundColor: '#F0F9D9',
    borderColor: COLORS.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotLabel: {
    fontSize: 15,
    color: COLORS.black,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
  },
  primaryBtnDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  pollSlots: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  pollDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  responseSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  responseCount: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    width: 120,
  },
  profileValue: {
    fontSize: 14,
    color: COLORS.black,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  driverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  driverOptionSelected: {
    backgroundColor: '#F0F9D9',
    borderColor: COLORS.primary,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  driverDetail: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vansList: {
    marginTop: 8,
  },
  vanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  vanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vanName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  vanStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vanStatusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  vanDetail: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  responseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  responseName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  responseDetail: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 6,
  },
  responseDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  pollSelectOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  pollSelectOptionActive: {
    backgroundColor: '#F0F9D9',
    borderColor: COLORS.primary,
  },
  pollSelectContent: {
    flex: 1,
  },
  pollSelectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
  pollSelectInfo: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 6,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInfo: {
    marginTop: 8,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeInfoText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  requestDetail: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 6,
  },
  complaintDesc: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  complaintMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintDetail: {
    fontSize: 13,
    color: COLORS.gray,
  },
  complaintDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginLeft: 12,
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  notificationDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.white,
    marginTop: 12,
    fontWeight: '600',
  },
  
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mapIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0F9D9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 3,
  },
  mapModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
  },
  fullMap: {
    flex: 1,
  },
  mapModalFooter: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5,
  },
  mapInstruction: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 12,
  },

});

export default TransporterDashboard;