const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = 'your-secret-key-change-in-production';

// ==================== FILE UPLOAD SETUP ====================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + '-' + Math.round(Math.random()*1E9) + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif/.test(file.mimetype) && /jpeg|jpg|png|gif/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only image files allowed!'));
  }
});

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ==================== MONGODB ====================
mongoose.connect('mongodb://localhost:27017/transportdb', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// ==================== SCHEMAS ====================
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: String, type: String, phone: String,
  company: String, license: String, address: String,
  country: String, city: String, zone: String,
  profileImage: String,
  status: { type: String, default: 'active' },
  registrationDate: { type: Date, default: Date.now },
  van: String, capacity: Number,
  availableTimeSlots: [String],
  experience: String, vehicle: String, vehicleNo: String,
  vehicleType: String,
  pickupPoint: String, destination: String,
  selectedTimeSlot: String, preferredTimeSlot: String,
  latitude: Number, longitude: Number,
  destinationLatitude: Number, destinationLongitude: Number,
  vehiclePreference: {
    type: String,
    enum: ['car', 'van', 'bus', null],
    default: null
  },
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
    passengerName: String, passengerEmail: String,
    response: String, selectedTimeSlot: String, pickupPoint: String,
    pickupLat: Number, pickupLng: Number,
    dropLat: Number, dropLng: Number,
    destination: String,
    vehiclePreference: { type: String, enum: ['car', 'van', 'bus', null], default: null },
    respondedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  notificationsSent: { type: Boolean, default: false }
});
const Poll = mongoose.model('Poll', pollSchema);

const driverAvailabilitySchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String, date: Date, startTime: String, endTime: String,
  status: { type: String, default: 'available' },
  confirmed: { type: Boolean, default: false },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const DriverAvailability = mongoose.model('DriverAvailability', driverAvailabilitySchema);

const routeSchema = new mongoose.Schema({
  name:         String,
  routeName:    String,
  pollId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Poll' },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  driverName:   { type: String, default: null },
  stops:        [String],
  startPoint:   String,
  destination:  String,
  timeSlot:     String,
  pickupTime:   String,
  date:         Date,
  passengers: [{
    passengerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passengerName: String,
    pickupPoint:   String,
    status:        { type: String, default: 'pending' },
  }],
  estimatedTime:  String,
  estimatedFuel:  String,
  estimatedKm:    String,
  // Pakistan fuel details
  fuelType:       { type: String, default: 'petrol' },
  fuelCostPKR:    String,
  fuelRatePerKm:  Number,
  vehicleType:    { type: String, default: 'van' },
  distance:         String,
  totalDistance:    String,
  duration:         String,
  estimatedDuration:String,
  status: { type: String, default: 'unassigned' },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const Route = mongoose.model('Route', routeSchema);

const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  routeName: String, status: String, currentStop: String,
  currentLocation: { latitude: Number, longitude: Number },
  passengers: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String, pickupPoint: String, status: String,
    pickupTime: String, confirmedMorning: { type: Boolean, default: false }
  }],
  stops: [String], completedStops: [String],
  speed: Number, eta: String, timeSlot: String,
  capacity: Number, vehicleType: String, vehicleNumber: String,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date, endTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Trip = mongoose.model('Trip', tripSchema);

const paymentSchema = new mongoose.Schema({
  type: String,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number, mode: String, status: String, month: String,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
const Payment = mongoose.model('Payment', paymentSchema);

const complaintSchema = new mongoose.Schema({
  title: String, description: String, category: String,
  byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: String, byRole: String,
  againstUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  againstName: String,
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, default: 'Open' },
  priority: { type: String, default: 'medium' },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replies: [{ by: String, byRole: String, text: String, date: { type: Date, default: Date.now } }],
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now }
});
const Complaint = mongoose.model('Complaint', complaintSchema);

const feedbackSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverName: String,
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  passengerName: String, givenBy: String, rating: Number, comment: String,
  categories: { punctuality: Number, cleanliness: Number, behavior: Number, driving: Number },
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

const notificationSchema = new mongoose.Schema({
  title: String, message: String, type: String, icon: String, color: String,
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
  name: String, fullName: String, email: String,
  phone: String, password: String, type: String,
  vehicle: String, vehicleNo: String,
  vehicleType: String,
  capacity: Number,
  experience: String, license: String, preferredTimeSlot: String,
  vehiclePreference: {
    type: String,
    enum: ['car', 'van', 'bus', null],
    default: null
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
    address: String
  },
  address: String, pickupPoint: String, destination: String,
  latitude: Number, longitude: Number,
  destinationLatitude: Number, destinationLongitude: Number,
  transporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transporterName: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ==================== HELPER FUNCTIONS ====================
async function sendNotification(userId, userRole, title, message, type, relatedId=null, relatedType=null, actionRequired=false, actionType=null) {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const notification = new Notification({
      title, message, type,
      icon: getIconForType(type), color: getColorForType(type),
      userId, userRole, relatedId, relatedType,
      actionRequired, actionType,
      transporterId: user.transporterId || userId,
      pollId: relatedType === 'poll' ? relatedId : null
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}
function getIconForType(type) {
  return ({ poll:'poll', route:'map', confirmation:'checkmark-circle', alert:'warning', complaint:'alert-circle', feedback:'star', general:'notifications', request:'person-add' })[type] || 'notifications';
}
function getColorForType(type) {
  return ({ poll:'#2196F3', route:'#A1D826', confirmation:'#4CAF50', alert:'#FF9800', complaint:'#F44336', feedback:'#FFD700', general:'#9E9E9E', request:'#9C27B0' })[type] || '#9E9E9E';
}

// ==================== PAKISTAN FUEL CALCULATOR ====================
// Pakistan ke hisaab se fuel rates (2024-2025)
// Petrol: ~Rs. 278/litre
// Diesel: ~Rs. 283/litre  
// CNG: ~Rs. 165/kg (equivalent ~Rs. 130/litre petrol equivalent)

const PAKISTAN_FUEL = {
  // L per 100km for Pakistani roads (urban/city driving with traffic)
  // Real-world Pakistan traffic conditions mein consumption zyada hoti hai
  consumption: {
    car: 10,    // 10 L/100km - Suzuki Mehran/Alto/WagonR typical city
    van: 14,    // 14 L/100km - Toyota HiAce/Shehzore typical city  
    bus: 28,    // 28 L/100km - Hino/Isuzu bus typical city
  },
  // Fuel types per vehicle (Pakistan mein van/bus diesel chalti hai mostly)
  fuelType: {
    car: 'petrol',
    van: 'diesel',
    bus: 'diesel',
  },
  // Current Pakistan prices per litre (Rs.)
  pricePerLitre: {
    petrol: 278,
    diesel: 283,
    cng: 130, // petrol equivalent
  },
  // Road factor - Pakistan roads mein actual distance GPS se ~25-35% zyada
  roadFactor: {
    car: 1.30,
    van: 1.28,
    bus: 1.25,
  }
};

/**
 * Pakistan-specific fuel calculation
 * @param {number} straightLineKm - Haversine/GPS distance
 * @param {string} vehicleType - car/van/bus
 * @returns {object} { fuelLitres, fuelCostPKR, fuelType, actualRoadKm, consumptionPer100km }
 */
function calculatePakistanFuel(straightLineKm, vehicleType = 'van') {
  const vType = vehicleType.toLowerCase();
  
  // Road factor apply karo - Pakistan roads mein GPS se actual zyada hota hai
  const roadFactor = PAKISTAN_FUEL.roadFactor[vType] || 1.30;
  const actualRoadKm = straightLineKm * roadFactor;
  
  // Consumption
  const consumptionPer100km = PAKISTAN_FUEL.consumption[vType] || 14;
  const fuelLitres = (actualRoadKm * consumptionPer100km) / 100;
  
  // Cost
  const fType = PAKISTAN_FUEL.fuelType[vType] || 'petrol';
  const pricePerLitre = PAKISTAN_FUEL.pricePerLitre[fType];
  const fuelCostPKR = fuelLitres * pricePerLitre;
  
  return {
    fuelLitres:          parseFloat(fuelLitres.toFixed(2)),
    fuelCostPKR:         Math.round(fuelCostPKR),
    fuelType:            fType,
    actualRoadKm:        parseFloat(actualRoadKm.toFixed(1)),
    consumptionPer100km,
    pricePerLitre,
  };
}

// ==================== SMART ROUTE OPTIMIZER ====================
const OSRM_BASE = 'https://router.project-osrm.org';
const VEHICLE_CAPS_SRV = { car: 4, van: 12, bus: 30 };
const ALPHA = 0.7, BETA = 0.3;

function pickBestVehicle(count) {
  if (count <= 4) return 'car';
  if (count <= 12) return 'van';
  return 'bus';
}
function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(x));
}
async function getMatrix(locations) {
  const valid = locations.map(l => ({ lat: typeof l.lat==='number'?l.lat:33.6844, lng: typeof l.lng==='number'?l.lng:73.0479 }));
  try {
    const coords = valid.map(l=>`${l.lng},${l.lat}`).join(';');
    const { data } = await axios.get(`${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`, { timeout: 8000 });
    if (data.code === 'Ok') return { durations: data.durations, distances: data.distances, source: 'osrm' };
  } catch (_) {}
  const n = valid.length;
  const D = Array.from({length:n},()=>Array(n).fill(0));
  const T = Array.from({length:n},()=>Array(n).fill(0));
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) if (i!==j) { const d=haversine(valid[i],valid[j]); D[i][j]=d; T[i][j]=d/8.33; }
  return { durations: T, distances: D, source: 'haversine' };
}
function routeCost(dur, dist) { return ALPHA*dur + BETA*dist; }
function bestInsertionCost(matrix, route, pi, di) {
  if (route.length < 2) return { cost: (matrix.durations[route[0]]?.[pi]||0)+(matrix.durations[pi]?.[di]||0), position: 1 };
  let best=Infinity, pos=1;
  for (let i=0;i<route.length-1;i++) {
    const a=route[i], b=route[i+1];
    const c = routeCost((matrix.durations[a]?.[pi]||0)+(matrix.durations[pi]?.[di]||0)+(matrix.durations[di]?.[b]||0)-(matrix.durations[a]?.[b]||0),(matrix.distances[a]?.[pi]||0)+(matrix.distances[pi]?.[di]||0)+(matrix.distances[di]?.[b]||0)-(matrix.distances[a]?.[b]||0));
    if (c<best) { best=c; pos=i+1; }
  }
  return { cost: best, position: pos };
}

function summariseRoute(route, matrix, vehicleType = 'van') {
  let distM=0, durS=0;
  for (let i=1;i<route.length;i++) { distM+=matrix.distances[route[i-1]]?.[route[i]]||0; durS+=matrix.durations[route[i-1]]?.[route[i]]||0; }
  const straightKm = distM / 1000;
  const mins = Math.round(durS / 60);
  
  // Pakistan-specific fuel calculation
  const fuelData = calculatePakistanFuel(straightKm, vehicleType);
  
  return {
    estimatedKm:    `${fuelData.actualRoadKm.toFixed(1)} km`,
    estimatedTime:  mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`,
    estimatedFuel:  `${fuelData.fuelLitres.toFixed(1)} L`,
    fuelCostPKR:    `Rs. ${fuelData.fuelCostPKR}`,
    fuelType:       fuelData.fuelType,
    fuelRatePerKm:  parseFloat((fuelData.fuelLitres / Math.max(fuelData.actualRoadKm, 0.1)).toFixed(3)),
  };
}

async function optimiseRoutes(rawPassengers, rawDrivers) {
  if (!rawPassengers?.length) return [];
  const norm = (c,fLat,fLng) => ({ lat: typeof c?.lat==='number'?c.lat:(parseFloat(c?.latitude)||fLat||33.6844), lng: typeof c?.lng==='number'?c.lng:(parseFloat(c?.longitude)||fLng||73.0479) });
  const passengers = rawPassengers.map((p,i) => ({ ...p, _i:i, id:p.id||p._id||`p_${i}`, pickupLoc:norm(p.pickupLocation,p.pickupLat,p.pickupLng), dropLoc:norm(p.dropLocation,p.dropLat,p.dropLng), vehiclePreference:p.vehiclePreference||null }));
  const drivers = (rawDrivers||[]).map((d,i) => ({ ...d, _i:i, id:d.id||d._id||`d_${i}`, vehicleType:d.vehicleType||d.vehicle||'van', currentLoc:norm(d.currentLocation,d.lat,d.lng), capacityMax:VEHICLE_CAPS_SRV[d.vehicleType||d.vehicle||'van']||8 }));
  const nD=drivers.length, nP=passengers.length;
  const pIdx=i=>nD+i, dIdx=i=>nD+nP+i;
  const allLocs=[...drivers.map(d=>d.currentLoc),...passengers.map(p=>p.pickupLoc),...passengers.map(p=>p.dropLoc)];
  const matrix = await getMatrix(allLocs);
  const prefGroups = { car:[],van:[],bus:[],none:[] };
  passengers.forEach(p => { const k=p.vehiclePreference||'none'; (prefGroups[k]||prefGroups.none).push(p); });
  const assignments=[], assignedIds=new Set(), usedDrivers=new Set();
  ['car','van','bus'].forEach(pref => {
    const group=prefGroups[pref].filter(p=>!assignedIds.has(p.id));
    if (!group.length) return;
    const cap=VEHICLE_CAPS_SRV[pref], available=drivers.filter(d=>d.vehicleType===pref&&!usedDrivers.has(d._i));
    for (let s=0;s<group.length;s+=cap) {
      const chunk=group.slice(s,s+cap), driver=available.shift()||null;
      if (driver) usedDrivers.add(driver._i);
      assignments.push({ driver, passengers:chunk, vehicleType:pref, warnings:driver?[]:[`No ${pref} driver available`], preferenceGroup:true });
      chunk.forEach(p=>assignedIds.add(p.id));
    }
  });
  const remaining=passengers.filter(p=>!assignedIds.has(p.id));
  if (remaining.length>0) {
    const MERGE_R=10000, clusters=[], clustered=new Set();
    remaining.forEach(p => {
      if (clustered.has(p._i)) return;
      const cl=[p]; clustered.add(p._i);
      remaining.forEach(q => { if (!clustered.has(q._i)&&haversine(p.pickupLoc,q.pickupLoc)<=MERGE_R) { cl.push(q); clustered.add(q._i); }});
      clusters.push(cl);
    });
    const large=clusters.filter(c=>c.length>1), solos=clusters.filter(c=>c.length===1);
    solos.forEach(s => { if (large.length) { let mn=Infinity,nr=large[0]; large.forEach(cl=>{const d=haversine(s[0].pickupLoc,cl[0].pickupLoc);if(d<mn){mn=d;nr=cl;}}); nr.push(s[0]); } else large.push(s); });
    const finalClusters=(large.length?large:clusters).sort((a,b)=>b.length-a.length);
    const freeDrivers=drivers.filter(d=>!usedDrivers.has(d._i));
    finalClusters.forEach(cluster => {
      const ideal=pickBestVehicle(cluster.length), cap=VEHICLE_CAPS_SRV[ideal];
      for (let s=0;s<cluster.length;s+=cap) {
        const chunk=cluster.slice(s,s+cap), count=chunk.length, idealType=pickBestVehicle(count);
        let di2=freeDrivers.findIndex(d=>d.vehicleType===idealType);
        if (di2===-1) di2=freeDrivers.findIndex(d=>VEHICLE_CAPS_SRV[d.vehicleType]>=count);
        if (di2===-1&&freeDrivers.length>0) di2=0;
        const driver=di2>=0?freeDrivers.splice(di2,1)[0]:null, actualType=driver?driver.vehicleType:idealType;
        if (driver) usedDrivers.add(driver._i);
        const warn=[]; if (!driver) warn.push(`No driver for ${idealType}`); if (driver&&driver.vehicleType!==idealType) warn.push(`Using ${driver.vehicleType} instead of ${idealType}`);
        assignments.push({ driver, passengers:chunk, vehicleType:actualType, warnings:warn, preferenceGroup:false });
        chunk.forEach(p=>assignedIds.add(p.id));
      }
    });
  }
  return assignments.filter(a=>a.passengers.length>0).map(a => {
    const routeSeq=a.driver?[a.driver._i]:[pIdx(a.passengers[0]._i)];
    a.passengers.forEach(p => {
      const pi=pIdx(p._i), di=dIdx(p._i);
      if (routeSeq.length===1) { routeSeq.push(pi,di); }
      else {
        const {position}=bestInsertionCost(matrix,routeSeq,pi,di);
        routeSeq.splice(position,0,pi);
        const pp=routeSeq.indexOf(pi); let bp=pp+1, bc=Infinity;
        for (let j=pp+1;j<=routeSeq.length;j++) {
          const prev=routeSeq[j-1], next=j<routeSeq.length?routeSeq[j]:null;
          const c=next!==null?routeCost((matrix.durations[prev]?.[di]||0)+(matrix.durations[di]?.[next]||0)-(matrix.durations[prev]?.[next]||0),(matrix.distances[prev]?.[di]||0)+(matrix.distances[di]?.[next]||0)-(matrix.distances[prev]?.[next]||0)):routeCost(matrix.durations[prev]?.[di]||0,matrix.distances[prev]?.[di]||0);
          if (c<bc) { bc=c; bp=j; }
        }
        routeSeq.splice(bp,0,di);
      }
    });
    
    const vType = a.vehicleType || 'van';
    const {estimatedKm, estimatedTime, estimatedFuel, fuelCostPKR, fuelType, fuelRatePerKm} = summariseRoute(routeSeq, matrix, vType);
    
    const stopMap={};
    a.passengers.forEach(p => { stopMap[pIdx(p._i)]={name:p.name||'Passenger',address:p.pickupAddress||p.pickupPoint||'Pickup',type:'pickup'}; stopMap[dIdx(p._i)]={name:p.name||'Passenger',address:p.dropAddress||p.destination||'Drop-off',type:'dropoff'}; });
    const stops=routeSeq.filter(r=>stopMap[r]).map(r=>stopMap[r].address||stopMap[r].name||'Stop');
    const cap=VEHICLE_CAPS_SRV[vType]||8, paxCount=a.passengers.length;
    if (paxCount>cap) a.warnings.push(`⚠ ${paxCount} passengers exceed ${vType} capacity (${cap})`);
    return {
      driverId:a.driver?.id||null,
      driverName:a.driver?.name||`Needs ${(vType).toUpperCase()} Driver`,
      vehicleType:vType,
      vehicleCapacity:cap,
      passengerCount:paxCount,
      passengers:a.passengers.map(({_i,pickupLoc,dropLoc,...rest})=>rest),
      stops,
      estimatedTime,
      estimatedFuel,
      estimatedKm,
      fuelCostPKR,
      fuelType,
      fuelRatePerKm,
      warnings:[...new Set(a.warnings)],
      isNewRoute:!a.driver,
      preferenceGroup:a.preferenceGroup||false,
      matrixSource:matrix.source
    };
  });
}

// ==================== VAN LOCATIONS ====================
let vans = [
  { id:'1', name:'Van-A', driver:'Ahmed Ali', currentLocation:{latitude:33.6844,longitude:73.0479}, status:'En Route', passengers:12, capacity:20, eta:'5 mins', color:'#FF5733' },
  { id:'2', name:'Van-B', driver:'Sajid Khan', currentLocation:{latitude:33.6484,longitude:73.0234}, status:'Delayed', passengers:8, capacity:15, eta:'12 mins', color:'#33FF57' }
];

// ==================== AUTH ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ success:false, message:'Invalid credentials' });
    const actualRole = user.role || user.type;
    if (role && actualRole !== role) return res.status(403).json({ success:false, message:`Account is "${actualRole}", not "${role}".` });
    const token = jwt.sign({ userId:user._id, email:user.email, role:actualRole }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ success:true, token, user:{ id:user._id, name:user.name, email:user.email, role:actualRole, type:actualRole, phone:user.phone, company:user.company, status:user.status, approved:user.status==='active', isApproved:user.status==='active', isVerified:user.status==='active', pickupPoint:user.pickupPoint, destination:user.destination, preferredTimeSlot:user.preferredTimeSlot, address:user.address, latitude:user.latitude, longitude:user.longitude, transporterId:user.transporterId||(actualRole==='transporter'?user._id:null), license:user.license, van:user.van, vehicleNo:user.vehicleNo, capacity:user.capacity, vehicle:user.vehicle, vehicleType:user.vehicleType, experience:user.experience, availableTimeSlots:user.availableTimeSlots, country:user.country, city:user.city, zone:user.zone, profileImage:user.profileImage, registrationDate:user.registrationDate } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ success:false, message:'Server error' }); }
});

app.post('/api/transporter/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const t = await User.findOne({ email:email.toLowerCase(), $or:[{role:'transporter'},{type:'transporter'}] });
    if (!t || password !== t.password) return res.status(401).json({ success:false, message:'Invalid credentials' });
    const token = jwt.sign({ userId:t._id, email:t.email, role:'transporter' }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ success:true, message:'Login successful', token, transporter:{ id:t._id, name:t.name, email:t.email, phone:t.phone, company:t.company, status:t.status, approved:t.status==='active', isApproved:t.status==='active', isVerified:t.status==='active', address:t.address, country:t.country, city:t.city, zone:t.zone, profileImage:t.profileImage, registrationDate:t.registrationDate, transporterId:t._id } });
  } catch (err) { console.error('Login error:', err); res.status(500).json({ success:false, message:'Login failed' }); }
});

// ==================== DRIVER REGISTRATION ====================
app.post('/api/driver-requests', async (req, res) => {
  try {
    const { fullName, email, phone, password, license, vehicleNo, vehicleType, vehicle, capacity, address, location, latitude, longitude, transporterId, transporterName } = req.body;
    const missing = [];
    if (!fullName) missing.push('fullName');
    if (!email)    missing.push('email');
    if (!phone)    missing.push('phone');
    if (!password) missing.push('password');
    if (!license)  missing.push('license');
    if (!vehicleNo) missing.push('vehicleNo');
    if (!transporterId) missing.push('transporterId');
    if (missing.length > 0) return res.status(400).json({ success:false, message:`Missing: ${missing.join(', ')}` });

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ success:false, message:'Email already registered.' });
    const existingReq = await JoinRequest.findOne({ email:email.toLowerCase(), status:'pending' });
    if (existingReq) return res.status(400).json({ success:false, message:'Pending request already exists for this email.' });

    let transporterObjId;
    try { transporterObjId = new mongoose.Types.ObjectId(transporterId); }
    catch { return res.status(400).json({ success:false, message:'Invalid transporter ID format.' }); }
    const transporter = await User.findById(transporterObjId);
    if (!transporter) return res.status(404).json({ success:false, message:'Transporter not found.' });

    const CAPS = { car:4, van:12, bus:30 };
    const resolvedVehicleType = vehicleType || vehicle || null;
    const resolvedCapacity = capacity ? Number(capacity) : (resolvedVehicleType ? (CAPS[resolvedVehicleType] || 4) : 4);
    let lat = latitude ? parseFloat(latitude) : null;
    let lng = longitude ? parseFloat(longitude) : null;
    if (!lat && location?.coordinates?.length === 2) { lng = location.coordinates[0]; lat = location.coordinates[1]; }

    const newRequest = new JoinRequest({
      name: fullName.trim(), fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(), password: password.trim(),
      type: 'driver',
      license: license.trim().toUpperCase(),
      vehicleNo: vehicleNo.trim().toUpperCase(),
      vehicle: vehicleNo.trim().toUpperCase(),
      vehicleType: resolvedVehicleType,
      capacity: resolvedCapacity,
      address: address || location?.address || 'Not provided',
      location: location || {},
      latitude: lat, longitude: lng,
      pickupPoint: address || location?.address || 'Not provided',
      transporterId: transporterObjId,
      transporterName: transporterName || transporter.name || transporter.company || 'Transporter',
      vehiclePreference: null,
      status: 'pending',
      createdAt: new Date()
    });
    await newRequest.save();
    try { await sendNotification(transporterObjId, 'transporter', 'New Driver Request 🚗', `${fullName} wants to join.\nVehicle: ${resolvedVehicleType||vehicleNo} | Capacity: ${resolvedCapacity}\nLicense: ${license}`, 'request', newRequest._id, 'driver_request', true, 'review_driver_request'); } catch (e) {}
    return res.status(201).json({ success: true, message: 'Driver request submitted! You will be notified once approved.', requestId: newRequest._id });
  } catch (err) {
    return res.status(500).json({ success:false, message:'Failed to submit request.', error:err.message });
  }
});

// ==================== PROFILE APIs ====================
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message:'User not found' });
    res.json({ id:user._id, name:user.name, email:user.email, phone:user.phone, company:user.company, registrationDate:user.registrationDate?new Date(user.registrationDate).toLocaleDateString():new Date().toLocaleDateString(), address:user.address, license:user.license||'N/A', location:user.address||'N/A', profileImage:user.profileImage||'https://cdn-icons-png.flaticon.com/512/149/149071.png', country:user.country, city:user.city, zone:user.zone, status:user.status, transporterId:user.transporterId||(user.role==='transporter'?user._id:null) });
  } catch (err) { res.status(500).json({ message:'Server error' }); }
});

app.get('/api/transporter/profile/:transporterId', authenticateToken, async (req, res) => {
  try {
    const t = await User.findById(req.params.transporterId);
    if (!t) return res.status(404).json({ success:false, message:'Transporter not found' });
    const p = { _id:t._id, id:t._id, name:t.name, email:t.email, phone:t.phone, phoneNumber:t.phone, company:t.company, companyName:t.company, address:t.address, license:t.license||'N/A', licenseNumber:t.license||'N/A', location:t.address||'N/A', registrationDate:t.registrationDate, createdAt:t.registrationDate, status:t.status, profileImage:t.profileImage };
    res.json({ success:true, data:p, transporter:p });
  } catch (err) { res.status(500).json({ success:false, message:'Server error' }); }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try { await User.findByIdAndUpdate(req.userId, req.body); res.json({ success:true, message:'Updated' }); }
  catch (err) { res.status(500).json({ message:'Update failed' }); }
});

app.put('/api/transporter/profile/:transporterId', authenticateToken, async (req, res) => {
  try { await User.findByIdAndUpdate(req.params.transporterId, req.body); res.json({ success:true, message:'Updated' }); }
  catch (err) { res.status(500).json({ success:false, message:'Update failed' }); }
});

// ==================== DASHBOARD STATS ====================
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const tid = req.query.transporterId || req.userId;
    const [activeDrivers, totalPassengers, completedTrips, ongoingTrips, complaints, driverPayments, pendingPayments] = await Promise.all([
      User.countDocuments({ $or:[{role:'driver'},{type:'driver'}], status:'active', transporterId:tid }),
      User.countDocuments({ $or:[{role:'passenger'},{type:'passenger'}], transporterId:tid }),
      Trip.countDocuments({ status:'Completed', transporterId:tid }),
      Trip.countDocuments({ status:'En Route', transporterId:tid }),
      Complaint.countDocuments({ status:'Open', transporterId:tid }),
      Payment.aggregate([{$match:{type:'driver',status:'Sent',transporterId:new mongoose.Types.ObjectId(tid)}},{$group:{_id:null,total:{$sum:'$amount'}}}]),
      Payment.aggregate([{$match:{type:'driver',status:'Pending',transporterId:new mongoose.Types.ObjectId(tid)}},{$group:{_id:null,total:{$sum:'$amount'}}}])
    ]);
    res.json({ stats:{ activeDrivers, totalPassengers, completedTrips, ongoingTrips, complaints, paymentsReceived:driverPayments[0]?.total||0, paymentsPending:pendingPayments[0]?.total||0 } });
  } catch (err) { res.status(500).json({ message:'Error fetching stats' }); }
});

// ==================== POLLS ====================
app.post('/api/polls', authenticateToken, async (req, res) => {
  try {
    const { title, timeSlots, closesAt, closingDate, transporterId } = req.body;
    const tid = transporterId || req.userId;
    const newPoll = new Poll({ title:title||'Tomorrow Travel', question:'Will you travel tomorrow?', timeSlots, closesAt, closingDate:closingDate||new Date(Date.now()+86400000), transporterId:tid, status:'active', responses:[] });
    await newPoll.save();
    const passengers = await User.find({ $or:[{role:'passenger'},{type:'passenger'}], transporterId:tid, status:'active' });
    let sent=0;
    for (const p of passengers) {
      try { await sendNotification(p._id,'passenger','📋 Travel Confirmation',`${title||'Will you travel tomorrow?'} Respond by ${closesAt}.`,'poll',newPoll._id,'poll',true,'respond_poll'); sent++; } catch {}
    }
    newPoll.notificationsSent=true; await newPoll.save();
    res.json({ success:true, poll:newPoll, notificationsSent:sent, totalPassengers:passengers.length });
  } catch (err) { res.status(500).json({ success:false, message:'Error creating poll', error:err.message }); }
});

app.get('/api/polls', authenticateToken, async (req, res) => {
  try {
    const tid = req.query.transporterId || req.userId;
    const polls = await Poll.find({ transporterId:tid }).populate('responses.passengerId').sort({ createdAt:-1 });
    res.json({ success:true, polls, data:polls });
  } catch (err) { res.status(500).json({ success:false, message:'Error' }); }
});

app.get('/api/polls/active', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    const query = { status:'active', closingDate:{$gte:new Date()} };
    if (user.transporterId) query.transporterId = user.transporterId;
    const polls = await Poll.find(query).sort({ createdAt:-1 });
    const result = polls.map(p => { const ur=p.responses.find(r=>r.passengerId&&r.passengerId.toString()===req.userId.toString()); return { ...p.toObject(), hasResponded:!!ur, userResponse:ur||null }; });
    res.json({ success:true, polls:result, count:result.length });
  } catch (err) { res.status(500).json({ success:false, message:'Error' }); }
});

app.get('/api/polls/:pollId', authenticateToken, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, poll });
  } catch (err) { res.status(500).json({ success:false, message:'Error' }); }
});

app.post('/api/polls/:pollId/respond', authenticateToken, async (req, res) => {
  try {
    const { response, selectedTimeSlot, pickupPoint } = req.body;
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ success:false, message:'Not found' });
    if (poll.status!=='active') return res.status(400).json({ success:false, message:'Closed' });
    const user = await User.findById(req.userId);
    const idx = poll.responses.findIndex(r=>r.passengerId&&r.passengerId.toString()===req.userId.toString());
    const obj = { passengerId:req.userId, passengerName:user.name, passengerEmail:user.email, response, selectedTimeSlot:response==='yes'?selectedTimeSlot:null, pickupPoint:response==='yes'?(pickupPoint||user.pickupPoint):null, respondedAt:new Date() };
    if (idx!==-1) poll.responses[idx]=obj; else poll.responses.push(obj);
    await poll.save();
    if (poll.transporterId) await sendNotification(poll.transporterId,'transporter','Poll Response',`${user.name}: ${response==='yes'?'Will travel':'Will not travel'}`,'poll',poll._id,'poll',false);
    res.json({ success:true, message:'Response recorded' });
  } catch (err) { res.status(500).json({ success:false, message:'Error' }); }
});

app.put('/api/polls/:pollId/close', authenticateToken, async (req, res) => {
  try { const p=await Poll.findByIdAndUpdate(req.params.pollId,{status:'closed'},{new:true}); res.json({ success:true, poll:p }); }
  catch (err) { res.status(500).json({ success:false }); }
});

app.delete('/api/polls/:pollId', authenticateToken, async (req, res) => {
  try { await Poll.findByIdAndDelete(req.params.pollId); res.json({ success:true }); }
  catch (err) { res.status(500).json({ success:false }); }
});

app.get('/api/polls/:pollId/responses', authenticateToken, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId).populate('responses.passengerId');
    if (!poll) return res.status(404).json({ success:false });
    const yes=poll.responses.filter(r=>r.response==='yes'), no=poll.responses.filter(r=>r.response==='no');
    res.json({ success:true, summary:{ total:poll.responses.length, yes:yes.length, no:no.length, yesResponses:yes, noResponses:no } });
  } catch (err) { res.status(500).json({ success:false }); }
});

// ==================== DRIVER AVAILABILITY ====================
app.post('/api/availability', authenticateToken, async (req, res) => {
  try {
    const { date, startTime, endTime, status } = req.body;
    const driver = await User.findById(req.userId);
    if (!driver||(driver.role!=='driver'&&driver.type!=='driver')) return res.status(403).json({ success:false, message:'Only drivers' });
    let av = await DriverAvailability.findOne({ driverId:req.userId, date:new Date(date) });
    if (av) { av.startTime=startTime; av.endTime=endTime; av.status=status; av.confirmed=true; }
    else av = new DriverAvailability({ driverId:req.userId, driverName:driver.name, date:new Date(date), startTime, endTime, status, confirmed:true, transporterId:driver.transporterId });
    await av.save();
    if (driver.transporterId) await sendNotification(driver.transporterId,'transporter','Driver Availability',`${driver.name} is ${status} for ${new Date(date).toLocaleDateString()}`,'confirmation',av._id,'availability',false);
    res.json({ success:true, availability:av });
  } catch (err) { res.status(500).json({ success:false, message:'Error' }); }
});

app.get('/api/availability', authenticateToken, async (req, res) => {
  try {
    const { driverId, transporterId, date } = req.query;
    let q={};
    if (driverId) q.driverId=driverId; else if (req.userRole==='driver') q.driverId=req.userId;
    if (transporterId) q.transporterId=transporterId;
    if (date) q.date=new Date(date);
    const av = await DriverAvailability.find(q).populate('driverId').sort({date:-1});
    res.json({ success:true, availability:av, data:av });
  } catch (err) { res.status(500).json({ success:false }); }
});

// ==================== ROUTES ====================
app.post('/api/routes', authenticateToken, async (req, res) => {
  try {
    const {
      name, routeName, pollId,
      startPoint, destination,
      timeSlot, pickupTime, date,
      passengers, stops,
      estimatedTime, estimatedFuel, estimatedKm,
      fuelCostPKR, fuelType, fuelRatePerKm,
      vehicleType, status, transporterId
    } = req.body;

    const tid = transporterId || req.userId;

    const stopStrings = (stops || []).map(s =>
      typeof s === 'string' ? s : (s.address || s.name || 'Stop')
    );

    const passengerList = (passengers || []).map(p => ({
      passengerId:   p.passengerId || p.id || p._id || null,
      passengerName: p.passengerName || p.name || 'Passenger',
      pickupPoint:   p.pickupPoint  || p.pickupAddress || startPoint || 'Pickup',
      status:        p.status || 'pending',
    }));

    const r = new Route({
      name:          routeName || name || 'Route',
      routeName:     routeName || name || 'Route',
      pollId:        pollId || null,
      assignedDriver: null,
      driverName:    null,
      stops:         stopStrings,
      startPoint:    startPoint || stopStrings[0] || 'Multiple Pickup Points',
      destination:   destination || 'Riphah International University',
      timeSlot,
      pickupTime,
      date:          date ? new Date(date) : new Date(Date.now() + 86400000),
      passengers:    passengerList,
      estimatedTime,
      estimatedFuel,
      estimatedKm,
      fuelCostPKR:   fuelCostPKR || null,
      fuelType:      fuelType || 'petrol',
      fuelRatePerKm: fuelRatePerKm || null,
      vehicleType:   vehicleType || 'van',
      status:        status || 'unassigned',
      transporterId: tid,
    });

    await r.save();
    console.log(`✅ Route saved: "${r.routeName}" | Fuel: ${fuelCostPKR} | Vehicle: ${vehicleType}`);
    res.status(201).json({ success: true, route: r, data: r, _id: r._id });
  } catch (err) {
    console.error('❌ Route save error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save route', error: err.message });
  }
});

app.get('/api/routes', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.query.assignedDriver) {
      let driverObjId;
      try { driverObjId = new mongoose.Types.ObjectId(req.query.assignedDriver); } catch { driverObjId = req.query.assignedDriver; }
      query.$or = [{ assignedDriver: driverObjId }, { assignedDriver: req.query.assignedDriver }];
    } else {
      query.transporterId = req.query.transporterId || req.userId;
    }
    const routes = await Route.find(query)
      .populate('assignedDriver', 'name vehicleType vehicleNo phone')
      .populate('passengers.passengerId', 'name phone pickupPoint')
      .sort({ createdAt: -1 });
    res.json({ success: true, routes, data: routes, count: routes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch routes', error: err.message });
  }
});

app.put('/api/routes/:routeId/assign-driver', authenticateToken, async (req, res) => {
  try {
    const { driverId, assignedDriver } = req.body;
    const dId = driverId || assignedDriver;
    if (!dId) return res.status(400).json({ success: false, message: 'driverId is required' });

    const driver = await User.findById(dId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const route = await Route.findByIdAndUpdate(
      req.params.routeId,
      { assignedDriver: dId, driverName: driver.name, status: 'assigned' },
      { new: true }
    );
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

    let trip = await Trip.findOne({ routeId: route._id });
    if (!trip) {
      trip = new Trip({
        driverId:        dId,
        driverName:      driver.name,
        routeId:         route._id,
        routeName:       route.routeName || route.name,
        status:          'Scheduled',
        currentStop:     route.startPoint,
        currentLocation: { latitude: 33.6844, longitude: 73.0479 },
        passengers:      (route.passengers || []).map(p => ({
          _id:            p.passengerId,
          name:           p.passengerName,
          pickupPoint:    p.pickupPoint,
          status:         'pending',
          confirmedMorning: false,
        })),
        stops:         route.stops || [],
        completedStops: [],
        timeSlot:      route.timeSlot,
        capacity:      driver.capacity || 8,
        vehicleType:   driver.vehicleType || driver.vehicle || route.vehicleType || 'van',
        vehicleNumber: driver.vehicleNo || driver.van || 'N/A',
        transporterId: route.transporterId,
      });
    } else {
      trip.driverId   = dId;
      trip.driverName = driver.name;
      trip.status     = 'Scheduled';
    }
    await trip.save();

    try { await sendNotification(dId, 'driver', 'Route Assigned! 🚐', `${route.routeName || route.name} — ${(route.passengers||[]).length} passengers`, 'route', route._id, 'route', true, 'confirm_route'); } catch {}
    res.json({ success: true, route, trip, message: `${driver.name} assigned successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign driver', error: err.message });
  }
});

app.post('/api/routes/assign', authenticateToken, async (req, res) => {
  try {
    const { pollId, driverId, routeName, startPoint, destination, timeSlot, pickupTime, date } = req.body;
    const poll = await Poll.findById(pollId);
    if (!poll) return res.status(404).json({ success:false, message:'Poll not found' });
    const yesR = poll.responses.filter(r=>r.response==='yes');
    if (!yesR.length) return res.status(400).json({ success:false, message:'No passengers confirmed' });
    const driver = await User.findById(driverId);
    if (!driver) return res.status(404).json({ success:false, message:'Driver not found' });
    const passengers = yesR.map(r=>({ passengerId:r.passengerId, passengerName:r.passengerName, pickupPoint:r.pickupPoint, status:'pending' }));
    const stops = [...new Set(passengers.map(p=>p.pickupPoint).filter(Boolean))];
    const newRoute = new Route({ name:routeName, routeName, stops, startPoint, destination, assignedDriver:driverId, driverName:driver.name, timeSlot, pickupTime, passengers, status:'assigned', transporterId:driver.transporterId, date:new Date(date) });
    await newRoute.save();
    const newTrip = new Trip({ driverId, driverName:driver.name, routeId:newRoute._id, routeName, status:'Scheduled', currentStop:startPoint, currentLocation:{latitude:33.6844,longitude:73.0479}, passengers:passengers.map(p=>({_id:p.passengerId,name:p.passengerName,pickupPoint:p.pickupPoint,status:'pending',confirmedMorning:false})), stops, completedStops:[], timeSlot, capacity:driver.capacity||8, vehicleType:driver.vehicleType||driver.vehicle||'Van', vehicleNumber:driver.van||driver.vehicleNo||'N/A', transporterId:driver.transporterId });
    await newTrip.save();
    try { await sendNotification(driverId,'driver','Route Assigned! 🚐',`${routeName} with ${passengers.length} passengers`,'route',newRoute._id,'route',true,'confirm_route'); } catch {}
    res.json({ success:true, route:newRoute, trip:newTrip });
  } catch (err) { res.status(500).json({ success:false, message:'Error', error:err.message }); }
});

app.put('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try { const r=await Route.findByIdAndUpdate(req.params.routeId,req.body,{new:true}); res.json({ success:true, route:r }); } catch { res.status(500).json({ success:false }); }
});
app.delete('/api/routes/:routeId', authenticateToken, async (req, res) => {
  try { await Route.findByIdAndDelete(req.params.routeId); res.json({ success:true }); } catch { res.status(500).json({ success:false }); }
});

// ==================== TRIPS ====================
app.get('/api/trips', authenticateToken, async (req, res) => {
  try {
    const { status, transporterId } = req.query;
    let q = { transporterId:transporterId||req.userId };
    if (status) q.status=status;
    const trips = await Trip.find(q).populate('driverId').populate('routeId').sort({createdAt:-1});
    res.json({ success:true, trips, data:trips });
  } catch { res.status(500).json({ success:false }); }
});

app.post('/api/routes/:routeId/start', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    if (!route) return res.status(404).json({ success:false });
    route.status='started'; await route.save();
    const trip = await Trip.findOne({ routeId:route._id });
    if (trip) { trip.status='En Route'; trip.startTime=new Date(); await trip.save(); }
    res.json({ success:true, route, trip });
  } catch { res.status(500).json({ success:false }); }
});

app.post('/api/routes/:routeId/end', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findById(req.params.routeId);
    if (!route) return res.status(404).json({ success:false });
    route.status='completed'; await route.save();
    const trip = await Trip.findOne({ routeId:route._id });
    if (trip) { trip.status='Completed'; trip.endTime=new Date(); await trip.save(); }
    res.json({ success:true, route, trip });
  } catch { res.status(500).json({ success:false }); }
});

app.post('/api/live-tracking/location', authenticateToken, async (req, res) => {
  try {
    const { routeId, latitude, longitude, speed } = req.body;
    const trip = await Trip.findOne({ routeId });
    if (!trip||trip.driverId.toString()!==req.userId.toString()) return res.status(403).json({ success:false });
    trip.currentLocation={latitude,longitude}; trip.speed=speed; trip.updatedAt=new Date();
    await trip.save(); res.json({ success:true, location:trip.currentLocation });
  } catch { res.status(500).json({ success:false }); }
});

app.get('/api/live-tracking/location/:tripId', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) return res.status(404).json({ success:false });
    res.json({ success:true, location:trip.currentLocation, speed:trip.speed, eta:trip.eta, currentStop:trip.currentStop, status:trip.status });
  } catch { res.status(500).json({ success:false }); }
});

// ==================== VAN LOCATIONS ====================
app.get('/api/vans/locations', (req, res) => {
  vans = vans.map(v=>({...v,currentLocation:{latitude:v.currentLocation.latitude+(Math.random()-0.5)*0.001,longitude:v.currentLocation.longitude+(Math.random()-0.5)*0.001}}));
  res.json(vans);
});
// ─── MAIN OPTIMIZE ENDPOINT ───────────────────────────────────────────────────
app.post('/api/optimize', async (req, res) => {
  try {
    const { passengers: rawPassengers, destination } = req.body;
    if (!rawPassengers?.length) return res.json({ routes: [], message: 'No passengers provided' });

    const DEST = {
      lat:     parseFloat(destination?.lat  || 33.6135),
      lng:     parseFloat(destination?.lng  || 73.1998),
      address: destination?.address || 'Riphah International University, Gulberg Greens, Islamabad',
    };

    // Step 1: Normalize + reverse geocode locations
    const passengers = await batchReverseGeocode(
      rawPassengers.map((p, i) => ({
        id:                p.id || p._id || `p_${i}`,
        name:              p.name || `Passenger ${i + 1}`,
        pickupLat:         parseFloat(p.pickupLat || p.latitude || 0),
        pickupLng:         parseFloat(p.pickupLng || p.longitude || 0),
        pickupAddress:     p.pickupAddress || p.address || '',
        vehiclePreference: p.vehiclePreference || null,
        timeSlot:          p.timeSlot || null,
      }))
    );

    const valid   = passengers.filter(p => p.pickupLat !== 0 && p.pickupLng !== 0);
    const invalid = passengers.filter(p => p.pickupLat === 0 && p.pickupLng === 0);

    // Step 2: Group by vehicle preference
    const groups = [
      { passengers: valid.filter(p => p.vehiclePreference === 'car'), forced: 'car' },
      { passengers: valid.filter(p => p.vehiclePreference === 'van'), forced: 'van' },
      { passengers: valid.filter(p => p.vehiclePreference === 'bus'), forced: 'bus' },
      { passengers: valid.filter(p => !p.vehiclePreference),          forced: null  },
    ].filter(g => g.passengers.length > 0);

    const allRouteGroups = [];
    const depot = DEST;

    for (const group of groups) {
      const maxCap = group.forced ? VEHICLE_CAPS[group.forced] : VEHICLE_CAPS.bus;
      const savedRoutes = clarkWrightSavings(group.passengers, depot, maxCap);

      // Split oversized routes
      for (let i = savedRoutes.length - 1; i >= 0; i--) {
        const route = savedRoutes[i];
        const cap   = group.forced ? VEHICLE_CAPS[group.forced] : VEHICLE_CAPS[
          route.length <= 4 ? 'car' : route.length <= 12 ? 'van' : 'bus'
        ];
        if (route.length > cap) {
          const chunks = [];
          for (let j = 0; j < route.length; j += cap) chunks.push(route.slice(j, j + cap));
          savedRoutes.splice(i, 1, ...chunks);
        }
      }
      savedRoutes.forEach(r => allRouteGroups.push({ passengers: r, forced: group.forced }));
    }

    if (invalid.length) {
      for (let i = 0; i < invalid.length; i += VEHICLE_CAPS.van)
        allRouteGroups.push({
          passengers: invalid.slice(i, i + VEHICLE_CAPS.van),
          forced: null,
          warning: 'No GPS coordinates — manual pickup required',
        });
    }

    // Step 3: Build route objects with distances
    const routeResults = await Promise.all(
      allRouteGroups.map(async ({ passengers: paxList, forced, warning }, idx) => {
        const vType = forced || (paxList.length <= 4 ? 'car' : paxList.length <= 12 ? 'van' : 'bus');
        const cap   = VEHICLE_CAPS[vType];
        const sorted = nearestNeighborSort(paxList);
        const waypoints = sorted.map(p => ({ lat: p.pickupLat, lng: p.pickupLng }));

        // Try OSRM for real road distance
        let distanceKm = 0, durationMins = 0, matrixSource = 'haversine';
        const osrmResult = await getOSRMRoute(waypoints, DEST);
        if (osrmResult && osrmResult.distanceKm > 0 && osrmResult.distanceKm < 300) {
          const minKm  = PK_FUEL.minRouteKm[vType] || 12;
          distanceKm   = Math.max(osrmResult.distanceKm, minKm);
          durationMins = osrmResult.durationMins;
          matrixSource = 'osrm';
        } else {
          // Haversine fallback with Pakistan road factor
          let straight = 0;
          for (let i = 0; i < waypoints.length - 1; i++)
            straight += haversineKm(waypoints[i].lat, waypoints[i].lng, waypoints[i+1].lat, waypoints[i+1].lng);
          if (waypoints.length)
            straight += haversineKm(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng, DEST.lat, DEST.lng);
          const roadKm     = straight * (PK_FUEL.roadFactor[vType] || 1.32);
          distanceKm       = Math.max(roadKm, PK_FUEL.minRouteKm[vType] || 12);
          durationMins     = Math.max(10, Math.round((distanceKm / (PK_FUEL.avgSpeedKmh[vType] || 23)) * 60));
        }

        const { fuelLitres, fuelCostPKR, fuelType, consumption } = calculateFuel(distanceKm, vType);
        const score = optimizationScore(distanceKm, durationMins, fuelLitres, paxList.length);

        const warnings = [];
        if (warning) warnings.push(warning);
        if (paxList.length > cap) warnings.push(`Exceeds ${vType} capacity (${paxList.length}/${cap})`);
        if (matrixSource === 'haversine') warnings.push('Estimated distance — OSRM unavailable');

        const stops = [
          ...sorted.map(p => ({
            name:    p.name,
            address: p.pickupAddress,
            lat:     p.pickupLat,
            lng:     p.pickupLng,
            type:    'pickup',
          })),
          { name: 'Destination', address: DEST.address, lat: DEST.lat, lng: DEST.lng, type: 'dropoff' },
        ];

        return {
          id:                `route_${idx + 1}`,
          vehicleType:       vType,
          passengerCount:    paxList.length,
          capacity:          cap,
          passengers:        paxList,
          stops,
          estimatedKm:       `${distanceKm.toFixed(1)} km`,
          estimatedTime:     durationMins < 60 ? `${durationMins} min` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
          estimatedFuel:     `${fuelLitres.toFixed(1)} L`,
          fuelCostPKR:       `Rs. ${fuelCostPKR.toLocaleString()}`,
          fuelType,
          consumption:       `${consumption} L/100km`,
          rawDistanceKm:     parseFloat(distanceKm.toFixed(2)),
          rawDurationMins:   durationMins,
          rawFuelLitres:     fuelLitres,
          rawFuelCostPKR:    fuelCostPKR,
          matrixSource,
          optimizationScore: score,
          warnings,
          destination:       DEST.address,
        };
      })
    );

    routeResults.sort((a, b) => b.optimizationScore - a.optimizationScore);

    const totalFuelCost  = routeResults.reduce((s, r) => s + r.rawFuelCostPKR, 0);
    const totalPassengers = routeResults.reduce((s, r) => s + r.passengerCount, 0);
    const avgScore        = Math.round(routeResults.reduce((s, r) => s + r.optimizationScore, 0) / (routeResults.length || 1));

    res.json({
      routes:         routeResults,
      summary: {
        totalRoutes:    routeResults.length,
        totalPassengers,
        totalFuelCost:  `Rs. ${totalFuelCost.toLocaleString()}`,
        avgScore,
        destination:    DEST.address,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── REVERSE GEOCODE ENDPOINT (single point) ──────────────────────────────────
app.get('/api/geocode', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });
  const address = await reverseGeocode(lat, lng);
  res.json({ lat: parseFloat(lat), lng: parseFloat(lng), address });
});


// ==================== SMART ROUTES ====================
app.post('/api/smart-routes/optimize', async (req, res) => {
  try {
    const { passengers, drivers, pollId } = req.body;
    if (!Array.isArray(passengers)||!passengers.length) return res.status(400).json({ success:false, error:'No passengers' });
    const results = await optimiseRoutes(passengers, drivers||[]);
    res.json({ success:true, pollId, routes:results, count:results.length });
  } catch (err) { res.status(500).json({ success:false, error:'Optimization failed', details:err.message }); }
});

// ==================== Pakistan Fuel Info API ====================
app.get('/api/fuel-rates', (req, res) => {
  res.json({
    success: true,
    rates: PAKISTAN_FUEL,
    note: 'Pakistan current fuel rates - updated periodically',
    lastUpdated: '2024-12'
  });
});

// ==================== COMPLAINTS ====================
app.post('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, againstUserId, againstName, tripId } = req.body;
    const user = await User.findById(req.userId);
    const c = new Complaint({ title, description, category, byUserId:req.userId, byName:user.name, byRole:user.role||user.type, againstUserId, againstName, tripId, status:'Open', priority:'medium', transporterId:user.transporterId });
    await c.save();
    if (user.transporterId) await sendNotification(user.transporterId,'transporter','New Complaint',`${user.name}: ${title}`,'complaint',c._id,'complaint',true);
    res.json({ success:true, complaint:c });
  } catch { res.status(500).json({ success:false }); }
});

app.get('/api/complaints', authenticateToken, async (req, res) => {
  try {
    const c = await Complaint.find({ transporterId:req.query.transporterId||req.userId }).populate('byUserId').populate('againstUserId').sort({createdAt:-1});
    res.json({ success:true, complaints:c, data:c });
  } catch { res.status(500).json({ success:false }); }
});

app.post('/api/complaints/:id/reply', authenticateToken, async (req, res) => {
  try {
    const c = await Complaint.findById(req.params.id);
    if (!c) return res.status(404).json({ success:false });
    const user = await User.findById(req.userId);
    c.replies.push({ by:user.name, byRole:user.role||user.type, text:req.body.text, date:new Date() });
    c.status='In Progress'; await c.save();
    await sendNotification(c.byUserId,c.byRole,'Complaint Reply',`New reply: ${c.title}`,'complaint',c._id,'complaint',false);
    res.json({ success:true, complaint:c });
  } catch { res.status(500).json({ success:false }); }
});

app.put('/api/complaints/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const c = await Complaint.findByIdAndUpdate(req.params.id,{status:'Resolved',resolvedAt:new Date()},{new:true});
    await sendNotification(c.byUserId,c.byRole,'Resolved',`Complaint resolved: ${c.title}`,'complaint',c._id,'complaint',false);
    res.json({ success:true, complaint:c });
  } catch { res.status(500).json({ success:false }); }
});

// ==================== FEEDBACK ====================
app.post('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { tripId, driverId, passengerId, rating, comment, categories } = req.body;
    const user = await User.findById(req.userId);
    const role = user.role||user.type;
    const driverName = role==='passenger'?(await User.findById(driverId))?.name:user.name;
    const passengerName = role==='passenger'?user.name:(await User.findById(passengerId))?.name;
    const fb = new Feedback({ tripId, driverId, driverName, passengerId, passengerName, givenBy:role, rating, comment, categories, transporterId:user.transporterId });
    await fb.save(); await Trip.findByIdAndUpdate(tripId,{rating});
    res.json({ success:true, feedback:fb });
  } catch { res.status(500).json({ success:false }); }
});

app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const { driverId, passengerId, tripId } = req.query;
    const q={};
    if (driverId) q.driverId=driverId; if (passengerId) q.passengerId=passengerId; if (tripId) q.tripId=tripId;
    const fb = await Feedback.find(q).sort({createdAt:-1});
    res.json({ success:true, feedback:fb, data:fb });
  } catch { res.status(500).json({ success:false }); }
});

// ==================== NOTIFICATIONS ====================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const n = await Notification.find({ userId:req.userId }).sort({createdAt:-1}).limit(50);
    res.json({ success:true, notifications:n, data:n, counts:{ total:n.length, unread:n.filter(x=>!x.read).length } });
  } catch { res.status(500).json({ success:false }); }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try { const n=await Notification.findByIdAndUpdate(req.params.id,{read:true},{new:true}); res.json({ success:true, notification:n }); } catch { res.status(500).json({ success:false }); }
});

app.put('/api/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try { await Notification.updateMany({userId:req.userId,read:false},{read:true}); res.json({ success:true }); } catch { res.status(500).json({ success:false }); }
});

// ==================== USERS ====================
app.get('/api/users', async (req, res) => {
  try {
    const { role, status, transporterId } = req.query;
    let q={};
    if (role) q.$or=[{role},{type:role}];
    if (status) q.status=status;
    if (transporterId) q.transporterId=transporterId;
    const users = await User.find(q);
    res.json({ success:true, users, count:users.length, data:users });
  } catch { res.status(500).json({ success:false }); }
});

app.get('/api/passengers', authenticateToken, async (req, res) => {
  try {
    const p = await User.find({ $or:[{role:'passenger'},{type:'passenger'}], transporterId:req.query.transporterId||req.userId });
    res.json({ success:true, passengers:p, data:p });
  } catch { res.status(500).json({ success:false }); }
});

app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const d = await User.find({ $or:[{role:'driver'},{type:'driver'}], transporterId:req.query.transporterId||req.userId });
    res.json({ success:true, drivers:d, data:d });
  } catch { res.status(500).json({ success:false }); }
});

// ==================== PASSENGER REQUEST ====================
app.post('/api/passenger/request', async (req, res) => {
  try {
    const { fullName, email, phone, password, address, latitude, longitude, destination, destinationLatitude, destinationLongitude, transporterId, vehiclePreference } = req.body;
    if (!fullName||!email||!phone||!password||!transporterId) return res.status(400).json({ success:false, message:'All fields required' });
    if (await User.findOne({ email:email.toLowerCase() })) return res.status(400).json({ success:false, message:'Email registered' });
    const r = new JoinRequest({ name:fullName, email:email.toLowerCase(), phone, password, type:'passenger', location:address, pickupPoint:address, latitude, longitude, destination, destinationLatitude, destinationLongitude, transporterId, vehiclePreference:vehiclePreference||null, status:'pending' });
    await r.save();
    res.json({ success:true, message:'Request sent', requestId:r._id });
  } catch (err) { res.status(500).json({ success:false, message:'Failed', error:err.message }); }
});

// ==================== JOIN REQUESTS ====================
app.get('/api/join-requests', authenticateToken, async (req, res) => {
  try {
    const { type, transporterId } = req.query;
    const rawId = transporterId || req.userId;
    let tidObjectId;
    try { tidObjectId = new mongoose.Types.ObjectId(rawId); }
    catch { return res.status(400).json({ success: false, message: 'Invalid transporterId format' }); }
    let f = { transporterId: tidObjectId, status: 'pending' };
    if (type) f.type = type;
    const r = await JoinRequest.find(f).sort({ createdAt: -1 });
    res.json({ success: true, requests: r, data: r, count: r.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/join-requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    if (!request||request.status!=='pending') return res.status(400).json({ success:false, message:'Invalid or already processed' });
    request.status='accepted'; await request.save();
    const CAPS = { car:4, van:12, bus:30 };
    const vType = request.vehicleType || null;
    const cap = request.capacity ? Number(request.capacity) : (vType ? (CAPS[vType]||8) : 8);
    const newUser = new User({
      name:                  request.name||request.fullName||'Unknown',
      email:                 request.email,
      phone:                 request.phone,
      password:              request.password,
      role:                  request.type,
      type:                  request.type,
      vehicle:               request.vehicle||request.vehicleNo,
      vehicleNo:             request.vehicleNo,
      vehicleType:           vType,
      van:                   request.vehicleNo,
      capacity:              cap,
      experience:            request.experience||'New',
      license:               request.license,
      availableTimeSlots:    request.availableTimeSlots||[],
      pickupPoint:           request.pickupPoint||request.address||'Not specified',
      destination:           request.destination||null,
      destinationLatitude:   request.destinationLatitude||null,
      destinationLongitude:  request.destinationLongitude||null,
      latitude:              request.latitude||null,
      longitude:             request.longitude||null,
      address:               request.address||request.pickupPoint||'Not provided',
      vehiclePreference:     request.vehiclePreference||null,
      transporterId:         request.transporterId,
      status:                'active',
      registrationDate:      new Date()
    });
    await newUser.save();
    await sendNotification(newUser._id, newUser.role, 'Request Approved! 🎉', 'You can now login.', 'confirmation', null, null, false);
    res.json({ success:true, message:'Accepted', user:{ id:newUser._id, name:newUser.name, email:newUser.email, role:newUser.role, vehicleType:newUser.vehicleType, capacity:newUser.capacity, status:newUser.status } });
  } catch (err) { res.status(500).json({ success:false, message:'Error', error:err.message }); }
});

app.put('/api/join-requests/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    if (!request || request.status !== 'pending') return res.status(400).json({ success: false, message: 'Invalid or already processed' });
    request.status = 'rejected';
    await request.save();
    res.json({ success: true, message: 'Request rejected', requestId: request._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error', error: err.message });
  }
});

// ==================== PAYMENTS ====================
app.get('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { type, transporterId } = req.query;
    let f={ transporterId:transporterId||req.userId }; if (type) f.type=type;
    const p = await Payment.find(f).populate('driverId').populate('passengerId').sort({createdAt:-1});
    res.json({ success:true, payments:p, data:p });
  } catch { res.status(500).json({ success:false }); }
});

app.post('/api/payments', authenticateToken, async (req, res) => {
  try { const p=new Payment(req.body); await p.save(); res.json({ success:true, payment:p }); } catch { res.status(500).json({ success:false }); }
});

// ==================== TRANSPORTER REGISTRATION ====================
app.post('/api/transporter/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { fullName, companyName, phone, country, city, zone, email, password } = req.body;
    const missing = ['fullName','companyName','phone','country','city','zone','email','password'].filter(f=>!req.body[f]);
    if (missing.length) { if (req.file) fs.unlinkSync(req.file.path); return res.status(400).json({ success:false, message:`Missing: ${missing.join(', ')}` }); }
    if (await User.findOne({ email:email.toLowerCase() })) { if (req.file) fs.unlinkSync(req.file.path); return res.status(400).json({ success:false, message:'Email registered' }); }
    const t = new User({ name:fullName, email:email.toLowerCase(), password, role:'transporter', type:'transporter', phone, company:companyName, license:`TRANS${Date.now()}`, address:`${zone}, ${city}, ${country}`, country, city, zone, profileImage:req.file?`/uploads/${req.file.filename}`:null, status:'active', registrationDate:new Date() });
    await t.save();
    res.status(201).json({ success:true, message:'Registration successful!', transporter:{ id:t._id, name:t.name, email:t.email } });
  } catch (err) { if (req.file) fs.unlink(req.file.path,()=>{}); res.status(500).json({ success:false, message:'Registration failed.', error:err.message }); }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server Working ✅',
    timestamp: new Date().toISOString(),
    pakistanFuelRates: {
      petrol: `Rs. ${PAKISTAN_FUEL.pricePerLitre.petrol}/L`,
      diesel: `Rs. ${PAKISTAN_FUEL.pricePerLitre.diesel}/L`,
      consumption: {
        car: `${PAKISTAN_FUEL.consumption.car} L/100km (petrol)`,
        van: `${PAKISTAN_FUEL.consumption.van} L/100km (diesel)`,
        bus: `${PAKISTAN_FUEL.consumption.bus} L/100km (diesel)`,
      }
    }
  });
});

// ==================== START ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 SERVER RUNNING on port ${PORT}                     ║
║  📡 IP: 10.128.159.15                                ║
║  ⛽ Pakistan Fuel Rates Active:                       ║
║     Car (Petrol): 10L/100km @ Rs.278/L               ║
║     Van (Diesel): 14L/100km @ Rs.283/L               ║
║     Bus (Diesel): 28L/100km @ Rs.283/L               ║
║  ✅ Road factor applied (30% for Pakistan roads)      ║
╚══════════════════════════════════════════════════════╝
  `);
});