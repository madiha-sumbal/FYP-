const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/transportdb';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.log('❌ MongoDB Connection Error:', err));

// ==================== SCHEMAS ====================

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  type: String,
  phone: String,
  company: String,
  license: String,
  address: String,
  country: String,
  city: String,
  zone: String,
  profileImage: String,
  status: { type: String, default: 'active' },
  registrationDate: { type: Date, default: Date.now },
  van: String,
  capacity: Number,
  availableTimeSlots: [String],
  experience: String,
  vehicle: String,
  pickupPoint: String,
  destination: String,
  selectedTimeSlot: String,
  preferredTimeSlot: String,
  latitude: Number,
  longitude: Number,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fcmToken: String // For push notifications
});

userSchema.pre('save', function(next) {
  if (this.type && !this.role) this.role = this.type;
  if (this.role && !this.type) this.type = this.role;
  next();
});

const User = mongoose.model('User', userSchema);

// Poll Schema - Enhanced
const pollSchema = new mongoose.Schema({
  title: String,
  question: { type: String, default: 'Will you travel tomorrow?' },
  timeSlots: [String],
  closesAt: String,
  closingDate: Date,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'active' }, // active, closed
  responses: [{
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passengerName: String,
    passengerEmail: String,
    response: String, // 'yes' or 'no'
    selectedTimeSlot: String,
    pickupPoint: String,
    respondedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  notificationsSent: { type: Boolean, default: false }
});

const Poll = mongoose.model('Poll', pollSchema);

// Driver Availability Schema
const driverAvailabilitySchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  date: Date,
  startTime: String,
  endTime: String,
  status: { type: String, default: 'available' }, // available, unavailable
  confirmed: { type: Boolean, default: false },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const DriverAvailability = mongoose.model('DriverAvailability', driverAvailabilitySchema);

// Route Schema - Enhanced
const routeSchema = new mongoose.Schema({
  name: String,
  routeName: String,
  stops: [String],
  startPoint: String,
  destination: String,
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  timeSlot: String,
  pickupTime: String,
  distance: String,
  totalDistance: String,
  duration: String,
  estimatedDuration: String,
  passengers: [{
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passengerName: String,
    pickupPoint: String,
    status: { type: String, default: 'pending' } // pending, confirmed, picked-up, completed
  }],
  status: { type: String, default: 'assigned' }, // assigned, started, completed
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  createdAt: { type: Date, default: Date.now }
});

const Route = mongoose.model('Route', routeSchema);

// Trip Schema - Enhanced
const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  routeName: String,
  status: String, // 'Scheduled', 'En Route', 'Completed'
  currentStop: String,
  currentLocation: { 
    latitude: Number, 
    longitude: Number 
  },
  passengers: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    pickupPoint: String,
    status: String, // 'pending', 'picked', 'completed', 'missed'
    pickupTime: String,
    confirmedMorning: { type: Boolean, default: false }
  }],
  stops: [String],
  completedStops: [String],
  speed: Number,
  eta: String,
  timeSlot: String,
  capacity: Number,
  vehicleType: String,
  vehicleNumber: String,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Trip = mongoose.model('Trip', tripSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
  type: String,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  mode: String,
  status: String,
  month: String,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// Complaint Schema - Enhanced
const complaintSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String, // 'driver', 'passenger', 'route', 'payment', 'other'
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: String,
  byRole: String, // 'driver' or 'passenger'
  againstUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  againstName: String,
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, default: 'Open' }, // Open, In Progress, Resolved
  priority: { type: String, default: 'medium' }, // low, medium, high
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{ 
    by: String, 
    byRole: String,
    text: String, 
    date: { type: Date, default: Date.now } 
  }],
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  passengerName: String,
  givenBy: String, // 'driver' or 'passenger'
  rating: Number, // 1-5
  comment: String,
  categories: {
    punctuality: Number,
    cleanliness: Number,
    behavior: Number,
    driving: Number
  },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Notification Schema - Enhanced
const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  type: String, // 'poll', 'route', 'confirmation', 'alert', 'complaint', 'feedback', 'general'
  icon: String,
  color: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: String, // 'passenger', 'driver', 'transporter'
  relatedId: mongoose.Schema.Types.ObjectId, // Poll ID, Route ID, Trip ID, etc.
  relatedType: String, // 'poll', 'route', 'trip', 'complaint'
  actionRequired: { type: Boolean, default: false },
  actionType: String, // 'respond_poll', 'confirm_availability', 'confirm_trip'
  read: { type: Boolean, default: false },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Join Request Schema
const joinRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  type: String,
  vehicle: String,
  capacity: Number,
  experience: String,
  license: String,
  availableTimeSlots: [String],
  location: String,
  pickupPoint: String,
  destination: String,
  preferredTimeSlot: String,
  latitude: Number,
  longitude: Number,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);

// ==================== AUTH MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Send notification to user
async function sendNotification(userId, userRole, title, message, type, relatedId = null, relatedType = null, actionRequired = false, actionType = null) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const notification = new Notification({
      title,
      message,
      type,
      icon: getIconForType(type),
      color: getColorForType(type),
      userId,
      userRole,
      relatedId,
      relatedType,
      actionRequired,
      actionType,
      transporterId: user.transporterId || userId
    });

    await notification.save();
    console.log(`✅ Notification sent to ${user.name}: ${title}`);
    
    // Here you would integrate with FCM/push notification service
    // sendPushNotification(user.fcmToken, title, message);
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

function getIconForType(type) {
  const icons = {
    'poll': 'poll',
    'route': 'map',
    'confirmation': 'checkmark-circle',
    'alert': 'warning',
    'complaint': 'alert-circle',
    'feedback': 'star',
    'general': 'notifications'
  };
  return icons[type] || 'notifications';
}

function getColorForType(type) {
  const colors = {
    'poll': '#2196F3',
    'route': '#A1D826',
    'confirmation': '#4CAF50',
    'alert': '#FF9800',
    'complaint': '#F44336',
    'feedback': '#FFD700',
    'general': '#9E9E9E'
  };
  return colors[type] || '#9E9E9E';
}

// ==================== AUTHENTICATION ====================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 Login request:", { email, role });
    
    const user = await User.findOne({ email: email.toLowerCase(), password: password });
    
    if (!user) {
      console.log("❌ User not found or invalid password");
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const actualRole = user.role || user.type;
    
    console.log("✓ User found:", user.email);
    console.log("  - Role:", actualRole);
    console.log("  - Status:", user.status);
    
    if (role && actualRole !== role) {
      return res.status(403).json({
        success: false,
        message: `This account is registered as "${actualRole}", not "${role}".`
      });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: actualRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: actualRole,
      type: actualRole,
      phone: user.phone,
      company: user.company,
      status: user.status,
      approved: user.status === 'active',
      isApproved: user.status === 'active',
      isVerified: user.status === 'active',
      pickupPoint: user.pickupPoint,
      destination: user.destination,
      preferredTimeSlot: user.preferredTimeSlot,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      transporterId: user.transporterId,
      license: user.license,
      van: user.van,
      capacity: user.capacity,
      vehicle: user.vehicle,
      experience: user.experience,
      availableTimeSlots: user.availableTimeSlots,
      country: user.country,
      city: user.city,
      zone: user.zone,
      profileImage: user.profileImage,
      registrationDate: user.registrationDate,
    };
    
    console.log("✓ Login successful!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ success: true, token: token, user: userResponse });
    
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== PROFILE APIs ====================

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Profile request for user ID:", req.userId);
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("⚠️ User not found");
      return res.status(404).json({ message: 'User not found' });
    }
    
    const profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company,
      registrationDate: user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : new Date().toLocaleDateString(),
      address: user.address,
      license: user.license || 'N/A',
      location: user.address || 'N/A',
      profileImage: user.profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      country: user.country,
      city: user.city,
      zone: user.zone,
      status: user.status
    };
    
    console.log("📤 Sending profile for:", user.email);
    res.json(profileData);
    
  } catch (error) {
    console.error("❌ Profile error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/transporter/profile/:transporterId', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.params;
    console.log("📥 Transporter profile request for ID:", transporterId);
    
    const transporter = await User.findById(transporterId);
    
    if (!transporter) {
      return res.status(404).json({ success: false, message: 'Transporter not found' });
    }
    
    const profileData = {
      _id: transporter._id,
      id: transporter._id,
      name: transporter.name,
      email: transporter.email,
      phone: transporter.phone,
      phoneNumber: transporter.phone,
      company: transporter.company,
      companyName: transporter.company,
      address: transporter.address,
      license: transporter.license || 'N/A',
      licenseNumber: transporter.license || 'N/A',
      location: transporter.address || 'N/A',
      registrationDate: transporter.registrationDate,
      createdAt: transporter.registrationDate,
      status: transporter.status
    };
    
    res.json({ success: true, data: profileData, transporter: profileData });
  } catch (error) {
    console.error("❌ Profile error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const profileData = req.body;
    console.log("📥 Profile update for user ID:", req.userId);
    
    await User.findByIdAndUpdate(req.userId, profileData);
    
    console.log("✅ Profile updated");
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ message: 'Update failed' });
  }
});

app.put('/api/transporter/profile/:transporterId', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.params;
    const profileData = req.body;
    
    await User.findByIdAndUpdate(transporterId, profileData);
    
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    console.log("📊 Stats request for transporter:", targetTransporterId);

    const activeDrivers = await User.countDocuments({ 
      $or: [{ role: 'driver' }, { type: 'driver' }],
      status: 'active',
      transporterId: targetTransporterId
    });
    
    const totalPassengers = await User.countDocuments({ 
      $or: [{ role: 'passenger' }, { type: 'passenger' }],
      transporterId: targetTransporterId
    });
    
    const completedTrips = await Trip.countDocuments({ 
      status: 'Completed',
      transporterId: targetTransporterId
    });
    
    const ongoingTrips = await Trip.countDocuments({ 
      status: 'En Route',
      transporterId: targetTransporterId
    });
    
    const complaints = await Complaint.countDocuments({ 
      status: 'Open',
      transporterId: targetTransporterId
    });
    
    const driverPayments = await Payment.aggregate([
      { $match: { type: 'driver', status: 'Sent', transporterId: new mongoose.Types.ObjectId(targetTransporterId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const pendingPayments = await Payment.aggregate([
      { $match: { type: 'driver', status: 'Pending', transporterId: new mongoose.Types.ObjectId(targetTransporterId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      stats: {
        activeDrivers,
        totalPassengers,
        completedTrips,
        ongoingTrips,
        complaints,
        paymentsReceived: driverPayments[0]?.total || 0,
        paymentsPending: pendingPayments[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// ==================== CONTINUED IN NEXT MESSAGE ====================
// ==================== CONTINUED FROM PART 1 ====================

// ==================== POLLS APIs (Enhanced Flow) ====================

// Create Poll by Transporter
app.post('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { title, timeSlots, closesAt, closingDate, transporterId } = req.body;
    
    const targetTransporterId = transporterId || req.userId;
    
    console.log("📊 Creating poll for transporter:", targetTransporterId);
    
    const newPoll = new Poll({
      title: title || 'Tomorrow Travel Confirmation',
      question: 'Will you travel tomorrow?',
      timeSlots,
      closesAt,
      closingDate: closingDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
      transporterId: targetTransporterId,
      status: 'active',
      responses: []
    });
    
    await newPoll.save();
    
    // Send notifications to all passengers
    const passengers = await User.find({ 
      $or: [{ role: 'passenger' }, { type: 'passenger' }],
      transporterId: targetTransporterId,
      status: 'active'
    });
    
    console.log(`📨 Sending poll notifications to ${passengers.length} passengers`);
    
    for (const passenger of passengers) {
      await sendNotification(
        passenger._id,
        'passenger',
        'Travel Confirmation Required',
        `${title || 'Will you travel tomorrow?'} Please respond by ${closesAt}`,
        'poll',
        newPoll._id,
        'poll',
        true,
        'respond_poll'
      );
    }
    
    newPoll.notificationsSent = true;
    await newPoll.save();
    
    console.log("✅ Poll created and notifications sent");
    
    res.json({ success: true, poll: newPoll, notificationsSent: passengers.length });
  } catch (error) {
    console.error('❌ Error creating poll:', error);
    res.status(500).json({ success: false, message: 'Error creating poll' });
  }
});

// Get Polls
app.get('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const polls = await Poll.find({ transporterId: targetTransporterId })
      .populate('responses.passengerId')
      .sort({ createdAt: -1 });
        // YEH ADD KARO ⬇️
  const pollsWithResponse = polls.map(poll => {
    const userResponse = poll.responses.find(
      r => r.passengerId.toString() === req.userId.toString()
    );
    return {
      ...poll.toObject(),
      hasResponded: !!userResponse  // ⬅️ YEH LINE!
    };
  });
    
    res.json({ success: true, polls, data: polls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ success: false, message: 'Error fetching polls' });
  }
  
});

// Get Active Polls for Passenger
// ==================== BACKEND FIX - Add this to server.js ====================

// REPLACE YOUR EXISTING /polls/active ENDPOINT WITH THIS:

app.get('/api/polls/active', authenticateToken, async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Fetching active polls for user:", req.userId);
    
    // Get user details
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log("✓ User found:", user.email);
    console.log("  - Role:", user.role || user.type);
    console.log("  - TransporterId:", user.transporterId);
    
    // Find all active polls for this transporter
    const query = {
      status: 'active',
      closingDate: { $gte: new Date() }
    };
    
    // If user has transporterId, filter by it
    if (user.transporterId) {
      query.transporterId = user.transporterId;
    }
    
    console.log("🔍 Query:", JSON.stringify(query, null, 2));
    
    const polls = await Poll.find(query).sort({ createdAt: -1 });
    
    console.log(`✓ Found ${polls.length} active polls`);
    
    // Add hasResponded flag for each poll
    const pollsWithResponse = polls.map(poll => {
      const userResponse = poll.responses.find(
        r => r.passengerId && r.passengerId.toString() === req.userId.toString()
      );
      
      const pollData = {
        ...poll.toObject(),
        hasResponded: !!userResponse,
        userResponse: userResponse || null
      };
      
      console.log(`  - Poll: ${poll.title} | HasResponded: ${!!userResponse}`);
      
      return pollData;
    });
    
    console.log("✅ Returning polls with hasResponded flags");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ 
      success: true, 
      polls: pollsWithResponse,
      count: pollsWithResponse.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching active polls:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching polls',
      error: error.message 
    });
  }
});

// ==================== ALSO UPDATE THE POLL RESPONSE ENDPOINT ====================

// REPLACE YOUR EXISTING /polls/:pollId/respond ENDPOINT:

app.post('/api/polls/:pollId/respond', authenticateToken, async (req, res) => {
  try {
    const { pollId } = req.params;
    const { response, selectedTimeSlot, pickupPoint } = req.body;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 Poll Response Submission");
    console.log("  - Poll ID:", pollId);
    console.log("  - User ID:", req.userId);
    console.log("  - Response:", response);
    console.log("  - Time Slot:", selectedTimeSlot);
    console.log("  - Pickup:", pickupPoint);
    
    const poll = await Poll.findById(pollId);
    
    if (!poll) {
      console.log("❌ Poll not found");
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    
    if (poll.status !== 'active') {
      console.log("❌ Poll is not active");
      return res.status(400).json({ success: false, message: 'Poll is closed' });
    }
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log("✓ User:", user.name, user.email);
    
    // Check if already responded
    const existingResponseIndex = poll.responses.findIndex(
      r => r.passengerId && r.passengerId.toString() === req.userId.toString()
    );
    
    if (existingResponseIndex !== -1) {
      // Update existing response
      console.log("📝 Updating existing response");
      poll.responses[existingResponseIndex] = {
        passengerId: req.userId,
        passengerName: user.name,
        passengerEmail: user.email,
        response,
        selectedTimeSlot: response === 'yes' ? selectedTimeSlot : null,
        pickupPoint: response === 'yes' ? (pickupPoint || user.pickupPoint) : null,
        respondedAt: new Date()
      };
    } else {
      // Add new response
      console.log("📝 Adding new response");
      poll.responses.push({
        passengerId: req.userId,
        passengerName: user.name,
        passengerEmail: user.email,
        response,
        selectedTimeSlot: response === 'yes' ? selectedTimeSlot : null,
        pickupPoint: response === 'yes' ? (pickupPoint || user.pickupPoint) : null,
        respondedAt: new Date()
      });
    }
    
    await poll.save();
    
    console.log("✅ Response saved successfully");
    console.log(`  - Total responses: ${poll.responses.length}`);
    console.log(`  - Yes: ${poll.responses.filter(r => r.response === 'yes').length}`);
    console.log(`  - No: ${poll.responses.filter(r => r.response === 'no').length}`);
    
    // Send notification to transporter
    if (poll.transporterId) {
      await sendNotification(
        poll.transporterId,
        'transporter',
        'New Poll Response',
        `${user.name} responded: ${response === 'yes' ? 'Will travel' : 'Will not travel'}${response === 'yes' ? ` at ${selectedTimeSlot}` : ''}`,
        'poll',
        poll._id,
        'poll',
        false
      );
      console.log("✅ Notification sent to transporter");
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ 
      success: true, 
      message: 'Response recorded successfully',
      poll: {
        ...poll.toObject(),
        totalResponses: poll.responses.length,
        yesCount: poll.responses.filter(r => r.response === 'yes').length,
        noCount: poll.responses.filter(r => r.response === 'no').length
      }
    });
    
  } catch (error) {
    console.error('❌ Error responding to poll:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting response',
      error: error.message 
    });
  }
});

// ==================== HELPER: CHECK TRANSPORTER ID ====================

// Add this endpoint to debug transporterId issues:
app.get('/api/debug/check-transporter', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const polls = await Poll.find({ status: 'active' });
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || user.type,
        transporterId: user.transporterId
      },
      activePolls: polls.map(p => ({
        id: p._id,
        title: p.title,
        transporterId: p.transporterId,
        matches: user.transporterId && 
                 user.transporterId.toString() === p.transporterId.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post('/api/polls/:pollId/respond', authenticateToken, async (req, res) => {
  try {
    const { pollId } = req.params;
    const { response, selectedTimeSlot, pickupPoint } = req.body;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝 Poll Response Submission");
    console.log("  - Poll ID:", pollId);
    console.log("  - User ID:", req.userId);
    console.log("  - Response:", response);
    console.log("  - Time Slot:", selectedTimeSlot);
    console.log("  - Pickup:", pickupPoint);
    
    const poll = await Poll.findById(pollId);
    
    if (!poll) {
      console.log("❌ Poll not found");
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    
    if (poll.status !== 'active') {
      console.log("❌ Poll is not active");
      return res.status(400).json({ success: false, message: 'Poll is closed' });
    }
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log("✓ User:", user.name, user.email);
    
    // Check if already responded
    const existingResponseIndex = poll.responses.findIndex(
      r => r.passengerId && r.passengerId.toString() === req.userId.toString()
    );
    
    if (existingResponseIndex !== -1) {
      // Update existing response
      console.log("📝 Updating existing response");
      poll.responses[existingResponseIndex] = {
        passengerId: req.userId,
        passengerName: user.name,
        passengerEmail: user.email,
        response,
        selectedTimeSlot: response === 'yes' ? selectedTimeSlot : null,
        pickupPoint: response === 'yes' ? (pickupPoint || user.pickupPoint) : null,
        respondedAt: new Date()
      };
    } else {
      // Add new response
      console.log("📝 Adding new response");
      poll.responses.push({
        passengerId: req.userId,
        passengerName: user.name,
        passengerEmail: user.email,
        response,
        selectedTimeSlot: response === 'yes' ? selectedTimeSlot : null,
        pickupPoint: response === 'yes' ? (pickupPoint || user.pickupPoint) : null,
        respondedAt: new Date()
      });
    }
    
    await poll.save();
    
    console.log("✅ Response saved successfully");
    console.log(`  - Total responses: ${poll.responses.length}`);
    console.log(`  - Yes: ${poll.responses.filter(r => r.response === 'yes').length}`);
    console.log(`  - No: ${poll.responses.filter(r => r.response === 'no').length}`);
    
    // Send notification to transporter
    if (poll.transporterId) {
      await sendNotification(
        poll.transporterId,
        'transporter',
        'New Poll Response',
        `${user.name} responded: ${response === 'yes' ? 'Will travel' : 'Will not travel'}${response === 'yes' ? ` at ${selectedTimeSlot}` : ''}`,
        'poll',
        poll._id,
        'poll',
        false
      );
      console.log("✅ Notification sent to transporter");
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ 
      success: true, 
      message: 'Response recorded successfully',
      poll: {
        ...poll.toObject(),
        totalResponses: poll.responses.length,
        yesCount: poll.responses.filter(r => r.response === 'yes').length,
        noCount: poll.responses.filter(r => r.response === 'no').length
      }
    });
    
  } catch (error) {
    console.error('❌ Error responding to poll:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting response',
      error: error.message 
    });
  }
});

// ==================== HELPER: CHECK TRANSPORTER ID ====================

// Add this endpoint to debug transporterId issues:
app.get('/api/debug/check-transporter', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const polls = await Poll.find({ status: 'active' });
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || user.type,
        transporterId: user.transporterId
      },
      activePolls: polls.map(p => ({
        id: p._id,
        title: p.title,
        transporterId: p.transporterId,
        matches: user.transporterId && 
                 user.transporterId.toString() === p.transporterId.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Close Poll
app.put('/api/polls/:pollId/close', authenticateToken, async (req, res) => {
  try {
    const poll = await Poll.findByIdAndUpdate(
      req.params.pollId,
      { status: 'closed' },
      { new: true }
    );
    
    res.json({ success: true, poll });
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ success: false, message: 'Error closing poll' });
  }
});

// Get Poll Responses Summary
app.get('/api/polls/:pollId/responses', authenticateToken, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId).populate('responses.passengerId');
    
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    
    const yesResponses = poll.responses.filter(r => r.response === 'yes');
    const noResponses = poll.responses.filter(r => r.response === 'no');
    
    res.json({ 
      success: true, 
      summary: {
        total: poll.responses.length,
        yes: yesResponses.length,
        no: noResponses.length,
        yesResponses,
        noResponses
      }
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ success: false, message: 'Error fetching responses' });
  }
});

// ==================== DRIVER AVAILABILITY APIs ====================

// Driver confirms availability
app.post('/api/availability', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime, status } = req.body;
    
    const driver = await User.findById(req.userId);
    
    if (!driver || (driver.role !== 'driver' && driver.type !== 'driver')) {
      return res.status(403).json({ success: false, message: 'Only drivers can set availability' });
    }
    
    // Check if availability already exists for this date
    let availability = await DriverAvailability.findOne({
      driverId: req.userId,
      date: new Date(date)
    });
    
    if (availability) {
      // Update existing
      availability.startTime = startTime;
      availability.endTime = endTime;
      availability.status = status;
      availability.confirmed = true;
    } else {
      // Create new
      availability = new DriverAvailability({
        driverId: req.userId,
        driverName: driver.name,
        date: new Date(date),
        startTime,
        endTime,
        status,
        confirmed: true,
        transporterId: driver.transporterId
      });
    }
    
    await availability.save();
    
    // Send notification to transporter
    if (driver.transporterId) {
      await sendNotification(
        driver.transporterId,
        'transporter',
        'Driver Availability Update',
        `${driver.name} is ${status} for ${new Date(date).toLocaleDateString()}`,
        'confirmation',
        availability._id,
        'availability',
        false
      );
    }
    
    console.log(`✅ Driver availability set: ${driver.name} - ${status}`);
    
    res.json({ success: true, availability });
  } catch (error) {
    console.error('❌ Error setting availability:', error);
    res.status(500).json({ success: false, message: 'Error setting availability' });
  }
});

// Get driver availability
app.get('/api/availability', authenticateToken, async (req, res) => {
  try {
    const { driverId, transporterId, date } = req.query;
    
    let query = {};
    
    if (driverId) {
      query.driverId = driverId;
    } else if (req.userRole === 'driver') {
      query.driverId = req.userId;
    }
    
    if (transporterId) {
      query.transporterId = transporterId;
    }
    
    if (date) {
      query.date = new Date(date);
    }
    
    const availability = await DriverAvailability.find(query)
      .populate('driverId')
      .sort({ date: -1 });
    
    res.json({ success: true, availability, data: availability });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ success: false, message: 'Error fetching availability' });
  }
});

// Get available drivers for a date
app.get('/api/availability/drivers', authenticateToken, async (req, res) => {
  try {
    const { date, transporterId } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    const targetTransporterId = transporterId || req.userId;
    
    const availableDrivers = await DriverAvailability.find({
      date: targetDate,
      status: 'available',
      confirmed: true,
      transporterId: targetTransporterId
    }).populate('driverId');
    
    res.json({ success: true, drivers: availableDrivers });
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    res.status(500).json({ success: false, message: 'Error fetching drivers' });
  }
});

// ==================== ROUTES APIs (Enhanced) ====================

// Create Route
app.post('/api/routes', authenticateToken, async (req, res) => {
  try {
    const { name, stops, destination, transporterId } = req.body;
    
    const targetTransporterId = transporterId || req.userId;
    
    const newRoute = new Route({
      name,
      routeName: name,
      stops,
      destination,
      transporterId: targetTransporterId,
      status: 'assigned'
    });
    
    await newRoute.save();
    
    res.json({ success: true, route: newRoute, data: newRoute });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(500).json({ success: false, message: 'Error creating route' });
  }
});

// Get Routes
app.get('/api/routes', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const routes = await Route.find({ transporterId: targetTransporterId })
      .populate('assignedDriver')
      .populate('passengers.passengerId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, routes, data: routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ success: false, message: 'Error fetching routes' });
  }
});

// Assign Route to Driver (Based on Poll Responses and Driver Availability)
app.post('/api/routes/assign', authenticateToken, async (req, res) => {
  try {
    const { 
      pollId, 
      driverId, 
      routeName, 
      startPoint, 
      destination, 
      timeSlot, 
      pickupTime,
      date 
    } = req.body;
    
    console.log("📍 Assigning route to driver:", driverId);
    
    // Get poll responses (passengers who said yes)
    const poll = await Poll.findById(pollId);
    
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    
    const yesResponses = poll.responses.filter(r => r.response === 'yes');
    
    if (yesResponses.length === 0) {
      return res.status(400).json({ success: false, message: 'No passengers confirmed travel' });
    }
    
    // Check driver availability
    const driverAvailability = await DriverAvailability.findOne({
      driverId,
      date: new Date(date),
      status: 'available',
      confirmed: true
    });
    
    if (!driverAvailability) {
      return res.status(400).json({ success: false, message: 'Driver not available for this date' });
    }
    
    const driver = await User.findById(driverId);
    
    // Create route
    const passengers = yesResponses.map(r => ({
      passengerId: r.passengerId,
      passengerName: r.passengerName,
      pickupPoint: r.pickupPoint,
      status: 'pending'
    }));
    
    const stops = [...new Set(passengers.map(p => p.pickupPoint))];
    
    const newRoute = new Route({
      name: routeName,
      routeName,
      stops,
      startPoint,
      destination,
      assignedDriver: driverId,
      driverName: driver.name,
      timeSlot,
      pickupTime,
      passengers,
      status: 'assigned',
      transporterId: driver.transporterId,
      date: new Date(date)
    });
    
    await newRoute.save();
    
    // Create Trip
    const newTrip = new Trip({
      driverId,
      driverName: driver.name,
      routeId: newRoute._id,
      routeName,
      status: 'Scheduled',
      currentStop: startPoint,
      currentLocation: {
        latitude: 33.6844,
        longitude: 73.0479
      },
      passengers: passengers.map(p => ({
        _id: p.passengerId,
        name: p.passengerName,
        pickupPoint: p.pickupPoint,
        status: 'pending',
        confirmedMorning: false
      })),
      stops,
      completedStops: [],
      timeSlot,
      capacity: driver.capacity || 8,
      vehicleType: driver.vehicle || 'Van',
      vehicleNumber: driver.van || 'N/A',
      transporterId: driver.transporterId
    });
    
    await newTrip.save();
    
    // Send notification to driver
    await sendNotification(
      driverId,
      'driver',
      'Route Assigned',
      `You have been assigned to ${routeName} with ${passengers.length} passengers for ${new Date(date).toLocaleDateString()}`,
      'route',
      newRoute._id,
      'route',
      true,
      'confirm_route'
    );
    
    // Send notifications to passengers
    for (const passenger of passengers) {
      await sendNotification(
        passenger.passengerId,
        'passenger',
        'Route Confirmed',
        `Your route has been confirmed! Driver: ${driver.name}, Pickup: ${pickupTime}`,
        'route',
        newRoute._id,
        'route',
        false
      );
    }
    
    console.log(`✅ Route assigned: ${routeName} to ${driver.name} with ${passengers.length} passengers`);
    
    res.json({ 
      success: true, 
      route: newRoute, 
      trip: newTrip,
      message: 'Route assigned successfully' 
    });
  } catch (error) {
    console.error('❌ Error assigning route:', error);
    res.status(500).json({ success: false, message: 'Error assigning route' });
  }
});

// Update Route
app.put('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const updatedRoute = await Route.findByIdAndUpdate(
      req.params.routeId,
      req.body,
      { new: true }
    );
    res.json({ success: true, route: updatedRoute });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ success: false, message: 'Error updating route' });
  }
});

// Delete Route
app.delete('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.routeId);
    res.json({ success: true, message: 'Route deleted' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ success: false, message: 'Error deleting route' });
  }
});

// ==================== MORNING CONFIRMATION APIs ====================

// Send morning confirmation notifications (Called by transporter or scheduled job)
app.post('/api/trips/:tripId/send-morning-confirmation', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('driverId')
      .populate('passengers._id');
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    // Send to driver
    await sendNotification(
      trip.driverId._id,
      'driver',
      'Morning Confirmation Required',
      'Please confirm you are ready to start your route',
      'confirmation',
      trip._id,
      'trip',
      true,
      'confirm_trip'
    );
    
    // Send to all passengers
    for (const passenger of trip.passengers) {
      await sendNotification(
        passenger._id,
        'passenger',
        'Final Travel Confirmation',
        'Are you still traveling today? Van will arrive soon!',
        'confirmation',
        trip._id,
        'trip',
        true,
        'confirm_trip'
      );
    }
    
    console.log(`✅ Morning confirmations sent for trip: ${trip.routeName}`);
    
    res.json({ success: true, message: 'Confirmations sent', notificationsSent: trip.passengers.length + 1 });
  } catch (error) {
    console.error('❌ Error sending confirmations:', error);
    res.status(500).json({ success: false, message: 'Error sending confirmations' });
  }
});

// Passenger confirms morning travel
app.post('/api/trips/:tripId/confirm-passenger', authenticateToken, async (req, res) => {
  try {
    const { traveling } = req.body; // true or false
    
    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    const passenger = trip.passengers.find(p => p._id.toString() === req.userId.toString());
    
    if (!passenger) {
      return res.status(404).json({ success: false, message: 'Passenger not found in trip' });
    }
    
    passenger.confirmedMorning = true;
    
    if (!traveling) {
      passenger.status = 'missed';
    }
    
    await trip.save();
    
    // Notify driver and transporter
    const user = await User.findById(req.userId);
    const message = traveling ? 
      `${user.name} confirmed they are traveling` : 
      `${user.name} will not be traveling today`;
    
    await sendNotification(
      trip.driverId,
      'driver',
      'Passenger Update',
      message,
      'alert',
      trip._id,
      'trip',
      false
    );
    
    console.log(`✅ Passenger confirmation: ${user.name} - ${traveling ? 'traveling' : 'not traveling'}`);
    
    res.json({ success: true, message: 'Confirmation recorded' });
  } catch (error) {
    console.error('❌ Error confirming passenger:', error);
    res.status(500).json({ success: false, message: 'Error confirming' });
  }
});

// Driver confirms ready to start
app.post('/api/trips/:tripId/confirm-driver', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    if (trip.driverId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    trip.status = 'Ready';
    await trip.save();
    
    console.log(`✅ Driver confirmed ready: ${trip.driverName}`);
    
    res.json({ success: true, message: 'Driver confirmed ready' });
  } catch (error) {
    console.error('❌ Error confirming driver:', error);
    res.status(500).json({ success: false, message: 'Error confirming' });
  }
});

// ==================== TRIP MANAGEMENT APIs ====================

// Get Trips
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const { status, transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    let query = { transporterId: targetTransporterId };
    
    if (status) {
      query.status = status;
    }
    
    const trips = await Trip.find(query)
      .populate('driverId')
      .populate('routeId')
      .populate('passengers._id')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, trips, data: trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Error fetching trips' });
  }
});

// Start Trip (Driver)
app.post('/api/routes/:routeId/start', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    if (route.assignedDriver.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    route.status = 'started';
    await route.save();
    
    // Update trip
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      trip.status = 'En Route';
      trip.startTime = new Date();
      await trip.save();
      
      // Notify passengers
      for (const passenger of trip.passengers) {
        await sendNotification(
          passenger._id,
          'passenger',
          'Van Started',
          `Your van has started the route. ETA: ${trip.eta || '15 mins'}`,
          'alert',
          trip._id,
          'trip',
          false
        );
      }
    }
    
    console.log(`✅ Route started: ${route.routeName}`);
    
    res.json({ success: true, message: 'Route started', route, trip });
  } catch (error) {
    console.error('❌ Error starting route:', error);
    res.status(500).json({ success: false, message: 'Error starting route' });
  }
});

// End Trip (Driver)
app.post('/api/routes/:routeId/end', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    if (route.assignedDriver.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    route.status = 'completed';
    await route.save();
    
    // Update trip
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      trip.status = 'Completed';
      trip.endTime = new Date();
      await trip.save();
      
      // Notify passengers to provide feedback
      for (const passenger of trip.passengers) {
        if (passenger.status === 'completed') {
          await sendNotification(
            passenger._id,
            'passenger',
            'Trip Completed',
            'Please rate your experience with the driver',
            'feedback',
            trip._id,
            'trip',
            true,
            'give_feedback'
          );
        }
      }
    }
    
    console.log(`✅ Route completed: ${route.routeName}`);
    
    res.json({ success: true, message: 'Route completed', route, trip });
  } catch (error) {
    console.error('❌ Error ending route:', error);
    res.status(500).json({ success: false, message: 'Error ending route' });
  }
});

// Update Stop Status (Driver marks pickup/dropoff)
app.put('/api/routes/:routeId/stops/:stopId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body; // 'picked-up' or 'completed'
    
    const route = await Route.findById(req.params.routeId);
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    // Update passenger status
    const passenger = route.passengers.find(p => p._id.toString() === req.params.stopId);
    
    if (passenger) {
      passenger.status = status;
      await route.save();
    }
    
    // Update trip
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      const tripPassenger = trip.passengers.find(p => p._id.toString() === req.params.stopId);
      
      if (tripPassenger) {
        tripPassenger.status = status;
        
        if (status === 'picked-up') {
          tripPassenger.pickupTime = new Date().toLocaleTimeString();
          
          // Notify passenger
          await sendNotification(
            tripPassenger._id,
            'passenger',
            'You have been picked up',
            'You are now on board. Have a safe journey!',
            'alert',
            trip._id,
            'trip',
            false
          );
        } else if (status === 'completed') {
          // Notify passenger
          await sendNotification(
            tripPassenger._id,
            'passenger',
            'You have reached your destination',
            'Thank you for traveling with us!',
            'alert',
            trip._id,
            'trip',
            false
          );
        }
        
        await trip.save();
      }
    }
    
    res.json({ success: true, stop: passenger, trip });
  } catch (error) {
    console.error('❌ Error updating stop:', error);
    res.status(500).json({ success: false, message: 'Error updating stop' });
  }
});

// ==================== REAL-TIME LOCATION TRACKING APIs ====================

// Update Live Location (Driver)
app.post('/api/live-tracking/location', authenticateToken, async (req, res) => {
  try {
    const { routeId, latitude, longitude, speed, heading } = req.body;
    
    const trip = await Trip.findOne({ routeId });
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    if (trip.driverId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    trip.currentLocation = { latitude, longitude };
    trip.speed = speed;
    trip.updatedAt = new Date();
    
    await trip.save();
    
    // You can broadcast this to passengers in real-time using WebSocket/Socket.io
    
    res.json({ success: true, location: trip.currentLocation });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ success: false, message: 'Error updating location' });
  }
});

// Get Current Location (Passenger)
app.get('/api/live-tracking/location/:tripId', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    res.json({ 
      success: true, 
      location: trip.currentLocation,
      speed: trip.speed,
      eta: trip.eta,
      currentStop: trip.currentStop,
      status: trip.status
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ success: false, message: 'Error fetching location' });
  }
});

// ==================== COMPLAINTS APIs (Enhanced) ====================

// Create Complaint
app.post('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      againstUserId, 
      againstName,
      tripId 
    } = req.body;
    
    const user = await User.findById(req.userId);
    
    const complaint = new Complaint({
      title,
      description,
      category,
      byUserId: req.userId,
      byName: user.name,
      byRole: user.role || user.type,
      againstUserId,
      againstName,
      tripId,
      status: 'Open',
      priority: 'medium',
      transporterId: user.transporterId
    });
    
    await complaint.save();
    
    // Notify transporter
    if (user.transporterId) {
      await sendNotification(
        user.transporterId,
        'transporter',
        'New Complaint Received',
        `${user.name} filed a complaint: ${title}`,
        'complaint',
        complaint._id,
        'complaint',
        true
      );
    }
    
    console.log(`✅ Complaint filed: ${title} by ${user.name}`);
    
    res.json({ success: true, complaint });
  } catch (error) {
    console.error('❌ Error creating complaint:', error);
    res.status(500).json({ success: false, message: 'Error creating complaint' });
  }
});

// Get Complaints
app.get('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const complaints = await Complaint.find({ transporterId: targetTransporterId })
      .populate('byUserId')
      .populate('againstUserId')
      .populate('tripId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, complaints, data: complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, message: 'Error fetching complaints' });
  }
});

// Reply to Complaint
app.post('/api/complaints/:complaintId/reply', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    const complaint = await Complaint.findById(req.params.complaintId);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    const user = await User.findById(req.userId);
    
    complaint.replies.push({
      by: user.name,
      byRole: user.role || user.type,
      text,
      date: new Date()
    });
    
    complaint.status = 'In Progress';
    
    await complaint.save();
    
    // Notify complaint creator
    await sendNotification(
      complaint.byUserId,
      complaint.byRole,
      'Complaint Update',
      `You have a new reply on your complaint: ${complaint.title}`,
      'complaint',
      complaint._id,
      'complaint',
      false
    );
    
    res.json({ success: true, complaint });
  } catch (error) {
    console.error('Error replying to complaint:', error);
    res.status(500).json({ success: false, message: 'Error replying' });
  }
});

// Resolve Complaint
app.put('/api/complaints/:complaintId/resolve', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      { 
        status: 'Resolved',
        resolvedAt: new Date()
      },
      { new: true }
    );
    
    // Notify complaint creator
    await sendNotification(
      complaint.byUserId,
      complaint.byRole,
      'Complaint Resolved',
      `Your complaint has been resolved: ${complaint.title}`,
      'complaint',
      complaint._id,
      'complaint',
      false
    );
    
    res.json({ success: true, complaint });
  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({ success: false, message: 'Error resolving' });
  }
});

// ==================== FEEDBACK APIs ====================

// Submit Feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const {
      tripId,
      driverId,
      passengerId,
      rating,
      comment,
      categories
    } = req.body;
    
    const user = await User.findById(req.userId);
    const givenBy = user.role || user.type;
    
    let driverName, passengerName;
    
    if (givenBy === 'passenger') {
      const driver = await User.findById(driverId);
      driverName = driver.name;
      passengerName = user.name;
    } else {
      const passenger = await User.findById(passengerId);
      passengerName = passenger.name;
      driverName = user.name;
    }
    
    const feedback = new Feedback({
      tripId,
      driverId,
      driverName,
      passengerId,
      passengerName,
      givenBy,
      rating,
      comment,
      categories,
      transporterId: user.transporterId
    });
    
    await feedback.save();
    
    // Update trip with rating
    await Trip.findByIdAndUpdate(tripId, { rating });
    
    // Notify the other party
    const notifyUserId = givenBy === 'passenger' ? driverId : passengerId;
    const notifyRole = givenBy === 'passenger' ? 'driver' : 'passenger';
    
    await sendNotification(
      notifyUserId,
      notifyRole,
      'Feedback Received',
      `You received ${rating} stars rating`,
      'feedback',
      feedback._id,
      'feedback',
      false
    );
    
    console.log(`✅ Feedback submitted: ${rating} stars by ${user.name}`);
    
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Error submitting feedback' });
  }
});

// Get Feedback
app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { driverId, passengerId, tripId } = req.query;
    
    let query = {};
    
    if (driverId) query.driverId = driverId;
    if (passengerId) query.passengerId = passengerId;
    if (tripId) query.tripId = tripId;
    
    const feedback = await Feedback.find(query)
      .populate('driverId')
      .populate('passengerId')
      .populate('tripId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, feedback, data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ success: false, message: 'Error fetching feedback' });
  }
});

// Get Driver Rating Summary
app.get('/api/feedback/driver/:driverId/summary', async (req, res) => {
  try {
    const feedback = await Feedback.find({ driverId: req.params.driverId });
    
    if (feedback.length === 0) {
      return res.json({ 
        success: true, 
        summary: { 
          averageRating: 0, 
          totalFeedback: 0,
          ratings: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        } 
      });
    }
    
    const totalRating = feedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = (totalRating / feedback.length).toFixed(1);
    
    const ratings = {
      5: feedback.filter(f => f.rating === 5).length,
      4: feedback.filter(f => f.rating === 4).length,
      3: feedback.filter(f => f.rating === 3).length,
      2: feedback.filter(f => f.rating === 2).length,
      1: feedback.filter(f => f.rating === 1).length
    };
    
    res.json({ 
      success: true, 
      summary: { 
        averageRating: parseFloat(averageRating), 
        totalFeedback: feedback.length,
        ratings
      } 
    });
  } catch (error) {
    console.error('Error fetching rating summary:', error);
    res.status(500).json({ success: false, message: 'Error fetching summary' });
  }
});

// ==================== NOTIFICATIONS APIs ====================

// Get Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    
    let query = {};
    
    if (req.userRole === 'transporter') {
      query.userId = req.userId;
    } else {
      query.userId = req.userId;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unread = notifications.filter(n => !n.read).length;
    
    res.json({ 
      success: true, 
      notifications, 
      data: notifications,
      counts: {
        total: notifications.length,
        unread
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Mark Notification as Read
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.notificationId,
      { read: true },
      { new: true }
    );
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification:', error);
    res.status(500).json({ success: false, message: 'Error updating notification' });
  }
});

// Mark All as Read
app.put('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications:', error);
    res.status(500).json({ success: false, message: 'Error updating notifications' });
  }
});

// ==================== EXISTING APIs (USERS, REQUESTS, ETC.) ====================

// Get Users
app.get('/api/users', async (req, res) => {
  try {
    const { role, status, transporterId } = req.query;
    let query = {};
    
    if (role) {
      query.$or = [{ role }, { type: role }];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (transporterId) {
      query.transporterId = transporterId;
    }
    
    const users = await User.find(query);
    console.log(`✅ Found ${users.length} users`);
    
    res.json({ success: true, users, count: users.length, data: users });
  } catch (error) {
    console.error('❌ Users fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

// Passenger Request
app.post('/api/passenger/request', async (req, res) => {
  try {
    const { fullName, email, phone, password, address, latitude, longitude, transporterId } = req.body;

    console.log("📥 Passenger request received:", { fullName, email, transporterId });

    if (!fullName || !email || !phone || !password || !transporterId) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const newRequest = new JoinRequest({
      name: fullName,
      email: email.toLowerCase(),
      phone,
      password,
      type: 'passenger',
      location: address,
      pickupPoint: address,
      latitude,
      longitude,
      transporterId,
      status: 'pending'
    });

    await newRequest.save();
    
    console.log("✅ Passenger request created");
    
    res.json({ success: true, message: 'Request sent', requestId: newRequest._id });
  } catch (error) {
    console.error("❌ Passenger request error:", error);
    res.status(500).json({ success: false, message: 'Failed to send request' });
  }
});

// Get Passenger Request Status
app.get('/api/passenger/request-status/:requestId', async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.json({ success: false, message: 'Request not found' });
    }

    res.json({
      success: true,
      status: request.status,
      approved: request.status === 'accepted',
      rejected: request.status === 'rejected'
    });
  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({ success: false, message: 'Error checking status' });
  }
});

// Get Pending Requests
app.get('/api/join-requests', authenticateToken, async (req, res) => {
  try {
    const { type, transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    let filter = { 
      transporterId: targetTransporterId,
      status: 'pending'
    };
    
    if (type) {
      filter.type = type;
    }
    
    const requests = await JoinRequest.find(filter)
      .populate('transporterId')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${requests.length} pending requests`);
    
    res.json({ success: true, requests, data: requests, count: requests.length });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ success: false, message: 'Error fetching requests' });
  }
});

// Approve Request
app.put('/api/join-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    request.status = 'accepted';
    await request.save();

    const newUser = new User({
      name: request.name,
      email: request.email,
      phone: request.phone,
      password: request.password,
      role: request.type,
      type: request.type,
      vehicle: request.vehicle,
      capacity: request.capacity,
      experience: request.experience,
      license: request.license,
      availableTimeSlots: request.availableTimeSlots,
      pickupPoint: request.pickupPoint,
      destination: request.destination,
      preferredTimeSlot: request.preferredTimeSlot,
      latitude: request.latitude,
      longitude: request.longitude,
      transporterId: request.transporterId,
      status: 'active'
    });

    await newUser.save();
    
    // Send notification
    await sendNotification(
      newUser._id,
      newUser.role,
      'Request Approved',
      'Your registration request has been approved!',
      'confirmation',
      null,
      null,
      false
    );
    
    console.log("✅ Request approved:", newUser.email);
    
    res.json({ success: true, message: 'Request accepted', user: newUser });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ success: false, message: 'Error accepting request' });
  }
});

// Reject Request
app.put('/api/join-requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();
    
    console.log("✅ Request rejected");
    
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ success: false, message: 'Error rejecting request' });
  }
});

// Get Passengers
app.get('/api/passengers', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const passengers = await User.find({ 
      $or: [{ role: 'passenger' }, { type: 'passenger' }],
      transporterId: targetTransporterId
    });
    
    res.json({ success: true, passengers, data: passengers });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({ success: false, message: 'Error fetching passengers' });
  }
});

// Get Drivers
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const drivers = await User.find({ 
      $or: [{ role: 'driver' }, { type: 'driver' }],
      transporterId: targetTransporterId
    });
    
    res.json({ success: true, drivers, data: drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Error fetching drivers' });
  }
});

// Get Payments
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { type, transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    let filter = { transporterId: targetTransporterId };
    
    if (type) {
      filter.type = type;
    }
    
    const payments = await Payment.find(filter)
      .populate('driverId')
      .populate('passengerId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, payments, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

// Create Payment
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const newPayment = new Payment(req.body);
    await newPayment.save();
    res.json({ success: true, payment: newPayment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, message: 'Error creating payment' });
  }
});

// ==================== TRANSPORTER AUTH ====================

app.post('/api/transporter/register', async (req, res) => {
  try {
    const { fullName, companyName, phone, country, city, zone, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email exists' });
    }

    const newTransporter = new User({
      name: fullName,
      email: email.toLowerCase(),
      password,
      role: 'transporter',
      type: 'transporter',
      phone,
      company: companyName,
      license: `TRANS${Date.now()}`,
      address: `${zone}, ${city}, ${country}`,
      country,
      city,
      zone,
      status: 'active'
    });

    await newTransporter.save();
    
    console.log("✅ New transporter registered:", newTransporter.email);
    
    res.status(201).json({ success: true, message: 'Registered!', transporter: newTransporter });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

app.post('/api/transporter/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 Transporter login:", { email });

    const transporter = await User.findOne({ 
      email: email.toLowerCase(), 
      $or: [{ role: 'transporter' }, { type: 'transporter' }]
    });

    if (!transporter || password !== transporter.password) {
      console.log("❌ Invalid credentials");
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: transporter._id, email: transporter.email, role: 'transporter' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log("✅ Transporter logged in:", transporter.email);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      transporter: {
        id: transporter._id,
        name: transporter.name,
        email: transporter.email,
        phone: transporter.phone,
        company: transporter.company,
        address: transporter.address,
        country: transporter.country,
        city: transporter.city,
        zone: transporter.zone
      }
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server Working ✅',
    timestamp: new Date().toISOString(),
    features: [
      'Poll System',
      'Driver Availability',
      'Route Assignment',
      'Morning Confirmation',
      'Real-time Tracking',
      'Complaints',
      'Feedback',
      'Notifications'
    ]
  });
});

// ==================== SERVER START ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║  🚀 SERVER RUNNING                             ║
║  📡 IP: 192.168.10.6                          ║
║  🔌 PORT: ${PORT}                              ║
║  ✅ All APIs Working                           ║
║  ✅ JWT Authentication Enabled                 ║
║  ✅ Poll System Active                         ║
║  ✅ Real-time Tracking Active                  ║
║  ✅ Notifications System Active                ║
╚════════════════════════════════════════════════╝
  `);
});