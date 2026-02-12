const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Microservices URLs
const SERVICES = {
  TRANSPORTER: 'http://192.168.10.4:3000',
  DRIVER: 'http://192.168.10.4:3001', 
  PASSENGER: 'http://192.168.10.4:5001',
  NOTIFICATIONS: 'http://192.168.10.4:5001'
};

// ==================== CROSS-SERVICE COMMUNICATION ====================

// ✅ Send Notification to Passenger
app.post('/api/notifications/send-to-passenger', async (req, res) => {
  try {
    const { passengerId, title, message, type, category } = req.body;

    const response = await axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
      passengerId,
      title,
      message,
      type,
      category,
      actionRequired: false
    });

    res.json({
      success: true,
      message: 'Notification sent to passenger',
      data: response.data
    });
  } catch (error) {
    console.error('Send notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

// ✅ Send Notification to Driver
app.post('/api/notifications/send-to-driver', async (req, res) => {
  try {
    const { driverId, title, message, type } = req.body;

    const response = await axios.post(`${SERVICES.DRIVER}/api/notifications`, {
      driverId,
      title,
      message,
      type
    });

    res.json({
      success: true,
      message: 'Notification sent to driver',
      data: response.data
    });
  } catch (error) {
    console.error('Send driver notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send notification to driver' });
  }
});

// ✅ Broadcast Poll to All Passengers
app.post('/api/polls/broadcast', async (req, res) => {
  try {
    const { pollId, title, message } = req.body;

    // Get all passengers
    const passengersResponse = await axios.get(`${SERVICES.PASSENGER}/api/passengers`);
    const passengers = passengersResponse.data.passengers || [];

    // Send notification to each passenger
    const notifications = passengers.map(passenger => 
      axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
        passengerId: passenger._id,
        title: `📊 New Poll: ${title}`,
        message: message || 'A new travel poll has been created. Please respond.',
        type: 'info',
        category: 'poll',
        actionRequired: true,
        metadata: { pollId }
      })
    );

    await Promise.all(notifications);

    res.json({
      success: true,
      message: `Poll broadcasted to ${passengers.length} passengers`
    });
  } catch (error) {
    console.error('Broadcast poll error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to broadcast poll' });
  }
});

// ✅ Live Location Updates from Driver to Passengers
app.post('/api/live-tracking/broadcast', async (req, res) => {
  try {
    const { routeId, driverId, location, speed, estimatedArrival } = req.body;

    // Get route details and passengers
    const routeResponse = await axios.get(`${SERVICES.TRANSPORTER}/api/routes/${routeId}`);
    const route = routeResponse.data.route;
    const passengerIds = route.passengers || [];

    // Send location update to each passenger
    const updates = passengerIds.map(passengerId =>
      axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
        passengerId,
        title: '🚗 Live Location Update',
        message: `Driver is on the way. Current speed: ${speed} km/h. ETA: ${estimatedArrival}`,
        type: 'info',
        category: 'tracking',
        metadata: {
          routeId,
          driverId,
          location,
          speed,
          estimatedArrival
        }
      })
    );

    await Promise.all(updates);

    res.json({
      success: true,
      message: `Location update sent to ${passengerIds.length} passengers`
    });
  } catch (error) {
    console.error('Live tracking broadcast error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to broadcast location' });
  }
});

// ✅ Driver Assignment Notifications
app.post('/api/driver-assigned/notify', async (req, res) => {
  try {
    const { routeId, driverId, passengerIds, timeSlot } = req.body;

    // Get driver details
    const driverResponse = await axios.get(`${SERVICES.DRIVER}/api/drivers/${driverId}`);
    const driver = driverResponse.data.driver;

    // Notify driver
    await axios.post(`${SERVICES.DRIVER}/api/notifications`, {
      driverId,
      title: '📋 New Route Assigned',
      message: `You have been assigned a new route for ${timeSlot}. Check your routes for details.`,
      type: 'success'
    });

    // Notify passengers
    const passengerNotifications = passengerIds.map(passengerId =>
      axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
        passengerId,
        title: '👨‍✈️ Driver Assigned',
        message: `Your driver ${driver.name} with vehicle ${driver.vehicleNumber} has been assigned for ${timeSlot}.`,
        type: 'success',
        category: 'driver'
      })
    );

    await Promise.all(passengerNotifications);

    res.json({
      success: true,
      message: 'Assignment notifications sent successfully'
    });
  } catch (error) {
    console.error('Driver assignment notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send assignment notifications' });
  }
});

// ✅ Trip Status Updates
app.post('/api/trip-status/update', async (req, res) => {
  try {
    const { routeId, status, message, passengerIds } = req.body;

    const notifications = passengerIds.map(passengerId =>
      axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
        passengerId,
        title: `🔄 Trip ${status}`,
        message: message,
        type: 'info',
        category: 'trip'
      })
    );

    await Promise.all(notifications);

    res.json({
      success: true,
      message: `Trip status update sent to ${passengerIds.length} passengers`
    });
  } catch (error) {
    console.error('Trip status update error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send trip status' });
  }
});

// ✅ Emergency/Alerts Broadcast
app.post('/api/emergency/broadcast', async (req, res) => {
  try {
    const { title, message, type, target } = req.body;

    let notifications = [];

    if (target === 'all' || target === 'passengers') {
      const passengersResponse = await axios.get(`${SERVICES.PASSENGER}/api/passengers`);
      const passengers = passengersResponse.data.passengers || [];
      
      notifications = [
        ...notifications,
        ...passengers.map(p => 
          axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
            passengerId: p._id,
            title,
            message,
            type: type || 'urgent',
            category: 'emergency',
            actionRequired: true
          })
        )
      ];
    }

    if (target === 'all' || target === 'drivers') {
      const driversResponse = await axios.get(`${SERVICES.DRIVER}/api/drivers`);
      const drivers = driversResponse.data.drivers || [];
      
      notifications = [
        ...notifications,
        ...drivers.map(d => 
          axios.post(`${SERVICES.DRIVER}/api/notifications`, {
            driverId: d._id,
            title,
            message,
            type: type || 'urgent'
          })
        )
      ];
    }

    await Promise.all(notifications);

    res.json({
      success: true,
      message: `Emergency alert broadcasted to ${target}`
    });
  } catch (error) {
    console.error('Emergency broadcast error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to broadcast emergency' });
  }
});

// ==================== REAL-TIME SOCKET COMMUNICATION ====================

const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Real-time communication rooms
io.on('connection', (socket) => {
  console.log('Client connected to gateway:', socket.id);

  // Join driver room
  socket.on('join-driver', (driverId) => {
    socket.join(`driver-${driverId}`);
    console.log(`Driver ${driverId} joined room`);
  });

  // Join passenger room  
  socket.on('join-passenger', (passengerId) => {
    socket.join(`passenger-${passengerId}`);
    console.log(`Passenger ${passengerId} joined room`);
  });

  // Join route room for live tracking
  socket.on('join-route', (routeId) => {
    socket.join(`route-${routeId}`);
    console.log(`Client joined route ${routeId}`);
  });

  // Live location updates from driver
  socket.on('driver-location-update', (data) => {
    const { routeId, driverId, location, speed, estimatedArrival } = data;
    
    // Broadcast to all passengers on this route
    socket.to(`route-${routeId}`).emit('location-update', {
      driverId,
      location,
      speed,
      estimatedArrival,
      timestamp: new Date()
    });

    // Also send as notification
    axios.post('http://localhost:3002/api/live-tracking/broadcast', {
      routeId,
      driverId,
      location,
      speed,
      estimatedArrival
    }).catch(console.error);
  });

  // Poll responses from passengers
  socket.on('poll-response', (data) => {
    const { pollId, passengerId, response } = data;
    
    // Notify transporter about new poll response
    socket.emit('new-poll-response', {
      pollId,
      passengerId,
      response,
      timestamp: new Date()
    });
  });

  // Driver status updates
  socket.on('driver-status-update', (data) => {
    const { driverId, status, message } = data;
    
    // Notify transporter
    socket.emit('driver-status-changed', {
      driverId,
      status,
      message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from gateway:', socket.id);
  });
});

// ==================== UNIFIED NOTIFICATION SYSTEM ====================

// Unified notification endpoint for all services
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { to, title, message, type, category, metadata } = req.body;

    let response;

    if (to.role === 'passenger') {
      response = await axios.post(`${SERVICES.PASSENGER}/api/alerts`, {
        passengerId: to.id,
        title,
        message,
        type,
        category,
        metadata
      });
    } else if (to.role === 'driver') {
      response = await axios.post(`${SERVICES.DRIVER}/api/notifications`, {
        driverId: to.id,
        title,
        message,
        type
      });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      data: response?.data
    });
  } catch (error) {
    console.error('Unified notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

// ==================== HEALTH CHECK & SERVICE STATUS ====================

app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {};

    // Check transporter service
    try {
      await axios.get(`${SERVICES.TRANSPORTER}/api/health`);
      healthStatus.transporter = 'healthy';
    } catch {
      healthStatus.transporter = 'unhealthy';
    }

    // Check driver service
    try {
      await axios.get(`${SERVICES.DRIVER}/api/health`);
      healthStatus.driver = 'healthy';
    } catch {
      healthStatus.driver = 'unhealthy';
    }

    // Check passenger service
    try {
      await axios.get(`${SERVICES.PASSENGER}/api/health`);
      healthStatus.passenger = 'healthy';
    } catch {
      healthStatus.passenger = 'unhealthy';
    }

    res.json({
      success: true,
      message: 'API Gateway is running',
      services: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// ==================== START GATEWAY SERVER ====================

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📡 WebSocket Gateway: ws://localhost:${PORT}`);
});
