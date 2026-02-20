import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import styles from "../../styles/TermsConditionsStyle";

export default function TermsConditionsScreen({ navigation }) {
  const [accepted, setAccepted] = useState(false);

  const sections = [
    {
      id: 1,
      title: "1. Acceptance of Terms",
      content: "By accessing and using Raahi services, you accept and agree to be bound by the terms and provision of this agreement."
    },
    {
      id: 2,
      title: "2. User Responsibilities",
      content: "Users must provide accurate information, maintain the confidentiality of their account, and use the service in compliance with all applicable laws."
    },
    {
      id: 3,
      title: "3. Ride Delays & Cancellation",
      content: "You must be ready 5 minutes before van arrival. You canot cancel your ride nce you booked it."
    },
    {
      id: 4,
      title: "4. Payment Terms",
      content: "All payments are processed securely. Users are responsible for maintaining valid payment methods."
    },
    {
      id: 5,
      title: "5. Safety & Conduct",
      content: "Users must follow safety guidelines, respect drivers and fellow passengers, and maintain proper decorum. Any misconduct may result in account suspension."
    },
    {
      id: 6,
      title: "6. Liability",
      content: "Raahi is not liable for delays caused by traffic, weather, or unforeseen circumstances. Users are responsible for their personal belongings."
    },
    {
      id: 7,
      title: "7. Privacy Policy",
      content: "We collect necessary data for service provision. User data is protected and never shared with third parties without consent, except as required by law."
    },
    {
      id: 8,
      title: "8. Service Modifications",
      content: "Raahi reserves the right to modify or discontinue services with reasonable notice to users. Continued use constitutes acceptance of changes."
    },
  ];

  const handleAccept = () => {
    if (accepted) {
      Alert.alert(
        "Terms Accepted",
        "Thank you for accepting our Terms & Conditions.",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Accept Terms",
        "Please read and accept the Terms & Conditions to continue.",
        [{ text: "OK" }]
      );
    }
  };

  const renderSection = (section) => (
    <View key={section.id} style={styles.sectionItem}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionContent}>{section.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView style={styles.scrollContainer}>
        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <Icon name="warning" size={28} color="#FFA726" />
          <View style={styles.noticeText}>
            <Text style={styles.noticeTitle}>Important Legal Document</Text>
            <Text style={styles.noticeSub}>
              Please read these terms carefully before using our services
            </Text>
          </View>
        </View>

        {/* Last Updated */}
        <View style={styles.updateCard}>
          <Text style={styles.updateText}>
            Last Updated: December 1, 2024
          </Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {sections.map(renderSection)}
        </View>

        {/* Acceptance Section */}
        <View style={styles.acceptanceCard}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAccepted(!accepted)}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted && <Icon name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxText}>
              I have read and agree to the Terms & Conditions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.acceptButton, !accepted && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={!accepted}
          >
            <LinearGradient
              colors={['#A1D826', '#8BC220']}
              style={styles.acceptButtonGradient}
            >
              <Text style={styles.acceptButtonText}>
                Accept Terms & Conditions
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Contact for Questions */}
        <View style={styles.contactCard}>
          <Icon name="help-circle" size={24} color="#A1D826" />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Questions?</Text>
            <Text style={styles.contactSub}>
              Contact our legal team at legal@raahi.com
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}