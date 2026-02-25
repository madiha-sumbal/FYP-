import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../styles/RideHistoryStyle';

export default function RideHistoryScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Fetch ride history from backend
  const fetchRideHistory = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);

      // Replace with your actual API endpoint
      const response = await fetch('http://192.168.10.12:3000/api/passenger/ride-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`, // Add your auth token
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ride history');
      }

      const data = await response.json();
      
      // Transform backend data to match frontend structure
      const formattedRides = data.map((ride, index) => ({
        id: ride.id || index + 1,
        date: formatDate(ride.bookingDate || ride.createdAt),
        time: formatTime(ride.bookingDate || ride.createdAt),
        route: `${ride.pickupLocation} → ${ride.dropoffLocation}`,
        driver: ride.driver?.name || 'Driver Information',
        vehicle: ride.driver?.vehicle || 'Vehicle Information',
        scheduledTime: formatTime(ride.scheduledTime),
        actualTime: formatTime(ride.actualPickupTime),
        delay: calculateDelay(ride.scheduledTime, ride.actualPickupTime),
        status: ride.status?.toLowerCase() || 'completed',
        rating: ride.rating,
        missed: ride.status?.toLowerCase() === 'missed' || ride.status?.toLowerCase() === 'cancelled',
      }));

      setRides(formattedRides);
      
      // Start animations after data is loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

    } catch (error) {
      console.error('Error fetching ride history:', error);
      Alert.alert('Error', 'Failed to load ride history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to get auth token (implement based on your auth system)
  const getAuthToken = async () => {
    // Replace with your actual token retrieval logic
    return 'your-auth-token';
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper function to format time
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to calculate delay
  const calculateDelay = (scheduledTime, actualTime) => {
    if (!scheduledTime || !actualTime) return 'N/A';
    
    const scheduled = new Date(scheduledTime);
    const actual = new Date(actualTime);
    const diffMinutes = Math.round((actual - scheduled) / (1000 * 60));
    
    if (diffMinutes === 0) return 'On time';
    if (diffMinutes > 0) return `${diffMinutes} minutes late`;
    return `${Math.abs(diffMinutes)} minutes early`;
  };

  useEffect(() => {
    fetchRideHistory();
  }, []);

  const filters = [
    { id: 'all', label: 'All Rides' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Missed' },
    { id: 'delayed', label: 'Delayed' },
  ];

  const filteredRides = selectedFilter === 'all' 
    ? rides 
    : selectedFilter === 'completed' 
    ? rides.filter(ride => ride.status === 'completed' && !ride.missed)
    : selectedFilter === 'cancelled'
    ? rides.filter(ride => ride.missed)
    : rides.filter(ride => ride.delay && ride.delay !== 'On time' && !ride.delay.includes('early') && !ride.missed);

  const getStatusColor = (status, missed) => {
    if (missed) return ['#FF6B6B', '#EE5A52'];
    switch (status) {
      case 'completed': return ['#A1D826', '#8BC220'];
      case 'cancelled': return ['#FF6B6B', '#EE5A52'];
      default: return ['#A1D826', '#8BC220'];
    }
  };

  const getStatusIcon = (status, missed) => {
    if (missed) return 'close-circle';
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'time';
    }
  };

  const getStatusText = (status, missed) => {
    if (missed) return 'Missed';
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  const handleRefresh = () => {
    fetchRideHistory(true);
  };

  const renderRideCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.rideCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>{item.route}</Text>
          <View style={[styles.statusBadge, item.missed && styles.missedBadge]}>
            <Text style={styles.statusText}>
              {getStatusText(item.status, item.missed)}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.timeInfo}>
          <View style={styles.timeRow}>
            <Icon name="time-outline" size={16} color="#666" />
            <Text style={styles.timeLabel}>Scheduled:</Text>
            <Text style={styles.timeValue}>{item.scheduledTime}</Text>
          </View>
          <View style={styles.timeRow}>
            <Icon name="time" size={16} color="#666" />
            <Text style={styles.timeLabel}>Actual:</Text>
            <Text style={styles.timeValue}>{item.actualTime}</Text>
          </View>
        </View>

        <View style={styles.delayInfo}>
          <Icon 
            name={item.missed ? "alert-circle" : "time"} 
            size={16} 
            color={item.missed ? "#FF6B6B" : "#FFA500"} 
          />
          <Text style={[
            styles.delayText,
            item.missed ? styles.missedText : styles.delayedText
          ]}>
            {item.missed ? 'You missed this ride' : item.delay}
          </Text>
        </View>

        <View style={styles.driverInfo}>
          <View style={styles.driverDetail}>
            <Icon name="person-outline" size={14} color="#666" />
            <Text style={styles.driverText}>{item.driver}</Text>
          </View>
          <View style={styles.driverDetail}>
            <Icon name="car-outline" size={14} color="#666" />
            <Text style={styles.driverText}>{item.vehicle}</Text>
          </View>
        </View>

        {item.rating && !item.missed && (
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Text style={styles.ratingLabel}>Driver Rating</Text>
          </View>
        )}
      </View>

      {item.missed && (
        <View style={styles.missedOverlay}>
          <Text style={styles.missedMessage}>This ride was missed</Text>
        </View>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#A1D826', '#8BC220']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride History</Text>
          <TouchableOpacity style={styles.downloadButton}>
            <Icon name="download-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A1D826" />
          <Text style={styles.loadingText}>Loading your ride history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
        <TouchableOpacity style={styles.downloadButton}>
          <Icon name="download-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filter Tabs - Fixed */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContentContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterTab,
                selectedFilter === filter.id && styles.filterTabActive
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredRides}
        renderItem={renderRideCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No rides found</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedFilter === 'all' 
                ? 'You haven\'t taken any rides yet' 
                : `No ${selectedFilter} rides found`}
            </Text>
          </View>
        }
      />
    </View>
  );
}