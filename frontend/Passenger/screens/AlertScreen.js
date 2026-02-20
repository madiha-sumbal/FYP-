import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  FlatList,
  RefreshControl,
  Alert as RNAlert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../styles/NotificationScreenStyle';

const API_BASE_URL = 'http://192.168.18.49:3000/api';

const categories = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'poll', label: 'Polls', icon: 'bar-chart' },
  { id: 'route', label: 'Routes', icon: 'map' },
  { id: 'confirmation', label: 'Confirmations', icon: 'checkmark-circle' },
  { id: 'alert', label: 'Alerts', icon: 'warning' },
];

export default function AlertScreen({ navigation, route }) {
  const { notifications: initialNotifications, onMarkAsRead, onMarkAllAsRead } = route.params || {};

  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [loading, setLoading] = useState(!initialNotifications);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [counts, setCounts] = useState({ total: 0, unread: 0 });
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  // Poll Modal States
  const [showPollModal, setShowPollModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [travelResponse, setTravelResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUserId = await AsyncStorage.getItem('userId');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      console.log("🔔 AlertScreen - Loading auth data");
      console.log("  - Token:", storedToken ? "Present" : "Missing");
      console.log("  - User ID:", storedUserId);
      
      setToken(storedToken);
      setUserId(storedUserId);
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setPickupPoint(userData.pickupPoint || '');
      }
    } catch (error) {
      console.error('❌ Error loading auth data:', error);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (token && userId) {
      console.log("🔔 Token and userId available, fetching notifications");
      fetchNotifications();
    }
  }, [token, userId]);

  useEffect(() => {
    if (token && userId && !loading) {
      console.log("🔔 Category changed to:", selectedCategory);
      fetchNotifications(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchNotifications = async (category = selectedCategory) => {
    try {
      if (!token || !userId) {
        console.log("🔔 Missing token or userId, skipping fetch");
        return;
      }

      let url = `${API_BASE_URL}/notifications`;
      if (category !== 'all') url += `?type=${category}`;

      console.log('🔔 Fetching notifications from:', url);
      console.log('🔔 Using userId:', userId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        RNAlert.alert('Session Expired', 'Please login again');
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log('🔔 Notifications API response:', data);

      if (data.success) {
        const allNotifs = data.notifications || data.data || [];
        console.log('🔔 Total notifications from API:', allNotifs.length);
        
        // Filter for current user
        const userNotifs = allNotifs.filter(n => {
          const notifUserId = n.userId?._id || n.userId;
          const matches = notifUserId?.toString() === userId.toString();
          return matches;
        });
        
        console.log('🔔 Notifications for user:', userNotifs.length);
        
        setNotifications(userNotifs);
        
        const unread = userNotifs.filter(n => !n.read).length;
        setCounts({ 
          total: userNotifs.length, 
          unread: unread
        });

        console.log('🔔 Unread count:', unread);
      } else {
        console.log("🔔 API returned unsuccessful response");
      }
    } catch (error) {
      console.error('❌ Fetch notifications error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      if (!token) return;
      
      console.log('✅ Marking notification as read:', id);
      
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Update local state
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setCounts(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      
      if (onMarkAsRead) onMarkAsRead(id);
    } catch (error) {
      console.error('❌ Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!token) return;
      
      console.log('✅ Marking all notifications as read');
      
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setCounts(prev => ({ ...prev, unread: 0 }));
      RNAlert.alert('Success', 'All notifications marked as read');
      
      if (onMarkAllAsRead) onMarkAllAsRead();
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
    }
  };

  const handleNotificationPress = async (notification) => {
    console.log('📱 Notification pressed:', notification);

    // Mark as read
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Handle poll notifications
    if (notification.type === 'poll' && notification.pollId) {
      await openPollModal(notification.pollId);
    }
    
    // Handle route notifications
    if (notification.type === 'route') {
      RNAlert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
  };

  const openPollModal = async (pollId) => {
    try {
      console.log('📊 Fetching poll details:', pollId);
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/polls/${pollId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch poll');
      }

      const data = await response.json();
      console.log('📊 Poll data:', data);

      if (data.success && data.poll) {
        const poll = data.poll;

        // Check if user has already responded
        const userResponse = poll.responses?.find(r => 
          r.passengerId === userId || 
          r.passengerId?._id === userId ||
          r.passengerId?.toString() === userId
        );

        if (userResponse) {
          RNAlert.alert(
            'Already Responded',
            `You have already responded to this poll with: ${userResponse.response === 'yes' ? 'Yes' : 'No'}`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Show poll modal
        setSelectedPoll(poll);
        setShowPollModal(true);
      }
    } catch (error) {
      console.error('❌ Error fetching poll:', error);
      RNAlert.alert('Error', 'Failed to load poll details');
    } finally {
      setLoading(false);
    }
  };

  const submitPollResponse = async () => {
    if (!selectedPoll) return;

    // Validation
    if (travelResponse === 'yes' && (!selectedTimeSlot || !pickupPoint)) {
      RNAlert.alert('Missing Information', 'Please select a time slot and confirm your pickup point');
      return;
    }

    if (!travelResponse) {
      RNAlert.alert('Please Choose', 'Please select whether you will travel or not');
      return;
    }

    try {
      setSubmitting(true);
      
      console.log('📤 Submitting poll response:', {
        pollId: selectedPoll._id,
        response: travelResponse,
        selectedTimeSlot,
        pickupPoint
      });

      const response = await fetch(`${API_BASE_URL}/polls/${selectedPoll._id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: travelResponse,
          selectedTimeSlot: travelResponse === 'yes' ? selectedTimeSlot : null,
          pickupPoint: travelResponse === 'yes' ? pickupPoint : null
        })
      });

      const data = await response.json();
      console.log('✅ Poll response result:', data);

      if (data.success) {
        RNAlert.alert(
          'Response Submitted',
          travelResponse === 'yes' 
            ? `Thank you! You've confirmed travel for tomorrow at ${selectedTimeSlot}.`
            : "You've confirmed that you won't be traveling tomorrow.",
          [{ 
            text: 'OK', 
            onPress: () => {
              setShowPollModal(false);
              setSelectedPoll(null);
              setTravelResponse('');
              setSelectedTimeSlot('');
              fetchNotifications(); // Refresh notifications
            }
          }]
        );
      } else {
        RNAlert.alert('Error', data.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('❌ Error submitting poll response:', error);
      RNAlert.alert('Error', 'Failed to submit your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'poll': return ['#2196F3', '#1976D2'];
      case 'route': return ['#A1D826', '#8BC220'];
      case 'confirmation': return ['#4CAF50', '#388E3C'];
      case 'alert': return ['#FF9800', '#F57C00'];
      default: return ['#A1D826', '#8BC220'];
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'poll': return 'bar-chart';
      case 'route': return 'map';
      case 'confirmation': return 'checkmark-circle';
      case 'alert': return 'warning';
      default: return 'notifications';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.notificationCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          !item.read && styles.unreadNotificationCard
        ]}
      >
        <View style={styles.notificationHeader}>
          <LinearGradient
            colors={getNotificationColor(item.type)}
            style={styles.notificationIcon}
          >
            <Icon name={getNotificationIcon(item.type)} size={18} color="#fff" />
          </LinearGradient>
          <View style={styles.notificationTitleContainer}>
            <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
          </View>
          {!item.read && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                markAsRead(item._id);
              }}
            >
              <Icon name="checkmark-circle" size={22} color="#A1D826" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        {item.type === 'poll' && item.actionRequired && (
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Tap to respond →</Text>
          </View>
        )}
        {!item.read && <View style={styles.unreadIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A1D826" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#A1D826', '#8BC220']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {counts.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{counts.unread}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllAsRead}>
          <Icon name="checkmark-done" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryTab,
                selectedCategory === item.id && styles.categoryTabActive
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Icon 
                name={item.icon} 
                size={18} 
                color={selectedCategory === item.id ? '#fff' : '#7f8c8d'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === item.id && styles.categoryTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
            colors={['#A1D826']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={60} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateText}>
              {selectedCategory === 'all' 
                ? "You're all caught up!" 
                : `No ${selectedCategory} notifications`}
            </Text>
          </View>
        }
      />

      {/* Mark All Read FAB */}
      {counts.unread > 0 && (
        <TouchableOpacity style={styles.fab} onPress={markAllAsRead}>
          <LinearGradient colors={['#A1D826', '#8BC220']} style={styles.fabGradient}>
            <Icon name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.fabText}>Mark All Read</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Poll Response Modal */}
      <Modal
        visible={showPollModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {selectedPoll?.title || 'Poll Response'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPollModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.pollQuestion}>
                {selectedPoll?.question || 'Will you travel tomorrow?'}
              </Text>

              <Text style={styles.pollClosingTime}>
                Closes at: {selectedPoll?.closesAt}
              </Text>

              {/* Yes/No Buttons */}
              <View style={styles.responseButtons}>
                <TouchableOpacity
                  style={[
                    styles.responseButton,
                    styles.yesButton,
                    travelResponse === 'yes' && styles.selectedButton
                  ]}
                  onPress={() => setTravelResponse('yes')}
                >
                  <Icon 
                    name="checkmark-circle" 
                    size={24} 
                    color={travelResponse === 'yes' ? '#fff' : '#4CAF50'} 
                  />
                  <Text style={[
                    styles.responseButtonText,
                    travelResponse === 'yes' && styles.selectedButtonText
                  ]}>
                    Yes, I'll Travel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.responseButton,
                    styles.noButton,
                    travelResponse === 'no' && styles.selectedButton
                  ]}
                  onPress={() => {
                    setTravelResponse('no');
                    // Auto-submit for 'No' response
                    setTimeout(() => submitPollResponse(), 100);
                  }}
                >
                  <Icon 
                    name="close-circle" 
                    size={24} 
                    color={travelResponse === 'no' ? '#fff' : '#F44336'} 
                  />
                  <Text style={[
                    styles.responseButtonText,
                    travelResponse === 'no' && styles.selectedButtonText
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Time Slot Selection (if Yes) */}
              {travelResponse === 'yes' && (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionLabel}>Select Time Slot:</Text>
                  {selectedPoll?.timeSlots?.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedTimeSlot === slot && styles.selectedTimeSlot
                      ]}
                      onPress={() => setSelectedTimeSlot(slot)}
                    >
                      <Icon 
                        name={selectedTimeSlot === slot ? 'radio-button-on' : 'radio-button-off'} 
                        size={20} 
                        color={selectedTimeSlot === slot ? '#2196F3' : '#999'} 
                      />
                      <Text style={[
                        styles.timeSlotText,
                        selectedTimeSlot === slot && styles.selectedTimeSlotText
                      ]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <Text style={styles.sectionLabel}>Pickup Point:</Text>
                  <TextInput
                    style={styles.pickupInput}
                    placeholder="Enter your pickup point"
                    placeholderTextColor="#999"
                    value={pickupPoint}
                    onChangeText={setPickupPoint}
                  />

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!selectedTimeSlot || !pickupPoint || submitting) && styles.disabledButton
                    ]}
                    onPress={submitPollResponse}
                    disabled={!selectedTimeSlot || !pickupPoint || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="checkmark-done" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Confirm Response</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}