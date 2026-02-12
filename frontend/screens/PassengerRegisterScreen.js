import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from 'react-native-vector-icons/MaterialIcons';

const API_BASE_URL = 'http://192.168.10.3:3000/api'; // Replace with your server IP

export default function PassengerProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    mobile: "",
    cnic: "",
    role: "",
    pickup: "",
    dropoff: "",
    status: "",
    attendanceStatus: "",
    image: "https://randomuser.me/api/portraits/women/79.jpg",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        // If no token, load from local storage
        const savedName = await AsyncStorage.getItem("name");
        const savedEmail = await AsyncStorage.getItem("email");
        const savedMobile = await AsyncStorage.getItem("mobile");
        const savedCnic = await AsyncStorage.getItem("cnic");
        const savedRole = await AsyncStorage.getItem("role");
        const savedPickup = await AsyncStorage.getItem("pickup");
        const savedDropoff = await AsyncStorage.getItem("dropoff");
        const savedStatus = await AsyncStorage.getItem("attendanceStatus");

        setProfile({
          ...profile,
          name: savedName || "Hanzla",
          email: savedEmail || "hanzlaalvi9@gmail.com",
          mobile: savedMobile || "03001234567",
          cnic: savedCnic || "1234512345671",
          role: savedRole || "Passenger",
          pickup: savedPickup || "N/A",
          dropoff: savedDropoff || "N/A",
          status: savedStatus || "Pending",
          attendanceStatus: savedStatus || "Pending",
        });
        setLoading(false);
        return;
      }

      // Fetch from backend API
      const response = await fetch(`${API_BASE_URL}/passengers/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.passenger);
        
        // Save to local storage for offline use
        await AsyncStorage.multiSet([
          ['name', data.passenger.name],
          ['email', data.passenger.email],
          ['mobile', data.passenger.mobile],
          ['cnic', data.passenger.cnic],
          ['role', data.passenger.role],
          ['pickup', data.passenger.pickup],
          ['dropoff', data.passenger.dropoff],
          ['attendanceStatus', data.passenger.attendanceStatus],
        ]);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile load error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateAttendanceStatus = async (status) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/passengers/attendance`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendanceStatus: status }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.passenger);
        await AsyncStorage.setItem('attendanceStatus', data.passenger.attendanceStatus);
        Alert.alert('Success', 'Attendance status updated successfully');
      } else {
        throw new Error('Failed to update attendance');
      }
    } catch (error) {
      console.error('Attendance update error:', error);
      Alert.alert('Error', 'Failed to update attendance status');
    }
  };

  const getStatusColor = () => {
    if (profile.attendanceStatus === "Yes - Traveling") return "#afd826";
    if (profile.attendanceStatus === "No - Not Traveling") return "#f87171";
    return "#f59e0b"; // Pending
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: profile.image }} style={styles.image} />
        <TouchableOpacity style={styles.editImageBtn}>
          <Icon name="edit" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.role}>{profile.role}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Mobile:</Text>
        <Text style={styles.value}>{profile.mobile}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>CNIC:</Text>
        <Text style={styles.value}>{profile.cnic}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Pickup Address:</Text>
        <Text style={styles.value}>{profile.pickup}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Dropoff Address:</Text>
        <Text style={styles.value}>{profile.dropoff}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.label}>Travel Status:</Text>
        <Text style={[styles.value, { color: getStatusColor(), fontWeight: "700" }]}>
          {profile.attendanceStatus}
        </Text>
      </View>

      {/* Attendance Buttons */}
      <View style={styles.attendanceContainer}>
        <Text style={styles.attendanceTitle}>Update Travel Status:</Text>
        <View style={styles.attendanceButtons}>
          <TouchableOpacity 
            style={[styles.attendanceBtn, styles.travelingBtn]}
            onPress={() => updateAttendanceStatus('Yes - Traveling')}
          >
            <Text style={styles.attendanceBtnText}>Traveling Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.attendanceBtn, styles.notTravelingBtn]}
            onPress={() => updateAttendanceStatus('No - Not Traveling')}
          >
            <Text style={styles.attendanceBtnText}>Not Traveling</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    borderWidth: 2,
    borderColor: "#afd826",
    borderRadius: 80,
    padding: 5,
    marginBottom: 15,
    position: 'relative',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImageBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: "#afd826",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  role: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  label: { 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 3,
    fontSize: 14,
  },
  value: { 
    fontSize: 16, 
    color: "#111" 
  },
  attendanceContainer: {
    width: "100%",
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  attendanceButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attendanceBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  travelingBtn: {
    backgroundColor: "#afd826",
  },
  notTravelingBtn: {
    backgroundColor: "#f87171",
  },
  attendanceBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});