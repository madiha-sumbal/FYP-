// API_CONFIG.js - Centralized API configuration
// Use this IP address: 192.168.10.10

export const API_BASE_URL = 'http://192.168.10.10:3000/api';
export const GOOGLE_MAPS_API_KEY = 'AIzaSyDiZhjAhYniDLe4Ndr1u87NdDfIdZS6SME';

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  TRANSPORTER_LOGIN: '/transporter/login',
  TRANSPORTER_REGISTER: '/transporter/register',
  
  // Profile
  PROFILE: '/profile',
  
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  
  // Polls
  POLLS: '/polls',
  POLLS_ACTIVE: '/polls/active',
  POLL_RESPOND: (pollId) => `/polls/${pollId}/respond`,
  
  // Availability
  AVAILABILITY: '/availability',
  AVAILABILITY_DRIVERS: (date) => `/availability/drivers/${date}`,
  
  // Routes
  ROUTES: '/routes',
  ROUTES_FROM_POLL: (pollId) => `/routes/from-poll/${pollId}`,
  ROUTE_START: (routeId) => `/routes/${routeId}/start`,
  ROUTE_CONFIRM_PASSENGER: (routeId) => `/routes/${routeId}/confirm-passenger`,
  
  // Trips
  TRIPS: '/trips',
  TRIP_LOCATION: (tripId) => `/trips/${tripId}/location`,
  TRIP_PICKUP: (tripId, passengerId) => `/trips/${tripId}/pickup/${passengerId}`,
  TRIP_COMPLETE: (tripId) => `/trips/${tripId}/complete`,
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_READ: (notificationId) => `/notifications/${notificationId}/read`,
  NOTIFICATIONS_MARK_ALL_READ: '/notifications/mark-all-read',
  
  // Feedback
  FEEDBACK: '/feedback',
  
  // Complaints
  COMPLAINTS: '/complaints',
  COMPLAINT_REPLY: (complaintId) => `/complaints/${complaintId}/reply`,
  COMPLAINT_RESOLVE: (complaintId) => `/complaints/${complaintId}/resolve`,
  
  // Users
  USERS: '/users',
  DRIVERS: '/drivers',
  PASSENGERS: '/passengers',
  
  // Join Requests
  JOIN_REQUESTS: '/join-requests',
  JOIN_REQUEST_ACCEPT: (requestId) => `/join-requests/${requestId}/accept`,
  JOIN_REQUEST_REJECT: (requestId) => `/join-requests/${requestId}/reject`,
  
  // Passenger Requests
  PASSENGER_REQUEST: '/passenger/request',
  PASSENGER_REQUEST_STATUS: (requestId) => `/passenger/request-status/${requestId}`,
  PASSENGER_REQUESTS_PENDING: '/passenger/requests/pending',
  PASSENGER_REQUEST_APPROVE: (requestId) => `/passenger/requests/${requestId}/approve`,
  PASSENGER_REQUEST_REJECT: (requestId) => `/passenger/requests/${requestId}/reject`,
  
  // Payments
  PAYMENTS: '/payments',
  
  // Auto Assignment
  AUTO_ASSIGN: '/auto-assign',
};