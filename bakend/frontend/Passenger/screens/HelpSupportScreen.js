import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from "../../styles/HelpSupportStyle";

export default function HelpSupportScreen({ navigation }) {
  const helpItems = [
    {
      id: 1,
      icon: 'call-outline',
      title: 'Contact Support',
      subtitle: 'Get immediate assistance from our team',
      action: () => navigation.navigate('ContactSupport')
    },
    {
      id: 2,
      icon: 'document-text-outline',
      title: 'FAQs',
      subtitle: 'Find answers to common questions',
      action: () => Alert.alert('FAQs', 'Frequently Asked Questions section')
    },
    {
      id: 3,
      icon: 'chatbubbles-outline',
      title: 'Live Chat',
      subtitle: 'Chat with support agents in real-time',
      action: () => Alert.alert('Live Chat', 'Live chat support')
    },
    {
      id: 4,
      icon: 'mail-outline',
      title: 'Email Support',
      subtitle: 'Send us an email for detailed queries',
      action: () => Linking.openURL('mailto:support@vanpooling.com')
    }
  ];

  const quickActions = [
    {
      id: 1,
      icon: 'help-circle-outline',
      title: 'How to Book',
      action: () => Alert.alert('Booking Guide', 'Step-by-step booking instructions')
    },
    {
      id: 2,
      icon: 'card-outline',
      title: 'Payments',
      action: () => Alert.alert('Payments', 'Payment methods and billing info')
    },
    {
      id: 3,
      icon: 'location-outline',
      title: 'Routes',
      action: () => Alert.alert('Routes', 'Available routes and schedules')
    }
  ];

  const faqItems = [
    {
      id: 1,
      question: "What if I forget to mark my next day attendence?",
      answer: "You must have to mark your attendence notification otherwise, your status will be marked absent automatically. "
    },
    {
      id: 2,
      question: 'What if I miss my van?',
      answer: 'Contact assosiated Transporter immediately. He\'ll help you book the next available van or provide alternative options.'
    },
    {
      id: 3,
      question: "How to change my pickup location?",
      answer: "You can update pickup location up to 1 hour before scheduled pickup or contact to your assosiated transporter."
    },
  ];

  const contactInfo = [
    {
      id: 1,
      icon: 'call',
      label: 'Support Hotline',
      value: '+1 (555) 123-HELP',
      action: () => Linking.openURL('tel:03191797223')
    },
    {
      id: 2,
      icon: 'mail',
      label: 'Email Address',
      value: 'support@raahi.com',
      action: () => Linking.openURL('mailto:support@raahi.com')
    },
    {
      id: 3,
      icon: 'time',
      label: 'Support Hours',
      value: '24/7 Available',
      action: null
    },
    {
      id: 4,
      icon: 'globe',
      label: 'Website',
      value: 'www.raahi.com/support',
      action: () => Linking.openURL('https://www.raahi.com/support')
    }
  ];

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Support',
      'This will connect you to emergency services. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Emergency', 
          style: 'destructive',
          onPress: () => Linking.openURL('tel:911')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity onPress={() => Alert.alert('Help Info', 'Get assistance with your rides and account')}>
          <Icon name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.actionButton}
              onPress={action.action}
            >
              <View style={styles.actionIcon}>
                <Icon name={action.icon} size={24} color="#A1D826" />
              </View>
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Card */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Icon name="warning" size={24} color="#FF6B6B" />
            <Text style={styles.emergencyTitle}>Emergency Support</Text>
          </View>
          <Text style={styles.emergencyText}>
            For urgent safety concerns or immediate assistance during your ride.
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
            <Text style={styles.emergencyButtonText}>Emergency Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Help Options */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          <View style={styles.helpCard}>
            {helpItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.helpItem}
                onPress={item.action}
              >
                <View style={styles.helpIcon}>
                  <Icon name={item.icon} size={22} color="#A1D826" />
                </View>
                <View style={styles.helpText}>
                  <Text style={styles.helpTitle}>{item.title}</Text>
                  <Text style={styles.helpSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.helpCard}>
            {faqItems.map((faq) => (
              <View key={faq.id} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Icon name="business" size={24} color="#A1D826" />
              <Text style={styles.contactTitle}>RAAHI Support</Text>
            </View>
            {contactInfo.map((contact) => (
              <TouchableOpacity 
                key={contact.id} 
                style={styles.contactItem}
                onPress={contact.action}
                disabled={!contact.action}
              >
                <View style={styles.contactIcon}>
                  <Icon name={contact.icon} size={18} color="#A1D826" />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactValue}>{contact.value}</Text>
                </View>
                {contact.action && <Icon name="chevron-forward" size={16} color="#ccc" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}