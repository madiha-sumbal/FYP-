import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, RefreshControl,
  Animated, Dimensions, ActivityIndicator, Modal,
  Platform, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── COLOUR PALETTE ──────────────────────────────────────────────────────────
const C = {
  primary:     '#A1D826',
  primaryDark: '#A1D826',
  primaryLight:'#A1D826',
  primaryPale: '#E6F4C3',
  primaryGhost:'#F5F9E8',
  white:       '#FFFFFF',
  offWhite:    '#FAFAFA',
  textDark:    '#A1D826',
  textMid:     '#030303',
  textLight:   '#000000',
  border:      '#D4E090',
  divider:     '#E8F2B0',
  error:       '#E53935',
  warning:     '#F57C00',
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VEHICLE_CAPS   = { car: 4, van: 12, bus: 30 };
const VEHICLE_INFO   = {
  car: { icon: '🚗', label: 'Car',  desc: 'Sedan / Hatchback', capacity: 4  },
  van: { icon: '🚐', label: 'Van',  desc: 'Minibus / Van',     capacity: 12 },
  bus: { icon: '🚌', label: 'Bus',  desc: 'Large Bus / Coach', capacity: 30 },
};

const API_BASE = 'http://192.168.18.49:3000/api';

const MENU_ITEMS = [
  { key: 'overview',    label: 'Dashboard',           icon: 'dashboard'            },
  { key: 'profile',     label: 'My Profile',          icon: 'account-circle'       },
  { key: 'poll',        label: 'Availability Polls',  icon: 'poll'                 },
  { key: 'smart-route', label: 'Smart Routes',        icon: 'auto-awesome'         },
  { key: 'routes',      label: 'Routes',              icon: 'map'                  },
  { key: 'assign',      label: 'Assign Driver',       icon: 'assignment-ind'       },
  { key: 'tracking',    label: 'Live Tracking',       icon: 'my-location'          },
  { key: 'driver-req',  label: 'Driver Requests',     icon: 'group-add'            },
  { key: 'pass-req',    label: 'Passenger Requests',  icon: 'person-add'           },
  { key: 'payments',    label: 'Payments',            icon: 'account-balance-wallet'},
  { key: 'complaints',  label: 'Complaints',          icon: 'support-agent'        },
  { key: 'notifications',label:'Notifications',       icon: 'notifications-active' },
];

// ─── API SERVICE ──────────────────────────────────────────────────────────────
class ApiService {
  // ✅ FIX: getAuthData now reads all possible keys and resolves transporterId correctly
  async getAuthData() {
    try {
      const [token, transporterId, userId, td] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('transporterId'),
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('transporterData'),
      ]);

      let parsedData = null;
      try {
        parsedData = td ? JSON.parse(td) : null;
      } catch (_) {}

      // ✅ Resolve the correct transporterId:
      // Priority: transporterId key → userId key → transporterData.id → transporterData._id
      const resolvedTransporterId =
        transporterId ||
        userId ||
        parsedData?.id ||
        parsedData?._id ||
        null;

      return {
        token,
        transporterId: resolvedTransporterId,
        transporterData: parsedData,
      };
    } catch {
      return { token: null, transporterId: null, transporterData: null };
    }
  }

  async call(endpoint, options = {}) {
    const { token } = await this.getAuthData();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
        ...options.headers,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('Authentication failed');
      throw new Error(`API Error ${res.status}`);
    }
    return text ? JSON.parse(text) : {};
  }

  /* ── Profile ── */
  // ✅ FIX: getProfile now uses JWT token's userId from the /api/transporter/profile/:id endpoint
  // If transporterId is missing, falls back to /api/profile (token-based auth)
  async getProfile() {
    const { transporterId } = await this.getAuthData();

    if (!transporterId) {
      // Fallback: use token-based profile endpoint
      const r = await this.call('/profile');
      return {
        id:               r._id || r.id || '',
        name:             r.name             || 'Transporter',
        email:            r.email            || '',
        phone:            r.phone || r.phoneNumber || 'N/A',
        company:          r.company || r.companyName || 'Transport Co.',
        address:          r.address          || 'N/A',
        license:          r.license || r.licenseNumber || 'N/A',
        registrationDate: r.registrationDate
                            ? new Date(r.registrationDate).toLocaleDateString()
                            : 'N/A',
        location:         r.location || r.address || 'N/A',
        status:           r.status           || 'active',
        profileImage:     r.profileImage     || null,
      };
    }

    const r = await this.call(`/transporter/profile/${transporterId}`);
    const p = r.data || r.transporter || r;
    return {
      id:               p._id || p.id || transporterId,
      name:             p.name             || 'Transporter',
      email:            p.email            || '',
      phone:            p.phone || p.phoneNumber || 'N/A',
      company:          p.company || p.companyName || 'Transport Co.',
      address:          p.address          || 'N/A',
      license:          p.license || p.licenseNumber || 'N/A',
      registrationDate: p.registrationDate
                          ? new Date(p.registrationDate).toLocaleDateString()
                          : 'N/A',
      location:         p.location || p.address || 'N/A',
      status:           p.status           || 'active',
      profileImage:     p.profileImage     || null,
    };
  }

  async updateProfile(data) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/transporter/profile/${transporterId}`, {
      method: 'PUT',
      body:   JSON.stringify(data),
    });
  }

  /* ── Stats ── */
  async getStats() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/dashboard/stats?transporterId=${transporterId}`);
    const s = r.stats || r.data || r;
    return {
      activeDrivers:   +s.activeDrivers   || 0,
      totalPassengers: +s.totalPassengers  || 0,
      completedTrips:  +s.completedTrips   || 0,
      ongoingTrips:    +s.ongoingTrips     || 0,
      complaints:      +s.complaints       || 0,
      paymentsReceived:+s.paymentsReceived || 0,
      paymentsPending: +s.paymentsPending  || 0,
    };
  }

  /* ── Polls ── */
  async getPolls() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/polls?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.polls || r.data || []);
  }

  async createPoll(data) {
    const { transporterId } = await this.getAuthData();
    return this.call('/polls', {
      method: 'POST',
      body:   JSON.stringify({ ...data, transporterId }),
    });
  }

  async deletePoll(id) {
    return this.call(`/polls/${id}`, { method: 'DELETE' });
  }

  /* ── Drivers ── */
  async getDrivers() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/drivers?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.drivers || r.data || []);
  }

  /* ── Smart Routes — calls server optimizer ── */
  async optimizeRoutes(passengers, drivers, pollId) {
    return this.call('/smart-routes/optimize', {
      method: 'POST',
      body: JSON.stringify({ passengers, drivers, pollId }),
    });
  }

  async assignRouteFromPoll(pollId, routeData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.call('/routes/assign', {
      method: 'POST',
      body: JSON.stringify({
        pollId,
        driverId:     routeData.driverId,
        routeName:    routeData.routeName,
        startPoint:   routeData.startPoint || 'Starting Point',
        destination:  routeData.destination || 'Destination',
        timeSlot:     routeData.timeSlot,
        pickupTime:   routeData.pickupTime || routeData.timeSlot,
        date:         tomorrow.toISOString(),
        passengers:   routeData.passengers || [],
        stops:        routeData.stops || [],
        estimatedTime:routeData.estimatedTime,
        estimatedFuel:routeData.estimatedFuel,
        estimatedKm:  routeData.estimatedKm,
        vehicleType:  routeData.vehicleType,
      }),
    });
  }

  async assignDriverToRoute(routeId, driverId) {
    return this.call(`/routes/${routeId}/assign-driver`, {
      method: 'PUT',
      body: JSON.stringify({ driverId }),
    });
  }

  /* ── Requests ── */
  async getDriverRequests() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/join-requests?type=driver&transporterId=${transporterId}`);
    return (Array.isArray(r) ? r : (r.requests || r.data || []))
      .filter(x => x.status === 'pending');
  }

  async approveDriverRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/join-requests/${id}/accept`, {
      method: 'PUT',
      body: JSON.stringify({ transporterId }),
    });
  }

  async rejectDriverRequest(id) {
    return this.call(`/join-requests/${id}/reject`, { method: 'PUT' });
  }

  async getPassengerRequests() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/join-requests?type=passenger&transporterId=${transporterId}`);
    return (Array.isArray(r) ? r : (r.requests || r.data || []))
      .filter(x => x.status === 'pending');
  }

  async approvePassengerRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/join-requests/${id}/accept`, {
      method: 'PUT',
      body: JSON.stringify({ transporterId }),
    });
  }

  async rejectPassengerRequest(id) {
    return this.call(`/join-requests/${id}/reject`, { method: 'PUT' });
  }

  /* ── Routes / Trips ── */
  async getRoutes() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/routes?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.routes || r.data || []);
  }

  async getTrips() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/trips?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.trips || r.data || []);
  }

  /* ── Misc ── */
  async getComplaints() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/complaints?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.complaints || r.data || []);
  }

  async getNotifications() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/notifications?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.notifications || r.data || []);
  }

  async markRead(id) {
    return this.call(`/notifications/${id}/read`, { method: 'PUT' });
  }
}

const api = new ApiService();

// ─── TIME PICKER ──────────────────────────────────────────────────────────────
const TimePicker = ({ visible, onClose, onSelect }) => {
  const hours = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const [h, setH] = useState('07');
  const [m, setM] = useState('00');
  const [p, setP] = useState('AM');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tp.overlay}>
        <View style={tp.box}>
          <View style={tp.hdr}>
            <Icon name="access-time" size={19} color={C.white} style={{ marginRight: 8 }} />
            <Text style={tp.hdrTxt}>Select Time</Text>
          </View>
          <View style={tp.body}>
            <Text style={tp.lbl}>HOUR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {hours.map(x => (
                <TouchableOpacity key={x} style={[tp.chip, h===x && tp.chipOn]} onPress={() => setH(x)}>
                  <Text style={[tp.chipTxt, h===x && tp.chipTxtOn]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={tp.lbl}>MINUTE</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
              {['00','15','30','45'].map(x => (
                <TouchableOpacity key={x} style={[tp.chip,{flex:1,alignItems:'center'},m===x&&tp.chipOn]} onPress={()=>setM(x)}>
                  <Text style={[tp.chipTxt,m===x&&tp.chipTxtOn]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={tp.lbl}>PERIOD</Text>
            <View style={{ flexDirection:'row', gap:8, marginBottom:12 }}>
              {['AM','PM'].map(x => (
                <TouchableOpacity key={x} style={[tp.chip,{flex:1,alignItems:'center'},p===x&&tp.chipOn]} onPress={()=>setP(x)}>
                  <Text style={[tp.chipTxt,p===x&&tp.chipTxtOn]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={tp.preview}>
              <Text style={tp.previewTime}>{h}:{m}</Text>
              <Text style={tp.previewPd}>{p}</Text>
            </View>
            <View style={{ flexDirection:'row', gap:10, marginTop:10 }}>
              <TouchableOpacity style={tp.cancelBtn} onPress={onClose}>
                <Text style={tp.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tp.confirmBtn} onPress={() => { onSelect(`${h}:${m} ${p}`); onClose(); }}>
                <Icon name="check" size={15} color={C.white} />
                <Text style={tp.confirmTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const tp = StyleSheet.create({
  overlay:    { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', alignItems:'center', padding:20 },
  box:        { backgroundColor:C.white, borderRadius:22, width:'100%', maxWidth:380, overflow:'hidden' },
  hdr:        { backgroundColor:C.primaryDark, flexDirection:'row', alignItems:'center', padding:16 },
  hdrTxt:     { fontSize:17, fontWeight:'900', color:C.white },
  body:       { padding:16 },
  lbl:        { fontSize:10, fontWeight:'800', color:C.textLight, letterSpacing:1.2, marginBottom:8 },
  chip:       { paddingHorizontal:14, paddingVertical:10, borderRadius:10, borderWidth:1.5, borderColor:C.border, backgroundColor:C.primaryGhost, marginRight:8 },
  chipOn:     { backgroundColor:C.primaryDark, borderColor:C.primaryDark },
  chipTxt:    { fontSize:15, fontWeight:'700', color:C.textMid },
  chipTxtOn:  { color:C.white },
  preview:    { backgroundColor:C.primaryGhost, borderRadius:14, padding:14, alignItems:'center', flexDirection:'row', justifyContent:'center', gap:8, borderWidth:1, borderColor:C.border },
  previewTime:{ fontSize:34, fontWeight:'900', color:C.primaryDark, letterSpacing:-1 },
  previewPd:  { fontSize:19, fontWeight:'700', color:C.primary, marginTop:6 },
  cancelBtn:  { flex:1, padding:13, borderRadius:12, borderWidth:1.5, borderColor:C.border, alignItems:'center', backgroundColor:C.primaryGhost },
  cancelTxt:  { fontWeight:'700', color:C.textMid, fontSize:14 },
  confirmBtn: { flex:2, padding:13, borderRadius:12, backgroundColor:C.primaryDark, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:6 },
  confirmTxt: { color:C.white, fontWeight:'800', fontSize:14 },
});

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 60 }) => {
  const init = useMemo(() => {
    if (!name) return 'T';
    const pts = name.trim().split(' ');
    return pts.length > 1 ? `${pts[0][0]}${pts[1][0]}`.toUpperCase() : name.substring(0,2).toUpperCase();
  }, [name]);
  return (
    <View style={{ width:size, height:size, borderRadius:size/2, overflow:'hidden', backgroundColor:C.primaryDark, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:C.primaryLight }}>
      {uri
        ? <Image source={{ uri }} style={{ width:size, height:size }} />
        : <Text style={{ color:C.white, fontSize:size*0.35, fontWeight:'900' }}>{init}</Text>
      }
    </View>
  );
};

const StatCard = ({ label, value, iconName, onPress }) => (
  <TouchableOpacity style={s.statCard} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
    <View style={s.statIconWrap}>
      <Icon name={iconName} size={21} color={C.primaryDark} />
    </View>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── SMART ROUTE CARD ─────────────────────────────────────────────────────────
const SmartRouteCard = ({ result, onConfirm, onDiscard, isConfirming }) => {
  const [expanded, setExpanded] = useState(false);
  const vi = VEHICLE_INFO[result.vehicleType] || VEHICLE_INFO.van;
  const hasWarnings = result.warnings?.length > 0;
  const noDriver = result.isNewRoute;

  return (
    <View style={[s.card, { borderTopWidth: 3, borderTopColor: noDriver ? C.warning : C.primaryDark }]}>
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
          <View style={[s.vIconWrap, { backgroundColor: noDriver ? '#FFF3E0' : C.primaryGhost }]}>
            <Text style={{ fontSize:24 }}>{vi.icon}</Text>
          </View>
          <View>
            <Text style={s.cardTitle} numberOfLines={1}>
              {noDriver ? `Needs ${vi.label} Driver` : result.driverName}
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginTop:3 }}>
              <View style={[s.pillBadge, { backgroundColor: C.primaryPale }]}>
                <Text style={[s.pillBadgeTxt, { color: C.primaryDark }]}>
                  {vi.label} · cap {vi.capacity}
                </Text>
              </View>
              <View style={[s.pillBadge, { backgroundColor: result.preferenceGroup ? '#E8F5E9' : C.primaryGhost }]}>
                <Text style={[s.pillBadgeTxt, { color: result.preferenceGroup ? '#2E7D32' : C.textMid }]}>
                  {result.preferenceGroup ? '🔒 Preference' : '🤖 Auto'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ alignItems:'flex-end' }}>
          <Text style={s.paxBig}>{result.passengerCount}</Text>
          <Text style={{ fontSize:10, color:C.textLight }}>passengers</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { i:'schedule',          v:result.estimatedTime, l:'Time'   },
          { i:'local-gas-station', v:result.estimatedFuel, l:'Fuel'   },
          { i:'straighten',        v:result.estimatedKm,   l:'Dist.'  },
        ].map((item, idx, arr) => (
          <React.Fragment key={idx}>
            <View style={s.statBox}>
              <Icon name={item.i} size={16} color={C.primaryDark} />
              <Text style={s.statBoxVal}>{item.v}</Text>
              <Text style={s.statBoxLbl}>{item.l}</Text>
            </View>
            {idx < arr.length-1 && <View style={s.statDiv} />}
          </React.Fragment>
        ))}
      </View>

      {/* Matrix source */}
      {result.matrixSource && (
        <View style={s.srcBadge}>
          <Icon name={result.matrixSource === 'osrm' ? 'wifi' : 'offline-bolt'} size={11} color={C.primaryDark} />
          <Text style={s.srcTxt}>{result.matrixSource === 'osrm' ? 'OSRM (live)' : 'Haversine (offline)'}</Text>
        </View>
      )}

      {/* Stops */}
      <TouchableOpacity style={s.stopsHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={s.stopsTitle}>Route Stops ({result.stops.length})</Text>
        <Icon name={expanded ? 'expand-less' : 'expand-more'} size={20} color={C.primaryDark} />
      </TouchableOpacity>

      {expanded && result.stops.map((stop, i) => (
        <View key={i} style={s.stopRow}>
          <View style={[s.stopDot, { backgroundColor: stop.type === 'pickup' ? C.primaryDark : C.primary }]} />
          <View style={s.stopLineWrap}>
            {i < result.stops.length-1 && <View style={s.stopLine} />}
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.stopName}>
              {stop.name}
              <Text style={{ fontWeight:'600', color: stop.type === 'pickup' ? C.primaryDark : C.primary }}>
                {' '}{stop.type === 'pickup' ? '↑ Pickup' : '↓ Drop-off'}
              </Text>
            </Text>
            {stop.address && <Text style={s.stopAddr} numberOfLines={1}>{stop.address}</Text>}
          </View>
        </View>
      ))}

      {/* Passengers list */}
      {expanded && result.passengers?.length > 0 && (
        <View style={{ marginTop:10 }}>
          <Text style={s.stopsTitle}>Passengers</Text>
          {result.passengers.map((p, i) => (
            <View key={i} style={s.paxRow}>
              <View style={s.paxAvatar}>
                <Text style={{ fontSize:11, fontWeight:'800', color:C.primaryDark }}>
                  {(p.name||'P').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:13, fontWeight:'700', color:C.textDark }}>{p.name}</Text>
                {p.vehiclePreference && (
                  <View style={[s.pillBadge, { backgroundColor:'#E8F5E9', alignSelf:'flex-start', marginTop:2 }]}>
                    <Text style={[s.pillBadgeTxt, { color:'#2E7D32' }]}>
                      Prefers {VEHICLE_INFO[p.vehiclePreference]?.icon} {p.vehiclePreference}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {hasWarnings && result.warnings.map((w, i) => (
        <View key={i} style={[s.warnBox, { borderColor: w.includes('⚠') || w.includes('No') ? C.warning : C.border }]}>
          <Icon name="warning" size={13} color={C.warning} />
          <Text style={[s.warnTxt, { color: C.warning }]}>{w}</Text>
        </View>
      ))}

      {/* Actions */}
      <View style={s.twoBtn}>
        <TouchableOpacity style={s.discardBtn} onPress={onDiscard}>
          <Icon name="delete-outline" size={16} color={C.white} />
          <Text style={s.btnTxt}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.confirmBtn2, isConfirming && { opacity:0.6 }]}
          onPress={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming
            ? <ActivityIndicator size="small" color={C.white} />
            : (
              <>
                <Icon name="check-circle" size={16} color={C.white} />
                <Text style={s.btnTxt}>Confirm Route</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── REQUEST CARD ──────────────────────────────────────────────────────────────
const RequestCard = ({ req, onAccept, onReject, isProcessing }) => {
  const vInfo = VEHICLE_INFO[req.vehicleType || req.vehicle_type] || null;
  const pInfo = VEHICLE_INFO[req.vehiclePreference || req.vehicle_preference] || null;
  return (
    <View style={s.card}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:12 }}>
        <View style={s.reqAvatar}>
          <Text style={{ fontSize:22 }}>{req.type === 'driver' ? '🚗' : '👤'}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.cardTitle}>{req.name || req.fullName}</Text>
          <View style={[s.pillBadge, { marginTop:3, backgroundColor:C.primaryPale }]}>
            <Text style={[s.pillBadgeTxt, { color:C.primaryDark }]}>
              {req.type === 'driver' ? 'Driver Request' : 'Passenger Request'}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ gap:5, marginBottom:10 }}>
        {req.email      && <View style={s.detailRow}><Icon name="email"       size={13} color={C.primaryDark} /><Text style={s.detailTxt}>{req.email}</Text></View>}
        {req.phone      && <View style={s.detailRow}><Icon name="phone"       size={13} color={C.primaryDark} /><Text style={s.detailTxt}>{req.phone}</Text></View>}
        {req.license    && <View style={s.detailRow}><Icon name="credit-card" size={13} color={C.primaryDark} /><Text style={s.detailTxt}>License: {req.license}</Text></View>}
        {req.pickupPoint && <View style={s.detailRow}><Icon name="place"      size={13} color={C.primaryDark} /><Text style={s.detailTxt}>{req.pickupPoint}</Text></View>}
        {req.destination && <View style={s.detailRow}><Icon name="flag"       size={13} color={C.primaryDark} /><Text style={s.detailTxt}>{req.destination}</Text></View>}
      </View>
      {vInfo && (
        <View style={s.vBadge}>
          <Text style={{ fontSize:20 }}>{vInfo.icon}</Text>
          <View style={{ marginLeft:10 }}>
            <Text style={s.vBadgeLbl}>Vehicle Type</Text>
            <Text style={s.vBadgeVal}>{vInfo.label} — {vInfo.desc}</Text>
          </View>
        </View>
      )}
      {pInfo && (
        <View style={[s.vBadge, { marginTop:6, backgroundColor:'#E8F5E9', borderColor:'#A5D6A7' }]}>
          <Text style={{ fontSize:20 }}>{pInfo.icon}</Text>
          <View style={{ marginLeft:10 }}>
            <Text style={s.vBadgeLbl}>Travel Preference 🔒</Text>
            <Text style={[s.vBadgeVal, { color:'#2E7D32' }]}>{pInfo.label} only — {pInfo.desc}</Text>
          </View>
        </View>
      )}
      <View style={s.twoBtn}>
        <TouchableOpacity style={s.rejectBtn} onPress={onReject} disabled={isProcessing}>
          <Icon name="close" size={16} color={C.white} />
          <Text style={s.btnTxt}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} onPress={onAccept} disabled={isProcessing}>
          {isProcessing
            ? <ActivityIndicator size="small" color={C.white} />
            : <><Icon name="check" size={16} color={C.white} /><Text style={s.btnTxt}>Accept</Text></>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── DRIVER CARD ───────────────────────────────────────────────────────────────
const DriverCard = ({ driver }) => {
  const vi   = VEHICLE_INFO[driver.vehicleType || driver.vehicle] || VEHICLE_INFO.van;
  const cap  = vi.capacity || driver.capacity || 8;
  const fill = driver.passengers?.length || 0;
  const pct  = Math.min((fill / cap) * 100, 100);
  return (
    <View style={s.driverCard}>
      <View style={[s.driverAvatar, { backgroundColor:C.primaryDark }]}>
        <Text style={s.driverAvatarTxt}>
          {(driver.name||'D').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
        </Text>
        <View style={[s.driverDot, { backgroundColor:driver.status==='active' ? C.primary : C.border }]} />
      </View>
      <View style={{ flex:1 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={s.driverName} numberOfLines={1}>{driver.name}</Text>
          <Text style={{ fontSize:16 }}>{vi.icon}</Text>
        </View>
        <Text style={s.driverSub} numberOfLines={1}>{vi.label} · cap {cap}</Text>
        <View style={s.capRow}>
          <Text style={s.capTxt}>{fill}/{cap}</Text>
          <View style={s.capBg}>
            <View style={[s.capFill, { width:`${pct}%`, backgroundColor: pct>80 ? C.error : C.primary }]} />
          </View>
        </View>
        {driver.phone && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:3, marginTop:3 }}>
            <Icon name="phone" size={10} color={C.textLight} />
            <Text style={{ fontSize:10, color:C.textLight }}>{driver.phone}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const TransporterDashboard = () => {
  const navigation  = useNavigation();
  const [section,   setSection]   = useState('overview');
  const [sidebar,   setSidebar]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const slideAnim = useRef(new Animated.Value(-295)).current;

  // Data
  const [profile,        setProfile]        = useState(null);
  const [editProfile,    setEditProfile]     = useState(null);
  const [isEditingPro,   setIsEditingPro]    = useState(false);
  const [stats,          setStats]          = useState({ activeDrivers:0,totalPassengers:0,completedTrips:0,ongoingTrips:0,complaints:0,paymentsReceived:0,paymentsPending:0 });
  const [polls,          setPolls]          = useState([]);
  const [drivers,        setDrivers]        = useState([]);
  const [routes,         setRoutes]         = useState([]);
  const [trips,          setTrips]          = useState([]);
  const [driverReqs,     setDriverReqs]     = useState([]);
  const [passReqs,       setPassReqs]       = useState([]);
  const [complaints,     setComplaints]     = useState([]);
  const [notifications,  setNotifications]  = useState([]);

  // Smart Route state
  const [smartResults,   setSmartResults]   = useState([]);
  const [optimizing,     setOptimizing]     = useState(false);
  const [confirmingIdx,  setConfirmingIdx]  = useState(null);
  const [activePoll,     setActivePoll]     = useState(null);

  // Poll modal
  const [selectedPoll,   setSelectedPoll]   = useState(null);
  const [lastUpdated,    setLastUpdated]    = useState(new Date());

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: sidebar ? 0 : -295,
      useNativeDriver: true,
      tension: 80, friction: 12,
    }).start();
  }, [sidebar]);

  // ✅ FIX: checkAuthAndLoad now also checks for 'userId' key as fallback
  const checkAuthAndLoad = async () => {
    const { token, transporterId } = await api.getAuthData();
    if (!token || !transporterId) {
      navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] });
      return;
    }
    await loadAll();
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [p, st, po, dr, req_d, req_p, rt, tr, co, no] = await Promise.allSettled([
        api.getProfile(),
        api.getStats(),
        api.getPolls(),
        api.getDrivers(),
        api.getDriverRequests(),
        api.getPassengerRequests(),
        api.getRoutes(),
        api.getTrips(),
        api.getComplaints(),
        api.getNotifications(),
      ]);
      if (p.status==='fulfilled'  && p.value)   setProfile(p.value);
      if (st.status==='fulfilled' && st.value)  setStats(st.value);
      if (po.status==='fulfilled' && po.value)  setPolls(po.value);
      if (dr.status==='fulfilled' && dr.value)  setDrivers(dr.value);
      if (req_d.status==='fulfilled') setDriverReqs(req_d.value||[]);
      if (req_p.status==='fulfilled') setPassReqs(req_p.value||[]);
      if (rt.status==='fulfilled')    setRoutes(rt.value||[]);
      if (tr.status==='fulfilled')    setTrips(tr.value||[]);
      if (co.status==='fulfilled')    setComplaints(co.value||[]);
      if (no.status==='fulfilled')    setNotifications(no.value||[]);
      setLastUpdated(new Date());
    } catch (e) {
      if (e.message?.includes('Authentication')) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text:'OK', onPress:() => navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] }) }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll().finally(() => setRefreshing(false));
  }, []);

  const unread = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const totalBadge = driverReqs.length + passReqs.length + unread + smartResults.length;

  const nav = (sec) => { setSection(sec); setSidebar(false); };

  // ── SMART ROUTE OPTIMIZER (calls server) ────────────────────────────────────
  const handleOptimize = async (poll) => {
    if (!poll) { Alert.alert('No Poll', 'Select a poll first.'); return; }
    setOptimizing(true);
    setActivePoll(poll);
    setSmartResults([]);
    try {
      const passengers = (poll.responses || [])
        .filter(r => r.response === 'yes')
        .map((r, i) => ({
          id:               r.passengerId || r._id || `p_${i}`,
          name:             r.passengerName || 'Passenger',
          vehiclePreference:r.vehiclePreference || null,
          pickupLocation:   r.pickupLocation || null,
          pickupLat:        r.pickupLat || null,
          pickupLng:        r.pickupLng || null,
          pickupAddress:    r.pickupPoint || r.pickupAddress || 'Pickup',
          dropLocation:     r.dropLocation || null,
          dropLat:          r.dropLat || null,
          dropLng:          r.dropLng || null,
          dropAddress:      r.destination || r.dropAddress || 'Drop-off',
          timeSlot:         r.selectedTimeSlot || r.timeSlot || poll.timeSlots?.[0] || '08:00 AM',
        }));

      if (!passengers.length) {
        Alert.alert('No Passengers', 'No passengers responded "Yes" to this poll.');
        setOptimizing(false);
        return;
      }

      const driversPayload = drivers.map(d => ({
        id:          d._id || d.id,
        name:        d.name,
        vehicleType: d.vehicleType || d.vehicle || 'van',
        currentLocation: d.currentLocation || null,
        lat:         d.latitude  || null,
        lng:         d.longitude || null,
        capacity:    VEHICLE_CAPS[d.vehicleType || d.vehicle || 'van'] || 8,
      }));

      console.log(`[SmartRoute] ${passengers.length} passengers, ${driversPayload.length} drivers`);
      const res = await api.optimizeRoutes(passengers, driversPayload, poll._id);
      if (res.success && Array.isArray(res.routes)) {
        setSmartResults(res.routes);
        nav('smart-route');
        if (res.routes.length === 0) {
          Alert.alert('No Routes', 'No routes could be generated.');
        }
      } else {
        Alert.alert('Error', res.error || 'Optimization failed');
      }
    } catch (err) {
      console.error('[SmartRoute]', err);
      Alert.alert('Error', 'Could not reach the optimizer. Check server connection.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleConfirmRoute = async (result, idx) => {
    setConfirmingIdx(idx);
    try {
      if (!activePoll) throw new Error('No active poll');
      await api.assignRouteFromPoll(activePoll._id, {
        driverId:     result.driverId,
        routeName:    result.driverName
                        ? `${result.driverName} - ${new Date().toLocaleDateString()}`
                        : `Route ${idx + 1} - ${new Date().toLocaleDateString()}`,
        timeSlot:     result.passengers?.[0]?.timeSlot || '08:00 AM',
        vehicleType:  result.vehicleType,
        passengers:   result.passengers,
        stops:        result.stops,
        estimatedTime:result.estimatedTime,
        estimatedFuel:result.estimatedFuel,
        estimatedKm:  result.estimatedKm,
      });
      setSmartResults(prev => prev.filter((_,i) => i !== idx));
      Alert.alert('Route Confirmed! ✅', `${result.driverName || 'Route'} assigned with ${result.passengerCount} passenger(s).\n⏱ ${result.estimatedTime}  ⛽ ${result.estimatedFuel}  📏 ${result.estimatedKm}`);
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not assign route.');
    } finally {
      setConfirmingIdx(null);
    }
  };

  const handleDiscardRoute = (idx) => {
    Alert.alert('Discard Route?', 'This suggestion will be removed.', [
      { text:'Cancel', style:'cancel' },
      { text:'Discard', style:'destructive', onPress:() => setSmartResults(prev => prev.filter((_,i)=>i!==idx)) },
    ]);
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text:'Cancel', style:'cancel' },
      { text:'Logout', style:'destructive', onPress: async () => {
        // ✅ FIX: clear all possible auth keys on logout
        await AsyncStorage.multiRemove(['authToken','transporterId','userId','transporterData']);
        navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] });
      }},
    ]);
  };

  // ─── SIDEBAR ──────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <Animated.View style={[s.sidebar, { transform:[{ translateX:slideAnim }] }]}>
      <View style={s.sidebarHdr}>
        <Avatar uri={profile?.profileImage} name={profile?.name} size={50} />
        <View style={{ marginLeft:12, flex:1 }}>
          <Text style={s.sidebarName} numberOfLines={1}>{profile?.name || 'Loading...'}</Text>
          <Text style={s.sidebarCo}   numberOfLines={1}>{profile?.company || 'Transport Co.'}</Text>
          <View style={s.sidebarStatus}>
            <View style={s.sidebarDot} />
            <Text style={s.sidebarStatusTxt}>Active</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setSidebar(false)} style={s.sidebarClose}>
          <Icon name="close" size={19} color={C.primaryLight} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map(item => {
          const active = section === item.key;
          const badge =
            item.key === 'notifications' ? unread :
            item.key === 'driver-req'    ? driverReqs.length :
            item.key === 'pass-req'      ? passReqs.length :
            item.key === 'smart-route'   ? smartResults.length : 0;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.menuItem, active && s.menuItemOn]}
              onPress={() => nav(item.key)}
            >
              {active && <View style={s.menuBar} />}
              <View style={[s.menuIconWrap, active && s.menuIconOn]}>
                <Icon name={item.icon} size={19} color={active ? C.primaryDark : C.textLight} />
              </View>
              <Text style={[s.menuTxt, active && s.menuTxtOn]}>{item.label}</Text>
              {badge > 0 && (
                <View style={s.menuBadge}>
                  <Text style={s.menuBadgeTxt}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.logoutItem} onPress={logout}>
          <View style={s.menuIconWrap}>
            <Icon name="logout" size={19} color={C.primaryDark} />
          </View>
          <Text style={[s.menuTxt, { color:C.primaryDark, fontWeight:'700' }]}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height:30 }} />
      </ScrollView>
    </Animated.View>
  );

  // ─── OVERVIEW ─────────────────────────────────────────────────────────────
  const OverviewSection = () => (
    <ScrollView
      style={s.section}
      contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.welcomeCard}>
        <View style={{ flex:1 }}>
          <Text style={s.welcomeGreet}>Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'} 👋</Text>
          <Text style={s.welcomeName}>{profile?.name || 'Transporter'}</Text>
          <Text style={s.welcomeTime}>Updated {lastUpdated.toLocaleTimeString()}</Text>
        </View>
        <Avatar uri={profile?.profileImage} name={profile?.name} size={50} />
      </View>

      {smartResults.length > 0 && (
        <TouchableOpacity style={s.smartBanner} onPress={() => nav('smart-route')}>
          <View style={s.smartBannerIcon}><Icon name="auto-awesome" size={19} color={C.primaryDark} /></View>
          <View style={{ flex:1 }}>
            <Text style={s.smartBannerTitle}>{smartResults.length} Smart Route{smartResults.length!==1?'s':''} Ready!</Text>
            <Text style={s.smartBannerSub}>Tap to review and confirm</Text>
          </View>
          <Icon name="chevron-right" size={21} color={C.textDark} />
        </TouchableOpacity>
      )}
      {optimizing && (
        <View style={s.optimizingRow}>
          <ActivityIndicator size="small" color={C.primaryDark} />
          <Text style={s.optimizingTxt}>Building optimized routes via OSRM...</Text>
        </View>
      )}

      <Text style={s.sectionLbl}>TODAY'S OVERVIEW</Text>
      <View style={s.statsGrid}>
        {[
          { l:'Active Drivers',  v:stats.activeDrivers,   i:'directions-car',         a:()=>nav('tracking')     },
          { l:'Passengers',      v:stats.totalPassengers,  i:'people',                 a:null                    },
          { l:'Trips Done',      v:stats.completedTrips,   i:'check-circle',           a:null                    },
          { l:'Active Trips',    v:stats.ongoingTrips,     i:'sync',                   a:null                    },
          { l:'Complaints',      v:stats.complaints,       i:'support-agent',          a:()=>nav('complaints')   },
          { l:'Payments In',     v:`Rs.${stats.paymentsReceived}`, i:'account-balance-wallet', a:()=>nav('payments') },
        ].map((it,i) => <StatCard key={i} label={it.l} value={it.v} iconName={it.i} onPress={it.a} />)}
      </View>

      <Text style={s.sectionLbl}>QUICK ACTIONS</Text>
      <View style={s.quickGrid}>
        {[
          { i:'auto-awesome', l:'Smart\nRoutes',  k:'smart-route', b:smartResults.length },
          { i:'poll',         l:'Polls',          k:'poll'                               },
          { i:'map',          l:'Routes',         k:'routes'                             },
          { i:'my-location',  l:'Tracking',       k:'tracking'                           },
          { i:'group-add',    l:'Driver\nReq.',   k:'driver-req',  b:driverReqs.length   },
          { i:'person-add',   l:'Pass.\nReq.',    k:'pass-req',    b:passReqs.length     },
        ].map((it,idx) => (
          <TouchableOpacity key={idx} style={s.quickCard} onPress={() => nav(it.k)}>
            <View style={s.quickIconWrap}>
              <Icon name={it.i} size={23} color={C.primaryDark} />
              {it.b > 0 && (
                <View style={s.quickBadge}>
                  <Text style={s.quickBadgeTxt}>{it.b>9?'9+':it.b}</Text>
                </View>
              )}
            </View>
            <Text style={s.quickLabel}>{it.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {unread > 0 && (
        <TouchableOpacity style={s.notifBanner} onPress={() => nav('notifications')}>
          <Icon name="notifications-active" size={17} color={C.primaryDark} />
          <Text style={s.notifBannerTxt}>{unread} unread notification{unread!==1?'s':''}</Text>
          <Icon name="chevron-right" size={17} color={C.textDark} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  const ProfileSection = () => {
    const [saving, setSaving] = useState(false);
    const p = editProfile || profile;
    const setField = (k, v) => setEditProfile(prev => ({ ...(prev || profile), [k]:v }));

    if (!p) return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator size="large" color={C.primaryDark} /></View>;

    return (
      <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:30 }}>
        <View style={s.profileHero}>
          <View style={s.profileHeroBg} />
          <Avatar uri={p.profileImage} name={p.name} size={82} />
          <Text style={s.profileName}>{p.name}</Text>
          <Text style={s.profileCo}>{p.company}</Text>
          <View style={s.activeChip}>
            <View style={[s.activeDot, { backgroundColor: p.status==='active' ? C.primary : C.border }]} />
            <Text style={s.activeChipTxt}>{p.status==='active' ? 'Active Account' : 'Inactive'}</Text>
          </View>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Account Information</Text>
          {isEditingPro ? (
            <>
              {[
                { k:'name',    l:'Full Name',  i:'person'      },
                { k:'phone',   l:'Phone',      i:'phone'       },
                { k:'company', l:'Company',    i:'business'    },
                { k:'address', l:'Address',    i:'place'       },
                { k:'license', l:'License',    i:'credit-card' },
              ].map(f => (
                <View key={f.k} style={{ marginBottom:12 }}>
                  <Text style={s.inputLabel}>{f.l}</Text>
                  <View style={s.inputRow}>
                    <Icon name={f.i} size={16} color={C.primaryDark} style={{ marginRight:8 }} />
                    <TextInput
                      style={s.inputInner}
                      value={p[f.k] || ''}
                      onChangeText={t => setField(f.k, t)}
                      placeholderTextColor={C.textLight}
                    />
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[s.primaryBtn, saving && { opacity:0.6 }]}
                disabled={saving}
                onPress={async () => {
                  setSaving(true);
                  try {
                    await api.updateProfile(editProfile);
                    setProfile(editProfile);
                    setEditProfile(null);
                    setIsEditingPro(false);
                    Alert.alert('Saved!', 'Profile updated.');
                  } catch {
                    Alert.alert('Error', 'Could not update profile.');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? <ActivityIndicator color={C.white} /> : <><Icon name="save" size={16} color={C.white} /><Text style={s.primaryBtnTxt}>Save Changes</Text></>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.outlineBtn, { marginTop:8 }]} onPress={() => { setEditProfile(null); setIsEditingPro(false); }}>
                <Text style={s.outlineBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                { l:'Email',       v:p.email,            i:'email'         },
                { l:'Phone',       v:p.phone,            i:'phone'         },
                { l:'Company',     v:p.company,          i:'business'      },
                { l:'Address',     v:p.address,          i:'place'         },
                { l:'License',     v:p.license,          i:'credit-card'   },
                { l:'Location',    v:p.location,         i:'location-on'   },
                { l:'Member Since',v:p.registrationDate, i:'calendar-today'},
              ].map((r, i) => (
                <View key={i} style={s.profileRow}>
                  <View style={s.profileRowIcon}><Icon name={r.i} size={15} color={C.primaryDark} /></View>
                  <View style={{ flex:1 }}>
                    <Text style={s.profileRowLabel}>{r.l}</Text>
                    <Text style={s.profileRowValue}>{r.v || 'N/A'}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={[s.primaryBtn, { marginTop:10 }]} onPress={() => { setEditProfile({ ...profile }); setIsEditingPro(true); }}>
                <Icon name="edit" size={16} color={C.white} />
                <Text style={s.primaryBtnTxt}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  };

  // ─── POLLS ────────────────────────────────────────────────────────────────
  const PollSection = () => {
    const [newPoll, setNewPoll] = useState({ title:'', timeSlots:[], closingTime:'' });
    const [creatingPoll, setCreatingPoll] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [tpVis, setTpVis] = useState(false);
    const [cpVis, setCpVis] = useState(false);

    const createPoll = async () => {
      if (!newPoll.title.trim())     { Alert.alert('Missing','Enter a poll title.');      return; }
      if (!newPoll.timeSlots.length) { Alert.alert('Missing','Add at least one time slot.'); return; }
      if (!newPoll.closingTime)      { Alert.alert('Missing','Set a closing time.');       return; }
      try {
        setCreatingPoll(true);
        const res = await api.createPoll({
          title:       newPoll.title,
          timeSlots:   newPoll.timeSlots,
          closesAt:    newPoll.closingTime,
          closingDate: new Date(Date.now() + 86400000),
        });
        setNewPoll({ title:'', timeSlots:[], closingTime:'' });
        await api.getPolls().then(setPolls);
        Alert.alert('Poll Sent! 📋', `Poll created.${res.notificationsSent ? ` ${res.notificationsSent} passengers notified.` : ''}`);
      } catch {
        Alert.alert('Error', 'Could not create poll.');
      } finally {
        setCreatingPoll(false);
      }
    };

    const confirmDelete = (poll) => {
      Alert.alert('Delete Poll?', `"${poll.title}" will be removed.`, [
        { text:'Cancel', style:'cancel' },
        { text:'Delete', style:'destructive', onPress: async () => {
          setDeletingId(poll._id);
          try { await api.deletePoll(poll._id); await api.getPolls().then(setPolls); }
          catch { Alert.alert('Error','Could not delete.'); }
          finally { setDeletingId(null); }
        }},
      ]);
    };

    return (
      <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
        <View style={s.pageHeader}>
          <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
            <Icon name="poll" size={21} color={C.white} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.pageTitle}>Availability Polls</Text>
            <Text style={s.pageSub}>Ask passengers if they need a ride</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>Create New Poll</Text>
          <Text style={s.inputLabel}>Poll Title</Text>
          <View style={s.inputRow}>
            <Icon name="title" size={16} color={C.primaryDark} style={{ marginRight:8 }} />
            <TextInput
              style={s.inputInner}
              placeholder="e.g. Tomorrow Morning Route"
              placeholderTextColor={C.textLight}
              value={newPoll.title}
              onChangeText={t => setNewPoll(p => ({ ...p, title:t }))}
            />
          </View>
          <Text style={s.inputLabel}>Time Slots</Text>
          {newPoll.timeSlots.length > 0 && (
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {newPoll.timeSlots.map((slot, i) => (
                <View key={i} style={s.slotTag}>
                  <Icon name="schedule" size={11} color={C.primaryDark} />
                  <Text style={s.slotTagTxt}>{slot}</Text>
                  <TouchableOpacity onPress={() => setNewPoll(p => ({ ...p, timeSlots:p.timeSlots.filter(x=>x!==slot) }))}>
                    <Icon name="close" size={12} color={C.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity style={s.addTimeBtn} onPress={() => setTpVis(true)}>
            <Icon name="add-circle-outline" size={18} color={C.primaryDark} />
            <Text style={s.addTimeTxt}>Add Time Slot</Text>
          </TouchableOpacity>
          <Text style={[s.inputLabel, { marginTop:12 }]}>Closing Time</Text>
          <TouchableOpacity style={s.inputRow} onPress={() => setCpVis(true)}>
            <Icon name="alarm" size={16} color={C.primaryDark} style={{ marginRight:8 }} />
            <Text style={[s.inputInner, { flex:1, color: newPoll.closingTime ? C.textDark : C.textLight }]}>
              {newPoll.closingTime || 'Tap to set closing time'}
            </Text>
            <Icon name="chevron-right" size={16} color={C.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, creatingPoll && { opacity:0.5 }]} onPress={createPoll} disabled={creatingPoll}>
            {creatingPoll
              ? <ActivityIndicator color={C.white} />
              : <><Icon name="send" size={16} color={C.white} /><Text style={s.primaryBtnTxt}>Send to All Passengers</Text></>
            }
          </TouchableOpacity>
        </View>

        <TimePicker visible={tpVis} onClose={() => setTpVis(false)} onSelect={t => {
          if (!newPoll.timeSlots.includes(t)) setNewPoll(p => ({ ...p, timeSlots:[...p.timeSlots, t] }));
        }} />
        <TimePicker visible={cpVis} onClose={() => setCpVis(false)} onSelect={t => setNewPoll(p => ({ ...p, closingTime:t }))} />

        <Text style={s.sectionLbl}>YOUR POLLS ({polls.length})</Text>
        {polls.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}><Icon name="poll" size={36} color={C.textLight} /></View>
            <Text style={s.emptyTxt}>No polls yet</Text>
            <Text style={s.emptySub}>Create your first poll above</Text>
          </View>
        ) : polls.map(poll => {
          const yes = poll.responses?.filter(r => r.response==='yes').length || 0;
          const no  = poll.responses?.filter(r => r.response==='no').length  || 0;
          return (
            <View key={poll._id} style={s.pollCard}>
              <View style={{ flexDirection:'row', alignItems:'flex-start' }}>
                <View style={s.pollIcon}><Icon name="poll" size={17} color={C.primaryDark} /></View>
                <View style={{ flex:1, marginLeft:10 }}>
                  <Text style={s.pollTitle}>{poll.title}</Text>
                  <Text style={s.pollMeta}>Closes: {poll.closesAt} · {new Date(poll.createdAt).toLocaleDateString()}</Text>
                  {poll.timeSlots?.length > 0 && (
                    <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:6 }}>
                      {poll.timeSlots.map((sl, i) => (
                        <View key={i} style={s.slotMini}><Text style={s.slotMiniTxt}>{sl}</Text></View>
                      ))}
                    </View>
                  )}
                </View>
                <TouchableOpacity style={s.deletePollBtn} onPress={() => confirmDelete(poll)} disabled={deletingId===poll._id}>
                  {deletingId===poll._id
                    ? <ActivityIndicator size="small" color={C.primaryDark} />
                    : <Icon name="delete" size={18} color={C.primaryDark} />
                  }
                </TouchableOpacity>
              </View>
              <View style={s.respRow}>
                <View style={[s.respBox, { backgroundColor:C.primaryGhost }]}>
                  <Text style={[s.respNum, { color:C.primaryDark }]}>{yes}</Text>
                  <Text style={s.respLbl}>Coming</Text>
                </View>
                <View style={[s.respBox, { backgroundColor:C.primaryPale }]}>
                  <Text style={[s.respNum, { color:C.primaryDark }]}>{no}</Text>
                  <Text style={s.respLbl}>Not Coming</Text>
                </View>
                <View style={[s.respBox, { backgroundColor:C.primaryGhost }]}>
                  <Text style={[s.respNum, { color:C.textDark }]}>{poll.responses?.length||0}</Text>
                  <Text style={s.respLbl}>Total</Text>
                </View>
              </View>
              <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
                <TouchableOpacity style={[s.outlineBtn,{flex:1,marginBottom:0}]} onPress={() => setSelectedPoll(poll)}>
                  <Icon name="visibility" size={14} color={C.primaryDark} />
                  <Text style={s.outlineBtnTxt}>Responses</Text>
                </TouchableOpacity>
                {yes > 0 && (
                  <TouchableOpacity
                    style={[s.primaryBtn,{flex:1,marginTop:0}]}
                    onPress={() => handleOptimize(poll)}
                    disabled={optimizing}
                  >
                    {optimizing && activePoll?._id===poll._id
                      ? <ActivityIndicator size="small" color={C.white} />
                      : <><Icon name="auto-awesome" size={14} color={C.white} /><Text style={s.primaryBtnTxt}>Build Route</Text></>
                    }
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <Modal visible={!!selectedPoll} animationType="slide" onRequestClose={() => setSelectedPoll(null)}>
          <SafeAreaView style={{ flex:1, backgroundColor:C.offWhite }}>
            <View style={s.modalHdr}>
              <TouchableOpacity onPress={() => setSelectedPoll(null)} style={s.modalBackBtn}>
                <Icon name="arrow-back" size={21} color={C.textDark} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>Poll Responses</Text>
              <View style={{ width:40 }} />
            </View>
            <ScrollView style={{ padding:16 }}>
              {(selectedPoll?.responses||[]).length === 0 ? (
                <View style={s.emptyState}><Text style={s.emptyTxt}>No responses yet</Text></View>
              ) : (
                (selectedPoll?.responses||[]).map((r, i) => (
                  <View key={i} style={s.card}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                      <Text style={s.cardTitle}>{r.passengerName}</Text>
                      <View style={[s.activeChip, r.response!=='yes' && { backgroundColor:C.primaryPale }]}>
                        <View style={[s.activeDot, { backgroundColor: r.response==='yes' ? C.primary : C.border }]} />
                        <Text style={s.activeChipTxt}>{r.response==='yes' ? 'Coming ✓' : 'Not Coming'}</Text>
                      </View>
                    </View>
                    {r.selectedTimeSlot && <Text style={s.pollMeta}>Time: {r.selectedTimeSlot}</Text>}
                    {r.pickupPoint       && <Text style={s.pollMeta}>Pickup: {r.pickupPoint}</Text>}
                    {r.vehiclePreference && (
                      <View style={[s.vBadge, { marginTop:6, backgroundColor:'#E8F5E9' }]}>
                        <Text>{VEHICLE_INFO[r.vehiclePreference]?.icon}</Text>
                        <Text style={[s.vBadgeVal, { marginLeft:8, color:'#2E7D32' }]}>
                          Prefers {r.vehiclePreference} 🔒
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    );
  };

  // ─── SMART ROUTES ─────────────────────────────────────────────────────────
  const SmartRouteSection = () => {
    const pollsWithYes = polls.filter(p => (p.responses?.filter(r => r.response==='yes').length||0) > 0);
    return (
      <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        <View style={s.pageHeader}>
          <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
            <Icon name="auto-awesome" size={21} color={C.white} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.pageTitle}>Smart Routes</Text>
            <Text style={s.pageSub}>AI-powered OSRM route optimization</Text>
          </View>
        </View>

        <View style={s.howCard}>
          <Text style={s.howTitle}>🧠 HOW THE ALGORITHM WORKS</Text>
          {[
            { n:'1', t:'Vehicle Preference 🔒', d:'Car passengers → car only. Van passengers → van only. Never mixed.' },
            { n:'2', t:'Capacity-Based Selection', d:'≤4 passengers → Car  |  5-12 → Van  |  13+ → Bus' },
            { n:'3', t:'Solo Passenger Merge', d:'A passenger alone never gets their own vehicle — merged into nearest route.' },
            { n:'4', t:'OSRM Route Matrix', d:'Real road distances via OSRM API. Falls back to Haversine if offline.' },
            { n:'5', t:'Cheapest Insertion', d:'Each pickup/drop-off inserted at optimal position to minimize fuel & time.' },
          ].map((step, i) => (
            <View key={i} style={s.howStep}>
              <View style={s.howNum}><Text style={s.howNumTxt}>{step.n}</Text></View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:12, fontWeight:'800', color:C.textDark }}>{step.t}</Text>
                <Text style={s.howStepTxt}>{step.d}</Text>
              </View>
            </View>
          ))}
        </View>

        {pollsWithYes.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>SELECT POLL TO OPTIMIZE</Text>
            {pollsWithYes.map(poll => {
              const yes = poll.responses?.filter(r=>r.response==='yes').length||0;
              const isActive = activePoll?._id === poll._id;
              return (
                <TouchableOpacity
                  key={poll._id}
                  style={[s.selectItem, isActive && s.selectItemOn]}
                  onPress={() => setActivePoll(poll)}
                >
                  <Icon name={isActive ? 'radio-button-checked' : 'radio-button-unchecked'} size={20}
                    color={isActive ? C.primaryDark : C.textLight} />
                  <View style={{ marginLeft:10, flex:1 }}>
                    <Text style={s.selectItemTitle}>{poll.title}</Text>
                    <Text style={s.selectItemSub}>{yes} passenger{yes!==1?'s':''} traveling · {poll.closesAt}</Text>
                  </View>
                  <View style={[s.pillBadge, { backgroundColor:C.primaryPale }]}>
                    <Text style={[s.pillBadgeTxt, { color:C.primaryDark }]}>{yes} ✓</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.primaryBtn, (!activePoll || optimizing) && { opacity:0.5 }]}
              onPress={() => handleOptimize(activePoll)}
              disabled={!activePoll || optimizing}
            >
              {optimizing
                ? <><ActivityIndicator size="small" color={C.white} style={{ marginRight:8 }} /><Text style={s.primaryBtnTxt}>Calculating via OSRM...</Text></>
                : <><Icon name="auto-awesome" size={16} color={C.white} /><Text style={s.primaryBtnTxt}>Build Optimal Routes</Text></>
              }
            </TouchableOpacity>
          </View>
        )}

        {optimizing && (
          <View style={[s.card, { alignItems:'center', paddingVertical:40 }]}>
            <ActivityIndicator size="large" color={C.primaryDark} />
            <Text style={[s.emptyTxt, { marginTop:14 }]}>Calculating routes...</Text>
            <Text style={s.emptySub}>Fetching OSRM road matrix · applying preferences · solving insertion</Text>
          </View>
        )}

        {!optimizing && smartResults.length === 0 && (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}><Icon name="auto-awesome" size={36} color={C.textLight} /></View>
            <Text style={s.emptyTxt}>No routes ready</Text>
            <Text style={s.emptySub}>
              {pollsWithYes.length > 0
                ? 'Select a poll above and tap "Build Optimal Routes"'
                : 'Create a poll and wait for passenger responses first'
              }
            </Text>
            {pollsWithYes.length === 0 && (
              <TouchableOpacity style={[s.outlineBtn, { marginTop:16 }]} onPress={() => nav('poll')}>
                <Icon name="poll" size={16} color={C.primaryDark} />
                <Text style={s.outlineBtnTxt}>Go to Polls</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!optimizing && smartResults.map((result, idx) => (
          <SmartRouteCard
            key={idx}
            result={result}
            onConfirm={() => handleConfirmRoute(result, idx)}
            onDiscard={() => handleDiscardRoute(idx)}
            isConfirming={confirmingIdx === idx}
          />
        ))}

        {!optimizing && smartResults.length > 0 && (
          <TouchableOpacity style={s.outlineBtn} onPress={() => { setSmartResults([]); if (activePoll) handleOptimize(activePoll); }}>
            <Icon name="refresh" size={16} color={C.primaryDark} />
            <Text style={s.outlineBtnTxt}>Recalculate Routes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  // ─── TRACKING ─────────────────────────────────────────────────────────────
  const TrackingSection = () => (
    <View style={s.section}>
      <View style={[s.pageHeader, { marginBottom:0 }]}>
        <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
          <Icon name="my-location" size={21} color={C.white} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.pageTitle}>Live Tracking</Text>
          <Text style={s.pageSub}>{drivers.length} driver{drivers.length!==1?'s':''} registered</Text>
        </View>
      </View>
      <View style={s.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ latitude:33.6844, longitude:73.0479, latitudeDelta:0.08, longitudeDelta:0.08 }}
        >
          {trips.map(t => t.currentLocation && (
            <Marker
              key={t._id}
              coordinate={{ latitude:t.currentLocation.latitude||33.6844, longitude:t.currentLocation.longitude||73.0479 }}
              title={t.driverName || 'Driver'}
              description={t.routeName || ''}
            />
          ))}
        </MapView>
      </View>
      <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:16 }}>
        <Text style={s.sectionLbl}>ALL DRIVERS ({drivers.length})</Text>
        {drivers.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}><Icon name="directions-car" size={36} color={C.textLight} /></View>
            <Text style={s.emptyTxt}>No drivers yet</Text>
          </View>
        ) : (
          <View style={s.driverGrid}>
            {drivers.map((d, i) => <DriverCard key={d._id||i} driver={d} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // ─── ROUTES ───────────────────────────────────────────────────────────────
  const RoutesSection = () => (
    <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
      <View style={s.pageHeader}>
        <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
          <Icon name="map" size={21} color={C.white} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.pageTitle}>Routes</Text>
          <Text style={s.pageSub}>{routes.length} route{routes.length!==1?'s':''}</Text>
        </View>
      </View>
      {routes.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}><Icon name="map" size={36} color={C.textLight} /></View>
          <Text style={s.emptyTxt}>No routes yet</Text>
          <Text style={s.emptySub}>Use Smart Routes to create and assign routes</Text>
          <TouchableOpacity style={[s.primaryBtn, { marginTop:16 }]} onPress={() => nav('smart-route')}>
            <Icon name="auto-awesome" size={16} color={C.white} />
            <Text style={s.primaryBtnTxt}>Go to Smart Routes</Text>
          </TouchableOpacity>
        </View>
      ) : routes.map(r => {
        const vi = VEHICLE_INFO[r.vehicleType] || null;
        return (
          <View key={r._id||r.id} style={s.card}>
            <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
              <View style={s.vIconWrap}>
                <Text style={{ fontSize:22 }}>{vi?.icon || '🚗'}</Text>
              </View>
              <View style={{ flex:1, marginLeft:10 }}>
                <Text style={s.cardTitle}>{r.routeName||r.name}</Text>
                <View style={s.activeChip}>
                  <View style={[s.activeDot, { backgroundColor: r.status==='active'?C.primary:C.border }]} />
                  <Text style={s.activeChipTxt}>{(r.status||'pending').toUpperCase()}</Text>
                </View>
              </View>
            </View>
            {[
              { i:'person',            t:r.driverName||'Unassigned'  },
              { i:'place',             t:r.startPoint                 },
              { i:'flag',              t:r.destination                },
              { i:'schedule',          t:r.timeSlot||r.pickupTime     },
              ...(r.estimatedTime ? [{ i:'timer',             t:r.estimatedTime             }] : []),
              ...(r.estimatedFuel ? [{ i:'local-gas-station', t:r.estimatedFuel             }] : []),
              ...(r.estimatedKm   ? [{ i:'straighten',        t:r.estimatedKm               }] : []),
            ].map((it, i) => it.t && (
              <View key={i} style={[s.detailRow, { marginBottom:5 }]}>
                <Icon name={it.i} size={12} color={C.primaryDark} />
                <Text style={s.detailTxt}>{it.t}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  // ─── ASSIGN ───────────────────────────────────────────────────────────────
  const AssignSection = () => {
    const [selD, setSelD] = useState(null);
    const [selR, setSelR] = useState(null);
    const [assigning, setAssigning] = useState(false);
    return (
      <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
        <View style={s.pageHeader}>
          <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
            <Icon name="assignment-ind" size={21} color={C.white} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.pageTitle}>Assign Driver</Text>
            <Text style={s.pageSub}>Manual driver-to-route assignment</Text>
          </View>
        </View>
        <View style={s.tipCard}>
          <Icon name="lightbulb-outline" size={19} color={C.primaryDark} />
          <View style={{ flex:1, marginLeft:10 }}>
            <Text style={s.tipTitle}>Use Smart Routes Instead!</Text>
            <Text style={s.tipTxt}>Smart Routes automatically picks the best vehicle type and driver. This screen is for manual overrides only.</Text>
          </View>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={() => nav('smart-route')}>
          <Icon name="auto-awesome" size={16} color={C.white} />
          <Text style={s.primaryBtnTxt}>Open Smart Routes</Text>
        </TouchableOpacity>
        <Text style={[s.sectionLbl, { marginTop:20 }]}>MANUAL ASSIGNMENT</Text>
        <Text style={s.inputLabel}>Select Route</Text>
        <View style={s.card}>
          {routes.length === 0 ? <Text style={{ color:C.textLight, fontSize:13 }}>No routes available</Text>
            : routes.map(r => (
              <TouchableOpacity key={r._id} style={[s.selectItem, selR?._id===r._id && s.selectItemOn]} onPress={() => setSelR(r)}>
                <Icon name={selR?._id===r._id ? 'radio-button-checked' : 'radio-button-unchecked'} size={20}
                  color={selR?._id===r._id ? C.primaryDark : C.textLight} />
                <View style={{ marginLeft:10, flex:1 }}>
                  <Text style={s.selectItemTitle}>{r.routeName||r.name}</Text>
                  <Text style={s.selectItemSub}>{r.timeSlot} · {r.startPoint} → {r.destination}</Text>
                </View>
              </TouchableOpacity>
            ))
          }
        </View>
        <Text style={s.inputLabel}>Select Driver</Text>
        <View style={s.card}>
          {drivers.length === 0 ? <Text style={{ color:C.textLight, fontSize:13 }}>No drivers available</Text>
            : drivers.map(d => {
              const vi = VEHICLE_INFO[d.vehicleType||d.vehicle] || VEHICLE_INFO.van;
              return (
                <TouchableOpacity key={d._id} style={[s.selectItem, selD?._id===d._id && s.selectItemOn]} onPress={() => setSelD(d)}>
                  <Icon name={selD?._id===d._id ? 'radio-button-checked' : 'radio-button-unchecked'} size={20}
                    color={selD?._id===d._id ? C.primaryDark : C.textLight} />
                  <View style={{ marginLeft:10, flex:1 }}>
                    <Text style={s.selectItemTitle}>{d.name} {vi.icon}</Text>
                    <Text style={s.selectItemSub}>{vi.label} · cap {vi.capacity}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          }
        </View>
        <TouchableOpacity
          style={[s.primaryBtn, (!selR || !selD || assigning) && { opacity:0.4 }]}
          disabled={!selR || !selD || assigning}
          onPress={async () => {
            setAssigning(true);
            try {
              await api.assignDriverToRoute(selR._id, selD._id);
              Alert.alert('Assigned!', `${selD.name} assigned to ${selR.routeName||selR.name}.`);
              setSelD(null); setSelR(null);
              await api.getRoutes().then(setRoutes);
            } catch { Alert.alert('Error','Could not assign.'); }
            finally { setAssigning(false); }
          }}
        >
          {assigning ? <ActivityIndicator color={C.white} /> : <><Icon name="assignment-ind" size={16} color={C.white} /><Text style={s.primaryBtnTxt}>Assign Now</Text></>}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ─── REQUESTS ────────────────────────────────────────────────────────────
  const RequestsSection = ({ type }) => {
    const list     = type==='driver' ? driverReqs : passReqs;
    const approve  = type==='driver' ? api.approveDriverRequest.bind(api)    : api.approvePassengerRequest.bind(api);
    const reject   = type==='driver' ? api.rejectDriverRequest.bind(api)     : api.rejectPassengerRequest.bind(api);
    const reload   = type==='driver' ? () => api.getDriverRequests().then(setDriverReqs) : () => api.getPassengerRequests().then(setPassReqs);
    const [proc, setProc] = useState(null);
    return (
      <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
        <View style={s.pageHeader}>
          <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
            <Icon name={type==='driver'?'group-add':'person-add'} size={21} color={C.white} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={s.pageTitle}>{type==='driver'?'Driver':'Passenger'} Requests</Text>
            <Text style={s.pageSub}>{list.length} pending</Text>
          </View>
        </View>
        {list.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}><Icon name={type==='driver'?'group-add':'person-add'} size={36} color={C.textLight} /></View>
            <Text style={s.emptyTxt}>No pending requests</Text>
            <Text style={s.emptySub}>New requests will appear here</Text>
          </View>
        ) : list.map(req => (
          <RequestCard
            key={req._id}
            req={{ ...req, type }}
            isProcessing={proc===req._id}
            onAccept={async () => {
              setProc(req._id);
              try { await approve(req._id); await reload(); Alert.alert('Accepted!', `${req.name} approved.`); }
              catch { Alert.alert('Error','Could not approve.'); }
              finally { setProc(null); }
            }}
            onReject={async () => {
              setProc(req._id);
              try { await reject(req._id); await reload(); Alert.alert('Rejected', `${req.name} rejected.`); }
              catch { Alert.alert('Error','Could not reject.'); }
              finally { setProc(null); }
            }}
          />
        ))}
      </ScrollView>
    );
  };

  // ─── PAYMENTS ────────────────────────────────────────────────────────────
  const PaymentsSection = () => (
    <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
      <View style={s.pageHeader}>
        <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
          <Icon name="account-balance-wallet" size={21} color={C.white} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.pageTitle}>Payments</Text>
          <Text style={s.pageSub}>Track your earnings</Text>
        </View>
      </View>
      <View style={s.statsGrid}>
        <StatCard label="Received" value={`Rs. ${stats.paymentsReceived}`} iconName="check-circle" />
        <StatCard label="Pending"  value={`Rs. ${stats.paymentsPending}`}  iconName="hourglass-empty" />
      </View>
      <View style={s.emptyState}>
        <View style={s.emptyIconWrap}><Icon name="account-balance-wallet" size={36} color={C.textLight} /></View>
        <Text style={s.emptyTxt}>Detailed history coming soon</Text>
      </View>
    </ScrollView>
  );

  // ─── COMPLAINTS ──────────────────────────────────────────────────────────
  const ComplaintsSection = () => (
    <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
      <View style={s.pageHeader}>
        <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
          <Icon name="support-agent" size={21} color={C.white} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.pageTitle}>Complaints</Text>
          <Text style={s.pageSub}>{complaints.length} total</Text>
        </View>
      </View>
      {complaints.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}><Icon name="check-circle" size={36} color={C.primary} /></View>
          <Text style={s.emptyTxt}>No complaints!</Text>
          <Text style={s.emptySub}>Your passengers are happy 🎉</Text>
        </View>
      ) : complaints.map((c, i) => (
        <View key={c._id||i} style={s.card}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
            <Text style={[s.cardTitle, { flex:1 }]}>{c.title||'Complaint'}</Text>
            <View style={[s.activeChip, c.status!=='Resolved' && { backgroundColor:C.primaryPale }]}>
              <View style={[s.activeDot, { backgroundColor: c.status==='Resolved'?C.primary:C.warning }]} />
              <Text style={s.activeChipTxt}>{(c.status||'Open').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={s.pollMeta}>From: {c.byName||'Unknown'}</Text>
          {c.description && <Text style={[s.pollMeta, { marginTop:4, color:C.textMid }]}>{c.description}</Text>}
        </View>
      ))}
    </ScrollView>
  );

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  const NotificationsSection = () => (
    <ScrollView style={s.section} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:24 }}>
      <View style={s.pageHeader}>
        <View style={[s.pageHdrIcon, { backgroundColor:C.primaryDark }]}>
          <Icon name="notifications-active" size={21} color={C.white} />
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.pageTitle}>Notifications</Text>
          <Text style={s.pageSub}>{unread} unread</Text>
        </View>
      </View>
      {notifications.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}><Icon name="notifications-none" size={36} color={C.textLight} /></View>
          <Text style={s.emptyTxt}>No notifications</Text>
        </View>
      ) : notifications.map((n, i) => (
        <TouchableOpacity key={n._id||i} style={[s.card, !n.read && { borderLeftWidth:3, borderLeftColor:C.primary }]}
          onPress={async () => { if (!n.read) { await api.markRead(n._id); await api.getNotifications().then(setNotifications); } }}
        >
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
            <Text style={[s.cardTitle, { fontSize:14, flex:1 }]}>{n.title}</Text>
            {!n.read && <View style={{ width:8, height:8, borderRadius:4, backgroundColor:C.primary, marginLeft:8, marginTop:3 }} />}
          </View>
          {n.message && <Text style={[s.pollMeta, { marginTop:3, color:C.textMid }]}>{n.message}</Text>}
          <Text style={[s.pollMeta, { marginTop:3 }]}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const renderSection = () => {
    if (loading) return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color={C.primaryDark} />
        <Text style={{ marginTop:14, color:C.textMid, fontSize:15, fontWeight:'600' }}>Loading dashboard...</Text>
      </View>
    );
    switch (section) {
      case 'overview':    return <OverviewSection />;
      case 'profile':     return <ProfileSection />;
      case 'poll':        return <PollSection />;
      case 'smart-route': return <SmartRouteSection />;
      case 'routes':      return <RoutesSection />;
      case 'assign':      return <AssignSection />;
      case 'tracking':    return <TrackingSection />;
      case 'driver-req':  return <RequestsSection type="driver" />;
      case 'pass-req':    return <RequestsSection type="passenger" />;
      case 'payments':    return <PaymentsSection />;
      case 'complaints':  return <ComplaintsSection />;
      case 'notifications': return <NotificationsSection />;
      default:            return <OverviewSection />;
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {sidebar && <TouchableOpacity style={s.overlay} onPress={() => setSidebar(false)} activeOpacity={1} />}
      <Sidebar />
      <View style={s.header}>
        <TouchableOpacity onPress={() => setSidebar(true)} style={s.menuBtn}>
          <Icon name="menu" size={25} color={C.white} />
          {totalBadge > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{Math.min(totalBadge, 9)}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {MENU_ITEMS.find(m => m.key===section)?.label || 'Dashboard'}
        </Text>
        <TouchableOpacity onPress={() => nav('profile')}>
          <Avatar uri={profile?.profileImage} name={profile?.name} size={33} />
        </TouchableOpacity>
      </View>
      <View style={{ flex:1 }}>{renderSection()}</View>
    </SafeAreaView>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:       { flex:1, backgroundColor:C.offWhite },
  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.35)', zIndex:10 },

  header:          { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, backgroundColor:C.primaryDark, elevation:8, shadowColor:C.primaryDark, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:10 },
  menuBtn:         { width:40, height:40, justifyContent:'center', alignItems:'center', position:'relative' },
  headerTitle:     { flex:1, textAlign:'center', fontSize:17, fontWeight:'900', color:C.white, letterSpacing:-0.3 },
  headerBadge:     { position:'absolute', top:0, right:0, backgroundColor:C.primaryLight, width:16, height:16, borderRadius:8, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:C.primaryDark },
  headerBadgeTxt:  { color:C.textDark, fontSize:8, fontWeight:'900' },

  sidebar:         { position:'absolute', top:0, left:0, width:295, height:'100%', backgroundColor:C.white, zIndex:20, elevation:16 },
  sidebarHdr:      { backgroundColor:C.primaryDark, paddingTop:Platform.OS==='ios'?54:42, paddingBottom:18, paddingHorizontal:18, flexDirection:'row', alignItems:'center' },
  sidebarName:     { color:C.white, fontWeight:'900', fontSize:15 },
  sidebarCo:       { color:C.primaryLight, fontSize:12, marginTop:2 },
  sidebarStatus:   { flexDirection:'row', alignItems:'center', gap:5, marginTop:5 },
  sidebarDot:      { width:7, height:7, borderRadius:4, backgroundColor:C.primaryLight },
  sidebarStatusTxt:{ color:C.primaryPale, fontSize:11, fontWeight:'600' },
  sidebarClose:    { position:'absolute', top:14, right:14, width:30, height:30, borderRadius:8, backgroundColor:'rgba(255,255,255,0.15)', justifyContent:'center', alignItems:'center' },

  menuItem:        { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, position:'relative' },
  menuItemOn:      { backgroundColor:C.primaryGhost },
  menuBar:         { position:'absolute', left:0, top:8, bottom:8, width:3, backgroundColor:C.primary, borderRadius:2 },
  menuIconWrap:    { width:34, height:34, borderRadius:10, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  menuIconOn:      { backgroundColor:C.primaryPale },
  menuTxt:         { flex:1, marginLeft:11, fontSize:13, color:C.textLight, fontWeight:'500' },
  menuTxtOn:       { color:C.primaryDark, fontWeight:'800' },
  menuBadge:       { backgroundColor:C.primary, borderRadius:10, paddingHorizontal:6, paddingVertical:2, minWidth:20, alignItems:'center' },
  menuBadgeTxt:    { color:C.white, fontSize:10, fontWeight:'900' },
  menuDivider:     { height:1, backgroundColor:C.divider, marginHorizontal:16, marginVertical:5 },
  logoutItem:      { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12 },

  section:         { flex:1, paddingHorizontal:14 },
  sectionLbl:      { fontSize:10, fontWeight:'800', color:C.textLight, letterSpacing:1.2, marginBottom:9, marginTop:4 },

  pageHeader:      { flexDirection:'row', alignItems:'center', paddingTop:16, paddingBottom:12, gap:12 },
  pageHdrIcon:     { width:44, height:44, borderRadius:13, justifyContent:'center', alignItems:'center' },
  pageTitle:       { fontSize:21, fontWeight:'900', color:C.textDark, letterSpacing:-0.5 },
  pageSub:         { fontSize:12, color:C.textLight, marginTop:1 },

  welcomeCard:     { backgroundColor:C.primaryDark, borderRadius:20, padding:16, flexDirection:'row', alignItems:'center', marginTop:14, marginBottom:12, elevation:6 },
  welcomeGreet:    { fontSize:12, color:C.primaryLight, fontWeight:'600' },
  welcomeName:     { fontSize:19, fontWeight:'900', color:C.white, letterSpacing:-0.4, marginTop:2 },
  welcomeTime:     { fontSize:10, color:C.primaryPale, marginTop:2 },

  smartBanner:     { backgroundColor:C.primaryGhost, borderRadius:15, padding:13, flexDirection:'row', alignItems:'center', marginBottom:12, borderWidth:1.5, borderColor:C.border, gap:10 },
  smartBannerIcon: { width:40, height:40, borderRadius:12, backgroundColor:C.primary, justifyContent:'center', alignItems:'center' },
  smartBannerTitle:{ fontSize:14, fontWeight:'800', color:C.textDark },
  smartBannerSub:  { fontSize:11, color:C.textLight, marginTop:1 },
  optimizingRow:   { flexDirection:'row', backgroundColor:C.primaryGhost, borderRadius:11, padding:11, alignItems:'center', gap:9, marginBottom:10, borderWidth:1, borderColor:C.border },
  optimizingTxt:   { color:C.primaryDark, fontWeight:'700', fontSize:13, flex:1 },

  statsGrid:       { flexDirection:'row', flexWrap:'wrap', gap:9, marginBottom:6 },
  statCard:        { backgroundColor:C.white, borderRadius:15, padding:13, width:(width-50)/2, borderWidth:1.5, borderColor:C.divider },
  statIconWrap:    { width:42, height:42, borderRadius:12, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginBottom:9 },
  statValue:       { fontSize:21, fontWeight:'900', color:C.textDark, letterSpacing:-0.5 },
  statLabel:       { fontSize:11, color:C.textLight, marginTop:1, fontWeight:'600' },

  quickGrid:       { flexDirection:'row', flexWrap:'wrap', gap:9, marginBottom:12 },
  quickCard:       { backgroundColor:C.white, borderRadius:15, paddingVertical:14, paddingHorizontal:6, width:(width-50)/3, alignItems:'center', borderWidth:1.5, borderColor:C.divider },
  quickIconWrap:   { width:48, height:48, borderRadius:14, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginBottom:7, position:'relative' },
  quickLabel:      { fontSize:10, color:C.textMid, fontWeight:'700', textAlign:'center', lineHeight:14 },
  quickBadge:      { position:'absolute', top:-3, right:-3, backgroundColor:C.primary, width:17, height:17, borderRadius:9, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:C.white },
  quickBadgeTxt:   { color:C.white, fontSize:8, fontWeight:'900' },

  notifBanner:     { flexDirection:'row', backgroundColor:C.primaryPale, borderRadius:13, padding:12, alignItems:'center', marginBottom:12, gap:9, borderWidth:1, borderColor:C.border },
  notifBannerTxt:  { flex:1, color:C.textDark, fontWeight:'700', fontSize:12 },

  card:            { backgroundColor:C.white, borderRadius:15, padding:15, marginBottom:11, borderWidth:1.5, borderColor:C.divider },
  cardTitle:       { fontSize:15, fontWeight:'800', color:C.textDark, letterSpacing:-0.3 },
  cardLabel:       { fontSize:10, fontWeight:'800', color:C.textLight, textTransform:'uppercase', letterSpacing:1, marginBottom:13 },

  vIconWrap:       { width:46, height:46, borderRadius:13, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  pillBadge:       { borderRadius:18, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start' },
  pillBadgeTxt:    { fontSize:10, fontWeight:'700' },
  paxBig:          { fontSize:24, fontWeight:'900', color:C.primaryDark, letterSpacing:-1 },

  statsRow:        { flexDirection:'row', backgroundColor:C.primaryGhost, borderRadius:13, padding:13, marginBottom:11, alignItems:'center', borderWidth:1, borderColor:C.divider },
  statBox:         { flex:1, alignItems:'center', gap:3 },
  statBoxVal:      { fontSize:13, fontWeight:'800', color:C.textDark },
  statBoxLbl:      { fontSize:10, color:C.textLight },
  statDiv:         { width:1, height:34, backgroundColor:C.border },

  srcBadge:        { flexDirection:'row', alignItems:'center', gap:4, marginBottom:9, backgroundColor:C.primaryGhost, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:3, borderRadius:8 },
  srcTxt:          { fontSize:10, color:C.primaryDark, fontWeight:'600' },

  stopsHeader:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  stopsTitle:      { fontSize:10, fontWeight:'800', color:C.textLight, textTransform:'uppercase', letterSpacing:0.8 },
  stopRow:         { flexDirection:'row', alignItems:'flex-start', marginBottom:7, gap:0 },
  stopDot:         { width:10, height:10, borderRadius:5, marginTop:3, marginRight:8 },
  stopLineWrap:    { position:'absolute', left:4, top:13, bottom:-7, width:2, backgroundColor:C.divider },
  stopLine:        { flex:1 },
  stopName:        { fontSize:12, color:C.textDark, fontWeight:'600' },
  stopAddr:        { fontSize:11, color:C.textLight, marginTop:1 },

  paxRow:          { flexDirection:'row', alignItems:'center', gap:10, marginBottom:7 },
  paxAvatar:       { width:34, height:34, borderRadius:10, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },

  warnBox:         { flexDirection:'row', backgroundColor:'#FFF8E1', borderRadius:9, padding:9, alignItems:'center', gap:5, marginBottom:5, borderWidth:1 },
  warnTxt:         { flex:1, fontSize:11, fontWeight:'600' },

  twoBtn:          { flexDirection:'row', gap:9, marginTop:13 },
  discardBtn:      { flex:1, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, padding:12, borderRadius:11, backgroundColor:C.textMid },
  confirmBtn2:     { flex:2, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, padding:12, borderRadius:11, backgroundColor:C.primaryDark },
  rejectBtn:       { flex:1, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, padding:12, borderRadius:11, backgroundColor:C.error },
  acceptBtn:       { flex:1.5, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, padding:12, borderRadius:11, backgroundColor:C.primaryDark },
  btnTxt:          { color:C.white, fontWeight:'800', fontSize:13 },

  howCard:         { backgroundColor:C.primaryGhost, borderRadius:15, padding:15, marginBottom:12, borderWidth:1, borderColor:C.border },
  howTitle:        { fontSize:10, fontWeight:'800', color:C.primaryDark, marginBottom:11, letterSpacing:1 },
  howStep:         { flexDirection:'row', alignItems:'flex-start', marginBottom:10, gap:11 },
  howNum:          { width:26, height:26, borderRadius:13, backgroundColor:C.primaryDark, justifyContent:'center', alignItems:'center', flexShrink:0, marginTop:2 },
  howNumTxt:       { color:C.white, fontWeight:'900', fontSize:11 },
  howStepTxt:      { fontSize:11, color:C.textLight, lineHeight:16, marginTop:2 },

  tipCard:         { flexDirection:'row', backgroundColor:C.primaryGhost, borderRadius:13, padding:13, alignItems:'flex-start', marginBottom:9, borderWidth:1.5, borderColor:C.border },
  tipTitle:        { fontSize:12, fontWeight:'800', color:C.textDark, marginBottom:2 },
  tipTxt:          { fontSize:12, color:C.textLight, lineHeight:17 },

  driverGrid:      { flexDirection:'row', flexWrap:'wrap', gap:9, marginBottom:7 },
  driverCard:      { backgroundColor:C.white, borderRadius:15, padding:11, width:(width-40)/2, flexDirection:'row', gap:9, borderWidth:1.5, borderColor:C.divider },
  driverAvatar:    { width:42, height:42, borderRadius:12, justifyContent:'center', alignItems:'center', position:'relative' },
  driverAvatarTxt: { color:C.white, fontWeight:'900', fontSize:13 },
  driverDot:       { position:'absolute', bottom:-1, right:-1, width:11, height:11, borderRadius:6, borderWidth:2, borderColor:C.white },
  driverName:      { fontSize:12, fontWeight:'800', color:C.textDark, flex:1 },
  driverSub:       { fontSize:10, color:C.textLight, marginTop:1, marginBottom:3 },
  capRow:          { flexDirection:'row', alignItems:'center', gap:4, marginBottom:3 },
  capTxt:          { fontSize:9, color:C.textLight, width:26 },
  capBg:           { flex:1, height:4, backgroundColor:C.divider, borderRadius:2 },
  capFill:         { height:4, borderRadius:2 },

  profileHero:     { alignItems:'center', paddingTop:22, paddingBottom:22, marginTop:8, marginBottom:11, backgroundColor:C.white, borderRadius:18, borderWidth:1.5, borderColor:C.divider, overflow:'hidden' },
  profileHeroBg:   { position:'absolute', top:0, left:0, right:0, height:72, backgroundColor:C.primaryDark },
  profileName:     { fontSize:21, fontWeight:'900', color:C.textDark, marginTop:11, letterSpacing:-0.4 },
  profileCo:       { fontSize:13, color:C.textLight, marginTop:3 },
  activeChip:      { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.primaryGhost, borderRadius:18, paddingHorizontal:9, paddingVertical:4, marginTop:7, alignSelf:'flex-start', borderWidth:1, borderColor:C.border },
  activeDot:       { width:6, height:6, borderRadius:3, backgroundColor:C.primary },
  activeChipTxt:   { fontSize:10, fontWeight:'800', color:C.primaryDark },
  profileRow:      { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:C.divider },
  profileRowIcon:  { width:32, height:32, borderRadius:9, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginRight:11 },
  profileRowLabel: { fontSize:10, color:C.textLight, fontWeight:'600' },
  profileRowValue: { fontSize:13, color:C.textDark, fontWeight:'600', marginTop:1 },

  inputLabel:      { fontSize:12, fontWeight:'700', color:C.textMid, marginBottom:5 },
  inputRow:        { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:C.border, borderRadius:11, padding:11, backgroundColor:C.white, marginBottom:11 },
  inputInner:      { flex:1, fontSize:14, color:C.textDark, padding:0 },

  primaryBtn:      { backgroundColor:C.primaryDark, borderRadius:13, padding:14, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:7, marginTop:5, elevation:4 },
  primaryBtnTxt:   { color:C.white, fontWeight:'800', fontSize:14 },
  outlineBtn:      { borderWidth:1.5, borderColor:C.primaryDark, borderRadius:13, padding:12, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:5, marginBottom:7, backgroundColor:C.white },
  outlineBtnTxt:   { color:C.primaryDark, fontWeight:'700', fontSize:13 },

  slotTag:         { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:C.primaryGhost, borderRadius:18, paddingHorizontal:9, paddingVertical:6, borderWidth:1.5, borderColor:C.border },
  slotTagTxt:      { fontSize:12, color:C.primaryDark, fontWeight:'700' },
  addTimeBtn:      { flexDirection:'row', alignItems:'center', gap:7, padding:11, borderRadius:11, borderWidth:1.5, borderColor:C.primaryDark, borderStyle:'dashed', backgroundColor:C.primaryGhost, marginBottom:3 },
  addTimeTxt:      { color:C.primaryDark, fontWeight:'700', fontSize:13 },

  pollCard:        { backgroundColor:C.white, borderRadius:15, padding:15, marginBottom:11, borderWidth:1.5, borderColor:C.divider },
  pollIcon:        { width:38, height:38, borderRadius:11, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  pollTitle:       { fontSize:14, fontWeight:'800', color:C.textDark },
  pollMeta:        { fontSize:11, color:C.textLight, marginTop:1 },
  slotMini:        { backgroundColor:C.primaryPale, borderRadius:7, paddingHorizontal:7, paddingVertical:2 },
  slotMiniTxt:     { fontSize:10, color:C.primaryDark, fontWeight:'700' },
  deletePollBtn:   { width:34, height:34, borderRadius:9, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  respRow:         { flexDirection:'row', gap:7, marginTop:11 },
  respBox:         { flex:1, borderRadius:11, padding:9, alignItems:'center' },
  respNum:         { fontSize:21, fontWeight:'900', letterSpacing:-0.5 },
  respLbl:         { fontSize:10, color:C.textLight, marginTop:2, fontWeight:'500' },

  reqAvatar:       { width:44, height:44, borderRadius:13, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  detailRow:       { flexDirection:'row', alignItems:'center', gap:6 },
  detailTxt:       { fontSize:12, color:C.textMid, flex:1 },
  vBadge:          { flexDirection:'row', alignItems:'center', backgroundColor:C.primaryGhost, borderRadius:11, padding:9, marginTop:7, borderWidth:1, borderColor:C.border },
  vBadgeLbl:       { fontSize:10, color:C.textLight, fontWeight:'600' },
  vBadgeVal:       { fontSize:12, color:C.textDark, fontWeight:'700', marginTop:1 },

  selectItem:      { flexDirection:'row', alignItems:'center', padding:11, borderRadius:11, borderWidth:1.5, borderColor:C.border, marginBottom:7 },
  selectItemOn:    { borderColor:C.primaryDark, backgroundColor:C.primaryGhost },
  selectItemTitle: { fontSize:13, fontWeight:'700', color:C.textDark },
  selectItemSub:   { fontSize:11, color:C.textLight, marginTop:1 },

  mapWrap:         { height:180, borderRadius:16, overflow:'hidden', marginBottom:11, marginTop:7, borderWidth:1, borderColor:C.border },

  modalHdr:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:15, backgroundColor:C.white, borderBottomWidth:1, borderBottomColor:C.divider },
  modalBackBtn:    { width:38, height:38, borderRadius:9, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center' },
  modalTitle:      { fontSize:17, fontWeight:'800', color:C.textDark },

  emptyState:      { alignItems:'center', paddingVertical:42, paddingHorizontal:20 },
  emptyIconWrap:   { width:76, height:76, borderRadius:22, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginBottom:13, borderWidth:2, borderColor:C.border },
  emptyTxt:        { fontSize:16, fontWeight:'700', color:C.textMid },
  emptySub:        { fontSize:12, color:C.textLight, textAlign:'center', marginTop:5, lineHeight:18 },
});

export default TransporterDashboard;