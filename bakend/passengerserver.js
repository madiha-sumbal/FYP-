// passengerServer.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== DB CONNECTION ====================
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/passenger_dashboard";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Passenger MongoDB Connected"))
  .catch((err) => console.log("❌ Mongo Error:", err));

const JWT_SECRET = process.env.JWT_SECRET || "passenger_secret_key_12345";

// ==================== SCHEMAS ====================

// Transporter Schema
const transporterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  company: String,
  address: String,
  status: { type: String, default: 'active' }
}, { timestamps: true });

const Transporter = mongoose.model("Transporter", transporterSchema);

// Passenger Schema
const passengerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: String,
  emergencyContact: String,
  dateOfBirth: String,
  transporterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Transporter",
    required: true 
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  approvedBy: String,
  approvalDate: Date,
}, { timestamps: true });

const Passenger = mongoose.model("Passenger", passengerSchema);

// Passenger Approval Request Schema
const passengerApprovalSchema = new mongoose.Schema({
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Passenger",
    required: true
  },
  transporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transporter",
    required: true
  },
  fullName: String,
  email: String,
  phone: String,
  address: String,
  emergencyContact: String,
  dateOfBirth: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: Date,
  reviewNotes: String
});

const PassengerApproval = mongoose.model("PassengerApproval", passengerApprovalSchema);

// ==================== AUTH MIDDLEWARE ====================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const passenger = await Passenger.findById(decoded.passengerId).select("-password");

    if (!passenger) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    req.passenger = passenger;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Hash password before saving
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

// Generate JWT token
const generateToken = (passengerId) => {
  return jwt.sign({ passengerId }, JWT_SECRET, { expiresIn: "30d" });
};

// ==================== APIs ====================

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Passenger server running",
    timestamp: new Date().toISOString()
  });
});

// ==================== GET TRANSPORTERS ====================
app.get("/api/passenger/transporters", async (req, res) => {
  try {
    const transporters = await Transporter.find({ status: 'active' })
      .select('name email phone company')
      .sort({ name: 1 });

    res.json({
      success: true,
      transporters
    });
  } catch (err) {
    console.error("Get transporters error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch transporters" 
    });
  }
});

// ==================== PASSENGER REGISTRATION ====================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { 
      fullName, 
      email, 
      password, 
      phone, 
      address, 
      emergencyContact, 
      dateOfBirth,
      transporterId 
    } = req.body;

    // Validation
    if (!fullName || !email || !password || !phone || !transporterId) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check if passenger already exists
    const existingPassenger = await Passenger.findOne({ email: email.toLowerCase() });
    if (existingPassenger) {
      return res.status(400).json({
        success: false,
        message: "Passenger with this email already exists"
      });
    }

    // Verify transporter exists
    const transporter = await Transporter.findById(transporterId);
    if (!transporter) {
      return res.status(400).json({
        success: false,
        message: "Invalid transporter selected"
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create passenger with pending status
    const passenger = new Passenger({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address,
      emergencyContact,
      dateOfBirth,
      transporterId,
      status: "pending"
    });

    await passenger.save();

    // Create approval request
    const approvalRequest = new PassengerApproval({
      passengerId: passenger._id,
      transporterId,
      fullName,
      email: email.toLowerCase(),
      phone,
      address,
      emergencyContact,
      dateOfBirth,
      status: "pending"
    });

    await approvalRequest.save();

    // Generate token
    const token = generateToken(passenger._id);

    res.status(201).json({
      success: true,
      message: "Registration request submitted successfully",
      token,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        phone: passenger.phone,
        status: passenger.status,
        transporterId: passenger.transporterId
      }
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Registration failed. Please try again." 
    });
  }
});

// ==================== PASSENGER LOGIN ====================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    // Find passenger
    const passenger = await Passenger.findOne({ email: email.toLowerCase() });
    if (!passenger) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check password
    const isMatch = await comparePassword(password, passenger.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate token
    const token = generateToken(passenger._id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        phone: passenger.phone,
        status: passenger.status,
        transporterId: passenger.transporterId
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Login failed. Please try again." 
    });
  }
});

// ==================== CHECK AUTH STATUS ====================
app.get("/api/auth/check", authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.passenger._id,
        fullName: req.passenger.fullName,
        email: req.passenger.email,
        phone: req.passenger.phone,
        status: req.passenger.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// ==================== CHECK APPROVAL STATUS ====================
app.get("/api/passenger/approval-status", authMiddleware, async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.passenger._id);
    
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: "Passenger not found"
      });
    }

    res.json({
      success: true,
      status: passenger.status,
      approvalDate: passenger.approvalDate
    });

  } catch (err) {
    console.error("Check approval error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check approval status" 
    });
  }
});

// ==================== GET PASSENGER PROFILE ====================
app.get("/api/passenger/profile", authMiddleware, async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.passenger._id)
      .select('-password')
      .populate('transporterId', 'name email phone company');

    res.json({
      success: true,
      passenger
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile"
    });
  }
});

// ==================== TRANSPORTER APPROVAL ENDPOINTS ====================

// Get pending approval requests for transporter
app.get("/api/transporter/approval-requests/:transporterId", async (req, res) => {
  try {
    const { transporterId } = req.params;

    const approvalRequests = await PassengerApproval.find({
      transporterId,
      status: "pending"
    })
    .populate('passengerId', 'fullName email phone')
    .sort({ submittedAt: -1 });

    res.json({
      success: true,
      requests: approvalRequests
    });

  } catch (err) {
    console.error("Get approval requests error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approval requests"
    });
  }
});

// Approve/Reject passenger
app.post("/api/transporter/review-passenger", async (req, res) => {
  try {
    const { approvalRequestId, action, reviewNotes } = req.body;

    if (!approvalRequestId || !action) {
      return res.status(400).json({
        success: false,
        message: "Approval request ID and action are required"
      });
    }

    // Find approval request
    const approvalRequest = await PassengerApproval.findById(approvalRequestId);
    if (!approvalRequest) {
      return res.status(404).json({
        success: false,
        message: "Approval request not found"
      });
    }

    // Find passenger
    const passenger = await Passenger.findById(approvalRequest.passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: "Passenger not found"
      });
    }

    // Update status
    if (action === "approve") {
      approvalRequest.status = "approved";
      passenger.status = "approved";
      passenger.approvalDate = new Date();
    } else if (action === "reject") {
      approvalRequest.status = "rejected";
      passenger.status = "rejected";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action"
      });
    }

    approvalRequest.reviewedAt = new Date();
    approvalRequest.reviewNotes = reviewNotes;

    await Promise.all([
      approvalRequest.save(),
      passenger.save()
    ]);

    res.json({
      success: true,
      message: `Passenger ${action}d successfully`,
      passenger: {
        id: passenger._id,
        fullName: passenger.fullName,
        email: passenger.email,
        status: passenger.status
      }
    });

  } catch (err) {
    console.error("Review passenger error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to review passenger request"
    });
  }
});

// ==================== SEED DATA (FOR TESTING) ====================
app.post("/api/seed-transporters", async (req, res) => {
  try {
    // Check if transporters already exist
    const count = await Transporter.countDocuments();
    if (count > 0) {
      return res.json({
        success: true,
        message: "Transporters already exist",
        count
      });
    }

    const sampleTransporters = [
      {
        name: "City Transport Services",
        email: "city@transport.com",
        password: await hashPassword("transport123"),
        phone: "+92 300 1234567",
        company: "City Transport Ltd",
        address: "Islamabad, Pakistan",
        status: "active"
      },
      {
        name: "Metro Van Services",
        email: "metro@transport.com",
        password: await hashPassword("transport123"),
        phone: "+92 301 7654321",
        company: "Metro Transport Co",
        address: "Rawalpindi, Pakistan",
        status: "active"
      },
      {
        name: "Express Ride Company",
        email: "express@transport.com",
        password: await hashPassword("transport123"),
        phone: "+92 333 9876543",
        company: "Express Rides",
        address: "Lahore, Pakistan",
        status: "active"
      }
    ];

    await Transporter.insertMany(sampleTransporters);

    res.json({
      success: true,
      message: "Sample transporters created successfully",
      count: sampleTransporters.length
    });

  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sample transporters"
    });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Passenger Server running on http://localhost:${PORT}`);
  console.log(`📍 API Health: http://localhost:${PORT}/api/health`);
});