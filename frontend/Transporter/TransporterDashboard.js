import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, RefreshControl, Animated,
  Dimensions, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// ==================== CONSTANTS ====================
const GOOGLE_MAPS_API_KEY = 'AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME';
const API_BASE_URL = 'http://172.21.243.83:3000/api';

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
  cardBg: '#ffffff',
  sectionBg: '#f4f6f8',
};

const MENU_ITEMS = [
  { key: 'overview',    label: 'Dashboard',           icon: 'dashboard' },
  { key: 'profile',     label: 'Profile',             icon: 'account-circle' },
  { key: 'poll',        label: 'Polls',               icon: 'poll' },
  { key: 'routes',      label: 'Routes',              icon: 'map' },
  { key: 'assign',      label: 'Assign',              icon: 'assignment-ind' },
  { key: 'tracking',    label: 'Tracking',            icon: 'my-location' },
  { key: 'driver-req',  label: 'Driver Requests',     icon: 'group-add' },
  { key: 'pass-req',    label: 'Passenger Requests',  icon: 'person-add' },
  { key: 'payments',    label: 'Payments',            icon: 'account-balance-wallet' },
  { key: 'complaints',  label: 'Complaints',          icon: 'support-agent' },
  { key: 'notifications', label: 'Notifications',     icon: 'notifications-active' },
];

// ==================== API SERVICE ====================
class ApiService {
  async getAuthData() {
    try {
      const [token, transporterId, transporterData] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('transporterId'),
        AsyncStorage.getItem('transporterData'),
      ]);
      return {
        token,
        transporterId,
        transporterData: transporterData ? JSON.parse(transporterData) : null,
      };
    } catch (error) {
      console.error('❌ Error getting auth data:', error);
      return { token: null, transporterId: null, transporterData: null };
    }
  }

  async apiCall(endpoint, options = {}) {
    try {
      const { token } = await this.getAuthData();
      if (!token) throw new Error('Authentication required');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
      const responseText = await response.text();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Authentication failed');
        throw new Error(`API Error: ${response.status}`);
      }
      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('❌ API Error:', endpoint, error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/transporter/profile/${transporterId}`);
      const p = response.data || response.transporter || response;
      return {
        id: p._id || p.id || transporterId,
        name: p.name || 'Transporter',
        email: p.email || 'email@example.com',
        phone: p.phone || p.phoneNumber || 'N/A',
        company: p.company || p.companyName || 'Transport Company',
        address: p.address || 'N/A',
        license: p.license || p.licenseNumber || 'N/A',
        registrationDate: p.registrationDate || new Date().toISOString(),
        location: p.location || 'N/A',
        status: p.status || 'active',
        profileImage: p.profileImage || p.avatar || null,
      };
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      return null;
    }
  }

  async updateProfile(profileData) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/transporter/profile/${transporterId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getStats() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/dashboard/stats?transporterId=${transporterId}`);
      const s = response.stats || response.data || response;
      return {
        activeDrivers:    parseInt(s.activeDrivers)    || 0,
        totalPassengers:  parseInt(s.totalPassengers)  || 0,
        completedTrips:   parseInt(s.completedTrips)   || 0,
        ongoingTrips:     parseInt(s.ongoingTrips)     || 0,
        complaints:       parseInt(s.complaints)       || 0,
        paymentsReceived: parseInt(s.paymentsReceived) || 0,
        paymentsPending:  parseInt(s.paymentsPending)  || 0,
      };
    } catch {
      return { activeDrivers:0, totalPassengers:0, completedTrips:0, ongoingTrips:0, complaints:0, paymentsReceived:0, paymentsPending:0 };
    }
  }

  async getPolls() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/polls?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.polls || response.data || []);
    } catch { return []; }
  }

  async createPoll(pollData) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall('/polls', {
      method: 'POST',
      body: JSON.stringify({ ...pollData, transporterId }),
    });
  }

  async deletePoll(pollId) {
    return this.apiCall(`/polls/${pollId}`, { method: 'DELETE' });
  }

  async getAvailableDrivers(date) {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/availability/drivers?date=${date}&transporterId=${transporterId}`);
      return response.drivers || [];
    } catch { return []; }
  }

  async assignRouteFromPoll(pollId, assignmentData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.apiCall('/routes/assign', {
      method: 'POST',
      body: JSON.stringify({
        pollId,
        driverId:    assignmentData.driverId,
        routeName:   assignmentData.routeName,
        startPoint:  assignmentData.startPoint  || 'Start Point',
        destination: assignmentData.destination || 'Destination',
        timeSlot:    assignmentData.timeSlot,
        pickupTime:  assignmentData.pickupTime  || assignmentData.timeSlot,
        date:        tomorrow.toISOString(),
      }),
    });
  }

  // ── NEW: assign driver to an existing route ──
  async assignDriverToRoute(routeId, driverId) {
    return this.apiCall(`/routes/${routeId}/assign-driver`, {
      method: 'PUT',
      body: JSON.stringify({ driverId }),
    });
  }

  async getDrivers() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/drivers?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.drivers || response.data || []);
    } catch { return []; }
  }

  async getDriverRequests() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/join-requests?type=driver&transporterId=${transporterId}`);
      const requests = Array.isArray(response) ? response : (response.requests || response.data || []);
      return requests.filter(r => r.status === 'pending');
    } catch { return []; }
  }

  async approveDriverRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/join-requests/${id}/accept`, { method:'PUT', body: JSON.stringify({ transporterId }) });
  }

  async rejectDriverRequest(id) {
    return this.apiCall(`/join-requests/${id}/reject`, { method:'PUT' });
  }

  async getPassengerRequests() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/join-requests?type=passenger&transporterId=${transporterId}`);
      const requests = Array.isArray(response) ? response : (response.requests || response.data || []);
      return requests.filter(r => r.status === 'pending');
    } catch { return []; }
  }

  async approvePassengerRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.apiCall(`/join-requests/${id}/accept`, { method:'PUT', body: JSON.stringify({ transporterId }) });
  }

  async rejectPassengerRequest(id) {
    return this.apiCall(`/join-requests/${id}/reject`, { method:'PUT' });
  }

  async getRoutes() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/routes?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.routes || response.data || []);
    } catch { return []; }
  }

  async getTrips() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/trips?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.trips || response.data || []);
    } catch { return []; }
  }

  async getComplaints() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/complaints?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.complaints || response.data || []);
    } catch { return []; }
  }

  async getNotifications() {
    try {
      const { transporterId } = await this.getAuthData();
      const response = await this.apiCall(`/notifications?transporterId=${transporterId}`);
      return Array.isArray(response) ? response : (response.notifications || response.data || []);
    } catch { return []; }
  }

  async markNotificationAsRead(id) {
    return this.apiCall(`/notifications/${id}/read`, { method:'PUT' });
  }

  async getAddressFromCoords(lat, lng) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }
}

const apiService = new ApiService();

// ==================== AUTH HOOK ====================
const useAuth = () => {
  const navigation = useNavigation();

  const checkAuth = useCallback(async () => {
    try {
      const { token, transporterId } = await apiService.getAuthData();
      if (!token || !transporterId) {
        Alert.alert('Authentication Required', 'Please login to continue', [
          { text:'OK', onPress:() => navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] }) },
        ]);
        return false;
      }
      return true;
    } catch {
      navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] });
      return false;
    }
  }, [navigation]);

  const logout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text:'Cancel', style:'cancel' },
      {
        text:'Logout', style:'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['authToken','transporterId','transporterData','transporterEmail','transporterName','userRole']);
          navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] });
        },
      },
    ]);
  }, [navigation]);

  return { checkAuth, logout };
};

// ==================== SHARED UI COMPONENTS ====================
const StatCard = ({ label, value, iconName, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
      <Icon name={iconName} size={26} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickActionCard = ({ iconName, title, onPress, badge }) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.quickActionIcon}>
      <Icon name={iconName} size={24} color={COLORS.primaryDark} />
      {badge > 0 && (
        <View style={[styles.badge, { top:-4, right:-4 }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

const ProfileImage = ({ uri, name, size = 60 }) => {
  const initials = useMemo(() => {
    if (!name) return 'T';
    const parts = name.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }, [name]);

  return (
    <View style={{ width:size, height:size, borderRadius:size/2, overflow:'hidden', backgroundColor:COLORS.primary, justifyContent:'center', alignItems:'center' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width:size, height:size }} />
      ) : (
        <Text style={{ color:COLORS.white, fontSize:size*0.35, fontWeight:'800' }}>{initials}</Text>
      )}
    </View>
  );
};

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// ==================== MAIN DASHBOARD ====================
const TransporterDashboard = () => {
  const navigation = useNavigation();
  const { checkAuth, logout } = useAuth();

  const [sidebarVisible, setSidebarVisible]   = useState(false);
  const [activeSection, setActiveSection]     = useState('overview');
  const [refreshing, setRefreshing]           = useState(false);
  const [lastUpdated, setLastUpdated]         = useState(new Date());
  const [slideAnim]                           = useState(new Animated.Value(-280));
  const [isLoading, setIsLoading]             = useState(true);

  const [profile, setProfile]                           = useState(null);
  const [isEditingProfile, setIsEditingProfile]         = useState(false);
  const [stats, setStats]                               = useState({ activeDrivers:0, totalPassengers:0, completedTrips:0, ongoingTrips:0, complaints:0, paymentsReceived:0, paymentsPending:0 });
  const [polls, setPolls]                               = useState([]);
  const [routes, setRoutes]                             = useState([]);
  const [driverRequests, setDriverRequests]             = useState([]);
  const [passengerRequests, setPassengerRequests]       = useState([]);
  const [complaints, setComplaints]                     = useState([]);
  const [notifications, setNotifications]               = useState([]);
  const [vans, setVans]                                 = useState([]);
  const [selectedPoll, setSelectedPoll]                 = useState(null);
  // ── used only for Poll → Assign flow (kept for backward compat) ──
  const [selectedPollForAssignment, setSelectedPollForAssignment] = useState(null);

  // ── init ──
  useEffect(() => {
    checkAuth().then(ok => { if (ok) loadAllData(); });
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: sidebarVisible ? 0 : -280,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [sidebarVisible]);

  // ── loaders ──
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadProfile(), loadStats(), loadPolls(),
        loadDriverRequests(), loadPassengerRequests(),
        loadRoutes(), loadComplaints(), loadNotifications(), loadTrips(),
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      if (error.message === 'Authentication required' || error.message === 'Authentication failed') {
        Alert.alert('Session Expired', 'Please login again', [
          { text:'OK', onPress:()=> navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] }) },
        ]);
      } else {
        Alert.alert('Error', 'Failed to load data. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfile           = async () => { const d = await apiService.getProfile(); if (d) setProfile({ ...d, registrationDate: d.registrationDate ? new Date(d.registrationDate).toLocaleDateString() : 'N/A' }); };
  const loadStats             = async () => setStats(await apiService.getStats());
  const loadPolls             = async () => setPolls(await apiService.getPolls());
  const loadDriverRequests    = async () => setDriverRequests(await apiService.getDriverRequests());
  const loadPassengerRequests = async () => setPassengerRequests(await apiService.getPassengerRequests());
  const loadRoutes            = async () => setRoutes(await apiService.getRoutes());
  const loadComplaints        = async () => setComplaints(await apiService.getComplaints());
  const loadNotifications     = async () => setNotifications(await apiService.getNotifications());

  const loadTrips = async () => {
    try {
      const data = await apiService.getTrips();
      if (!data || !data.length) { setVans([]); return; }
      setVans(data.map(trip => {
        const picked = (Array.isArray(trip.passengers) ? trip.passengers : []).filter(p => p && (p.status==='picked'||p.status==='current'));
        return {
          id: trip._id || trip.id,
          name: `Van - ${trip.driverName || 'Unknown'}`,
          driver: trip.driverName || 'Unknown Driver',
          route: trip.routeName || 'Unknown Route',
          timeSlot: trip.timeSlot || 'N/A',
          status: trip.status || 'Unknown',
          passengers: picked.length,
          capacity: trip.capacity || 8,
          currentStop: trip.currentStop || 'N/A',
          currentLocation: trip.currentLocation || { latitude:33.6844, longitude:73.0479 },
          speed: trip.speed || 0,
          eta: trip.eta || '0 min',
          color: '#3498DB',
        };
      }));
    } catch { setVans([]); }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // ==================== SIDEBAR ====================
  const Sidebar = () => (
    <Animated.View style={[styles.sidebar, { transform:[{ translateX:slideAnim }] }]}>
      <View style={styles.sidebarHeader}>
        <ProfileImage uri={profile?.profileImage} name={profile?.name} size={48} />
        <View style={{ marginLeft:12, flex:1 }}>
          <Text style={styles.sidebarName}>{profile?.name || 'Loading...'}</Text>
          <Text style={styles.sidebarCompany}>{profile?.company || 'Transport Company'}</Text>
        </View>
        <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.sidebarClose}>
          <Icon name="close" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map(item => {
          const isActive = activeSection === item.key;
          const badgeNum =
            item.key === 'notifications' ? unreadCount :
            item.key === 'driver-req'    ? driverRequests.length :
            item.key === 'pass-req'      ? passengerRequests.length : 0;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => { setActiveSection(item.key); setSidebarVisible(false); }}
              activeOpacity={0.7}
            >
              <Icon name={item.icon} size={22} color={isActive ? COLORS.primaryDark : COLORS.gray} />
              <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>{item.label}</Text>
              {badgeNum > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{badgeNum > 9 ? '9+' : badgeNum}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.logoutMenuItem} onPress={logout}>
          <Icon name="logout" size={22} color={COLORS.danger} />
          <Text style={styles.logoutMenuText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  // ==================== OVERVIEW ====================
  const OverviewSection = () => (
    <ScrollView
      style={styles.section}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Dashboard" />
      <Text style={styles.updateText}>Last updated: {lastUpdated.toLocaleTimeString()}</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Active Drivers"   value={stats.activeDrivers}   iconName="directions-car"  color={COLORS.primary} />
        <StatCard label="Passengers"       value={stats.totalPassengers} iconName="people"          color={COLORS.success} />
        <StatCard label="Completed Trips"  value={stats.completedTrips}  iconName="check-circle"    color={COLORS.primaryDark} />
        <StatCard label="Ongoing Trips"    value={stats.ongoingTrips}    iconName="sync"            color={COLORS.warning} />
        <StatCard label="Complaints"       value={stats.complaints}      iconName="support-agent"   color={COLORS.danger} />
        <StatCard label="Payments Recv."   value={stats.paymentsReceived} iconName="account-balance-wallet" color={COLORS.success} />
      </View>
      <Text style={styles.sectionSubtitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionCard iconName="poll"            title="Polls"       onPress={() => setActiveSection('poll')} />
        <QuickActionCard iconName="map"             title="Routes"      onPress={() => setActiveSection('routes')} />
        <QuickActionCard iconName="assignment-ind"  title="Assign"      onPress={() => setActiveSection('assign')} />
        <QuickActionCard iconName="my-location"     title="Tracking"    onPress={() => setActiveSection('tracking')} />
        <QuickActionCard iconName="group-add"       title="Driver Req"  onPress={() => setActiveSection('driver-req')} badge={driverRequests.length} />
        <QuickActionCard iconName="person-add"      title="Pass. Req"   onPress={() => setActiveSection('pass-req')}  badge={passengerRequests.length} />
      </View>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.notifBanner} onPress={() => setActiveSection('notifications')}>
          <Icon name="notifications-active" size={22} color={COLORS.white} />
          <Text style={styles.notifBannerText}>You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
          <Icon name="chevron-right" size={22} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ==================== PROFILE ====================
  const ProfileSection = () => {
    if (!profile) return <ActivityIndicator style={{ flex:1 }} color={COLORS.primary} />;
    return (
      <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Profile" />
        <View style={[styles.card, { alignItems:'center', paddingVertical:24 }]}>
          <ProfileImage uri={profile.profileImage} name={profile.name} size={80} />
          <Text style={[styles.cardTitle, { marginTop:12, fontSize:20 }]}>{profile.name}</Text>
          <Text style={{ color:COLORS.gray, fontSize:14 }}>{profile.company}</Text>
          <View style={[styles.statusPill, { backgroundColor: profile.status==='active' ? COLORS.success+'22' : COLORS.danger+'22' }]}>
            <Text style={{ color: profile.status==='active' ? COLORS.success : COLORS.danger, fontWeight:'700', fontSize:12 }}>
              {profile.status?.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Personal Information</Text>
          {isEditingProfile ? (
            <>
              {[
                { key:'name',    label:'Name',    keyboard:'default' },
                { key:'phone',   label:'Phone',   keyboard:'phone-pad' },
                { key:'company', label:'Company', keyboard:'default' },
                { key:'address', label:'Address', keyboard:'default' },
                { key:'license', label:'License', keyboard:'default' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={profile[f.key]}
                    onChangeText={t => setProfile({ ...profile, [f.key]:t })}
                    keyboardType={f.keyboard}
                    multiline={f.key==='address'}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.primaryBtn} onPress={async () => {
                try {
                  await apiService.updateProfile(profile);
                  setIsEditingProfile(false);
                  Alert.alert('Success','Profile updated');
                  await loadProfile();
                } catch { Alert.alert('Error','Failed to update profile'); }
              }}>
                <Text style={styles.primaryBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, styles.secondaryBtn]} onPress={() => { setIsEditingProfile(false); loadProfile(); }}>
                <Text style={styles.primaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { label:'Email',      value:profile.email },
                { label:'Phone',      value:profile.phone },
                { label:'Company',    value:profile.company },
                { label:'Address',    value:profile.address },
                { label:'License',    value:profile.license },
                { label:'Location',   value:profile.location },
                { label:'Registered', value:profile.registrationDate },
              ].map(row => (
                <View key={row.label} style={styles.profileRow}>
                  <Text style={styles.profileLabel}>{row.label}</Text>
                  <Text style={styles.profileValue}>{row.value}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsEditingProfile(true)}>
                <Text style={styles.primaryBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  // ==================== POLLS ====================
  const PollSection = () => {
    const [newPoll, setNewPoll]         = useState({ title:'', selectedSlots:[], closingTime:'' });
    const [pollResponses, setPollResponses] = useState([]);
    const [deletingId, setDeletingId]   = useState(null);

    const customTimeSlots = ['07:00 AM','07:30 AM','08:00 AM'];

    const toggleSlot = slot => setNewPoll(prev => ({
      ...prev,
      selectedSlots: prev.selectedSlots.includes(slot)
        ? prev.selectedSlots.filter(s => s !== slot)
        : [...prev.selectedSlots, slot],
    }));

    const createPoll = async () => {
      if (!newPoll.title || !newPoll.selectedSlots.length || !newPoll.closingTime) {
        Alert.alert('Error','Please fill all fields and select at least one time slot');
        return;
      }
      try {
        setIsLoading(true);
        const res = await apiService.createPoll({
          title:       newPoll.title,
          timeSlots:   newPoll.selectedSlots,
          closesAt:    newPoll.closingTime,
          closingDate: new Date(Date.now() + 24*60*60*1000),
        });
        setNewPoll({ title:'', selectedSlots:[], closingTime:'' });
        await loadPolls();
        Alert.alert('Success', `Poll created! ${res.notificationsSent || 0} passengers notified.`);
      } catch { Alert.alert('Error','Failed to create poll'); }
      finally  { setIsLoading(false); }
    };

    const confirmDelete = (poll) => {
      Alert.alert(
        'Delete Poll',
        `"${poll.title}" ko delete karna chahte hain? Yeh action undo nahi ho sakti.`,
        [
          { text:'Cancel', style:'cancel' },
          {
            text:'Delete', style:'destructive', onPress: async () => {
              try {
                setDeletingId(poll._id);
                await apiService.deletePoll(poll._id);
                await loadPolls();
                Alert.alert('Deleted','Poll successfully deleted.');
              } catch { Alert.alert('Error','Poll delete karne mein masla aya.'); }
              finally { setDeletingId(null); }
            },
          },
        ]
      );
    };

    return (
      <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Polls" />

        {/* Create Poll Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>New Poll</Text>
          <Text style={styles.inputLabel}>Poll Title</Text>
          <TextInput style={styles.input} placeholder="e.g. Tomorrow's Morning Route" value={newPoll.title} onChangeText={t => setNewPoll({ ...newPoll, title:t })} />
          <Text style={styles.inputLabel}>Time Slots</Text>
          {customTimeSlots.map((slot,i) => (
            <TouchableOpacity key={i} style={[styles.timeSlotOption, newPoll.selectedSlots.includes(slot) && styles.timeSlotSelected]} onPress={() => toggleSlot(slot)}>
              <View style={[styles.checkbox, newPoll.selectedSlots.includes(slot) && styles.checkboxSelected]}>
                {newPoll.selectedSlots.includes(slot) && <Icon name="check" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.timeSlotLabel}>{slot}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.inputLabel}>Closing Time</Text>
          <TextInput style={styles.input} placeholder="e.g. 06:00 PM" value={newPoll.closingTime} onChangeText={t => setNewPoll({ ...newPoll, closingTime:t })} />
          <TouchableOpacity style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]} onPress={createPoll} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color={COLORS.white} /> : <><Icon name="poll" size={18} color={COLORS.white} /><Text style={[styles.primaryBtnText,{marginLeft:8}]}>Create Poll & Notify Passengers</Text></>}
          </TouchableOpacity>
        </View>

        {/* Polls List */}
        <Text style={styles.sectionSubtitle}>Active Polls</Text>
        {polls.length > 0 ? polls.map(poll => (
          <View key={poll._id} style={styles.card}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
              <View style={{ flex:1 }}>
                <Text style={styles.cardTitle}>{poll.title}</Text>
                <Text style={styles.pollMeta}>📅 Created: {new Date(poll.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.pollMeta}>⏰ Closes at: {poll.closesAt}</Text>
                <Text style={styles.pollMeta}>🕐 Slots: {poll.timeSlots?.join(', ') || 'None'}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(poll)} disabled={deletingId === poll._id} style={styles.deleteBtn}>
                {deletingId === poll._id ? <ActivityIndicator size="small" color={COLORS.danger} /> : <Icon name="delete" size={18} color={COLORS.danger} />}
              </TouchableOpacity>
            </View>
            <View style={styles.responseStatsRow}>
              <View style={[styles.responseStatBox, { backgroundColor:'#e8f5e9' }]}>
                <Text style={[styles.responseStatNum, { color:COLORS.success }]}>{poll.responses?.filter(r=>r.response==='yes').length || 0}</Text>
                <Text style={styles.responseStatLabel}>Will Travel</Text>
              </View>
              <View style={[styles.responseStatBox, { backgroundColor:'#fce4ec' }]}>
                <Text style={[styles.responseStatNum, { color:COLORS.danger }]}>{poll.responses?.filter(r=>r.response==='no').length || 0}</Text>
                <Text style={styles.responseStatLabel}>Won't Travel</Text>
              </View>
              <View style={[styles.responseStatBox, { backgroundColor:'#f3f4f6' }]}>
                <Text style={[styles.responseStatNum, { color:COLORS.black }]}>{poll.responses?.length || 0}</Text>
                <Text style={styles.responseStatLabel}>Total</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
              <TouchableOpacity style={[styles.outlineBtn, { flex:1 }]} onPress={() => { setSelectedPoll(poll); setPollResponses(poll.responses || []); }}>
                <Icon name="visibility" size={16} color={COLORS.primaryDark} />
                <Text style={styles.outlineBtnText}>Responses</Text>
              </TouchableOpacity>
              {(poll.responses?.filter(r=>r.response==='yes').length || 0) > 0 && (
                <TouchableOpacity style={[styles.primaryBtn, { flex:1, marginTop:0 }]} onPress={() => {
                  setSelectedPollForAssignment(poll);
                  setActiveSection('assign');
                }}>
                  <Icon name="assignment-ind" size={16} color={COLORS.white} />
                  <Text style={[styles.primaryBtnText,{marginLeft:6}]}>Assign Route</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Icon name="poll" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No active polls</Text>
            <Text style={styles.emptySubtext}>Create a poll to get travel confirmations from passengers</Text>
          </View>
        )}

        {/* Responses Modal */}
        <Modal visible={!!selectedPoll} animationType="slide" onRequestClose={() => setSelectedPoll(null)}>
          <SafeAreaView style={{ flex:1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Poll Responses</Text>
              <TouchableOpacity onPress={() => setSelectedPoll(null)}><Icon name="close" size={24} color={COLORS.black} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {pollResponses.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No responses yet</Text></View>
              ) : pollResponses.map((r,i) => (
                <View key={i} style={styles.responseCard}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={styles.responseName}>{r.passengerName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: r.response==='yes' ? COLORS.success : COLORS.danger }]}>
                      <Text style={styles.statusBadgeText}>{r.response==='yes' ? 'Will Travel' : "Won't Travel"}</Text>
                    </View>
                  </View>
                  {r.response==='yes' && (<><Text style={styles.responseDetail}>🕐 {r.selectedTimeSlot}</Text><Text style={styles.responseDetail}>📍 {r.pickupPoint}</Text></>)}
                  <Text style={styles.responseDate}>{new Date(r.respondedAt).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    );
  };

  // ==================== ROUTES ====================
  // ── Inline Driver Assignment Modal (inside Routes section) ──
  const RoutesSection = () => {
    const [routeFilter, setRouteFilter]               = useState('all');
    const [aiSuggestions, setAiSuggestions]           = useState([]);
    const [isGenerating, setIsGenerating]             = useState(false);
    const [showAiPanel, setShowAiPanel]               = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showDetailModal, setShowDetailModal]       = useState(false);

    // ── NEW: driver-assign modal state for AI suggestion ──
    const [showAssignModal, setShowAssignModal]       = useState(null); // holds suggestion obj
    const [availDrivers, setAvailDrivers]             = useState([]);
    const [pickedDriver, setPickedDriver]             = useState(null);
    const [assigningRoute, setAssigningRoute]         = useState(false);
    const [routeNameInput, setRouteNameInput]         = useState('');
    const [startPointInput, setStartPointInput]       = useState('');
    const [destinationInput, setDestinationInput]     = useState('');

    const filteredRoutes = useMemo(() => {
      if (routeFilter === 'all') return routes;
      return routes.filter(r => r.status === routeFilter);
    }, [routes, routeFilter]);

    const getEfficiencyColor = score => score >= 75 ? COLORS.success : score >= 45 ? COLORS.warning : COLORS.danger;

    // ── Load drivers for modal ──
    const openAssignModal = async (suggestion) => {
      setShowAssignModal(suggestion);
      setPickedDriver(suggestion.assignedDriver?._id || null);
      setRouteNameInput(suggestion.routeLabel);
      setStartPointInput('');
      setDestinationInput('');
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = await apiService.getAvailableDrivers(tomorrow.toISOString().split('T')[0]);
        setAvailDrivers(d);
      } catch { setAvailDrivers([]); }
    };

    const handleAssignFromAI = async () => {
      if (!showAssignModal || !pickedDriver || !routeNameInput || !showAssignModal.timeSlot) {
        Alert.alert('Error', 'Please select a driver and fill route name');
        return;
      }
      try {
        setAssigningRoute(true);
        await apiService.assignRouteFromPoll(showAssignModal.pollId, {
          driverId:    pickedDriver,
          routeName:   routeNameInput,
          timeSlot:    showAssignModal.timeSlot,
          startPoint:  startPointInput  || 'Start Point',
          destination: destinationInput || 'Destination',
          pickupTime:  showAssignModal.timeSlot,
        });
        Alert.alert('Success', `Route "${routeNameInput}" assigned! All parties notified.`, [
          { text:'OK', onPress: async () => {
            setShowAssignModal(null);
            setShowDetailModal(false);
            setShowAiPanel(false);
            setAiSuggestions([]);
            await loadRoutes();
            await loadTrips();
          }},
        ]);
      } catch { Alert.alert('Error','Failed to assign route.'); }
      finally   { setAssigningRoute(false); }
    };

    // ── AI ALGORITHM ──
    const runAiAlgorithm = useCallback(async () => {
      setIsGenerating(true);
      setShowAiPanel(true);
      try {
        const [pollsData, driversData] = await Promise.all([
          apiService.getPolls(),
          apiService.getDrivers(),
        ]);

        const confirmed = [];
        pollsData.forEach(poll => {
          (poll.responses || []).forEach(r => {
            if (r.response === 'yes' && r.pickupPoint) {
              confirmed.push({
                name:        r.passengerName || 'Passenger',
                pickupPoint: r.pickupPoint,
                timeSlot:    r.selectedTimeSlot || (poll.timeSlots?.[0] ?? 'N/A'),
                pollTitle:   poll.title,
                pollId:      poll._id,
              });
            }
          });
        });

        if (confirmed.length === 0) {
          Alert.alert('No Data','No confirmed passengers found in polls. Please wait for poll responses.');
          setIsGenerating(false);
          setShowAiPanel(false);
          return;
        }

        // Group by time slot
        const groups = {};
        confirmed.forEach(p => {
          if (!groups[p.timeSlot]) groups[p.timeSlot] = [];
          groups[p.timeSlot].push(p);
        });

        // Available drivers
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        let availDriversList = [];
        try { availDriversList = await apiService.getAvailableDrivers(tomorrow.toISOString().split('T')[0]); } catch {}

        const driverPool = availDriversList.length > 0
          ? availDriversList.map(a => ({
              _id:          a.driverId?._id || a._id,
              name:         a.driverId?.name || a.driverName || 'Driver',
              phone:        a.driverId?.phone || a.phone || 'N/A',
              capacity:     a.driverId?.capacity || a.capacity || 8,
              availableFrom: a.startTime || '',
              availableTo:   a.endTime   || '',
            }))
          : driversData.map(d => ({
              _id:      d._id,
              name:     d.name || 'Driver',
              phone:    d.phone || 'N/A',
              capacity: d.capacity || 8,
              availableFrom: '',
              availableTo:   '',
            }));

        const suggestions = [];
        let di = 0;
        Object.entries(groups).forEach(([timeSlot, passengers], slotIdx) => {
          const CAPACITY = 8;
          for (let i = 0; i < passengers.length; i += CAPACITY) {
            const group      = passengers.slice(i, i + CAPACITY);
            const driver     = driverPool[di % Math.max(driverPool.length,1)] || null;
            di++;
            const uniqueStops = [...new Set(group.map(p => p.pickupPoint))];
            const groupIdx    = Math.floor(i / CAPACITY);
            const label       = `Route ${slotIdx + 1}${Math.ceil(passengers.length/CAPACITY)>1?`-${groupIdx+1}`:''}`;
            const fillRate    = Math.round((group.length / CAPACITY) * 100);
            const score       = Math.min(100, Math.round(fillRate * 0.7 + (driver ? 30 : 0)));
            suggestions.push({
              id: `s-${slotIdx}-${groupIdx}`,
              routeLabel:     label,
              timeSlot,
              passengers:     group,
              passengerCount: group.length,
              stops:          uniqueStops,
              assignedDriver: driver,
              efficiencyScore: score,
              fillRate,
              pollTitle: group[0]?.pollTitle || 'N/A',
              pollId:    group[0]?.pollId    || null,
            });
          }
        });
        suggestions.sort((a,b) => b.efficiencyScore - a.efficiencyScore);
        setAiSuggestions(suggestions);
      } catch (err) {
        console.error('AI Error:', err);
        Alert.alert('Error','Could not generate suggestions. Please try again.');
        setShowAiPanel(false);
      } finally {
        setIsGenerating(false);
      }
    }, []);

    // ── Suggestion Detail Modal ──
    const SuggestionDetailModal = () => {
      if (!selectedSuggestion) return null;
      const s = selectedSuggestion;
      return (
        <Modal visible={showDetailModal} animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
          <SafeAreaView style={{ flex:1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{s.routeLabel}</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}><Icon name="close" size={24} color={COLORS.black} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {/* Summary */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Summary</Text>
                <View style={{ flexDirection:'row', alignItems:'center', marginBottom:12 }}>
                  <View style={[styles.statIconWrap, { backgroundColor: getEfficiencyColor(s.efficiencyScore)+'22', width:48, height:48, borderRadius:24 }]}>
                    <Text style={{ fontSize:16, fontWeight:'800', color: getEfficiencyColor(s.efficiencyScore) }}>{s.efficiencyScore}%</Text>
                  </View>
                  <Text style={{ marginLeft:12, fontSize:16, fontWeight:'700', color:COLORS.black }}>Efficient</Text>
                </View>
                {[
                  { icon:'schedule',    label:'Time Slot',     val:s.timeSlot },
                  { icon:'poll',        label:'Poll',          val:s.pollTitle },
                  { icon:'people',      label:'Passengers',    val:`${s.passengerCount}` },
                  { icon:'location-on', label:'Unique Stops',  val:`${s.stops.length}` },
                ].map(row => (
                  <View key={row.label} style={styles.infoRow}>
                    <Icon name={row.icon} size={18} color={COLORS.gray} />
                    <Text style={styles.infoText}>{row.label}: <Text style={{ color:COLORS.black, fontWeight:'700' }}>{row.val}</Text></Text>
                  </View>
                ))}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width:`${s.fillRate}%`, backgroundColor: getEfficiencyColor(s.efficiencyScore) }]} />
                </View>
              </View>

              {/* Driver */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Suggested Driver</Text>
                {s.assignedDriver ? (
                  <View>
                    <Text style={styles.driverName}>{s.assignedDriver.name}</Text>
                    <Text style={styles.driverDetail}>📞 {s.assignedDriver.phone}</Text>
                    <Text style={styles.driverDetail}>🚐 Capacity: {s.assignedDriver.capacity}</Text>
                    {s.assignedDriver.availableFrom ? (
                      <Text style={styles.driverDetail}>✅ {s.assignedDriver.availableFrom} – {s.assignedDriver.availableTo}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={{ color:COLORS.warning, fontWeight:'600' }}>⚠️ No available driver found. You can still assign below.</Text>
                )}
              </View>

              {/* Stops */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Pickup Stops ({s.stops.length})</Text>
                {s.stops.map((stop, idx) => (
                  <View key={idx} style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
                    <View style={[styles.stopNumber, { backgroundColor: COLORS.primary+'33' }]}>
                      <Text style={{ fontSize:11, fontWeight:'800', color:COLORS.primaryDark }}>{idx+1}</Text>
                    </View>
                    <Text style={{ marginLeft:10, fontSize:14, color:COLORS.black, flex:1 }}>{stop}</Text>
                  </View>
                ))}
              </View>

              {/* Passengers */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Passengers ({s.passengerCount})</Text>
                {s.passengers.map((p,i) => (
                  <View key={i} style={{ flexDirection:'row', marginBottom:8 }}>
                    <Icon name="person" size={18} color={COLORS.gray} />
                    <View style={{ marginLeft:8 }}>
                      <Text style={{ fontSize:13, fontWeight:'700', color:COLORS.black }}>{p.name}</Text>
                      <Text style={{ fontSize:12, color:COLORS.gray }}>📍 {p.pickupPoint}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── ASSIGN BUTTON → opens inline assign modal ── */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginBottom:24 }]}
                onPress={() => { setShowDetailModal(false); openAssignModal(s); }}
              >
                <Icon name="assignment-ind" size={18} color={COLORS.white} />
                <Text style={[styles.primaryBtnText, { marginLeft:8 }]}>Assign This Route</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      );
    };

    // ── INLINE DRIVER ASSIGN MODAL (stays in Routes section) ──
    const InlineAssignModal = () => {
      if (!showAssignModal) return null;
      const s = showAssignModal;
      return (
        <Modal visible={!!showAssignModal} animationType="slide" onRequestClose={() => setShowAssignModal(null)}>
          <SafeAreaView style={{ flex:1, backgroundColor: COLORS.sectionBg }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAssignModal(null)}>
                <Icon name="arrow-back" size={24} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { flex:1, marginLeft:12 }]}>Assign Route</Text>
            </View>
            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">

              {/* Route Info summary */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Route Info</Text>
                <Text style={styles.inputLabel}>Route Name</Text>
                <TextInput
                  style={styles.input}
                  value={routeNameInput}
                  onChangeText={setRouteNameInput}
                  placeholder="Route name"
                />
                <Text style={styles.inputLabel}>Start Point</Text>
                <TextInput
                  style={styles.input}
                  value={startPointInput}
                  onChangeText={setStartPointInput}
                  placeholder="e.g. Sector G-8"
                />
                <Text style={styles.inputLabel}>Destination</Text>
                <TextInput
                  style={styles.input}
                  value={destinationInput}
                  onChangeText={setDestinationInput}
                  placeholder="e.g. Blue Area"
                />
                <View style={styles.infoRow}>
                  <Icon name="schedule" size={16} color={COLORS.gray} />
                  <Text style={styles.infoText}>Time Slot: <Text style={{ fontWeight:'700', color:COLORS.black }}>{s.timeSlot}</Text></Text>
                </View>
                <View style={styles.infoRow}>
                  <Icon name="people" size={16} color={COLORS.gray} />
                  <Text style={styles.infoText}>Passengers: <Text style={{ fontWeight:'700', color:COLORS.black }}>{s.passengerCount}</Text></Text>
                </View>
              </View>

              {/* Driver selection */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>Select Driver</Text>

                {/* Suggested driver first */}
                {s.assignedDriver && (
                  <View style={{ marginBottom:8 }}>
                    <Text style={{ fontSize:12, color:COLORS.primary, fontWeight:'700', marginBottom:6 }}>⭐ AI Suggested</Text>
                    <TouchableOpacity
                      style={[styles.driverOption, pickedDriver === s.assignedDriver._id && styles.driverOptionSelected]}
                      onPress={() => setPickedDriver(s.assignedDriver._id)}
                    >
                      <View style={[styles.driverAvatar, { backgroundColor: COLORS.primary+'33' }]}>
                        <Icon name="person" size={20} color={COLORS.primaryDark} />
                      </View>
                      <View style={{ flex:1, marginLeft:10 }}>
                        <Text style={styles.driverName}>{s.assignedDriver.name}</Text>
                        <Text style={styles.driverDetail}>📞 {s.assignedDriver.phone} · 🚐 {s.assignedDriver.capacity}</Text>
                        {s.assignedDriver.availableFrom ? (
                          <Text style={[styles.driverDetail, { color:COLORS.success }]}>✅ {s.assignedDriver.availableFrom}–{s.assignedDriver.availableTo}</Text>
                        ) : null}
                      </View>
                      {pickedDriver === s.assignedDriver._id && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                    </TouchableOpacity>
                  </View>
                )}

                {/* All available drivers */}
                {availDrivers.length > 0 && (
                  <View>
                    <Text style={{ fontSize:12, color:COLORS.gray, fontWeight:'700', marginBottom:6 }}>All Available Drivers</Text>
                    {availDrivers.map((av, i) => {
                      const d   = av.driverId || av;
                      const isSel = pickedDriver === d._id;
                      // Skip if same as suggested
                      if (s.assignedDriver && d._id === s.assignedDriver._id) return null;
                      return (
                        <TouchableOpacity key={i} style={[styles.driverOption, isSel && styles.driverOptionSelected]} onPress={() => setPickedDriver(d._id)}>
                          <View style={[styles.driverAvatar, { backgroundColor: COLORS.gray+'33' }]}>
                            <Icon name="person" size={20} color={COLORS.gray} />
                          </View>
                          <View style={{ flex:1, marginLeft:10 }}>
                            <Text style={styles.driverName}>{d.name || av.driverName}</Text>
                            <Text style={styles.driverDetail}>📞 {d.phone || 'N/A'} · 🚐 {d.capacity || 8}</Text>
                            {av.startTime && <Text style={[styles.driverDetail, { color:COLORS.success }]}>✅ {av.startTime}–{av.endTime}</Text>}
                          </View>
                          {isSel && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {availDrivers.length === 0 && !s.assignedDriver && (
                  <View style={styles.emptyState}>
                    <Icon name="person-off" size={36} color={COLORS.border} />
                    <Text style={styles.emptyText}>No drivers available</Text>
                    <Text style={styles.emptySubtext}>Drivers need to confirm their availability for tomorrow</Text>
                  </View>
                )}
              </View>

              {/* Summary */}
              <View style={styles.card}>
                <Text style={styles.cardSectionLabel}>📋 Assignment Summary</Text>
                {[
                  { label:'Route',       val: routeNameInput   || 'Not set' },
                  { label:'Start',       val: startPointInput  || 'Not set' },
                  { label:'Destination', val: destinationInput || 'Not set' },
                  { label:'Time Slot',   val: s.timeSlot },
                  { label:'Passengers',  val: `${s.passengerCount}` },
                  { label:'Driver',      val: (() => {
                    if (!pickedDriver) return 'Not selected';
                    if (s.assignedDriver && pickedDriver === s.assignedDriver._id) return s.assignedDriver.name;
                    const found = availDrivers.find(av => (av.driverId?._id || av._id) === pickedDriver);
                    return found ? (found.driverId?.name || found.driverName || 'Selected') : 'Selected';
                  })() },
                ].map(row => (
                  <View key={row.label} style={styles.profileRow}>
                    <Text style={styles.profileLabel}>{row.label}</Text>
                    <Text style={styles.profileValue}>{row.val}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginBottom:32 }, (!pickedDriver || assigningRoute) && styles.primaryBtnDisabled]}
                onPress={handleAssignFromAI}
                disabled={!pickedDriver || assigningRoute}
              >
                {assigningRoute ? <ActivityIndicator color={COLORS.white} /> : (
                  <><Icon name="assignment-turned-in" size={18} color={COLORS.white} /><Text style={[styles.primaryBtnText,{marginLeft:8}]}>Assign Route & Notify All</Text></>
                )}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      );
    };

    return (
      <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Routes" />

        {/* AI Button */}
        <TouchableOpacity style={styles.aiBtn} onPress={runAiAlgorithm} disabled={isGenerating}>
          {isGenerating ? <ActivityIndicator color={COLORS.primary} /> : <Icon name="auto-awesome" size={22} color={COLORS.primary} />}
          <Text style={styles.aiBtnText}>{isGenerating ? 'Generating AI Suggestions...' : 'Generate AI Route Suggestions'}</Text>
        </TouchableOpacity>

        {/* AI Panel */}
        {showAiPanel && !isGenerating && (
          <View style={styles.card}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <View>
                <Text style={styles.cardTitle}>AI Suggestions</Text>
                <Text style={styles.pollMeta}>{aiSuggestions.length} routes</Text>
              </View>
              <TouchableOpacity onPress={() => { setShowAiPanel(false); setAiSuggestions([]); }}>
                <Icon name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize:12, color:COLORS.gray, marginBottom:12 }}>Based on driver availability and poll responses. Tap a suggestion for details.</Text>
            {aiSuggestions.length === 0 ? (
              <Text style={styles.emptyText}>No suggestions. Confirm poll responses first.</Text>
            ) : aiSuggestions.map(s => (
              <TouchableOpacity key={s.id} style={styles.suggestionCard} onPress={() => { setSelectedSuggestion(s); setShowDetailModal(true); }} activeOpacity={0.75}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={{ fontSize:15, fontWeight:'700', color:COLORS.black }}>{s.routeLabel}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getEfficiencyColor(s.efficiencyScore) }]}>
                    <Text style={styles.statusBadgeText}>{s.efficiencyScore}%</Text>
                  </View>
                </View>
                <Text style={styles.pollMeta}>⏰ {s.timeSlot} &nbsp;·&nbsp; 👥 {s.passengerCount} pax &nbsp;·&nbsp; 📍 {s.stops.length} stops</Text>
                <Text style={[styles.pollMeta, { marginTop:4 }]}>{s.assignedDriver ? s.assignedDriver.name : '⚠️ No driver'}</Text>
                <Text style={{ fontSize:12, color:COLORS.primary, marginTop:6, fontWeight:'700' }}>Tap for details → Assign here</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          {['all','assigned','started','completed'].map(f => (
            <TouchableOpacity key={f} style={[styles.tab, routeFilter===f && styles.tabActive]} onPress={() => setRouteFilter(f)}>
              <Text style={[styles.tabText, routeFilter===f && styles.tabTextActive]}>{f.charAt(0).toUpperCase()+f.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Routes List */}
        {filteredRoutes.length > 0 ? filteredRoutes.map(route => (
          <View key={route._id} style={styles.card}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <Text style={styles.cardTitle}>{route.name || route.routeName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: route.status==='completed' ? COLORS.success : route.status==='started' ? COLORS.warning : COLORS.primary }]}>
                <Text style={styles.statusBadgeText}>{route.status?.toUpperCase() || 'ASSIGNED'}</Text>
              </View>
            </View>
            {[
              { icon:'person',         text:`Driver: ${route.driverName || 'Not assigned'}` },
              route.timeSlot && { icon:'schedule',       text:`Time: ${route.timeSlot}` },
              route.date     && { icon:'calendar-today', text:`Date: ${new Date(route.date).toLocaleDateString()}` },
              route.passengers?.length && { icon:'people', text:`Passengers: ${route.passengers.length}` },
              route.stops?.length      && { icon:'location-on', text:`Stops: ${route.stops.join(', ')}` },
            ].filter(Boolean).map((row,i) => (
              <View key={i} style={styles.infoRow}>
                <Icon name={row.icon} size={16} color={COLORS.gray} />
                <Text style={styles.infoText}>{row.text}</Text>
              </View>
            ))}
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Icon name="map" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No routes found</Text>
            <Text style={styles.emptySubtext}>Routes will appear here once created from polls</Text>
          </View>
        )}

        <SuggestionDetailModal />
        <InlineAssignModal />
      </ScrollView>
    );
  };

  // ==================== ASSIGN ====================
  // ── Now: assign drivers to EXISTING routes from the Routes list ──
  const AssignSection = () => {
    const [selectedRoute, setSelectedRoute]     = useState(null);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [selectedDriver, setSelectedDriver]   = useState(null);
    const [isAssigning, setIsAssigning]         = useState(false);
    const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

    // Also keep old poll-based assignment (from Poll → Assign Route button)
    const [showPollFlow, setShowPollFlow]       = useState(false);
    const [pollRouteName, setPollRouteName]     = useState('');
    const [pollSelectedDriver, setPollSelectedDriver] = useState(null);
    const [pollSelectedTimeSlot, setPollSelectedTimeSlot] = useState('');
    const [pollStartPoint, setPollStartPoint]   = useState('');
    const [pollDestination, setPollDestination] = useState('');
    const [pollAvailDrivers, setPollAvailDrivers] = useState([]);
    const [isAssigningPoll, setIsAssigningPoll] = useState(false);

    // Auto-enter poll flow if navigated from Polls section
    useEffect(() => {
      if (selectedPollForAssignment) {
        setShowPollFlow(true);
        setPollRouteName(selectedPollForAssignment.title);
        loadPollDrivers();
      }
    }, [selectedPollForAssignment]);

    const loadPollDrivers = async () => {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = await apiService.getAvailableDrivers(tomorrow.toISOString().split('T')[0]);
        setPollAvailDrivers(d);
      } catch { setPollAvailDrivers([]); }
    };

    const handleSelectRoute = async (route) => {
      setSelectedRoute(route);
      setSelectedDriver(null);
      setIsLoadingDrivers(true);
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = await apiService.getAvailableDrivers(tomorrow.toISOString().split('T')[0]);
        setAvailableDrivers(d);
      } catch { setAvailableDrivers([]); }
      finally { setIsLoadingDrivers(false); }
    };

    const handleAssignDriver = async () => {
      if (!selectedRoute || !selectedDriver) {
        Alert.alert('Error','Please select a route and a driver');
        return;
      }
      try {
        setIsAssigning(true);
        await apiService.assignDriverToRoute(selectedRoute._id, selectedDriver);
        Alert.alert('Success', `Driver assigned to "${selectedRoute.name || selectedRoute.routeName}" successfully!`, [
          { text:'OK', onPress: async () => {
            setSelectedRoute(null);
            setSelectedDriver(null);
            await loadRoutes();
          }},
        ]);
      } catch { Alert.alert('Error','Failed to assign driver.'); }
      finally { setIsAssigning(false); }
    };

    const handlePollAssign = async () => {
      if (!selectedPollForAssignment || !pollSelectedDriver || !pollRouteName || !pollSelectedTimeSlot) {
        Alert.alert('Error','Please fill all required fields');
        return;
      }
      try {
        setIsAssigningPoll(true);
        await apiService.assignRouteFromPoll(selectedPollForAssignment._id, {
          driverId:    pollSelectedDriver,
          routeName:   pollRouteName,
          timeSlot:    pollSelectedTimeSlot,
          startPoint:  pollStartPoint  || 'Start Point',
          destination: pollDestination || 'Destination',
          pickupTime:  pollSelectedTimeSlot,
        });
        Alert.alert('Success', `Route "${pollRouteName}" assigned! All parties notified.`, [
          { text:'OK', onPress: () => {
            setPollRouteName(''); setPollSelectedDriver(null); setPollSelectedTimeSlot('');
            setPollStartPoint(''); setPollDestination('');
            setSelectedPollForAssignment(null);
            setShowPollFlow(false);
            loadRoutes(); loadTrips();
          }},
        ]);
      } catch { Alert.alert('Error','Failed to assign route.'); }
      finally { setIsAssigningPoll(false); }
    };

    // ── Unassigned routes (no driver yet) ──
    const unassignedRoutes = useMemo(() =>
      routes.filter(r => !r.driverName || r.driverName === 'Not assigned' || r.driverName === ''),
    [routes]);

    return (
      <ScrollView style={styles.section} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionHeader title="Assign Drivers" />

        {/* Toggle between two flows */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, !showPollFlow && styles.tabActive]} onPress={() => setShowPollFlow(false)}>
            <Text style={[styles.tabText, !showPollFlow && styles.tabTextActive]}>Existing Routes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, showPollFlow && styles.tabActive]} onPress={() => { setShowPollFlow(true); if (!selectedPollForAssignment) {} }}>
            <Text style={[styles.tabText, showPollFlow && styles.tabTextActive]}>From Poll</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════
            TAB 1: ASSIGN DRIVER TO EXISTING ROUTE
            ═══════════════════════════════════════ */}
        {!showPollFlow && (
          <>
            {/* Step 1: Select Route */}
            <View style={styles.card}>
              <Text style={styles.stepLabel}>Step 1 — Select a Route</Text>
              {unassignedRoutes.length > 0 ? unassignedRoutes.map(route => {
                const isSel = selectedRoute?._id === route._id;
                return (
                  <TouchableOpacity
                    key={route._id}
                    style={[styles.pollOption, isSel && styles.pollOptionActive]}
                    onPress={() => handleSelectRoute(route)}
                  >
                    <View style={{ flex:1 }}>
                      <Text style={styles.pollOptionTitle}>{route.name || route.routeName}</Text>
                      <Text style={styles.pollOptionInfo}>⏰ {route.timeSlot || 'N/A'} &nbsp;·&nbsp; 📍 {route.stops?.join(', ') || 'N/A'}</Text>
                      <Text style={styles.pollOptionInfo}>👥 {route.passengers?.length || 0} passengers</Text>
                    </View>
                    {isSel && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }) : (
                <View style={styles.emptyState}>
                  <Icon name="map" size={36} color={COLORS.border} />
                  <Text style={styles.emptyText}>No unassigned routes</Text>
                  <Text style={styles.emptySubtext}>All routes already have a driver, or create routes from AI suggestions first</Text>
                </View>
              )}
            </View>

            {/* Step 2: Select Driver (shown only after route selected) */}
            {selectedRoute && (
              <View style={styles.card}>
                <Text style={styles.stepLabel}>Step 2 — Select Driver</Text>
                <Text style={{ fontSize:13, color:COLORS.gray, marginBottom:12 }}>
                  Assigning to: <Text style={{ color:COLORS.black, fontWeight:'700' }}>{selectedRoute.name || selectedRoute.routeName}</Text>
                </Text>
                {isLoadingDrivers ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : availableDrivers.length > 0 ? availableDrivers.map((av, i) => {
                  const d   = av.driverId || av;
                  const isSel = selectedDriver === d._id;
                  return (
                    <TouchableOpacity key={i} style={[styles.driverOption, isSel && styles.driverOptionSelected]} onPress={() => setSelectedDriver(d._id)}>
                      <View style={[styles.driverAvatar, { backgroundColor: isSel ? COLORS.primary+'33' : COLORS.gray+'22' }]}>
                        <Icon name="person" size={20} color={isSel ? COLORS.primaryDark : COLORS.gray} />
                      </View>
                      <View style={{ flex:1, marginLeft:10 }}>
                        <Text style={styles.driverName}>{d.name || av.driverName}</Text>
                        <Text style={styles.driverDetail}>📞 {d.phone || 'N/A'} &nbsp;·&nbsp; 🚐 Capacity: {d.capacity || 8}</Text>
                        {av.startTime && <Text style={[styles.driverDetail, { color:COLORS.success }]}>✅ {av.startTime}–{av.endTime}</Text>}
                      </View>
                      {isSel && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                }) : (
                  <View style={styles.emptyState}>
                    <Icon name="person-off" size={36} color={COLORS.border} />
                    <Text style={styles.emptyText}>No drivers available for tomorrow</Text>
                    <Text style={styles.emptySubtext}>Drivers need to confirm their availability</Text>
                  </View>
                )}

                {/* Summary */}
                <View style={{ marginTop:16, padding:14, backgroundColor:COLORS.sectionBg, borderRadius:10 }}>
                  <Text style={styles.cardSectionLabel}>📋 Assignment Summary</Text>
                  {[
                    { label:'Route',    val: selectedRoute.name || selectedRoute.routeName },
                    { label:'Time',     val: selectedRoute.timeSlot || 'N/A' },
                    { label:'Passengers', val: `${selectedRoute.passengers?.length || 0}` },
                    { label:'Driver',   val: (() => {
                      if (!selectedDriver) return 'Not selected';
                      const f = availableDrivers.find(av => (av.driverId?._id || av._id) === selectedDriver);
                      return f ? (f.driverId?.name || f.driverName || 'Selected') : 'Selected';
                    })() },
                  ].map(row => (
                    <View key={row.label} style={styles.profileRow}>
                      <Text style={styles.profileLabel}>{row.label}</Text>
                      <Text style={styles.profileValue}>{row.val}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (!selectedDriver || isAssigning) && styles.primaryBtnDisabled]}
                  onPress={handleAssignDriver}
                  disabled={!selectedDriver || isAssigning}
                >
                  {isAssigning ? <ActivityIndicator color={COLORS.white} /> : (
                    <><Icon name="assignment-turned-in" size={18} color={COLORS.white} /><Text style={[styles.primaryBtnText,{marginLeft:8}]}>Assign Driver</Text></>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ════════════════════════════════
            TAB 2: CREATE ROUTE FROM POLL
            ════════════════════════════════ */}
        {showPollFlow && (
          <>
            {/* Step 1: Poll */}
            <View style={styles.card}>
              <Text style={styles.stepLabel}>Step 1 — Select Poll</Text>
              {polls.filter(p => p.status==='active').length > 0 ? polls.filter(p=>p.status==='active').map(poll => {
                const yes      = poll.responses?.filter(r=>r.response==='yes').length || 0;
                const isSel    = selectedPollForAssignment?._id === poll._id;
                return (
                  <TouchableOpacity key={poll._id} style={[styles.pollOption, isSel && styles.pollOptionActive]}
                    onPress={() => { setSelectedPollForAssignment(poll); setPollRouteName(poll.title); loadPollDrivers(); }}
                  >
                    <View style={{ flex:1 }}>
                      <Text style={styles.pollOptionTitle}>{poll.title}</Text>
                      <Text style={styles.pollOptionInfo}>👥 {yes} passengers confirmed</Text>
                      <Text style={styles.pollOptionInfo}>🕐 {poll.timeSlots?.join(', ')}</Text>
                    </View>
                    {isSel && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }) : (
                <View style={styles.emptyState}>
                  <Icon name="poll" size={36} color={COLORS.border} />
                  <Text style={styles.emptyText}>No active polls</Text>
                  <TouchableOpacity style={[styles.primaryBtn, { marginTop:12 }]} onPress={() => setActiveSection('poll')}>
                    <Text style={styles.primaryBtnText}>Create Poll</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {selectedPollForAssignment && (
              <>
                {/* Step 2: Route Details */}
                <View style={styles.card}>
                  <Text style={styles.stepLabel}>Step 2 — Route Details</Text>
                  <Text style={styles.inputLabel}>Route Name</Text>
                  <TextInput style={styles.input} value={pollRouteName} onChangeText={setPollRouteName} placeholder="Route name" />
                  <Text style={styles.inputLabel}>Start Point</Text>
                  <TextInput style={styles.input} value={pollStartPoint} onChangeText={setPollStartPoint} placeholder="e.g. Sector G-8" />
                  <Text style={styles.inputLabel}>Destination</Text>
                  <TextInput style={styles.input} value={pollDestination} onChangeText={setPollDestination} placeholder="e.g. Blue Area" />
                  <Text style={styles.inputLabel}>Time Slot</Text>
                  {selectedPollForAssignment.timeSlots?.map((slot,i) => (
                    <TouchableOpacity key={i} style={[styles.timeSlotOption, pollSelectedTimeSlot===slot && styles.timeSlotSelected]} onPress={() => setPollSelectedTimeSlot(slot)}>
                      <View style={[styles.checkbox, pollSelectedTimeSlot===slot && styles.checkboxSelected]}>
                        {pollSelectedTimeSlot===slot && <Icon name="check" size={14} color={COLORS.white} />}
                      </View>
                      <Text style={styles.timeSlotLabel}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Step 3: Driver */}
                <View style={styles.card}>
                  <Text style={styles.stepLabel}>Step 3 — Select Driver</Text>
                  {pollAvailDrivers.length > 0 ? pollAvailDrivers.map((av,i) => {
                    const d   = av.driverId || av;
                    const isSel = pollSelectedDriver === d._id;
                    return (
                      <TouchableOpacity key={i} style={[styles.driverOption, isSel && styles.driverOptionSelected]} onPress={() => setPollSelectedDriver(d._id)}>
                        <View style={[styles.driverAvatar, { backgroundColor: isSel ? COLORS.primary+'33' : COLORS.gray+'22' }]}>
                          <Icon name="person" size={20} color={isSel ? COLORS.primaryDark : COLORS.gray} />
                        </View>
                        <View style={{ flex:1, marginLeft:10 }}>
                          <Text style={styles.driverName}>{d.name || av.driverName}</Text>
                          <Text style={styles.driverDetail}>📞 {d.phone || 'N/A'} &nbsp;·&nbsp; 🚐 {d.capacity || 8}</Text>
                          {av.startTime && <Text style={[styles.driverDetail, { color:COLORS.success }]}>✅ {av.startTime}–{av.endTime}</Text>}
                        </View>
                        {isSel && <Icon name="check-circle" size={22} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  }) : (
                    <View style={styles.emptyState}>
                      <Icon name="person-off" size={36} color={COLORS.border} />
                      <Text style={styles.emptyText}>No drivers available for tomorrow</Text>
                    </View>
                  )}
                </View>

                {/* Summary */}
                <View style={styles.card}>
                  <Text style={styles.cardSectionLabel}>📋 Assignment Summary</Text>
                  {[
                    { label:'Route',       val: pollRouteName      || 'Not set' },
                    { label:'Start',       val: pollStartPoint     || 'Not set' },
                    { label:'Destination', val: pollDestination    || 'Not set' },
                    { label:'Time Slot',   val: pollSelectedTimeSlot || 'Not selected' },
                    { label:'Passengers',  val: `${selectedPollForAssignment.responses?.filter(r=>r.response==='yes').length||0}` },
                  ].map(row => (
                    <View key={row.label} style={styles.profileRow}>
                      <Text style={styles.profileLabel}>{row.label}</Text>
                      <Text style={styles.profileValue}>{row.val}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isAssigningPoll && styles.primaryBtnDisabled]}
                  onPress={handlePollAssign}
                  disabled={isAssigningPoll}
                >
                  {isAssigningPoll ? <ActivityIndicator color={COLORS.white} /> : (
                    <><Icon name="assignment-turned-in" size={18} color={COLORS.white} /><Text style={[styles.primaryBtnText,{marginLeft:8}]}>Assign Route & Notify All</Text></>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  // ==================== TRACKING ====================
  const TrackingSection = () => {
    const mapRef = useRef(null);
    const [selectedVan, setSelectedVan] = useState(null);
    const [localVans, setLocalVans]     = useState([
      { id:1, name:'Van A (Route 01)', driver:'Ahmed Ali',   source:{latitude:33.6844,longitude:73.0479}, destination:{latitude:33.7100,longitude:73.0800}, currentLocation:{latitude:33.6844,longitude:73.0479}, color:'#FF5733', status:'En Route', stops:['Sector G-8','Blue Area','F-7 Markaz'] },
      { id:2, name:'Van B (Route 05)', driver:'Zahid Khan',  source:{latitude:33.6500,longitude:73.0200}, destination:{latitude:33.6800,longitude:73.0500}, currentLocation:{latitude:33.6500,longitude:73.0200}, color:'#33A2FF', status:'En Route', stops:['Saddar','Shamsabad','Faizabad'] },
    ]);

    const handleSelectVan = van => {
      setSelectedVan(van);
      mapRef.current?.animateToRegion({ ...van.currentLocation, latitudeDelta:0.01, longitudeDelta:0.01 }, 800);
    };

    useEffect(() => {
      const interval = setInterval(() => {
        setLocalVans(prev => prev.map(van => {
          const step = 0.0002;
          const { latitude:cLat, longitude:cLng } = van.currentLocation;
          const { latitude:dLat, longitude:dLng } = van.destination;
          if (Math.abs(cLat-dLat) < step && Math.abs(cLng-dLng) < step) return van;
          return { ...van, currentLocation:{ latitude: cLat + (dLat-cLat>0?step:-step), longitude: cLng + (dLng-cLng>0?step:-step) } };
        }));
      }, 1000);
      return () => clearInterval(interval);
    }, [selectedVan]);

    return (
      <View style={{ flex:1 }}>
        {selectedVan && (
          <View style={styles.trackingHeader}>
            <TouchableOpacity onPress={() => setSelectedVan(null)} style={styles.backBtn}><Icon name="arrow-back" size={20} color={COLORS.black} /></TouchableOpacity>
            <Text style={styles.trackingHeaderTitle}>{selectedVan.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor:COLORS.success }]}><Text style={styles.statusBadgeText}>LIVE</Text></View>
          </View>
        )}
        <MapView ref={mapRef} style={[styles.mapWrapper, { height: selectedVan ? height*0.45 : height*0.5 }]}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ latitude:33.6844, longitude:73.0479, latitudeDelta:0.05, longitudeDelta:0.05 }}
        >
          {localVans.map(van => (
            (!selectedVan || selectedVan.id===van.id) && (
              <Marker key={van.id} coordinate={van.currentLocation} onPress={() => handleSelectVan(van)}>
                <View style={styles.vanMarkerBubble}><Icon name="directions-bus" size={20} color={van.color} /></View>
              </Marker>
            )
          ))}
        </MapView>
        <ScrollView style={styles.section}>
          {!selectedVan ? (
            <>
              <Text style={styles.sectionSubtitle}>Active Vans</Text>
              {localVans.map(van => (
                <TouchableOpacity key={van.id} style={styles.vanCard} onPress={() => handleSelectVan(van)} activeOpacity={0.8}>
                  <View style={[styles.vanColorDot, { backgroundColor:van.color, width:14, height:14, borderRadius:7, marginRight:14 }]} />
                  <View style={{ flex:1 }}>
                    <Text style={styles.vanName}>{van.name}</Text>
                    <Text style={styles.vanDriver}>{van.driver} • {van.status}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor:COLORS.success }]}><Text style={styles.statusBadgeText}>LIVE</Text></View>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.trackStatBox}><Text style={styles.trackStatLabel}>Current Stop</Text><Text style={styles.trackStatValue}>{selectedVan.stops[1] || 'N/A'}</Text></View>
                <View style={styles.trackStatBox}><Text style={styles.trackStatLabel}>ETA</Text><Text style={styles.trackStatValue}>12 min</Text></View>
              </View>
              <Text style={[styles.sectionSubtitle, { marginTop:12 }]}>Route Timeline</Text>
              {selectedVan.stops.map((stop,i) => (
                <View key={i} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: i===0 ? COLORS.success : i===1 ? COLORS.primary : COLORS.border }]} />
                    {i < selectedVan.stops.length-1 && <View style={styles.timelineLine} />}
                  </View>
                  <Text style={styles.timelineStop}>{stop}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // ==================== REQUESTS (SHARED) ====================
  const RequestCard = ({ req, onAccept, onReject }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{req.name}</Text>
      <Text style={styles.requestDetail}>📧 {req.email}</Text>
      <Text style={styles.requestDetail}>📞 {req.phone}</Text>
      {req.vehicle      && <Text style={styles.requestDetail}>🚐 {req.vehicle}</Text>}
      {req.license      && <Text style={styles.requestDetail}>🪪 {req.license}</Text>}
      {req.pickupPoint  && <Text style={styles.requestDetail}>📍 {req.pickupPoint}</Text>}
      <View style={styles.requestActions}>
        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject}>
          <Icon name="close" size={16} color={COLORS.white} />
          <Text style={styles.actionBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={onAccept}>
          <Icon name="check" size={16} color={COLORS.white} />
          <Text style={styles.actionBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const DriverRequestsSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Driver Requests" />
      {driverRequests.length > 0 ? driverRequests.map(req => (
        <RequestCard key={req._id} req={req}
          onAccept={async () => { try { await apiService.approveDriverRequest(req._id); await loadDriverRequests(); Alert.alert('Success','Request approved'); } catch { Alert.alert('Error','Failed to approve'); } }}
          onReject={async () => { try { await apiService.rejectDriverRequest(req._id); await loadDriverRequests(); Alert.alert('Success','Request rejected'); } catch { Alert.alert('Error','Failed to reject'); } }}
        />
      )) : (
        <View style={styles.emptyState}><Icon name="group-add" size={48} color={COLORS.border} /><Text style={styles.emptyText}>No pending driver requests</Text></View>
      )}
    </ScrollView>
  );

  const PassengerRequestsSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Passenger Requests" />
      {passengerRequests.length > 0 ? passengerRequests.map(req => (
        <RequestCard key={req._id} req={req}
          onAccept={async () => { try { await apiService.approvePassengerRequest(req._id); await loadPassengerRequests(); Alert.alert('Success','Request approved'); } catch { Alert.alert('Error','Failed to approve'); } }}
          onReject={async () => { try { await apiService.rejectPassengerRequest(req._id); await loadPassengerRequests(); Alert.alert('Success','Request rejected'); } catch { Alert.alert('Error','Failed to reject'); } }}
        />
      )) : (
        <View style={styles.emptyState}><Icon name="person-add" size={48} color={COLORS.border} /><Text style={styles.emptyText}>No pending passenger requests</Text></View>
      )}
    </ScrollView>
  );

  // ==================== PAYMENTS ====================
  const PaymentsSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Payments" />
      <View style={styles.emptyState}><Icon name="account-balance-wallet" size={48} color={COLORS.border} /><Text style={styles.emptyText}>No payment records yet</Text></View>
    </ScrollView>
  );

  // ==================== COMPLAINTS ====================
  const ComplaintsSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Complaints" />
      {complaints.length > 0 ? complaints.map(c => (
        <View key={c._id} style={styles.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: c.status==='resolved' ? COLORS.success : COLORS.warning }]}>
              <Text style={styles.statusBadgeText}>{c.status}</Text>
            </View>
          </View>
          <Text style={{ fontSize:13, color:COLORS.darkGray, marginTop:6 }}>{c.description}</Text>
          <Text style={styles.pollMeta}>By: {c.byName}</Text>
          <Text style={styles.pollMeta}>{new Date(c.createdAt).toLocaleDateString()}</Text>
        </View>
      )) : (
        <View style={styles.emptyState}><Icon name="sentiment-very-satisfied" size={48} color={COLORS.border} /><Text style={styles.emptyText}>No complaints — all good! 🎉</Text></View>
      )}
    </ScrollView>
  );

  // ==================== NOTIFICATIONS ====================
  const NotificationsSection = () => (
    <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
      <SectionHeader title="Notifications" />
      {notifications.length > 0 ? notifications.map(n => (
        <TouchableOpacity key={n._id} style={[styles.card, !n.read && styles.unreadCard]} onPress={async () => { try { await apiService.markNotificationAsRead(n._id); await loadNotifications(); } catch {} }} activeOpacity={0.8}>
          <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
            <View style={[styles.notifIconWrap, { backgroundColor: COLORS.primary+'22' }]}>
              <Icon name="notifications" size={22} color={COLORS.primaryDark} />
            </View>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                {!n.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={{ fontSize:13, color:COLORS.gray, marginTop:4 }}>{n.message}</Text>
              <Text style={styles.pollMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )) : (
        <View style={styles.emptyState}><Icon name="notifications-none" size={48} color={COLORS.border} /><Text style={styles.emptyText}>All caught up!</Text></View>
      )}
    </ScrollView>
  );

  // ==================== RENDER ====================
  const renderSection = () => ({
    overview:     <OverviewSection />,
    profile:      <ProfileSection />,
    poll:         <PollSection />,
    routes:       <RoutesSection />,
    assign:       <AssignSection />,
    tracking:     <TrackingSection />,
    'driver-req': <DriverRequestsSection />,
    'pass-req':   <PassengerRequestsSection />,
    payments:     <PaymentsSection />,
    complaints:   <ComplaintsSection />,
    notifications:<NotificationsSection />,
  })[activeSection] || <OverviewSection />;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:COLORS.white }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setSidebarVisible(true)}>
          <Icon name="menu" size={24} color={COLORS.white} />
          {(driverRequests.length + passengerRequests.length + unreadCount) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{driverRequests.length + passengerRequests.length + unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transporter Dashboard</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setActiveSection('notifications')}>
          <Icon name="notifications" size={24} color={COLORS.white} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {sidebarVisible && <Sidebar />}
      {sidebarVisible && (
        <TouchableOpacity style={styles.overlay} onPress={() => setSidebarVisible(false)} activeOpacity={1} />
      )}

      {renderSection()}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  section:           { flex:1, padding:16, backgroundColor:COLORS.sectionBg },
  centerContainer:   { flex:1, justifyContent:'center', alignItems:'center' },
  sectionHeaderRow:  { marginBottom:16 },
  sectionTitle:      { fontSize:22, fontWeight:'800', color:COLORS.black },
  sectionSubtitle:   { fontSize:16, fontWeight:'700', color:COLORS.black, marginTop:16, marginBottom:10 },
  updateText:        { fontSize:12, color:COLORS.gray, marginBottom:16, marginTop:-8 },
  header:            { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:14, paddingHorizontal:16, backgroundColor:COLORS.primary, elevation:6 },
  headerTitle:       { fontSize:18, fontWeight:'800', color:COLORS.white },
  menuBtn:           { width:38, height:38, borderRadius:10, backgroundColor:'rgba(255,255,255,0.2)', justifyContent:'center', alignItems:'center' },
  badge:             { position:'absolute', top:-2, right:-2, backgroundColor:COLORS.danger, borderRadius:8, minWidth:16, height:16, justifyContent:'center', alignItems:'center', paddingHorizontal:3 },
  badgeText:         { color:COLORS.white, fontSize:10, fontWeight:'800' },
  sidebar:           { position:'absolute', top:0, left:0, bottom:0, width:280, backgroundColor:COLORS.white, elevation:24, zIndex:1000 },
  sidebarHeader:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, paddingTop:48, backgroundColor:COLORS.primary },
  sidebarName:       { fontSize:16, fontWeight:'700', color:COLORS.white },
  sidebarCompany:    { fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 },
  sidebarClose:      { padding:4 },
  menuItem:          { flexDirection:'row', alignItems:'center', paddingVertical:13, paddingHorizontal:16, marginHorizontal:10, marginVertical:2, borderRadius:10 },
  menuItemActive:    { backgroundColor:'#F0F9D9' },
  menuItemText:      { fontSize:14, color:COLORS.gray, marginLeft:12, fontWeight:'600', flex:1 },
  menuItemTextActive:{ color:COLORS.primaryDark, fontWeight:'700' },
  menuBadge:         { backgroundColor:COLORS.danger, borderRadius:10, minWidth:18, height:18, justifyContent:'center', alignItems:'center', paddingHorizontal:4 },
  menuBadgeText:     { color:COLORS.white, fontSize:10, fontWeight:'800' },
  menuDivider:       { height:1, backgroundColor:COLORS.border, marginVertical:10, marginHorizontal:16 },
  logoutMenuItem:    { flexDirection:'row', alignItems:'center', paddingVertical:13, paddingHorizontal:16, marginHorizontal:10, borderRadius:10, backgroundColor:'#ffebee', marginBottom:16 },
  logoutMenuText:    { fontSize:14, color:COLORS.danger, marginLeft:12, fontWeight:'700' },
  overlay:           { position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.45)', zIndex:999 },
  card:              { backgroundColor:COLORS.cardBg, borderRadius:14, padding:16, marginBottom:12, elevation:2, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4 },
  cardTitle:         { fontSize:16, fontWeight:'700', color:COLORS.black, marginBottom:4 },
  cardSectionLabel:  { fontSize:12, fontWeight:'700', color:COLORS.primary, textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  statsGrid:         { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginBottom:8 },
  statCard:          { width:'48%', backgroundColor:COLORS.cardBg, borderRadius:14, padding:16, marginBottom:12, alignItems:'center', elevation:2, borderTopWidth:3, borderTopColor:COLORS.primary },
  statIconWrap:      { width:50, height:50, borderRadius:25, justifyContent:'center', alignItems:'center', marginBottom:8 },
  statValue:         { fontSize:26, fontWeight:'800', color:COLORS.black, marginTop:4 },
  statLabel:         { fontSize:12, color:COLORS.gray, marginTop:4, textAlign:'center', fontWeight:'600' },
  quickActionsGrid:  { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', marginBottom:8 },
  quickActionCard:   { width:'31%', backgroundColor:COLORS.cardBg, borderRadius:14, padding:14, marginBottom:10, alignItems:'center', elevation:2 },
  quickActionIcon:   { width:46, height:46, borderRadius:23, backgroundColor:'#F0F9D9', justifyContent:'center', alignItems:'center', marginBottom:8 },
  quickActionTitle:  { fontSize:12, color:COLORS.black, fontWeight:'600', textAlign:'center' },
  notifBanner:       { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.primaryDark, borderRadius:12, padding:14, gap:10, marginTop:8, marginBottom:8 },
  notifBannerText:   { flex:1, color:COLORS.white, fontSize:14, fontWeight:'600' },
  statusPill:        { paddingHorizontal:10, paddingVertical:3, borderRadius:20, marginTop:6, alignSelf:'center' },
  profileRow:        { flexDirection:'row', marginBottom:12, paddingBottom:12, borderBottomWidth:1, borderBottomColor:'#f0f0f0' },
  profileLabel:      { fontSize:13, fontWeight:'600', color:COLORS.gray, width:110 },
  profileValue:      { fontSize:13, color:COLORS.black, flex:1 },
  input:             { borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:13, marginBottom:8, fontSize:14, backgroundColor:COLORS.white, color:COLORS.black },
  inputLabel:        { fontSize:13, fontWeight:'600', color:COLORS.darkGray, marginBottom:6, marginTop:4 },
  stepLabel:         { fontSize:13, fontWeight:'700', color:COLORS.primaryDark, textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 },
  primaryBtn:        { backgroundColor:COLORS.primary, borderRadius:11, padding:15, alignItems:'center', marginTop:8, elevation:2, flexDirection:'row', justifyContent:'center' },
  primaryBtnText:    { color:COLORS.white, fontSize:15, fontWeight:'700' },
  primaryBtnDisabled:{ backgroundColor:COLORS.gray, opacity:0.6 },
  secondaryBtn:      { backgroundColor:COLORS.gray, marginTop:8 },
  outlineBtn:        { borderWidth:1.5, borderColor:COLORS.primary, borderRadius:10, padding:10, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6 },
  outlineBtnText:    { color:COLORS.primaryDark, fontSize:14, fontWeight:'700' },
  deleteBtn:         { width:36, height:36, borderRadius:10, backgroundColor:'#ffebee', justifyContent:'center', alignItems:'center' },
  timeSlotOption:    { flexDirection:'row', alignItems:'center', padding:13, borderRadius:10, marginBottom:8, backgroundColor:'#f8f9fa', borderWidth:1.5, borderColor:COLORS.border },
  timeSlotSelected:  { backgroundColor:'#F0F9D9', borderColor:COLORS.primary },
  timeSlotLabel:     { fontSize:14, color:COLORS.black, flex:1 },
  checkbox:          { width:22, height:22, borderRadius:6, borderWidth:2, borderColor:COLORS.gray, justifyContent:'center', alignItems:'center', marginRight:12 },
  checkboxSelected:  { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  tabContainer:      { flexDirection:'row', backgroundColor:'#eeeeee', borderRadius:10, marginBottom:14, padding:3 },
  tab:               { flex:1, paddingVertical:10, alignItems:'center', borderRadius:8 },
  tabActive:         { backgroundColor:COLORS.white, elevation:2 },
  tabText:           { fontSize:13, color:COLORS.gray, fontWeight:'600' },
  tabTextActive:     { color:COLORS.primary, fontWeight:'800' },
  pollMeta:          { fontSize:12, color:COLORS.gray, marginTop:2 },
  responseStatsRow:  { flexDirection:'row', gap:8, marginTop:10 },
  responseStatBox:   { flex:1, borderRadius:10, padding:10, alignItems:'center' },
  responseStatNum:   { fontSize:22, fontWeight:'800' },
  responseStatLabel: { fontSize:11, color:COLORS.gray, fontWeight:'600', marginTop:2 },
  modalHeader:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', padding:16, borderBottomWidth:1, borderBottomColor:COLORS.border },
  modalTitle:        { fontSize:17, fontWeight:'700', color:COLORS.black },
  modalContent:      { flex:1, padding:16 },
  responseCard:      { backgroundColor:'#f8f9fa', borderRadius:10, padding:14, marginBottom:10 },
  responseName:      { fontSize:15, fontWeight:'700', color:COLORS.black },
  responseDetail:    { fontSize:13, color:COLORS.darkGray, marginBottom:4 },
  responseDate:      { fontSize:11, color:COLORS.gray, marginTop:6 },
  statusBadge:       { paddingHorizontal:10, paddingVertical:3, borderRadius:20 },
  statusBadgeText:   { color:COLORS.white, fontSize:11, fontWeight:'700' },
  infoRow:           { flexDirection:'row', alignItems:'center', marginBottom:6 },
  infoText:          { fontSize:13, color:COLORS.gray, marginLeft:8 },
  aiBtn:             { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:COLORS.black, borderRadius:12, padding:14, marginBottom:14, elevation:4, gap:8 },
  aiBtnText:         { color:COLORS.primary, fontSize:14, fontWeight:'700' },
  suggestionCard:    { backgroundColor:'#f8f9fa', borderRadius:12, padding:14, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  progressBg:        { height:6, backgroundColor:'#e0e0e0', borderRadius:3, marginTop:10, overflow:'hidden' },
  progressFill:      { height:'100%', borderRadius:3 },
  pollOption:        { backgroundColor:'#f8f9fa', borderRadius:12, padding:14, marginBottom:10, flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:COLORS.border },
  pollOptionActive:  { backgroundColor:'#F0F9D9', borderColor:COLORS.primary },
  pollOptionTitle:   { fontSize:15, fontWeight:'700', color:COLORS.black, marginBottom:3 },
  pollOptionInfo:    { fontSize:12, color:COLORS.gray, marginTop:1 },
  driverAvatar:      { width:38, height:38, borderRadius:19, justifyContent:'center', alignItems:'center' },
  driverOption:      { flexDirection:'row', alignItems:'center', padding:13, borderRadius:12, marginBottom:8, backgroundColor:'#f8f9fa', borderWidth:1.5, borderColor:COLORS.border },
  driverOptionSelected: { backgroundColor:'#F0F9D9', borderColor:COLORS.primary },
  driverName:        { fontSize:14, fontWeight:'700', color:COLORS.black },
  driverDetail:      { fontSize:12, color:COLORS.gray, marginTop:2 },
  trackingHeader:    { flexDirection:'row', alignItems:'center', padding:12, backgroundColor:COLORS.white, elevation:3, gap:12 },
  backBtn:           { width:36, height:36, borderRadius:18, backgroundColor:'#f0f0f0', justifyContent:'center', alignItems:'center' },
  trackingHeaderTitle: { fontSize:16, fontWeight:'700', color:COLORS.black, flex:1 },
  mapWrapper:        { width:'100%', elevation:4 },
  vanMarkerBubble:   { backgroundColor:COLORS.white, borderRadius:20, padding:6, borderWidth:2, elevation:5 },
  vanCard:           { flexDirection:'row', alignItems:'center', backgroundColor:COLORS.cardBg, padding:14, borderRadius:14, marginBottom:10, elevation:2 },
  vanName:           { fontSize:15, fontWeight:'700', color:COLORS.black },
  vanDriver:         { fontSize:12, color:COLORS.gray, marginTop:2 },
  statsRow:          { flexDirection:'row', gap:10 },
  trackStatBox:      { flex:1, backgroundColor:COLORS.cardBg, borderRadius:12, padding:14, alignItems:'center', elevation:2 },
  trackStatLabel:    { fontSize:12, color:COLORS.gray, fontWeight:'600' },
  trackStatValue:    { fontSize:20, fontWeight:'800', color:COLORS.black, marginTop:4 },
  timelineRow:       { flexDirection:'row', alignItems:'flex-start', marginBottom:4 },
  timelineLeft:      { width:24, alignItems:'center' },
  timelineDot:       { width:12, height:12, borderRadius:6, marginTop:4 },
  timelineLine:      { width:2, flex:1, backgroundColor:COLORS.border, marginTop:2 },
  timelineStop:      { flex:1, fontSize:14, color:COLORS.black, paddingLeft:10, paddingBottom:16, paddingTop:2 },
  requestDetail:     { fontSize:13, color:COLORS.gray, marginBottom:4 },
  requestActions:    { flexDirection:'row', justifyContent:'flex-end', marginTop:12, gap:8 },
  actionBtn:         { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:9, borderRadius:9, gap:6 },
  acceptBtn:         { backgroundColor:COLORS.success },
  rejectBtn:         { backgroundColor:COLORS.danger },
  actionBtnText:     { color:COLORS.white, fontSize:13, fontWeight:'700' },
  unreadCard:        { borderLeftWidth:3, borderLeftColor:COLORS.primary, backgroundColor:'#FAFFF0' },
  notifIconWrap:     { width:42, height:42, borderRadius:21, justifyContent:'center', alignItems:'center' },
  unreadDot:         { width:10, height:10, borderRadius:5, backgroundColor:COLORS.primary },
  stopNumber:        { width:26, height:26, borderRadius:13, justifyContent:'center', alignItems:'center' },
  emptyState:        { alignItems:'center', justifyContent:'center', padding:36, backgroundColor:COLORS.cardBg, borderRadius:14, marginTop:10 },
  emptyText:         { fontSize:15, color:COLORS.gray, marginTop:12, fontWeight:'600' },
  emptySubtext:      { fontSize:12, color:COLORS.gray, marginTop:6, textAlign:'center' },
  loadingOverlay:    { position:'absolute', top:0, left:0, right:0, bottom:0, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.4)', zIndex:9999 },
  loadingBox:        { backgroundColor:COLORS.white, borderRadius:16, padding:28, alignItems:'center', elevation:10 },
  loadingText:       { fontSize:14, color:COLORS.black, marginTop:12, fontWeight:'600' },
  vanColorDot:       {},
});

export default TransporterDashboard; 