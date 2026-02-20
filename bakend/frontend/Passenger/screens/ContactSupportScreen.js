import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { LinearGradient } from 'expo-linear-gradient';
import styles from "../../styles/ContactSupportStyle";

const { width, height } = Dimensions.get('window');

export default function ContactSupportScreen({ navigation }) {
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { 
      id: 1, 
      text: "Hello! I'm Sarah, your dedicated transporter. How can I assist you with your journey today?", 
      fromSupport: true, 
      time: "10:30 AM" 
    },
    { 
      id: 2, 
      text: "Hi Sarah, I'm running late today. Will you be able to wait for 5 minutes at my pickup point?", 
      fromSupport: false, 
      time: "10:31 AM" 
    },
    { 
      id: 3, 
      text: "Sure! I can wait for 5 minutes. Please try to reach as soon as possible.", 
      fromSupport: true, 
      time: "10:32 AM" 
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState("support");
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const callRingAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);
  const callTimerRef = useRef(null);

  const transporter = {
    name: "Sarah Johnson",
    role: "Your Transporter",
    phone: "+1 (555) 123-4567",
    email: "sarah.j@raahi.com",
    rating: 4.9,
    experience: "5+ years",
    vehicle: "Toyota Hiace - RA 1234",
    routes: "Route 42 - Downtown Express",
    availability: "Available Now",
    responseTime: "Usually responds in 2-3 minutes"
  };

  const quickActions = [
    {
      id: 1,
      title: "Running Late",
      icon: "time-outline",
      message: "Hi, I'm running late. Please wait for me."
    },
    {
      id: 2,
      title: "Change Pickup",
      icon: "location-outline",
      message: "Can we change my pickup location?"
    },
    {
      id: 3,
      title: "Emergency",
      icon: "warning-outline",
      message: "I have an emergency, need assistance."
    },
    {
      id: 4,
      title: "Vehicle Issue",
      icon: "car-outline",
      message: "Is there any issue with the vehicle today?"
    }
  ];

  const faqItems = [
    {
      id: 1,
      question: "What if I'm running late for pickup?",
      answer: "Notify your transporter immediately via call or message. They can wait up to 5 minutes depending on schedule."
    },
    {
      id: 2,
      question: "How to change my pickup location?",
      answer: "Contact your transporter directly at least 1 hour before scheduled pickup for location changes."
    },
    {
      id: 3,
      question: "What if I miss my van?",
      answer: "Contact your transporter immediately. They'll guide you about the next available option."
    },
    {
      id: 4,
      question: "Vehicle maintenance issues?",
      answer: "Your transporter will notify you in advance about any vehicle maintenance or replacements."
    },
  ];

  // Call ring animation
  useEffect(() => {
    if (callModalVisible && !isCallConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(callRingAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(callRingAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      
      // Pulse animation for call buttons
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      callRingAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [callModalVisible, isCallConnected]);

  useEffect(() => {
    if (isCallConnected) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
      setCallDuration(0);
    }

    return () => clearInterval(callTimerRef.current);
  }, [isCallConnected]);

  const ringScale = callRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const formatCallTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const sendMessage = () => {
    if (inputText.trim()) {
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const newMsg = {
        id: chatMessages.length + 1,
        text: inputText,
        fromSupport: false,
        time: currentTime,
      };
      setChatMessages([...chatMessages, newMsg]);
      setInputText("");
      
      // Auto reply from transporter
      setTimeout(() => {
        const supportReply = {
          id: chatMessages.length + 2,
          text: "Thanks for your message. I'll assist you with this.",
          fromSupport: true,
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
        };
        setChatMessages(prev => [...prev, supportReply]);
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1500);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendQuickMessage = (message) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const newMsg = {
      id: chatMessages.length + 1,
      text: message,
      fromSupport: false,
      time: currentTime,
    };
    setChatMessages([...chatMessages, newMsg]);
    
    setTimeout(() => {
      const supportReply = {
        id: chatMessages.length + 2,
        text: "Noted. I'll accommodate your request.",
        fromSupport: true,
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      setChatMessages(prev => [...prev, supportReply]);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 1500);
    
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleCallAction = () => {
    if (!isCallConnected) {
      setIsCallConnected(true);
    } else {
      setCallModalVisible(false);
      setIsCallConnected(false);
    }
  };

  const renderFAQItem = ({ item }) => (
    <View style={styles.faqItem}>
      <Text style={styles.faqQuestion}>{item.question}</Text>
      <Text style={styles.faqAnswer}>{item.answer}</Text>
    </View>
  );

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity 
      style={styles.quickActionItem}
      onPress={() => sendQuickMessage(item.message)}
    >
      <Icon name={item.icon} size={24} color="#A1D826" />
      <Text style={styles.quickActionText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#A1D826" />
      
      {/* Enhanced Header */}
      <LinearGradient
        colors={['#A1D826', '#8BC220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Contact Transporter</Text>
          <Text style={styles.headerSubtitle}>Direct communication</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "support" && styles.activeTab]}
          onPress={() => setActiveTab("support")}
        >
          <Icon 
            name="person" 
            size={20} 
            color={activeTab === "support" ? "#fff" : "#A1D826"} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === "support" && styles.activeTabText]}>
            My Transporter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "faq" && styles.activeTab]}
          onPress={() => setActiveTab("faq")}
        >
          <Icon 
            name="help-circle" 
            size={20} 
            color={activeTab === "faq" ? "#fff" : "#A1D826"} 
            style={styles.tabIcon}
          />
          <Text style={[styles.tabText, activeTab === "faq" && styles.activeTabText]}>
            FAQ
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {activeTab === "support" ? (
          <>
            {/* Transporter Profile Card */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={['#A1D826', '#8BC220']}
                style={styles.profileGradient}
              >
                <View style={styles.profileHeader}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.profileInitials}>SJ</Text>
                  </View>
                  <View style={styles.profileStatus}>
                    <View style={styles.statusIndicator} />
                    <Text style={styles.statusText}>{transporter.availability}</Text>
                  </View>
                </View>
                
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{transporter.name}</Text>
                  <Text style={styles.profileRole}>{transporter.role}</Text>
                  
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{transporter.rating} • {transporter.experience} experience</Text>
                  </View>
                  
                  <View style={styles.vehicleInfo}>
                    <Icon name="car" size={14} color="#fff" />
                    <Text style={styles.vehicleText}> {transporter.vehicle}</Text>
                  </View>
                  
                  <View style={styles.routeInfo}>
                    <Icon name="map" size={14} color="#fff" />
                    <Text style={styles.routeText}> {transporter.routes}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Contact Information */}
              <View style={styles.contactInfo}>
                <View style={styles.contactItem}>
                  <Icon name="call" size={20} color="#A1D826" />
                  <Text style={styles.contactText}>{transporter.phone}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Icon name="mail" size={20} color="#A1D826" />
                  <Text style={styles.contactText}>{transporter.email}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Icon name="time" size={20} color="#A1D826" />
                  <Text style={styles.contactText}>{transporter.responseTime}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Messages</Text>
              <Text style={styles.sectionSubtitle}>Send common messages instantly</Text>
              
              <FlatList
                data={quickActions}
                renderItem={renderQuickAction}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.quickActionsGrid}
              />
            </View>

            {/* Communication Buttons */}
            <View style={styles.communicationSection}>
              <TouchableOpacity 
                style={styles.communicationButton}
                onPress={() => setCallModalVisible(true)}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A52']}
                  style={styles.communicationButtonGradient}
                >
                  <Icon name="call" size={28} color="#fff" />
                  <Text style={styles.communicationButtonText}>Call Now</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.communicationButton}
                onPress={() => setChatModalVisible(true)}
              >
                <LinearGradient
                  colors={['#A1D826', '#8BC220']}
                  style={styles.communicationButtonGradient}
                >
                  <Icon name="chatbubble" size={28} color="#fff" />
                  <Text style={styles.communicationButtonText}>Message</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* FAQ Section */
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="help-circle" size={24} color="#A1D826" style={styles.sectionIcon} />
              <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
            </View>

            <FlatList
              data={faqItems}
              renderItem={renderFAQItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              style={styles.faqList}
            />
          </View>
        )}
      </ScrollView>

      {/* Enhanced Call Modal */}
      <Modal visible={callModalVisible} transparent animationType="fade">
        <View style={styles.callModalOverlay}>
          <Animated.View style={[styles.callModalContent, { transform: [{ scale: ringScale }] }]}>
            <View style={styles.callerInfo}>
              <LinearGradient
                colors={['#A1D826', '#8BC220']}
                style={styles.callerAvatar}
              >
                <Text style={styles.callerInitials}>SJ</Text>
              </LinearGradient>

              <Text style={styles.callerName}>{transporter.name}</Text>
              <Text style={styles.callerRole}>Your Transporter</Text>
              
              {isCallConnected ? (
                <Text style={styles.callTimer}>{formatCallTime(callDuration)}</Text>
              ) : (
                <Text style={styles.callingText}>Calling your transporter...</Text>
              )}
            </View>

            <View style={styles.callActions}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity onPress={handleCallAction}>
                  <LinearGradient
                    colors={isCallConnected ? ['#FF6B6B', '#EE5A52'] : ['#4CD964', '#2ECC71']}
                    style={styles.mainCallButton}
                  >
                    <Icon 
                      name={isCallConnected ? "call" : "call"} 
                      size={32} 
                      color="#fff" 
                      style={isCallConnected ? { transform: [{ rotate: '135deg' }] } : {}}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              
              <Text style={styles.callButtonText}>
                {isCallConnected ? "End Call" : "Connecting..."}
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Enhanced Chat Modal */}
      <Modal visible={chatModalVisible} animationType="slide">
        <View style={styles.chatContainer}>
          <LinearGradient
            colors={['#A1D826', '#8BC220']}
            style={styles.chatHeader}
          >
            <TouchableOpacity 
              onPress={() => setChatModalVisible(false)}
              style={styles.chatBackButton}
            >
              <Icon name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.chatUserInfo}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>SJ</Text>
              </View>
              <View style={styles.chatUserDetails}>
                <Text style={styles.chatHeaderTitle}>{transporter.name}</Text>
                <Text style={styles.chatHeaderSubtitle}>Online • {transporter.responseTime}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.chatHeaderButton}>
              <Icon name="information-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[
                styles.messageContainer,
                item.fromSupport ? styles.supportMessageContainer : styles.userMessageContainer
              ]}>
                {item.fromSupport && (
                  <View style={styles.messageAvatar}>
                    <Text style={styles.messageAvatarText}>SJ</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.chatBubble,
                    item.fromSupport ? styles.supportBubble : styles.userBubble,
                  ]}
                >
                  <Text style={styles.chatText}>{item.text}</Text>
                  <Text style={styles.chatTime}>{item.time}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.chatMessagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.chatInputContainer}
          >
            <View style={styles.chatInputBox}>
              <TouchableOpacity style={styles.attachBtn}>
                <Icon name="add" size={28} color="#A1D826" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.chatInput}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity 
                onPress={sendMessage}
                disabled={!inputText.trim()}
                style={styles.sendButtonContainer}
              >
                <LinearGradient
                  colors={inputText.trim() ? ['#A1D826', '#8BC220'] : ['#ccc', '#bbb']}
                  style={styles.sendButton}
                >
                  <Icon name="send" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}