import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  FlatList,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from '../../styles/PassengerPaymentStyle';

const API_BASE_URL = 'http://172.21.243.83:3000/api';

export default function PaymentsScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState('current');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    rejected: 0
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
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

    // Load initial data
    fetchData();
  }, []);

  // Fetch all required data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCurrentSubscription(),
        fetchSubscriptionHistory(),
        fetchSubscriptionPlans()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Use mock data as fallback
      useMockData();
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch current subscription
  const fetchCurrentSubscription = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/subscriptions/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentSubscription(data.subscription);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Fetch current subscription error:', error);
      throw error;
    }
  };

  // Fetch subscription history
  const fetchSubscriptionHistory = async () => {
    try {
      const token = await getAuthToken();
      let url = `${API_BASE_URL}/subscriptions/history`;
      if (selectedFilter !== 'all') {
        url += `?status=${selectedFilter}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSubscriptionHistory(data.subscriptions || []);
        setStats(data.stats || { total: 0, active: 0, completed: 0, rejected: 0 });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Fetch subscription history error:', error);
      throw error;
    }
  };

  // Fetch subscription plans
  const fetchSubscriptionPlans = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSubscriptionPlans(data.plans || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Fetch subscription plans error:', error);
      throw error;
    }
  };

  // Mock data fallback
  const useMockData = () => {
    const mockCurrentSubscription = {
      id: 1,
      planName: 'Monthly Subscription',
      amount: 'Rs. 10,000',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      status: 'active',
      paymentMethod: 'Bank Transfer',
      transactionId: 'SUB001234',
      daysRemaining: 6,
      requestDate: '2023-12-25',
      approvedDate: '2023-12-28',
      approvedBy: 'Transport Manager',
    };

    const mockSubscriptionHistory = [
      {
        id: 1,
        planName: 'Monthly Subscription',
        amount: 'Rs. 10,000',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'active',
        paymentMethod: 'Bank Transfer',
        transactionId: 'SUB001234',
        requestDate: '2023-12-25',
        approvedDate: '2023-12-28',
        approvedBy: 'Transport Manager',
      },
      {
        id: 2,
        planName: 'Monthly Subscription',
        amount: 'Rs. 10,000',
        startDate: '2023-12-01',
        endDate: '2023-12-31',
        status: 'completed',
        paymentMethod: 'EasyPaisa',
        transactionId: 'SUB001233',
        requestDate: '2023-11-25',
        approvedDate: '2023-11-28',
        approvedBy: 'Transport Manager',
      },
      // ... more mock data
    ];

    setCurrentSubscription(mockCurrentSubscription);
    setSubscriptionHistory(mockSubscriptionHistory);
    setStats({
      total: mockSubscriptionHistory.length,
      active: 1,
      completed: 1,
      rejected: 0
    });
  };

  // Refresh when filter changes
  useEffect(() => {
    if (selectedTab === 'history') {
      fetchSubscriptionHistory();
    }
  }, [selectedFilter]);

  // Refresh when tab changes
  useEffect(() => {
    if (selectedTab === 'current') {
      fetchCurrentSubscription();
    } else if (selectedTab === 'history') {
      fetchSubscriptionHistory();
    }
  }, [selectedTab]);

  const onRefresh = () => {
    fetchData();
  };

  const tabs = [
    { id: 'current', label: 'Current Plan' },
    { id: 'history', label: 'History' },
    { id: 'renew', label: 'Renew Plan' },
  ];

  const filters = [
    { id: 'all', label: 'All Status' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'pending', label: 'Pending' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return ['#A1D826', '#8BC220'];
      case 'completed': return ['#4ECDC4', '#45B7D1'];
      case 'rejected': return ['#FF6B6B', '#EE5A52'];
      case 'pending': return ['#FF9500', '#FF8A00'];
      default: return ['#A1D826', '#8BC220'];
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'completed': return 'checkmark-done';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'checkmark-circle';
    }
  };

  const filteredSubscriptions = subscriptionHistory.filter(sub => {
    const matchesSearch = sub.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleRenewSubscription = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/subscriptions/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: subscriptionPlans[0]?.id || 'default' // Use first plan or default
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowRenewModal(false);
        
        // Refresh data
        fetchData();
        
        Alert.alert(
          'Renewal Request Sent',
          'Your monthly subscription renewal request has been sent to your transporter. They will review and approve it within 24 hours.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to send renewal request');
      }
    } catch (error) {
      console.error('Renew subscription error:', error);
      Alert.alert('Error', 'Failed to send renewal request. Please try again.');
    }
  };

  // Rest of your component functions remain the same...
  // renderCurrentSubscription, renderSubscriptionCard, renderRenewPlan, etc.

  const renderCurrentSubscription = () => {
    if (!currentSubscription) {
      return (
        <Animated.View
          style={[
            styles.currentPlanCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#FF6B6B', '#EE5A52']}
            style={styles.currentPlanGradient}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>No Active Subscription</Text>
                <Text style={styles.planPrice}>Please renew your plan</Text>
                <Text style={styles.planDescription}>Your subscription has expired</Text>
              </View>
              <Icon name="warning" size={32} color="#fff" />
            </View>
            
            <TouchableOpacity 
              style={styles.renewBtn}
              onPress={() => setSelectedTab('renew')}
            >
              <Icon name="refresh" size={18} color="#fff" />
              <Text style={styles.renewBtnText}>Renew Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.currentPlanCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <LinearGradient
          colors={['#A1D826', '#8BC220']}
          style={styles.currentPlanGradient}
        >
          {/* ... existing current subscription JSX ... */}
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{currentSubscription.planName}</Text>
              <Text style={styles.planPrice}>{currentSubscription.amount}</Text>
              <Text style={styles.planDescription}>Monthly Van Pooling Service</Text>
            </View>
            <LinearGradient
              colors={['#fff', '#f8f9fa']}
              style={styles.statusBadgeLarge}
            >
              <Icon name={getStatusIcon(currentSubscription.status)} size={16} color="#A1D826" />
              <Text style={styles.statusTextLarge}>
                {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.planDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="calendar" size={16} color="#fff" />
                <Text style={styles.detailTextWhite}>
                  {currentSubscription.startDate} to {currentSubscription.endDate}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Icon name="time" size={16} color="#fff" />
                <Text style={styles.detailTextWhite}>
                  {currentSubscription.daysRemaining} days remaining
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Icon name="card" size={16} color="#fff" />
                <Text style={styles.detailTextWhite}>
                  {currentSubscription.paymentMethod}
                </Text>
              </View>
            </View>

            {currentSubscription.approvedBy && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Icon name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.detailTextWhite}>
                    Approved by: {currentSubscription.approvedBy}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.planActions}>
            <TouchableOpacity 
              style={styles.renewBtn}
              onPress={() => setShowRenewModal(true)}
            >
              <Icon name="refresh" size={18} color="#fff" />
              <Text style={styles.renewBtnText}>Renew Plan</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // ... rest of your component code remains mostly the same

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Monthly Subscription</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <Icon name="filter" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.tabActive
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Refresh Control for ScrollView */}
      <ScrollView 
        style={styles.scrollContainer} 
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
        {/* Content based on selected tab */}
        {selectedTab === 'current' && (
          <>
            {renderCurrentSubscription()}
            
            {/* Stats Overview */}
            <Animated.View 
              style={[
                styles.statsCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <Text style={styles.statsTitle}>Subscription Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.active}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.rejected}</Text>
                  <Text style={styles.statLabel}>Rejected</Text>
                </View>
              </View>
            </Animated.View>
          </>
        )}

        {selectedTab === 'renew' && (
          renderRenewPlan()
        )}
      </ScrollView>

      {/* History Tab with FlatList */}
      {selectedTab === 'history' && (
        <>
          {/* Search Bar */}
          <Animated.View 
            style={[
              styles.searchContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.searchBox}>
              <Icon name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by transaction ID..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Active Filter Display */}
          {selectedFilter !== 'all' && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                Filter: {filters.find(f => f.id === selectedFilter)?.label}
              </Text>
              <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                <Icon name="close" size={16} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Subscription List */}
          <FlatList
            data={filteredSubscriptions}
            renderItem={renderSubscriptionCard}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#A1D826']}
                tintColor={'#A1D826'}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="receipt" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>No subscriptions found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery ? 'Try adjusting your search' : 'No subscription history available'}
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* ... existing modals remain the same ... */}
    </View>
  );
}

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    // return await AsyncStorage.getItem('userToken');
    return 'demo-token';
  } catch (error) {
    return 'demo-token';
  }
};