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
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../styles/NotificationScreenStyle';

const API_BASE_URL = 'http://192.168.10.12:3000/api';

const categories = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'payment', label: 'Payments', icon: 'card' },
  { id: 'trip', label: 'Trips', icon: 'car' },
  { id: 'driver', label: 'Drivers', icon: 'person' },
  { id: 'route', label: 'Routes', icon: 'map' },
  { id: 'poll', label: 'Polls', icon: 'help-circle' },
  { id: 'system', label: 'System', icon: 'settings' },
];

export default function NotificationsScreen({ navigation, route }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [counts, setCounts] = useState({ total: 0, unread: 0 });
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  /* 🔐 Load auth data */
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        
        console.log('📌 NotificationsScreen - Token loaded:', storedToken ? 'Yes' : 'No');
        console.log('📌 NotificationsScreen - UserId:', storedUserId);
        
        if (!storedToken || !storedUserId) {
          RNAlert.alert(
            'Authentication Required',
            'Please login again to view notifications',
            [{ text: 'OK', onPress: () => navigation.navigate('PassengerLoginScreen') }]
          );
          setLoading(false);
          return;
        }
        
        setToken(storedToken);
        setUserId(storedUserId);
      } catch (error) {
        console.error('❌ Error loading auth data:', error);
        setLoading(false);
      }
    };
    
    loadAuthData();
  }, []);

  /* 🎞️ Animations */
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

  /* 📡 Fetch notifications */
  const fetchNotifications = async (category = selectedCategory) => {
    try {
      if (!token || !userId) {
        console.log('⚠️ No token or userId available for fetching notifications');
        return;
      }

      console.log(`📡 Fetching notifications for category: ${category}`);
      console.log(`📡 Using token: ${token.substring(0, 20)}...`);
      console.log(`📡 Using userId: ${userId}`);
      
      let url = `${API_BASE_URL}/notifications`;
      if (category !== 'all') {
        url += `?category=${category}`;
      }

      console.log('🔗 API URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        if (response.status === 401) {
          RNAlert.alert(
            'Session Expired',
            'Please login again',
            [{ 
              text: 'OK', 
              onPress: async () => {
                await AsyncStorage.multiRemove(['authToken', 'userId', 'userData']);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'PassengerLoginScreen' }],
                });
              }
            }]
          );
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Notifications API Response:', JSON.stringify(data, null, 2));

      if (data.success) {
        // Handle both array and object responses
        let notificationsList = [];
        
        if (Array.isArray(data.notifications)) {
          notificationsList = data.notifications;
        } else if (Array.isArray(data.data)) {
          notificationsList = data.data;
        } else if (data.notifications && typeof data.notifications === 'object') {
          notificationsList = [data.notifications];
        }
        
        console.log(`📝 Total notifications received: ${notificationsList.length}`);
        
        // Filter notifications for current user
        const userNotifications = notificationsList.filter(n => {
          const notifUserId = n.userId?._id || n.userId;
          const matches = notifUserId?.toString() === userId.toString();
          console.log(`  📧 Notification ${n._id}: userId=${notifUserId}, matches=${matches}, type=${n.type || n.category}`);
          return matches;
        });
        
        console.log(`📝 User notifications after filter: ${userNotifications.length}`);
        
        // Filter by category if needed
        let filteredNotifications = userNotifications;
        if (category !== 'all') {
          filteredNotifications = userNotifications.filter(n => 
            (n.type || n.category) === category
          );
          console.log(`📝 Notifications after category filter (${category}): ${filteredNotifications.length}`);
        }
        
        setNotifications(filteredNotifications);
        
        const totalCount = userNotifications.length;
        const unreadCount = userNotifications.filter(n => !n.read).length;
        
        setCounts({ 
          total: totalCount, 
          unread: unreadCount 
        });
        
        console.log(`📊 Stats - Total: ${totalCount}, Unread: ${unreadCount}`);
      } else {
        console.log('⚠️ API returned success: false -', data.message);
        setNotifications([]);
        setCounts({ total: 0, unread: 0 });
      }
    } catch (error) {
      console.error('❌ Fetch notifications error:', error.message);
      RNAlert.alert(
        'Error',
        'Failed to load notifications. Please check your internet connection.',
        [{ text: 'Retry', onPress: () => fetchNotifications(category) }]
      );
      setNotifications([]);
      setCounts({ total: 0, unread: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* 🔄 Initial fetch when token is available */
  useEffect(() => {
    if (token && userId) {
      console.log('🚀 Token and userId available, fetching notifications...');
      fetchNotifications();
    }
  }, [token, userId]);

  /* 🔄 Fetch when category changes */
  useEffect(() => {
    if (token && userId && !loading) {
      console.log('🔄 Category changed to:', selectedCategory);
      fetchNotifications(selectedCategory);
    }
  }, [selectedCategory]);

  /* 🔄 Handle navigation params (when coming from dashboard) */
  useEffect(() => {
    if (route.params?.notifications) {
      console.log('📬 Received notifications from navigation params:', route.params.notifications.length);
      setNotifications(route.params.notifications);
      
      const unread = route.params.notifications.filter(n => !n.read).length;
      setCounts({ 
        total: route.params.notifications.length, 
        unread: unread 
      });
      setLoading(false);
    }
  }, [route.params?.notifications]);

  /* 🔄 Refresh on focus */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Screen focused, refreshing notifications...');
      if (token && userId) {
        fetchNotifications();
      }
    });

    return unsubscribe;
  }, [navigation, token, userId]);

  const onRefresh = () => {
    console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    fetchNotifications();
  };

  /* ✅ Mark single notification */
  const markAsRead = async (id) => {
    try {
      console.log(`✅ Marking notification ${id} as read`);
      
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Notification marked as read successfully');
        
        // Update local state immediately
        setNotifications(prev => prev.map(n => 
          n._id === id ? { ...n, read: true } : n
        ));
        setCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1)
        }));
        
        // Call the callback if provided from navigation params
        if (route.params?.onMarkAsRead) {
          route.params.onMarkAsRead(id);
        }
        
        // Refresh to sync with backend
        setTimeout(() => fetchNotifications(), 500);
      } else {
        console.error('❌ Failed to mark as read:', response.status);
      }
    } catch (error) {
      console.error('❌ Mark as read error:', error);
    }
  };

  /* ✅ Mark all as read */
  const markAllAsRead = async () => {
    try {
      console.log('✅ Marking all notifications as read');
      
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ All notifications marked as read successfully');
        
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setCounts(prev => ({ ...prev, unread: 0 }));
        
        // Call the callback if provided
        if (route.params?.onMarkAllAsRead) {
          route.params.onMarkAllAsRead();
        }
        
        RNAlert.alert('Success', 'All notifications marked as read');
        
        // Refresh
        setTimeout(() => fetchNotifications(), 500);
      } else {
        console.error('❌ Failed to mark all as read:', response.status);
        RNAlert.alert('Error', 'Failed to mark all as read');
      }
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      RNAlert.alert('Error', 'Failed to mark all as read');
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'payment': return ['#FFA726', '#FF9800'];
      case 'trip': return ['#A1D826', '#8BC220'];
      case 'driver': return ['#5AC8FA', '#4AB9F1'];
      case 'route': return ['#2196F3', '#1976D2'];
      case 'poll': return ['#9C27B0', '#7B1FA2'];
      case 'system': return ['#FF6B6B', '#EE5A52'];
      default: return ['#A1D826', '#8BC220'];
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment': return 'card';
      case 'trip': return 'car';
      case 'driver': return 'person';
      case 'route': return 'map';
      case 'poll': return 'help-circle';
      case 'system': return 'settings';
      default: return 'notifications';
    }
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const renderNotification = ({ item, index }) => (
    <Animated.View
      style={[
        styles.notificationCard,
        { 
          opacity: fadeAnim, 
          transform: [{ translateY: slideAnim }],
          backgroundColor: item.read ? '#fff' : '#f8fff0'
        }
      ]}
    >
      <View style={styles.notificationHeader}>
        <LinearGradient
          colors={getNotificationColor(item.type || item.category)}
          style={styles.notificationIcon}
        >
          <Icon 
            name={item.icon || getNotificationIcon(item.type || item.category)} 
            size={18} 
            color="#fff" 
          />
        </LinearGradient>

        <View style={styles.notificationTitleContainer}>
          <Text style={styles.notificationTitle}>
            {item.title || 'Notification'}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt || item.timestamp || item.time)}
          </Text>
        </View>

        {!item.read && (
          <TouchableOpacity onPress={() => markAsRead(item._id)}>
            <Icon name="checkmark-circle" size={22} color="#A1D826" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.notificationMessage}>
        {item.message || item.body || item.text || 'No message'}
      </Text>
      
      {!item.read && <View style={styles.unreadIndicator} />}
    </Animated.View>
  );

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
      contentContainerStyle={styles.categoryContent}
    >
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const categoryCount = category.id === 'all' 
          ? counts.total 
          : notifications.filter(n => (n.type || n.category) === category.id).length;
        
        return (
          <TouchableOpacity
            key={category.id}
            onPress={() => setSelectedCategory(category.id)}
            style={[
              styles.categoryButton,
              isSelected && styles.categoryButtonActive
            ]}
          >
            <Icon
              name={category.icon}
              size={18}
              color={isSelected ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.categoryLabel,
                isSelected && styles.categoryLabelActive
              ]}
            >
              {category.label}
              {categoryCount > 0 && ` (${categoryCount})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A1D826" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={26} color="#333" />
          </TouchableOpacity>
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {counts.unread > 0 
                ? `${counts.unread} unread notification${counts.unread > 1 ? 's' : ''}`
                : 'All caught up!'}
            </Text>
          </View>
        </View>
        
        {counts.unread > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item, index) => item._id || index.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A1D826']}
            tintColor="#A1D826"
          />
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={80} color="#ddd" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'all' 
                ? "You're all caught up!"
                : `No ${selectedCategory} notifications`}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Mark All Read FAB - only show if unread > 0 and not already showing in header */}
      {counts.unread > 0 && notifications.length > 5 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={markAllAsRead}
          activeOpacity={0.8}
        >
          <LinearGradient 
            colors={['#A1D826', '#8BC220']} 
            style={styles.fabGradient}
          >
            <Icon name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.fabText}>Mark All Read</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}