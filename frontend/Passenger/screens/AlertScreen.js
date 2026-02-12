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

const API_BASE_URL = 'http://192.168.10.6:3000/api';

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('authToken');
      setToken(storedToken);
    };
    loadToken();
  }, []);

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
    if (token) fetchNotifications();
  }, [token]);

  useEffect(() => {
    if (token && !loading) fetchNotifications(selectedCategory);
  }, [selectedCategory]);

  const fetchNotifications = async (category = selectedCategory) => {
    try {
      if (!token) return;

      let url = `${API_BASE_URL}/notifications`;
      if (category !== 'all') url += `?type=${category}`;

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
      if (data.success) {
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setCounts(data.counts || { 
          total: notifs.length, 
          unread: notifs.filter(n => !n.read).length 
        });
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
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setCounts(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      if (onMarkAsRead) onMarkAsRead(id);
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!token) return;
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
      console.error('Mark all as read error:', error);
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
          <Icon name={getNotificationIcon(item.type)} size={18} color="#fff" />
        </LinearGradient>
        <View style={styles.notificationTitleContainer}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.createdAt)}</Text>
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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