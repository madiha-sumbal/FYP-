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
  StatusBar,
  StyleSheet,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'http://192.168.10.12:3000/api';

const categories = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'payment', label: 'Payments', icon: 'card-outline' },
  { id: 'trip', label: 'Trips', icon: 'car-outline' },
  { id: 'driver', label: 'Drivers', icon: 'person-outline' },
  { id: 'route', label: 'Routes', icon: 'map-outline' },
  { id: 'poll', label: 'Polls', icon: 'help-circle-outline' },
  { id: 'system', label: 'System', icon: 'settings-outline' },
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

  // 🔐 Load Auth Data
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        if (!storedToken || !storedUserId) {
          RNAlert.alert('Session Expired', 'Please login again.');
          navigation.navigate('PassengerLoginScreen');
          return;
        }
        setToken(storedToken);
        setUserId(storedUserId);
      } catch (e) { setLoading(false); }
    };
    loadAuthData();
  }, []);

  // 📡 Fetch Notifications
  const fetchNotifications = async (category = selectedCategory) => {
    try {
      if (!token || !userId) return;
      let url = `${API_BASE_URL}/notifications${category !== 'all' ? `?category=${category}` : ''}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        let list = data.notifications || data.data || [];
        const userNotifs = list.filter(n => (n.userId?._id || n.userId)?.toString() === userId.toString());
        setNotifications(userNotifs);
        setCounts({ total: userNotifs.length, unread: userNotifs.filter(n => !n.read).length });
        
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (token) fetchNotifications(); }, [token, selectedCategory]);

  const markAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setCounts(c => ({ ...c, unread: Math.max(0, c.unread - 1) }));
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setCounts(c => ({ ...c, unread: 0 }));
    } catch (e) { console.error(e); }
  };

  const getTheme = (type) => {
    const themes = {
      payment: { colors: ['#FF9800', '#F57C00'], icon: 'card' },
      trip: { colors: ['#A1D826', '#8BC220'], icon: 'car' },
      driver: { colors: ['#00BCD4', '#0097A7'], icon: 'person' },
      route: { colors: ['#2196F3', '#1976D2'], icon: 'map' },
      poll: { colors: ['#9C27B0', '#7B1FA2'], icon: 'help-circle' },
      system: { colors: ['#FF5252', '#D32F2F'], icon: 'settings' },
    };
    return themes[type] || themes.trip;
  };

  const formatTime = (ts) => {
    const diff = new Date() - new Date(ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#A1D826" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* --- HEADER --- */}
      <LinearGradient colors={['#ffffff', '#f3f4f6']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerStatus}>{counts.unread} New Messages</Text>
          </View>
          {counts.unread > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              onPress={() => setSelectedCategory(cat.id)}
              style={[styles.chip, selectedCategory === cat.id && styles.activeChip]}
            >
              <Icon name={cat.icon} size={16} color={selectedCategory === cat.id ? '#fff' : '#6B7280'} />
              <Text style={[styles.chipText, selectedCategory === cat.id && styles.activeChipText]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* --- LIST --- */}
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications()} tintColor="#A1D826" />}
        renderItem={({ item }) => {
          const theme = getTheme(item.type || item.category);
          return (
            <Animated.View style={[styles.card, { opacity: fadeAnim }, !item.read && styles.unreadCard]}>
              <View style={styles.cardHeader}>
                <LinearGradient colors={theme.colors} style={styles.iconBox}>
                  <Icon name={theme.icon} size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.read && (
                  <TouchableOpacity onPress={() => markAsRead(item._id)}>
                    <Icon name="checkmark-done-circle" size={24} color="#A1D826" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.notifBody}>{item.message}</Text>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="notifications-off-outline" size={70} color="#E5E7EB" />
            <Text style={styles.emptyText}>No notifications yet!</Text>
          </View>
        }
      />
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  headerStatus: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  markAllBtn: { backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markAllText: { color: '#A1D826', fontWeight: '700', fontSize: 12 },
  filterBar: { marginTop: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  activeChip: { backgroundColor: '#A1D826', borderColor: '#A1D826' },
  chipText: { marginLeft: 6, fontSize: 12, fontWeight: '600', color: '#6B7280' },
  activeChipText: { color: '#fff' },
  listContainer: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  unreadCard: { borderLeftWidth: 5, borderLeftColor: '#A1D826' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
  notifBody: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#9CA3AF', marginTop: 10, fontSize: 16, fontWeight: '600' }
});