const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret
const JWT_SECRET = 'your-secret-key-change-in-production';

// ==================== FILE UPLOAD SETUP ====================

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created');
}

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer Upload Configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded files

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
  vehicleNo: String,
  pickupPoint: String,
  destination: String,
  selectedTimeSlot: String,
  preferredTimeSlot: String,
  latitude: Number,
  longitude: Number,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fcmToken: String
});

userSchema.pre('save', function(next) {
  if (this.type && !this.role) this.role = this.type;
  if (this.role && !this.type) this.type = this.role;
  next();
});

const User = mongoose.model('User', userSchema);

const pollSchema = new mongoose.Schema({
  title: String,
  question: { type: String, default: 'Will you travel tomorrow?' },
  timeSlots: [String],
  closesAt: String,
  closingDate: Date,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'active' },
  responses: [{
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passengerName: String,
    passengerEmail: String,
    response: String,
    selectedTimeSlot: String,
    pickupPoint: String,
    respondedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  notificationsSent: { type: Boolean, default: false }
});

const Poll = mongoose.model('Poll', pollSchema);

const driverAvailabilitySchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  date: Date,
  startTime: String,
  endTime: String,
  status: { type: String, default: 'available' },
  confirmed: { type: Boolean, default: false },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const DriverAvailability = mongoose.model('DriverAvailability', driverAvailabilitySchema);

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
    status: { type: String, default: 'pending' }
  }],
  status: { type: String, default: 'assigned' },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  createdAt: { type: Date, default: Date.now }
});

const Route = mongoose.model('Route', routeSchema);

const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  routeName: String,
  status: String,
  currentStop: String,
  currentLocation: { 
    latitude: Number, 
    longitude: Number 
  },
  passengers: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    pickupPoint: String,
    status: String,
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

const complaintSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: String,
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: String,
  byRole: String,
  againstUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  againstName: String,
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, default: 'Open' },
  priority: { type: String, default: 'medium' },
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

const feedbackSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  passengerName: String,
  givenBy: String,
  rating: Number,
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

const notificationSchema = new mongoose.Schema({
  title: String,
  message: String,
  type: String,
  icon: String,
  color: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: String,
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedType: String,
  actionRequired: { type: Boolean, default: false },
  actionType: String,
  read: { type: Boolean, default: false },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

const joinRequestSchema = new mongoose.Schema({
  name: String,
  fullName: String,
  email: String,
  phone: String,
  password: String,
  type: String,
  vehicle: String,
  vehicleNo: String,
  capacity: Number,
  experience: String,
  license: String,
  availableTimeSlots: [String],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
    address: String
  },
  address: String,
  pickupPoint: String,
  destination: String,
  preferredTimeSlot: String,
  latitude: Number,
  longitude: Number,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transporterName: String,
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
    req.user = decoded; // Add full user object for convenience
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ==================== HELPER FUNCTIONS ====================

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
      transporterId: user.transporterId || userId,
      pollId: relatedType === 'poll' ? relatedId : null
    });

    await notification.save();
    console.log(`✅ Notification sent to ${user.name}: ${title}`);
    
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
    'general': 'notifications',
    'request': 'person-add'
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
    'general': '#9E9E9E',
    'request': '#9C27B0'
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
      vehicleNo: user.vehicleNo,
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

// ==================== DRIVER REGISTRATION ENDPOINT ====================

app.post('/api/driver-requests', async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 DRIVER REQUEST RECEIVED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
    
    const { 
      fullName, 
      email, 
      phone, 
      password, 
      license, 
      vehicleNo,
      address,
      location,
      transporterId,
      transporterName
    } = req.body;

    // Validation
    if (!fullName || !email || !phone || !password || !license || !vehicleNo || !transporterId) {
      console.log("❌ VALIDATION FAILED - Missing required fields");
      const missing = [];
      if (!fullName) missing.push('fullName');
      if (!email) missing.push('email');
      if (!phone) missing.push('phone');
      if (!password) missing.push('password');
      if (!license) missing.push('license');
      if (!vehicleNo) missing.push('vehicleNo');
      if (!transporterId) missing.push('transporterId');
      
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missing.join(', ')}` 
      });
    }

    console.log("✅ All required fields present");

    // Check if email already exists
    console.log("🔍 Checking if email exists:", email);
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    const existingRequest = await JoinRequest.findOne({ email: email.toLowerCase(), status: 'pending' });
    
    if (existingUser) {
      console.log("❌ Email already registered as user");
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered. Please use a different email or login.' 
      });
    }

    if (existingRequest) {
      console.log("⚠️ Pending request already exists");
      return res.status(400).json({ 
        success: false, 
        message: 'A pending request already exists for this email. Please wait for approval.' 
      });
    }

    console.log("✅ Email is available");

    // Verify transporter exists
    console.log("🔍 Verifying transporter:", transporterId);
    const transporter = await User.findById(transporterId);
    
    if (!transporter) {
      console.log("❌ Transporter not found");
      return res.status(404).json({ 
        success: false, 
        message: 'Selected transporter not found' 
      });
    }

    console.log("✅ Transporter verified:", transporter.name || transporter.company);

    // Extract coordinates
    let latitude = null;
    let longitude = null;
    
    if (location && location.coordinates && location.coordinates.length === 2) {
      longitude = location.coordinates[0];
      latitude = location.coordinates[1];
    }

    // Create driver request
    console.log("📝 Creating driver request...");
    const newRequest = new JoinRequest({
      name: fullName.trim(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password.trim(),
      type: 'driver',
      license: license.trim().toUpperCase(),
      vehicleNo: vehicleNo.trim().toUpperCase(),
      vehicle: vehicleNo.trim().toUpperCase(),
      address: address || location?.address || 'Not provided',
      location: location || {},
      latitude: latitude,
      longitude: longitude,
      pickupPoint: address || location?.address || 'Not provided',
      transporterId: transporterId,
      transporterName: transporterName || transporter.name || transporter.company || 'Transporter',
      status: 'pending',
      createdAt: new Date()
    });

    console.log("💾 Saving request to database...");
    await newRequest.save();
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅✅✅ DRIVER REQUEST CREATED SUCCESSFULLY ✅✅✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Request Details:");
    console.log("  - Request ID:", newRequest._id);
    console.log("  - Driver Name:", fullName);
    console.log("  - Email:", email);
    console.log("  - License:", license);
    console.log("  - Vehicle:", vehicleNo);
    console.log("  - Transporter:", transporterName || transporter.name);
    console.log("  - Status:", newRequest.status);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Send notification to transporter
    try {
      await sendNotification(
        transporterId,
        'transporter',
        'New Driver Request',
        `${fullName} has requested to join as a driver. License: ${license}, Vehicle: ${vehicleNo}`,
        'request',
        newRequest._id,
        'driver_request',
        true,
        'review_driver_request'
      );
      console.log("✅ Notification sent to transporter");
    } catch (notifError) {
      console.error("⚠️ Failed to send notification:", notifError.message);
      // Don't fail the request if notification fails
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Driver request submitted successfully! You will be notified once approved.',
      requestId: newRequest._id,
      request: {
        id: newRequest._id,
        name: newRequest.name,
        email: newRequest.email,
        phone: newRequest.phone,
        license: newRequest.license,
        vehicleNo: newRequest.vehicleNo,
        status: newRequest.status,
        transporterName: newRequest.transporterName,
        createdAt: newRequest.createdAt
      }
    });
    
  } catch (error) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌❌❌ DRIVER REQUEST ERROR ❌❌❌");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit driver request. Please try again.',
      error: error.message 
    });
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
      status: transporter.status,
      profileImage: transporter.profileImage
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

// ==================== POLLS APIs ====================

app.post('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { title, timeSlots, closesAt, closingDate, transporterId } = req.body;
    
    const targetTransporterId = transporterId || req.userId;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Creating poll for transporter:", targetTransporterId);
    console.log("  - Title:", title);
    console.log("  - Time Slots:", timeSlots);
    console.log("  - Closes At:", closesAt);
    
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
    console.log("✅ Poll created:", newPoll._id);
    
    // Get all active passengers for this transporter
    const passengers = await User.find({ 
      $or: [{ role: 'passenger' }, { type: 'passenger' }],
      transporterId: targetTransporterId,
      status: 'active'
    });
    
    console.log(`📨 Found ${passengers.length} active passengers`);
    
    if (passengers.length === 0) {
      console.log("⚠️ No active passengers found");
      return res.json({ 
        success: true, 
        poll: newPoll, 
        notificationsSent: 0,
        message: 'Poll created but no active passengers found' 
      });
    }
    
    // Send notifications to all passengers
    let notificationsSent = 0;
    for (const passenger of passengers) {
      try {
        await sendNotification(
          passenger._id,
          'passenger',
          '📋 Travel Confirmation Required',
          `${title || 'Will you travel tomorrow?'} Please respond by ${closesAt}. Time slots: ${timeSlots.join(', ')}`,
          'poll',
          newPoll._id,
          'poll',
          true,
          'respond_poll'
        );
        notificationsSent++;
        console.log(`✅ Notification sent to: ${passenger.name} (${passenger.email})`);
      } catch (notifErr) {
        console.error(`⚠️ Failed to send notification to ${passenger.name}:`, notifErr);
      }
    }
    
    newPoll.notificationsSent = true;
    await newPoll.save();
    
    console.log(`✅ Poll created successfully! Notifications sent: ${notificationsSent}/${passengers.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ 
      success: true, 
      poll: newPoll, 
      notificationsSent: notificationsSent,
      totalPassengers: passengers.length,
      message: `Poll created and ${notificationsSent} passengers notified!`
    });
    
  } catch (error) {
    console.error('❌ Error creating poll:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating poll',
      error: error.message 
    });
  }
});

app.get('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    const polls = await Poll.find({ transporterId: targetTransporterId })
      .populate('responses.passengerId')
      .sort({ createdAt: -1 });
    
    const pollsWithResponse = polls.map(poll => {
      const userResponse = poll.responses.find(
        r => r.passengerId && r.passengerId.toString() === req.userId.toString()
      );
      return {
        ...poll.toObject(),
        hasResponded: !!userResponse
      };
    });
    
    res.json({ success: true, polls, data: polls });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ success: false, message: 'Error fetching polls' });
  }
});

app.get('/api/polls/active', authenticateToken, async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Fetching active polls for user:", req.userId);
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log("✓ User found:", user.email);
    console.log("  - Role:", user.role || user.type);
    console.log("  - TransporterId:", user.transporterId);
    
    const query = {
      status: 'active',
      closingDate: { $gte: new Date() }
    };
    
    if (user.transporterId) {
      query.transporterId = user.transporterId;
    }
    
    console.log("🔍 Query:", JSON.stringify(query, null, 2));
    
    const polls = await Poll.find(query).sort({ createdAt: -1 });
    
    console.log(`✓ Found ${polls.length} active polls`);
    
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

// FIXED: Get single poll by ID (changed from router to app)
app.get('/api/polls/:pollId', authenticateToken, async (req, res) => {
  try {
    const { pollId } = req.params;
    const passengerId = req.userId;

    console.log('📊 Fetching poll:', pollId, 'for passenger:', passengerId);

    // Find the poll
    const poll = await Poll.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found'
      });
    }

    // Check if poll is still active
    const now = new Date();
    const closingDate = new Date(poll.closingDate);

    if (now > closingDate || poll.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This poll has been closed'
      });
    }

    // Return poll with responses (needed to check if user already responded)
    const pollData = {
      _id: poll._id,
      title: poll.title,
      question: poll.question || 'Will you travel tomorrow?',
      timeSlots: poll.timeSlots || [],
      closesAt: poll.closesAt,
      closingDate: poll.closingDate,
      status: poll.status,
      transporterId: poll.transporterId,
      responses: poll.responses || [], // CRITICAL: Include all responses
      createdAt: poll.createdAt
    };

    console.log('✅ Poll found with', poll.responses?.length || 0, 'responses');

    res.json({
      success: true,
      poll: pollData
    });

  } catch (error) {
    console.error('❌ Error fetching poll:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch poll',
      error: error.message
    });
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
    
    const existingResponseIndex = poll.responses.findIndex(
      r => r.passengerId && r.passengerId.toString() === req.userId.toString()
    );
    
    if (existingResponseIndex !== -1) {
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

app.post('/api/availability', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime, status } = req.body;
    
    const driver = await User.findById(req.userId);
    
    if (!driver || (driver.role !== 'driver' && driver.type !== 'driver')) {
      return res.status(403).json({ success: false, message: 'Only drivers can set availability' });
    }
    
    let availability = await DriverAvailability.findOne({
      driverId: req.userId,
      date: new Date(date)
    });
    
    if (availability) {
      availability.startTime = startTime;
      availability.endTime = endTime;
      availability.status = status;
      availability.confirmed = true;
    } else {
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

// ==================== ROUTES APIs ====================

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

app.post('/api/routes/assign', authenticateToken, async (req, res) => {
  try {
    const { pollId, driverId, routeName, startPoint, destination, timeSlot, pickupTime, date } = req.body;
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 ROUTE ASSIGNMENT REQUEST");
    console.log("  - Poll ID:", pollId);
    console.log("  - Driver ID:", driverId);
    console.log("  - Route Name:", routeName);
    console.log("  - Time Slot:", timeSlot);
    console.log("  - Date:", date);
    
    const poll = await Poll.findById(pollId);
    
    if (!poll) {
      console.log("❌ Poll not found");
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    
    const yesResponses = poll.responses.filter(r => r.response === 'yes');
    
    console.log(`✓ Found ${yesResponses.length} passengers who confirmed travel`);
    
    if (yesResponses.length === 0) {
      console.log("❌ No passengers confirmed travel");
      return res.status(400).json({ success: false, message: 'No passengers confirmed travel' });
    }
    
    // Make driver availability check optional
    const requestedDate = new Date(date);
    console.log("🔍 Checking driver availability for:", requestedDate.toISOString());
    
    const driverAvailability = await DriverAvailability.findOne({
      driverId,
      date: requestedDate,
      status: 'available',
      confirmed: true
    });
    
    if (!driverAvailability) {
      console.log("⚠️ No confirmed availability found for driver, proceeding anyway...");
    } else {
      console.log("✅ Driver availability confirmed");
    }
    
    const driver = await User.findById(driverId);
    
    if (!driver) {
      console.log("❌ Driver not found");
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    
    console.log("✓ Driver found:", driver.name);
    
    // Map passengers properly
    const passengers = yesResponses.map(r => ({
      passengerId: r.passengerId,
      passengerName: r.passengerName,
      pickupPoint: r.pickupPoint,
      status: 'pending'
    }));
    
    console.log(`✓ Mapped ${passengers.length} passengers`);
    
    const stops = [...new Set(passengers.map(p => p.pickupPoint))];
    
    console.log(`✓ Created ${stops.length} unique stops`);
    
    // Create route
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
      date: requestedDate
    });
    
    await newRoute.save();
    console.log("✅ Route created:", newRoute._id);
    
    // Create trip
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
      vehicleNumber: driver.van || driver.vehicleNo || 'N/A',
      transporterId: driver.transporterId
    });
    
    await newTrip.save();
    console.log("✅ Trip created:", newTrip._id);
    
    // Send notification to driver
    try {
      await sendNotification(
        driverId,
        'driver',
        'Route Assigned! 🚐',
        `You have been assigned to ${routeName} with ${passengers.length} passengers for ${requestedDate.toLocaleDateString()}`,
        'route',
        newRoute._id,
        'route',
        true,
        'confirm_route'
      );
      console.log("✅ Notification sent to driver");
    } catch (notifErr) {
      console.error("⚠️ Failed to send driver notification:", notifErr);
    }
    
    // Send notifications to all passengers
    let notificationsSent = 0;
    for (const passenger of passengers) {
      try {
        await sendNotification(
          passenger.passengerId,
          'passenger',
          'Route Confirmed! ✓',
          `Your route has been confirmed! Driver: ${driver.name}, Pickup: ${pickupTime}. Time slot: ${timeSlot}`,
          'route',
          newRoute._id,
          'route',
          false
        );
        notificationsSent++;
        console.log(`✅ Notification sent to passenger: ${passenger.passengerName}`);
      } catch (notifErr) {
        console.error(`⚠️ Failed to send notification to ${passenger.passengerName}:`, notifErr);
      }
    }
    
    console.log(`✅ Route assigned successfully! Notifications sent: ${notificationsSent}/${passengers.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.json({ 
      success: true, 
      route: newRoute, 
      trip: newTrip, 
      message: `Route assigned successfully! ${notificationsSent} passengers notified.`,
      notificationsSent: notificationsSent
    });
    
  } catch (error) {
    console.error('❌ Error assigning route:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error assigning route',
      error: error.message 
    });
  }
});

app.put('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    const updatedRoute = await Route.findByIdAndUpdate(req.params.routeId, req.body, { new: true });
    res.json({ success: true, route: updatedRoute });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ success: false, message: 'Error updating route' });
  }
});

app.delete('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.routeId);
    res.json({ success: true, message: 'Route deleted' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ success: false, message: 'Error deleting route' });
  }
});

// ==================== TRIP MANAGEMENT ====================

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
    
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      trip.status = 'En Route';
      trip.startTime = new Date();
      await trip.save();
      
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
    
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      trip.status = 'Completed';
      trip.endTime = new Date();
      await trip.save();
      
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

app.post('/api/trips/:tripId/send-morning-confirmation', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId)
      .populate('driverId')
      .populate('passengers._id');
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
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

app.post('/api/trips/:tripId/confirm-passenger', authenticateToken, async (req, res) => {
  try {
    const { traveling } = req.body;
    
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
    
    const user = await User.findById(req.userId);
    const message = traveling ? `${user.name} confirmed they are traveling` : `${user.name} will not be traveling today`;
    
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

app.put('/api/routes/:routeId/stops/:stopId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    const route = await Route.findById(req.params.routeId);
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    const passenger = route.passengers.find(p => p._id.toString() === req.params.stopId);
    
    if (passenger) {
      passenger.status = status;
      await route.save();
    }
    
    const trip = await Trip.findOne({ routeId: route._id });
    
    if (trip) {
      const tripPassenger = trip.passengers.find(p => p._id.toString() === req.params.stopId);
      
      if (tripPassenger) {
        tripPassenger.status = status;
        
        if (status === 'picked-up') {
          tripPassenger.pickupTime = new Date().toLocaleTimeString();
          
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
    
    res.json({ success: true, location: trip.currentLocation });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    res.status(500).json({ success: false, message: 'Error updating location' });
  }
});

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

// ==================== COMPLAINTS ====================

app.post('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, againstUserId, againstName, tripId } = req.body;
    
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

app.put('/api/complaints/:complaintId/resolve', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.complaintId,
      { status: 'Resolved', resolvedAt: new Date() },
      { new: true }
    );
    
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

// ==================== FEEDBACK ====================

app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { tripId, driverId, passengerId, rating, comment, categories } = req.body;
    
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
    
    await Trip.findByIdAndUpdate(tripId, { rating });
    
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

// ==================== NOTIFICATIONS ====================

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

// ==================== USERS ====================

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

// ==================== PASSENGER REQUEST ====================

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

app.get('/api/join-requests', authenticateToken, async (req, res) => {
  try {
    const { type, transporterId } = req.query;
    const targetTransporterId = transporterId || req.userId;
    
    let filter = { transporterId: targetTransporterId, status: 'pending' };
    
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

app.put('/api/join-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Approving request:", request.email);

    request.status = 'accepted';
    await request.save();

    // Create user with all fields properly mapped
    const newUser = new User({
      name: request.name || request.fullName,
      email: request.email,
      phone: request.phone,
      password: request.password,
      role: request.type,
      type: request.type,
      // Driver-specific fields
      vehicle: request.vehicle || request.vehicleNo,
      vehicleNo: request.vehicleNo,
      van: request.vehicleNo, // Set van field for backward compatibility
      capacity: request.capacity || 8,
      experience: request.experience || 'New',
      license: request.license,
      availableTimeSlots: request.availableTimeSlots || [],
      // Location fields
      pickupPoint: request.pickupPoint || request.address,
      destination: request.destination,
      preferredTimeSlot: request.preferredTimeSlot,
      latitude: request.latitude,
      longitude: request.longitude,
      address: request.address || request.pickupPoint,
      // Transporter link
      transporterId: request.transporterId,
      status: 'active',
      registrationDate: new Date()
    });

    await newUser.save();
    
    console.log("✅ User created successfully:");
    console.log("  - ID:", newUser._id);
    console.log("  - Email:", newUser.email);
    console.log("  - Role:", newUser.role);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    await sendNotification(
      newUser._id,
      newUser.role,
      'Request Approved! 🎉',
      'Your registration has been approved! You can now login to your account.',
      'confirmation',
      null,
      null,
      false
    );
    
    console.log("✅ Notification sent to user");
    
    res.json({ 
      success: true, 
      message: 'Request accepted successfully', 
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        type: newUser.type,
        status: newUser.status,
        transporterId: newUser.transporterId
      }
    });
  } catch (error) {
    console.error('❌ Error accepting request:', error);
    res.status(500).json({ success: false, message: 'Error accepting request' });
  }
});

// ==================== PAYMENTS ====================

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

// ==================== TRANSPORTER REGISTRATION (WITH IMAGE UPLOAD) ====================

app.post('/api/transporter/register', upload.single('profileImage'), async (req, res) => {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 TRANSPORTER REGISTRATION REQUEST");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📦 req.body:", JSON.stringify(req.body, null, 2));
    console.log("📷 req.file:", req.file ? JSON.stringify(req.file, null, 2) : "NO FILE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const { fullName, companyName, phone, country, city, zone, email, password } = req.body;

    console.log("📝 Extracted Fields:");
    console.log("  - fullName:", fullName);
    console.log("  - companyName:", companyName);
    console.log("  - phone:", phone);
    console.log("  - country:", country);
    console.log("  - city:", city);
    console.log("  - zone:", zone);
    console.log("  - email:", email);
    console.log("  - password:", password ? "***PROVIDED***" : "MISSING");

    // Validation
    if (!fullName || !companyName || !phone || !country || !city || !zone || !email || !password) {
      console.log("❌ VALIDATION FAILED - Missing fields");
      
      const missing = [];
      if (!fullName) missing.push('fullName');
      if (!companyName) missing.push('companyName');
      if (!phone) missing.push('phone');
      if (!country) missing.push('country');
      if (!city) missing.push('city');
      if (!zone) missing.push('zone');
      if (!email) missing.push('email');
      if (!password) missing.push('password');
      
      console.log("❌ Missing fields:", missing.join(', '));
      
      if (req.file) {
        fs.unlinkSync(req.file.path);
        console.log("🗑️ Deleted uploaded file");
      }
      
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missing.join(', ')}` 
      });
    }

    console.log("✅ All fields present");

    console.log("🔍 Checking if email exists:", email);
    const existing = await User.findOne({ email: email.toLowerCase() });
    
    if (existing) {
      console.log("❌ Email already registered:", email);
      
      if (req.file) {
        fs.unlinkSync(req.file.path);
        console.log("🗑️ Deleted uploaded file");
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    console.log("✅ Email is available");

    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/${req.file.filename}`;
      console.log("✅ Profile image uploaded:", profileImagePath);
    } else {
      console.log("⚠️ No profile image uploaded");
    }

    console.log("📝 Creating transporter user...");

    const newTransporter = new User({
      name: fullName,
      email: email.toLowerCase(),
      password: password,
      role: 'transporter',
      type: 'transporter',
      phone,
      company: companyName,
      license: `TRANS${Date.now()}`,
      address: `${zone}, ${city}, ${country}`,
      country,
      city,
      zone,
      profileImage: profileImagePath,
      status: 'active',
      registrationDate: new Date()
    });

    console.log("💾 Saving to database...");
    await newTransporter.save();
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅✅✅ REGISTRATION SUCCESSFUL ✅✅✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 User Details:");
    console.log("  - ID:", newTransporter._id);
    console.log("  - Name:", fullName);
    console.log("  - Email:", email);
    console.log("  - Company:", companyName);
    console.log("  - Location:", `${zone}, ${city}, ${country}`);
    console.log("  - Profile Image:", profileImagePath || "Not uploaded");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    res.status(201).json({ 
      success: true, 
      message: 'Registration successful! You can now login.',
      transporter: {
        id: newTransporter._id,
        name: newTransporter.name,
        email: newTransporter.email,
        phone: newTransporter.phone,
        company: newTransporter.company,
        profileImage: newTransporter.profileImage,
        country: newTransporter.country,
        city: newTransporter.city,
        zone: newTransporter.zone
      }
    });
    
  } catch (error) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌❌❌ REGISTRATION ERROR ❌❌❌");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
        else console.log("🗑️ Deleted uploaded file");
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed. Please try again.',
      error: error.message 
    });
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
        zone: transporter.zone,
        profileImage: transporter.profileImage
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
      'Poll System with Notifications ✅',
      'Driver Availability',
      'Route Assignment',
      'Morning Confirmation',
      'Real-time Tracking',
      'Complaints',
      'Feedback',
      'Notifications System Active',
      'Image Upload Support ✅',
      'Driver Registration Fixed ✅',
      'Router Issues Fixed ✅'
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
║  ✅ Poll System + Notifications Active ✅      ║
║  ✅ Real-time Tracking Active                  ║
║  ✅ Router Issues Fixed ✅                     ║
║  ✅ Image Upload Support Active 📷            ║
╚════════════════════════════════════════════════╝
  `);
});