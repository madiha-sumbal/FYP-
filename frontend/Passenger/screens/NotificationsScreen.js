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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../styles/NotificationScreenStyle';

const API_BASE_URL = 'http://192.168.10.8:3000/api';

const categories = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'payment', label: 'Payments', icon: 'card' },
  { id: 'trip', label: 'Trips', icon: 'car' },
  { id: 'driver', label: 'Drivers', icon: 'person' },
  { id: 'system', label: 'System', icon: 'settings' },
];

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [counts, setCounts] = useState({ total: 0, unread: 0 });
  const [token, setToken] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  /* 🔐 Load token once */
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
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
      if (!token) return;

      let url = `${API_BASE_URL}/notifications`;
      if (category !== 'all') {
        url += `?category=${category}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setCounts(data.counts || { total: 0, unread: 0 });
      }
    } catch (error) {
      console.error('❌ Fetch notifications error:', error);
      RNAlert.alert('Error', 'Failed to load notifications');
      setNotifications([]);
      setCounts({ total: 0, unread: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token]);

  useEffect(() => {
    if (!loading) fetchNotifications(selectedCategory);
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  /* ✅ Mark single notification */
  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      fetchNotifications();
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  /* ✅ Mark all as read */
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      fetchNotifications();
      RNAlert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'payment': return ['#FFA726', '#FF9800'];
      case 'trip': return ['#A1D826', '#8BC220'];
      case 'driver': return ['#5AC8FA', '#4AB9F1'];
      case 'system': return ['#FF6B6B', '#EE5A52'];
      default: return ['#A1D826', '#8BC220'];
    }
  };

  const renderNotification = ({ item }) => (
    <Animated.View
      style={[
        styles.notificationCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.notificationHeader}>
        <LinearGradient
          colors={getNotificationColor(item.type)}
          style={styles.notificationIcon}
        >
          <Icon name={item.icon || 'notifications'} size={18} color="#fff" />
        </LinearGradient>

        <View style={styles.notificationTitleContainer}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>

        {!item.read && (
          <TouchableOpacity onPress={() => markAsRead(item._id)}>
            <Icon name="checkmark-circle" size={22} color="#A1D826" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.notificationMessage}>{item.message}</Text>
      {!item.read && <View style={styles.unreadIndicator} />}
    </Animated.View>
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
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A1D826']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="notifications-off" size={60} color="#ccc" />
            <Text>No notifications found</Text>
          </View>
        }
      />

      {counts.unread > 0 && (
        <TouchableOpacity style={styles.fab} onPress={markAllAsRead}>
          <LinearGradient colors={['#A1D826', '#8BC220']} style={styles.fabGradient}>
            <Icon name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.fabText}>Mark All Read</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}
