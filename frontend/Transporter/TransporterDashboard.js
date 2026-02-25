import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, RefreshControl,
  Animated, Dimensions, ActivityIndicator, Modal,
  StatusBar, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// ─── COLOUR PALETTE ───────────────────────────────────────────────────────────
const C = {
  primary:      '#B8E040',
  primaryDark:  '#8BBF1E',
  primaryLight: '#D4EC80',
  primaryPale:  '#EAF5C2',
  primaryGhost: '#F5FAE8',
  white:        '#FFFFFF',
  offWhite:     '#F8F9FA',
  black:        '#000000',
  textDark:     '#0A0A0A',
  textMid:      '#3A3A3A',
  textLight:    '#6B6B6B',
  border:       '#D4EC80',
  divider:      '#EDF5C8',
  headerBg:     '#8BBF1E',
  headerText:   '#FFFFFF',
  error:        '#DC2626',
  errorLight:   '#FEE2E2',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  success:      '#16A34A',
  successLight: '#DCFCE7',
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VEHICLE_CAPS = { car: 4, van: 12, bus: 30 };
const VEHICLE_INFO = {
  car: { icon: '🚗', label: 'Car',  desc: 'Suzuki/Toyota City Car',   capacity: 4  },
  van: { icon: '🚐', label: 'Van',  desc: 'Toyota HiAce/Shehzore',    capacity: 12 },
  bus: { icon: '🚌', label: 'Bus',  desc: 'Hino/Isuzu Coach Bus',      capacity: 30 },
};

// ─── PAKISTAN FUEL DATA ───────────────────────────────────────────────────────
const PK_FUEL = {
  consumption:   { car: 12,  van: 15,  bus: 30  },   // L/100km
  fuelType:      { car: 'petrol', van: 'diesel', bus: 'diesel' },
  pricePerLitre: { petrol: 278, diesel: 283 },
  roadFactor:    { car: 1.38, van: 1.32, bus: 1.28 }, // straight-line → road km
  avgSpeedKmh:   { car: 28,  van: 23,  bus: 20  },
  minRouteKm:    { car: 8,   van: 12,  bus: 20  },
  minFuelLitres: { car: 1.0, van: 2.0, bus: 6.0 },
};

const OPT_WEIGHTS  = { distance: 0.35, time: 0.35, fuel: 0.30 };
const OSRM_BASE    = 'https://router.project-osrm.org';
const NOMINATIM    = 'https://nominatim.openstreetmap.org';
const API_BASE     = 'http://10.128.159.15:3000/api';

const fmtTime   = (m) => { const mm = Math.round(m); if (mm < 60) return `${mm} min`; const h = Math.floor(mm/60), r = mm%60; return r===0?`${h}h`:`${h}h ${r}m`; };
const fmtKm     = (km) => km < 1 ? `${Math.round(km*1000)} m` : `${parseFloat(km).toFixed(1)} km`;
const fmtLitres = (l)  => `${parseFloat(l).toFixed(1)} L`;
const fmtPKR    = (r)  => `Rs. ${Math.round(r).toLocaleString('en-PK')}`;

const MENU_ITEMS = [
  { key: 'overview',    label: 'Dashboard',          icon: 'dashboard'              },
  { key: 'profile',     label: 'My Profile',          icon: 'account-circle'         },
  { key: 'poll',        label: 'Availability Polls',  icon: 'poll'                   },
  { key: 'smart-route', label: 'Smart Routes',        icon: 'auto-awesome'           },
  { key: 'routes',      label: 'Routes',              icon: 'map'                    },
  { key: 'assign',      label: 'Assign Driver',       icon: 'assignment-ind'         },
  { key: 'tracking',    label: 'Live Tracking',       icon: 'my-location'            },
  { key: 'driver-req',  label: 'Driver Requests',     icon: 'group-add'              },
  { key: 'pass-req',    label: 'Passenger Requests',  icon: 'person-add'             },
  { key: 'payments',    label: 'Payments',            icon: 'account-balance-wallet' },
  { key: 'complaints',  label: 'Complaints',          icon: 'support-agent'          },
  { key: 'notifications',label:'Notifications',       icon: 'notifications-active'   },
];

// ══════════════════════════════════════════════════════════════════
// ─── ROUTE OPTIMIZATION ENGINE ────────────────────────────────────
// FIX 1: All helper functions defined BEFORE the class/optimizer
// FIX 2: No axios — using native fetch throughout
// FIX 3: optimizer instance created at module level so handleOptimize can access it
// ══════════════════════════════════════════════════════════════════

// ─── HAVERSINE DISTANCE (km) ──────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const a1 = parseFloat(lat1), o1 = parseFloat(lng1);
  const a2 = parseFloat(lat2), o2 = parseFloat(lng2);
  if (!a1||!o1||!a2||!o2||isNaN(a1)||isNaN(o1)||isNaN(a2)||isNaN(o2)) return 0;
  const dLat = (a2-a1)*Math.PI/180;
  const dLng = (o2-o1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── CENTROID ─────────────────────────────────────────────────────────────────
function centroid(points) {
  const v = points.filter(p => p.lat && p.lng);
  if (!v.length) return { lat: 33.6135, lng: 73.1998 };
  return {
    lat: v.reduce((s,p) => s+parseFloat(p.lat), 0) / v.length,
    lng: v.reduce((s,p) => s+parseFloat(p.lng), 0) / v.length,
  };
}

// ─── NEAREST-NEIGHBOR SORT ────────────────────────────────────────────────────
function nearestNeighborSort(passengers) {
  if (passengers.length <= 1) return [...passengers];
  const sorted = [], remaining = [...passengers];
  let cur = remaining.splice(0, 1)[0];
  sorted.push(cur);
  while (remaining.length) {
    let ni = 0, nd = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineKm(cur.pickupLat, cur.pickupLng, p.pickupLat, p.pickupLng);
      if (d < nd) { nd = d; ni = i; }
    });
    cur = remaining.splice(ni, 1)[0];
    sorted.push(cur);
  }
  return sorted;
}

// ─── 2-OPT IMPROVEMENT ────────────────────────────────────────────────────────
function twoOptImprove(stops) {
  if (stops.length <= 2) return stops;
  let improved = true, best = [...stops];
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length-1; i++) {
      for (let j = i+1; j < best.length; j++) {
        const p1=best[i], p2=best[(i+1)%best.length], p3=best[j], p4=best[(j+1)%best.length];
        const before = haversineKm(p1.lat,p1.lng,p2.lat,p2.lng)+haversineKm(p3.lat,p3.lng,p4.lat,p4.lng);
        const after  = haversineKm(p1.lat,p1.lng,p3.lat,p3.lng)+haversineKm(p2.lat,p2.lng,p4.lat,p4.lng);
        if (after < before-0.01) {
          best = [...best.slice(0,i+1), ...best.slice(i+1,j+1).reverse(), ...best.slice(j+1)];
          improved = true;
        }
      }
    }
  }
  return best;
}

// ─── CLARK-WRIGHT SAVINGS ─────────────────────────────────────────────────────
function clarkWrightSavings(passengers, depot, maxCap) {
  if (!passengers.length) return [];
  let routes = passengers.map((p, i) => ({ id: `r_${i}`, passengers: [p] }));
  const savings = [];
  for (let i = 0; i < passengers.length; i++) {
    for (let j = i+1; j < passengers.length; j++) {
      const pi = passengers[i], pj = passengers[j];
      const di  = haversineKm(depot.lat, depot.lng, pi.pickupLat, pi.pickupLng);
      const dj  = haversineKm(depot.lat, depot.lng, pj.pickupLat, pj.pickupLng);
      const dij = haversineKm(pi.pickupLat, pi.pickupLng, pj.pickupLat, pj.pickupLng);
      savings.push({ i, j, saving: di+dj-dij });
    }
  }
  savings.sort((a, b) => b.saving - a.saving);
  for (const { i, j } of savings) {
    const rI = routes.find(r => r.passengers.some(p => p.id === passengers[i].id));
    const rJ = routes.find(r => r.passengers.some(p => p.id === passengers[j].id));
    if (!rI || !rJ || rI.id === rJ.id) continue;
    if (rI.passengers.length + rJ.passengers.length > maxCap) continue;
    const cI = centroid(rI.passengers.map(p => ({ lat: p.pickupLat, lng: p.pickupLng })));
    const cJ = centroid(rJ.passengers.map(p => ({ lat: p.pickupLat, lng: p.pickupLng })));
    if (haversineKm(cI.lat, cI.lng, cJ.lat, cJ.lng) > 11) continue;
    routes = routes.filter(r => r.id !== rI.id && r.id !== rJ.id);
    routes.push({ id: rI.id, passengers: [...rI.passengers, ...rJ.passengers] });
  }
  return routes.map(r => r.passengers);
}

// ─── DETECT OUTLIERS ─────────────────────────────────────────────────────────
function detectOutliers(passengers) {
  if (passengers.length <= 1) return { inliers: passengers, outliers: [] };
  const cent = centroid(passengers.map(p => ({ lat: p.pickupLat, lng: p.pickupLng })));
  const distances = passengers.map(p => ({
    p,
    dist: haversineKm(cent.lat, cent.lng, p.pickupLat, p.pickupLng),
  }));
  const sorted = [...distances].sort((a,b) => a.dist-b.dist);
  const q3 = sorted[Math.floor(sorted.length*0.75)]?.dist || 18;
  const threshold = Math.max(q3*1.8, 18);
  return {
    inliers:  distances.filter(d => d.dist<=threshold).map(d => d.p),
    outliers: distances.filter(d => d.dist>threshold).map(d => d.p),
  };
}

// ─── FUEL CALCULATION ─────────────────────────────────────────────────────────
function calculateFuel(distanceKm, vehicleType) {
  const consumption = PK_FUEL.consumption[vehicleType] || 15;
  const fuelType    = PK_FUEL.fuelType[vehicleType]    || 'diesel';
  const pricePerL   = PK_FUEL.pricePerLitre[fuelType];
  const minFuel     = PK_FUEL.minFuelLitres[vehicleType] || 2.0;
  const rawFuel     = (distanceKm * consumption) / 100;
  const fuelLitres  = Math.max(rawFuel, minFuel);
  return {
    fuelLitres:  parseFloat(fuelLitres.toFixed(2)),
    fuelCostPKR: Math.round(fuelLitres * pricePerL),
    fuelType,
    consumption,
  };
}

// ─── OPTIMIZATION SCORE ───────────────────────────────────────────────────────
function computeOptimizationScore(distanceKm, durationMins, fuelL, passengerCount) {
  const n      = Math.max(passengerCount, 1);
  const dScore = Math.min(100, Math.max(0, 100 - (distanceKm/n-2)*8));
  const tScore = Math.min(100, Math.max(0, 100 - (durationMins/n-3)*4));
  const fScore = Math.min(100, Math.max(0, 100 - (fuelL/n-0.5)*40));
  return Math.round(OPT_WEIGHTS.distance*dScore + OPT_WEIGHTS.time*tScore + OPT_WEIGHTS.fuel*fScore);
}

// ─── REVERSE GEOCODE via Nominatim (fetch, NOT axios) ─────────────────────────
// FIX 2: Was using axios which is not imported in React Native — replaced with fetch
async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'TransporterApp/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.display_name) {
      const addr  = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.footway || addr.hamlet,
        addr.suburb || addr.neighbourhood || addr.village || addr.quarter,
        addr.city || addr.town || addr.county || addr.state,
      ].filter(Boolean);
      return parts.length
        ? parts.join(', ')
        : data.display_name.split(',').slice(0,3).join(', ');
    }
  } catch (e) {
    console.warn(`reverseGeocode failed (${lat},${lng}):`, e.message);
  }
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
}

// ─── OSRM ROUTE (real road distance, free, no API key) ────────────────────────
async function getOSRMRoute(waypoints, destination) {
  try {
    const allPts = [...waypoints, destination];
    const coords = allPts.map(w => `${w.lng},${w.lat}`).join(';');
    const url    = `${OSRM_BASE}/route/v1/driving/${coords}?overview=false`;
    const res    = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data   = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      const r = data.routes[0];
      return {
        distanceKm:  r.distance / 1000,
        durationMins: Math.round(r.duration / 60),
        source: 'osrm',
      };
    }
  } catch (e) {
    console.warn('OSRM failed:', e.message);
  }
  return null;
}

// ─── AREA LABEL ───────────────────────────────────────────────────────────────
function getMostCommonArea(addresses) {
  if (!addresses.length) return 'Area';
  const parts = addresses
    .map(a => { const s = String(a||''), p = s.split(','); return p.length>1?p[1].trim():p[0].trim(); })
    .filter(Boolean);
  const freq = {};
  parts.forEach(p => { freq[p] = (freq[p]||0)+1; });
  return Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Route';
}

// ══════════════════════════════════════════════════════════════════
// ─── MAIN OPTIMIZER CLASS ─────────────────────────────────────────
// FIX 1: Class properly defined with all methods
// FIX 3: Instantiated as `optimizer` at module level below the class
// ══════════════════════════════════════════════════════════════════
class RouteOptimizationEngine {
  constructor(config = {}) {
    this.DEFAULT_DEST_LAT  = config.destLat   || 33.6135;
    this.DEFAULT_DEST_LNG  = config.destLng   || 73.1998;
    this.DEFAULT_DEST_ADDR = config.destAddr  || 'Riphah International University, Gulberg Greens, Islamabad';
    this.SOLO_MERGE_RADIUS = 10;  // km
  }

  getBestVehicleType(count, forced = null) {
    if (forced) return forced;
    if (count <= VEHICLE_CAPS.car) return 'car';
    if (count <= VEHICLE_CAPS.van) return 'van';
    return 'bus';
  }

  // ─── MAIN OPTIMIZE METHOD ─────────────────────────────────────────────────
  async optimize(allPassengers, onProgress) {
    // Step 1: Normalize passenger data
    const passengers = allPassengers.map((r, i) => ({
      id:              r.id || r._id?.$oid || r._id || `p_${i}`,
      name:            r.name || r.passengerName || `Passenger ${i+1}`,
      pickupLat:       parseFloat(r.pickupLat || r.latitude || 0),
      pickupLng:       parseFloat(r.pickupLng || r.longitude || 0),
      pickupAddress:   r.pickupAddress || r.pickupPoint || r.address || '',
      dropLat:         parseFloat(r.dropLat || r.destinationLatitude  || this.DEFAULT_DEST_LAT),
      dropLng:         parseFloat(r.dropLng || r.destinationLongitude || this.DEFAULT_DEST_LNG),
      dropAddress:     r.dropAddress || r.destination || r.destinationAddress || this.DEFAULT_DEST_ADDR,
      vehiclePreference: r.vehiclePreference || null,
      timeSlot:        r.selectedTimeSlot || r.timeSlot || null,
    }));

    const valid   = passengers.filter(p => p.pickupLat !== 0 || p.pickupLng !== 0);
    const invalid = passengers.filter(p => p.pickupLat === 0 && p.pickupLng === 0);

    onProgress?.(`Validating ${passengers.length} passengers...`);

    // Step 2: Reverse geocode missing addresses (rate-limited 1/sec for Nominatim)
    onProgress?.('Fetching pickup addresses from GPS coordinates...');
    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      if ((!p.pickupAddress || p.pickupAddress === 'Pickup Point') && p.pickupLat && p.pickupLng) {
        valid[i] = {
          ...p,
          pickupAddress: await reverseGeocode(p.pickupLat, p.pickupLng),
        };
        onProgress?.(`Geocoding ${i+1}/${valid.length}: ${valid[i].pickupAddress}`);
        await new Promise(r => setTimeout(r, 1100)); // Nominatim 1 req/sec limit
      }
    }

    // Step 3: Group by vehicle preference
    const groups = [
      { passengers: valid.filter(p => p.vehiclePreference === 'car'), forced: 'car', label: 'Car-Only'  },
      { passengers: valid.filter(p => p.vehiclePreference === 'van'), forced: 'van', label: 'Van-Only'  },
      { passengers: valid.filter(p => p.vehiclePreference === 'bus'), forced: 'bus', label: 'Bus-Only'  },
      { passengers: valid.filter(p => !p.vehiclePreference),          forced: null,  label: 'Auto-Assign'},
    ].filter(g => g.passengers.length > 0);

    onProgress?.(`Building routes for ${valid.length} passengers across ${groups.length} group(s)...`);

    const allRoutes = [];
    const depot     = { lat: this.DEFAULT_DEST_LAT, lng: this.DEFAULT_DEST_LNG };

    for (const group of groups) {
      onProgress?.(`Optimising ${group.label} (${group.passengers.length} passengers)...`);
      const maxCap = group.forced ? VEHICLE_CAPS[group.forced] : VEHICLE_CAPS.bus;
      const { inliers, outliers } = detectOutliers(group.passengers);
      const savedRoutes = inliers.length > 0 ? clarkWrightSavings(inliers, depot, maxCap) : [];

      // Merge outliers into nearest existing route or create solo route
      for (const outlier of outliers) {
        let merged = false;
        if (savedRoutes.length > 0) {
          let bestIdx = -1, bestDist = Infinity;
          savedRoutes.forEach((route, idx) => {
            const cap = group.forced
              ? VEHICLE_CAPS[group.forced]
              : VEHICLE_CAPS[this.getBestVehicleType(route.length+1)];
            if (route.length >= cap) return;
            const cent = centroid(route.map(p => ({ lat: p.pickupLat, lng: p.pickupLng })));
            const dist = haversineKm(cent.lat, cent.lng, outlier.pickupLat, outlier.pickupLng);
            if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
          });
          if (bestIdx >= 0 && bestDist <= this.SOLO_MERGE_RADIUS) {
            savedRoutes[bestIdx].push(outlier);
            merged = true;
          }
        }
        if (!merged) savedRoutes.push([outlier]);
      }

      // Split routes exceeding capacity
      for (let i = savedRoutes.length-1; i >= 0; i--) {
        const route = savedRoutes[i];
        const cap   = group.forced
          ? VEHICLE_CAPS[group.forced]
          : VEHICLE_CAPS[this.getBestVehicleType(route.length)];
        if (route.length > cap) {
          const chunks = [];
          for (let j = 0; j < route.length; j += cap) chunks.push(route.slice(j, j+cap));
          savedRoutes.splice(i, 1, ...chunks);
        }
      }

      savedRoutes.forEach(r => allRoutes.push({ passengers: r, forced: group.forced }));
    }

    // Add passengers with no GPS as manual routes
    if (invalid.length > 0) {
      for (let i = 0; i < invalid.length; i += VEHICLE_CAPS.van) {
        allRoutes.push({
          passengers: invalid.slice(i, i + VEHICLE_CAPS.van),
          forced: null,
          warning: 'No GPS coordinates — manual pickup required',
        });
      }
    }

    if (!allRoutes.length) return [];

    onProgress?.(`Computing road distances for ${allRoutes.length} routes...`);

    // Step 4: Build final route objects with distances + fuel
    const routeResults = await Promise.allSettled(
      allRoutes.map(async ({ passengers: paxList, forced, warning }, idx) => {
        const vType = forced || this.getBestVehicleType(paxList.length);
        const cap   = VEHICLE_CAPS[vType];
        const dest  = {
          lat:     paxList[0]?.dropLat  || this.DEFAULT_DEST_LAT,
          lng:     paxList[0]?.dropLng  || this.DEFAULT_DEST_LNG,
          address: paxList[0]?.dropAddress || this.DEFAULT_DEST_ADDR,
        };

        // Sort pickups optimally
        const nnSorted  = nearestNeighborSort(paxList);
        const optimized = twoOptImprove(
          nnSorted.map(p => ({ ...p, lat: p.pickupLat, lng: p.pickupLng }))
        );
        const waypoints = optimized.map(p => ({
          lat: parseFloat(p.pickupLat || p.lat),
          lng: parseFloat(p.pickupLng || p.lng),
        })).filter(w => w.lat && w.lng);

        let distanceKm = 0, durationMins = 0, matrixSource = 'haversine';

        if (waypoints.length > 0) {
          // Try OSRM first (free, real road data)
          const osrm = await getOSRMRoute(waypoints, dest);
          if (osrm && osrm.distanceKm > 0 && osrm.distanceKm < 300) {
            distanceKm   = Math.max(osrm.distanceKm, PK_FUEL.minRouteKm[vType] || 12);
            durationMins = osrm.durationMins;
            matrixSource = 'osrm';
          } else {
            // Haversine fallback with Pakistan road factor
            let straight = 0;
            for (let i = 0; i < waypoints.length-1; i++) {
              straight += haversineKm(waypoints[i].lat, waypoints[i].lng, waypoints[i+1].lat, waypoints[i+1].lng);
            }
            straight    += haversineKm(waypoints[waypoints.length-1].lat, waypoints[waypoints.length-1].lng, dest.lat, dest.lng);
            const roadKm = straight * (PK_FUEL.roadFactor[vType] || 1.32);
            distanceKm   = Math.max(roadKm, PK_FUEL.minRouteKm[vType] || 12);
            durationMins = Math.max(10, Math.round((distanceKm / (PK_FUEL.avgSpeedKmh[vType] || 23)) * 60));
            matrixSource = 'haversine';
          }
        } else {
          distanceKm   = PK_FUEL.minRouteKm[vType] || 12;
          durationMins = Math.round((distanceKm / (PK_FUEL.avgSpeedKmh[vType] || 23)) * 60);
        }

        const { fuelLitres, fuelCostPKR, fuelType, consumption } = calculateFuel(distanceKm, vType);
        const score = computeOptimizationScore(distanceKm, durationMins, fuelLitres, paxList.length);
        const areaLabel = getMostCommonArea(paxList.map(p => p.pickupAddress));

        const stops = [
          ...optimized.map(p => ({
            name:    p.name,
            address: p.pickupAddress || `${p.pickupLat?.toFixed(4)}, ${p.pickupLng?.toFixed(4)}`,
            lat:     parseFloat(p.pickupLat || p.lat),
            lng:     parseFloat(p.pickupLng || p.lng),
            type:    'pickup',
          })),
          {
            name:    'Destination',
            address: dest.address,
            lat:     dest.lat,
            lng:     dest.lng,
            type:    'dropoff',
          },
        ];

        const warnings = [];
        if (warning)             warnings.push(warning);
        if (paxList.length > cap) warnings.push(`Exceeds ${vType} capacity (${paxList.length}/${cap})`);
        if (matrixSource === 'haversine') warnings.push('Estimated distance — OSRM unavailable');
        if (paxList.some(p => !p.pickupLat || !p.pickupLng)) warnings.push('Some passengers missing GPS');

        return {
          id:                  `route_${Date.now()}_${idx}`,
          vehicleType:         vType,
          passengerCount:      paxList.length,
          capacity:            cap,
          passengers:          paxList,
          stops,
          destination:         dest.address,
          estimatedKm:         fmtKm(distanceKm),
          estimatedTime:       fmtTime(durationMins),
          estimatedFuel:       fmtLitres(fuelLitres),
          fuelCostPKR:         fmtPKR(fuelCostPKR),
          fuelType,
          fuelRatePerKm:       parseFloat((fuelLitres / Math.max(distanceKm, 0.1)).toFixed(3)),
          rawDistanceKm:       parseFloat(distanceKm.toFixed(2)),
          rawDurationMins:     durationMins,
          rawFuelLitres:       fuelLitres,
          rawFuelCostPKR:      fuelCostPKR,
          matrixSource,
          optimizationScore:   score,
          preferenceGroup:     !!forced,
          areaLabel,
          warnings,
        };
      })
    );

    const final = routeResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    // Sort: preference groups first, then by optimization score
    final.sort((a, b) => {
      if (a.preferenceGroup && !b.preferenceGroup) return -1;
      if (!a.preferenceGroup && b.preferenceGroup) return 1;
      return b.optimizationScore - a.optimizationScore;
    });

    return final;
  }
}

// FIX 3: Instantiate at module level — accessible everywhere in the file
const optimizer = new RouteOptimizationEngine();

// ─── API SERVICE ──────────────────────────────────────────────────────────────
class ApiService {
  async getAuthData() {
    try {
      const [token, transporterId, userId, td] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('transporterId'),
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('transporterData'),
      ]);
      let parsedData = null;
      try { parsedData = td ? JSON.parse(td) : null; } catch (_) {}
      const resolvedId = transporterId || userId || parsedData?.id || parsedData?._id || null;
      return { token, transporterId: resolvedId, transporterData: parsedData };
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
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('Authentication failed — please login again');
      let errMsg = `Server Error ${res.status}`;
      try { const j = JSON.parse(text); errMsg = j.message || j.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    return text ? JSON.parse(text) : {};
  }

  async getProfile() {
    const { transporterId } = await this.getAuthData();
    if (!transporterId) {
      const r = await this.call('/profile');
      return this._normalizeProfile(r, '');
    }
    const r = await this.call(`/transporter/profile/${transporterId}`);
    const p = r.data || r.transporter || r;
    return this._normalizeProfile(p, transporterId);
  }

  _normalizeProfile(p, fallbackId) {
    return {
      id:               p._id || p.id || fallbackId,
      name:             p.name || 'Transporter',
      email:            p.email || '',
      phone:            p.phone || p.phoneNumber || 'N/A',
      company:          p.company || p.companyName || 'Transport Co.',
      address:          p.address || 'N/A',
      license:          p.license || p.licenseNumber || 'N/A',
      registrationDate: p.registrationDate ? new Date(p.registrationDate).toLocaleDateString() : 'N/A',
      location:         p.location || p.address || 'N/A',
      status:           p.status || 'active',
      profileImage:     p.profileImage || null,
    };
  }

  async updateProfile(data) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/transporter/profile/${transporterId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async getStats() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/dashboard/stats?transporterId=${transporterId}`);
    const s = r.stats || r.data || r;
    return {
      activeDrivers:    +s.activeDrivers    || 0,
      totalPassengers:  +s.totalPassengers  || 0,
      completedTrips:   +s.completedTrips   || 0,
      ongoingTrips:     +s.ongoingTrips     || 0,
      complaints:       +s.complaints       || 0,
      paymentsReceived: +s.paymentsReceived || 0,
      paymentsPending:  +s.paymentsPending  || 0,
    };
  }

  async getPolls() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/polls?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.polls || r.data || []);
  }

  async createPoll(data) {
    const { transporterId } = await this.getAuthData();
    return this.call('/polls', { method: 'POST', body: JSON.stringify({ ...data, transporterId }) });
  }

  async deletePoll(id) {
    return this.call(`/polls/${id}`, { method: 'DELETE' });
  }

  async getDrivers() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/drivers?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.drivers || r.data || []);
  }

  async saveUnassignedRoute(routeData) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { transporterId: authTid } = await this.getAuthData();
    const stopStrings   = (routeData.stops || []).map(s => typeof s === 'string' ? s : (s.address || s.name || 'Stop'));
    const passengerList = (routeData.passengers || []).map(p => ({
      passengerId:  p.id || p._id || null,
      passengerName: p.name || 'Passenger',
      pickupPoint:  p.pickupAddress || p.pickupPoint || 'Pickup',
      status:       'pending',
    }));
    return this.call('/routes', {
      method: 'POST',
      body: JSON.stringify({
        name:          routeData.routeName,
        routeName:     routeData.routeName,
        pollId:        routeData.pollId,
        startPoint:    routeData.startPoint || stopStrings[0] || 'Multiple Pickup Points',
        destination:   routeData.destination || 'Riphah International University',
        timeSlot:      routeData.timeSlot,
        pickupTime:    routeData.pickupTime || routeData.timeSlot,
        date:          tomorrow.toISOString(),
        passengers:    passengerList,
        stops:         stopStrings,
        estimatedTime: routeData.estimatedTime,
        estimatedFuel: routeData.estimatedFuel,
        estimatedKm:   routeData.estimatedKm,
        fuelCostPKR:   routeData.fuelCostPKR,
        fuelType:      routeData.fuelType,
        fuelRatePerKm: routeData.fuelRatePerKm,
        vehicleType:   routeData.vehicleType,
        status:        'unassigned',
        transporterId: routeData.transporterId || authTid,
      }),
    });
  }

  async assignDriverToRoute(routeId, driverId) {
    return this.call(`/routes/${routeId}/assign-driver`, { method: 'PUT', body: JSON.stringify({ driverId, assignedDriver: driverId }) });
  }

  async getDriverRequests() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/join-requests?type=driver&transporterId=${transporterId}`);
    return (Array.isArray(r) ? r : (r.requests || r.data || [])).filter(x => x.status === 'pending');
  }

  async approveDriverRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/join-requests/${id}/accept`, { method: 'PUT', body: JSON.stringify({ transporterId }) });
  }

  async rejectDriverRequest(id) {
    return this.call(`/join-requests/${id}/reject`, { method: 'PUT' });
  }

  async getPassengerRequests() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/join-requests?type=passenger&transporterId=${transporterId}`);
    return (Array.isArray(r) ? r : (r.requests || r.data || [])).filter(x => x.status === 'pending');
  }

  async approvePassengerRequest(id) {
    const { transporterId } = await this.getAuthData();
    return this.call(`/join-requests/${id}/accept`, { method: 'PUT', body: JSON.stringify({ transporterId }) });
  }

  async rejectPassengerRequest(id) {
    return this.call(`/join-requests/${id}/reject`, { method: 'PUT' });
  }

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

  async getComplaints() {
    const { transporterId } = await this.getAuthData();
    const r = await this.call(`/complaints?transporterId=${transporterId}`);
    return Array.isArray(r) ? r : (r.complaints || r.data || []);
  }

  async getNotifications() {
    const r = await this.call('/notifications');
    return Array.isArray(r) ? r : (r.notifications || r.data || []);
  }

  async markRead(id) {
    return this.call(`/notifications/${id}/read`, { method: 'PUT' });
  }
}

const api = new ApiService();

// ─── CLOCK TIME PICKER ────────────────────────────────────────────────────────
const TimePicker = ({ visible, onClose, onSelect }) => {
  const [mode, setMode]     = useState('hour');
  const [hour, setHour]     = useState(7);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');
  const CLOCK_SIZE = 240, CENTER = 120, RADIUS = 90, HAND_RADIUS = 80;

  useEffect(() => { if (visible) { setMode('hour'); setHour(7); setMinute(0); setPeriod('AM'); } }, [visible]);

  const hourNumbers   = Array.from({ length: 12 }, (_, i) => i+1);
  const minuteNumbers = Array.from({ length: 12 }, (_, i) => i*5);

  const getNumPosition = (index, total, r) => {
    const angle = ((index/total)*2*Math.PI) - (Math.PI/2);
    return { x: CENTER + r*Math.cos(angle), y: CENTER + r*Math.sin(angle) };
  };

  const handAngle = mode === 'hour' ? ((hour/12)*360)-90 : ((minute/60)*360)-90;
  const handRad   = (handAngle*Math.PI)/180;
  const handX     = CENTER + HAND_RADIUS*Math.cos(handRad);
  const handY     = CENTER + HAND_RADIUS*Math.sin(handRad);

  const handleClockPress = (evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - CENTER, dy = locationY - CENTER;
    let angle = Math.atan2(dy, dx)*(180/Math.PI) + 90;
    if (angle < 0) angle += 360;
    if (mode === 'hour') {
      let h = Math.round(angle/30); if (h===0) h=12; if (h>12) h=12;
      setHour(h); setTimeout(() => setMode('minute'), 300);
    } else {
      let m = Math.round(angle/6); if (m>=60) m=0; setMinute(m);
    }
  };

  const dH = String(hour).padStart(2,'0'), dM = String(minute).padStart(2,'0');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={clk.overlay}>
        <View style={clk.box}>
          <View style={clk.hdr}>
            <Icon name="alarm" size={18} color={C.black} style={{ marginRight:8 }} />
            <Text style={clk.hdrTxt}>Set Pickup Time</Text>
          </View>
          <View style={clk.digitalRow}>
            <TouchableOpacity onPress={() => setMode('hour')} style={[clk.digitBox, mode==='hour'&&clk.digitBoxOn]}>
              <Text style={[clk.digitTxt, mode==='hour'&&clk.digitTxtOn]}>{dH}</Text>
            </TouchableOpacity>
            <Text style={clk.colon}>:</Text>
            <TouchableOpacity onPress={() => setMode('minute')} style={[clk.digitBox, mode==='minute'&&clk.digitBoxOn]}>
              <Text style={[clk.digitTxt, mode==='minute'&&clk.digitTxtOn]}>{dM}</Text>
            </TouchableOpacity>
            <View style={clk.ampmCol}>
              {['AM','PM'].map(p => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[clk.ampmBtn, period===p&&clk.ampmBtnOn]}>
                  <Text style={[clk.ampmTxt, period===p&&clk.ampmTxtOn]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={clk.modeLabel}>{mode==='hour'?'SELECT HOUR':'SELECT MINUTE'}</Text>
          <View style={clk.clockWrap}>
            <View
              style={[clk.clockFace, { width:CLOCK_SIZE, height:CLOCK_SIZE, borderRadius:CLOCK_SIZE/2 }]}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handleClockPress}
              onResponderMove={handleClockPress}>
              {(mode==='hour' ? hourNumbers : minuteNumbers).map((n, i) => {
                const pos   = getNumPosition(i, 12, RADIUS);
                const isSel = mode==='hour' ? n===hour : (minute===n || (i===0&&minute<3));
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      if (mode==='hour') { setHour(n); setTimeout(() => setMode('minute'), 300); }
                      else { setMinute(n); }
                    }}
                    style={[clk.clockNum, { left:pos.x-18, top:pos.y-18, backgroundColor:isSel?C.primary:'transparent' }]}>
                    <Text style={[clk.clockNumTxt, { color:isSel?C.primaryDark:C.textDark, fontSize:mode==='minute'?12:14 }]}>
                      {mode==='minute' ? String(n).padStart(2,'0') : n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={[clk.centerDot, { left:CENTER-5, top:CENTER-5 }]} />
              <View style={[clk.handLine, { left:CENTER, top:CENTER, width:HAND_RADIUS, transform:[{translateX:-2},{rotate:`${handAngle+90}deg`},{translateX:-HAND_RADIUS/2}] }]} />
              <View style={[clk.handDot, { left:handX-10, top:handY-10 }]} />
            </View>
          </View>
          {mode==='minute' && (
            <View style={clk.quickMin}>
              {[0,15,30,45].map(m => (
                <TouchableOpacity key={m} style={[clk.quickMinBtn, minute===m&&clk.quickMinBtnOn]} onPress={() => setMinute(m)}>
                  <Text style={[clk.quickMinTxt, minute===m&&clk.quickMinTxtOn]}>:{String(m).padStart(2,'0')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={clk.actions}>
            <TouchableOpacity style={clk.cancelBtn} onPress={onClose}>
              <Text style={clk.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={clk.confirmBtn} onPress={() => { onSelect(`${dH}:${dM} ${period}`); onClose(); }}>
              <Icon name="check" size={15} color={C.primaryDark} />
              <Text style={clk.confirmTxt}>{dH}:{dM} {period}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const clk = StyleSheet.create({
  overlay:       { flex:1, backgroundColor:'rgba(0,0,0,0.65)', justifyContent:'center', alignItems:'center', padding:16 },
  box:           { backgroundColor:C.white, borderRadius:20, width:'100%', maxWidth:340, overflow:'hidden', elevation:20 },
  hdr:           { backgroundColor:C.primary, flexDirection:'row', alignItems:'center', padding:16 },
  hdrTxt:        { fontSize:16, fontWeight:'900', color:C.black },
  digitalRow:    { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingTop:20, paddingBottom:10, paddingHorizontal:20, gap:4 },
  digitBox:      { backgroundColor:C.primaryGhost, borderRadius:12, paddingHorizontal:20, paddingVertical:12, borderWidth:2, borderColor:C.border },
  digitBoxOn:    { backgroundColor:C.primary, borderColor:C.primaryDark },
  digitTxt:      { fontSize:36, fontWeight:'900', color:C.textDark },
  digitTxtOn:    { color:C.black },
  colon:         { fontSize:36, fontWeight:'900', color:C.textDark, marginHorizontal:2 },
  ampmCol:       { marginLeft:10, gap:5 },
  ampmBtn:       { paddingHorizontal:12, paddingVertical:7, borderRadius:8, backgroundColor:C.primaryGhost, borderWidth:2, borderColor:C.border },
  ampmBtnOn:     { backgroundColor:C.primary, borderColor:C.primaryDark },
  ampmTxt:       { fontSize:12, fontWeight:'800', color:C.textDark },
  ampmTxtOn:     { color:C.black },
  modeLabel:     { textAlign:'center', fontSize:10, fontWeight:'800', color:C.textLight, letterSpacing:2, marginBottom:8 },
  clockWrap:     { alignItems:'center', paddingBottom:10 },
  clockFace:     { backgroundColor:C.primaryGhost, borderWidth:2, borderColor:C.border, position:'relative' },
  clockNum:      { position:'absolute', width:36, height:36, borderRadius:18, justifyContent:'center', alignItems:'center' },
  clockNumTxt:   { fontWeight:'800' },
  centerDot:     { position:'absolute', width:10, height:10, borderRadius:5, backgroundColor:C.primaryDark },
  handLine:      { position:'absolute', height:3, backgroundColor:C.primaryDark, borderRadius:2 },
  handDot:       { position:'absolute', width:20, height:20, borderRadius:10, backgroundColor:C.primary, borderWidth:3, borderColor:C.primaryDark },
  quickMin:      { flexDirection:'row', gap:8, paddingHorizontal:16, marginBottom:12, justifyContent:'center' },
  quickMinBtn:   { flex:1, paddingVertical:8, borderRadius:8, backgroundColor:C.primaryGhost, alignItems:'center', borderWidth:2, borderColor:C.border },
  quickMinBtnOn: { backgroundColor:C.primary, borderColor:C.primaryDark },
  quickMinTxt:   { fontSize:13, fontWeight:'700', color:C.textDark },
  quickMinTxtOn: { color:C.black, fontWeight:'900' },
  actions:       { flexDirection:'row', gap:10, padding:16, paddingTop:4 },
  cancelBtn:     { flex:1, padding:14, borderRadius:10, borderWidth:2, borderColor:C.border, alignItems:'center' },
  cancelTxt:     { fontWeight:'700', color:C.textDark, fontSize:14 },
  confirmBtn:    { flex:2, padding:14, borderRadius:10, backgroundColor:C.primary, flexDirection:'row', justifyContent:'center', alignItems:'center', gap:6 },
  confirmTxt:    { color:C.black, fontWeight:'900', fontSize:14 },
});

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 60 }) => {
  const init = useMemo(() => {
    if (!name) return 'T';
    const pts = name.trim().split(' ');
    return pts.length > 1 ? `${pts[0][0]}${pts[1][0]}`.toUpperCase() : name.substring(0,2).toUpperCase();
  }, [name]);
  return (
    <View style={{ width:size, height:size, borderRadius:size/2, overflow:'hidden', backgroundColor:C.primary, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:C.white }}>
      {uri ? <Image source={{ uri }} style={{ width:size, height:size }} /> : <Text style={{ color:C.black, fontSize:size*0.35, fontWeight:'900' }}>{init}</Text>}
    </View>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, iconName, onPress }) => (
  <TouchableOpacity style={s.statCard} onPress={onPress} activeOpacity={onPress?0.75:1}>
    <View style={s.statIconWrap}><Icon name={iconName} size={20} color={C.primaryDark} /></View>
    <Text style={s.statValue}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── FUEL BADGE ───────────────────────────────────────────────────────────────
const FuelBadge = ({ fuelType, fuelCostPKR, estimatedFuel, estimatedKm, vehicleType }) => {
  const isDiesel    = fuelType === 'diesel';
  const consumption = PK_FUEL.consumption[vehicleType] || (isDiesel ? 15 : 12);
  const pricePerL   = PK_FUEL.pricePerLitre[fuelType]  || (isDiesel ? 283 : 278);
  return (
    <View style={s.fuelBadge}>
      <Text style={{ fontSize:20 }}>{isDiesel ? '🛢️' : '⛽'}</Text>
      <View style={{ marginLeft:10, flex:1 }}>
        <Text style={s.fuelBadgeType}>{isDiesel?'Diesel':'Petrol'} · {VEHICLE_INFO[vehicleType]?.label || vehicleType}</Text>
        <Text style={s.fuelBadgeVal}>{estimatedFuel}{fuelCostPKR ? ` · ${typeof fuelCostPKR==='string'?fuelCostPKR:fmtPKR(fuelCostPKR)}` : ''}</Text>
        <Text style={s.fuelBadgeNote}>Rs.{pricePerL}/L · {consumption}L per 100km</Text>
      </View>
    </View>
  );
};

// ─── SMART ROUTE CARD ─────────────────────────────────────────────────────────
const SmartRouteCard = ({ result, onConfirm, onDiscard, isConfirming }) => {
  const [expanded, setExpanded] = useState(false);
  const vi         = VEHICLE_INFO[result.vehicleType] || VEHICLE_INFO.van;
  const scoreColor = result.optimizationScore >= 80 ? C.success : result.optimizationScore >= 60 ? C.warning : C.error;
  return (
    <View style={s.card}>
      <View style={[s.cardAccentBar, { backgroundColor:C.primary }]} />
      {/* Header */}
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:10, flex:1 }}>
          <View style={s.vIconWrap}><Text style={{ fontSize:24 }}>{vi.icon}</Text></View>
          <View style={{ flex:1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {vi.label} · {result.areaLabel || 'Route'} ({result.passengerCount}/{result.capacity})
            </Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:5, marginTop:4 }}>
              <View style={s.chip}><Text style={s.chipTxt}>{vi.label} · cap {vi.capacity}</Text></View>
              <View style={[s.chip, { backgroundColor:C.warningLight, borderColor:C.warning }]}>
                <Text style={[s.chipTxt, { color:C.warning }]}>⏳ Needs Driver</Text>
              </View>
              {result.preferenceGroup && (
                <View style={[s.chip, { backgroundColor:C.successLight, borderColor:C.success }]}>
                  <Text style={[s.chipTxt, { color:C.success }]}>🔒 Preference</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[s.scoreBubble, { borderColor:scoreColor }]}>
          <Text style={[s.scoreNum, { color:scoreColor }]}>{result.optimizationScore}</Text>
          <Text style={s.scoreLbl}>%</Text>
        </View>
      </View>

      {result.destination && (
        <View style={[s.detailRow, { backgroundColor:C.primaryGhost, borderRadius:8, padding:9, marginBottom:10 }]}>
          <Icon name="flag" size={14} color={C.primaryDark} />
          <Text style={[s.detailTxt, { fontWeight:'700' }]} numberOfLines={2}>{result.destination}</Text>
        </View>
      )}

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { i:'straighten',        v:result.estimatedKm,   l:'Road Dist.' },
          { i:'schedule',          v:result.estimatedTime, l:'Est. Time'  },
          { i:'local-gas-station', v:result.estimatedFuel, l:'Fuel'       },
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

      <FuelBadge
        fuelType={result.fuelType} fuelCostPKR={result.fuelCostPKR}
        estimatedFuel={result.estimatedFuel} estimatedKm={result.estimatedKm}
        vehicleType={result.vehicleType} />

      <View style={s.srcBadge}>
        <Icon name={result.matrixSource==='osrm'?'map':'offline-bolt'} size={12} color={C.primaryDark} />
        <Text style={s.srcTxt}>
          {result.matrixSource==='osrm' ? '🗺 OSRM (real road data, free)' : '📐 Haversine estimate (OSRM unavailable)'}
        </Text>
      </View>

      <View style={[s.srcBadge, { marginTop:6, backgroundColor:C.primaryGhost, borderColor:C.border }]}>
        <Icon name="calculate" size={12} color={C.primaryDark} />
        <Text style={s.srcTxt}>
          {result.estimatedKm} × Rs.{result.fuelType==='diesel'?283:278}/L @ {PK_FUEL.consumption[result.vehicleType]||15}L/100km = {result.fuelCostPKR}
        </Text>
      </View>

      <TouchableOpacity style={s.stopsHeader} onPress={() => setExpanded(!expanded)}>
        <Text style={s.stopsTitle}>Route Stops ({result.stops?.length || 0})</Text>
        <Icon name={expanded?'expand-less':'expand-more'} size={22} color={C.primaryDark} />
      </TouchableOpacity>

      {expanded && (result.stops || []).map((stop, i) => (
        <View key={i} style={s.stopRow}>
          <View style={[s.stopDot, { backgroundColor:stop.type==='pickup'?C.primary:C.primaryDark }]} />
          <View style={{ flex:1 }}>
            <Text style={s.stopName}>
              {typeof stop==='string' ? stop : stop.name}
              {typeof stop !== 'string' && (
                <Text style={{ fontWeight:'700', color:stop.type==='pickup'?C.primaryDark:C.textLight }}>
                  {' '}{stop.type==='pickup'?'↑ Pickup':'↓ Drop-off'}
                </Text>
              )}
            </Text>
            {typeof stop!=='string' && stop.address && (
              <Text style={s.stopAddr} numberOfLines={2}>{stop.address}</Text>
            )}
            {typeof stop!=='string' && stop.lat && stop.lng && (
              <Text style={{ fontSize:10, color:C.textLight, marginTop:1 }}>
                {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
              </Text>
            )}
          </View>
        </View>
      ))}

      {expanded && result.passengers?.length > 0 && (
        <View style={{ marginTop:8 }}>
          <Text style={s.stopsTitle}>Passengers ({result.passengers.length})</Text>
          {result.passengers.map((p, i) => (
            <View key={i} style={s.paxRow}>
              <View style={s.paxAvatar}>
                <Text style={{ fontSize:11, fontWeight:'900', color:C.primaryDark }}>
                  {(p.name||'P').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:13, fontWeight:'700', color:C.textDark }}>{p.name}</Text>
                {p.pickupAddress && (
                  <Text style={{ fontSize:11, color:C.textLight }} numberOfLines={1}>📍 {p.pickupAddress}</Text>
                )}
                {p.pickupLat !== 0 && p.pickupLng !== 0 && (
                  <Text style={{ fontSize:10, color:C.textLight }}>
                    🌐 {parseFloat(p.pickupLat).toFixed(5)}, {parseFloat(p.pickupLng).toFixed(5)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {(result.warnings || []).map((w, i) => (
        <View key={i} style={s.warnBox}>
          <Icon name="warning" size={13} color={C.warning} />
          <Text style={s.warnTxt}>{w}</Text>
        </View>
      ))}

      <View style={[s.warnBox, { backgroundColor:C.primaryGhost, borderColor:C.border }]}>
        <Icon name="info-outline" size={13} color={C.primaryDark} />
        <Text style={[s.warnTxt, { color:C.textMid }]}>Assign a driver via "Assign Driver" screen</Text>
      </View>

      <View style={s.twoBtn}>
        <TouchableOpacity style={s.discardBtn} onPress={onDiscard}>
          <Icon name="delete-outline" size={16} color={C.white} />
          <Text style={s.btnTxt}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.confirmBtnGreen, isConfirming&&{opacity:0.6}]} onPress={onConfirm} disabled={isConfirming}>
          {isConfirming
            ? <ActivityIndicator size="small" color={C.black} />
            : <><Icon name="save" size={16} color={C.black} /><Text style={[s.btnTxt,{color:C.black}]}>Save Route</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── REQUEST CARD ─────────────────────────────────────────────────────────────
const RequestCard = ({ req, onAccept, onReject, isProcessing }) => {
  const vInfo = VEHICLE_INFO[req.vehicleType  || req.vehicle_type]   || null;
  const pInfo = VEHICLE_INFO[req.vehiclePreference || req.vehicle_preference] || null;
  return (
    <View style={s.card}>
      <View style={[s.cardAccentBar, { backgroundColor:req.type==='driver'?C.primaryDark:C.primary }]} />
      <View style={{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:12 }}>
        <View style={s.reqAvatar}><Text style={{ fontSize:24 }}>{req.type==='driver'?'🚗':'👤'}</Text></View>
        <View style={{ flex:1 }}>
          <Text style={s.cardTitle}>{req.name || req.fullName}</Text>
          <View style={[s.chip,{marginTop:4}]}>
            <Text style={s.chipTxt}>{req.type==='driver'?'Driver Request':'Passenger Request'}</Text>
          </View>
        </View>
      </View>
      <View style={{ gap:7, marginBottom:12 }}>
        {req.email       && <View style={s.detailRow}><Icon name="email"       size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{req.email}</Text></View>}
        {req.phone       && <View style={s.detailRow}><Icon name="phone"       size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{req.phone}</Text></View>}
        {req.license     && <View style={s.detailRow}><Icon name="credit-card" size={14} color={C.primaryDark}/><Text style={s.detailTxt}>License: {req.license}</Text></View>}
        {req.pickupPoint && <View style={s.detailRow}><Icon name="place"       size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{req.pickupPoint}</Text></View>}
        {req.destination && <View style={s.detailRow}><Icon name="flag"        size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{req.destination}</Text></View>}
      </View>
      {vInfo && (
        <View style={s.vBadge}>
          <Text style={{ fontSize:22 }}>{vInfo.icon}</Text>
          <View style={{ marginLeft:10 }}>
            <Text style={s.vBadgeLbl}>VEHICLE TYPE</Text>
            <Text style={s.vBadgeVal}>{vInfo.label} — {vInfo.desc}</Text>
          </View>
        </View>
      )}
      {pInfo && (
        <View style={[s.vBadge,{ marginTop:8, backgroundColor:C.successLight, borderColor:C.success }]}>
          <Text style={{ fontSize:22 }}>{pInfo.icon}</Text>
          <View style={{ marginLeft:10 }}>
            <Text style={[s.vBadgeLbl,{ color:C.success }]}>TRAVEL PREFERENCE 🔒</Text>
            <Text style={[s.vBadgeVal,{ color:C.success }]}>{pInfo.label} only — {pInfo.desc}</Text>
          </View>
        </View>
      )}
      <View style={s.twoBtn}>
        <TouchableOpacity style={s.rejectBtn} onPress={onReject} disabled={isProcessing}>
          <Icon name="close" size={16} color={C.white} /><Text style={s.btnTxt}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} onPress={onAccept} disabled={isProcessing}>
          {isProcessing
            ? <ActivityIndicator size="small" color={C.black} />
            : <><Icon name="check" size={16} color={C.black}/><Text style={[s.btnTxt,{color:C.black}]}>Accept</Text></>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── DRIVER CARD ──────────────────────────────────────────────────────────────
const DriverCard = ({ driver, compact = false }) => {
  const vi   = VEHICLE_INFO[driver.vehicleType || driver.vehicle] || VEHICLE_INFO.van;
  const cap  = vi.capacity || driver.capacity || 8;
  const fill = driver.passengers?.length || 0;
  const pct  = Math.min((fill/cap)*100, 100);
  return (
    <View style={[s.driverCard, compact && { flex:1, marginBottom:0, borderWidth:0, elevation:0, shadowOpacity:0, padding:0, backgroundColor:'transparent' }]}>
      <View style={s.driverAvatar}>
        <Text style={s.driverAvatarTxt}>
          {(driver.name||'D').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
        </Text>
        <View style={[s.driverDot, { backgroundColor:driver.status==='active'?C.success:C.border }]} />
      </View>
      <View style={{ flex:1 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={s.driverName} numberOfLines={1}>{driver.name}</Text>
          <Text style={{ fontSize:18 }}>{vi.icon}</Text>
        </View>
        <Text style={s.driverSub}>{vi.label} · cap {cap}</Text>
        <View style={s.capRow}>
          <Text style={s.capTxt}>{fill}/{cap}</Text>
          <View style={s.capBg}>
            <View style={[s.capFill, { width:`${pct}%`, backgroundColor:pct>80?C.error:C.primary }]} />
          </View>
        </View>
        {driver.phone && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginTop:3 }}>
            <Icon name="phone" size={11} color={C.textLight} />
            <Text style={{ fontSize:11, color:C.textLight }}>{driver.phone}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ══════════════════════════════════════════════════════════════════
const TransporterDashboard = () => {
  const navigation = useNavigation();
  const [section,        setSection]        = useState('overview');
  const [sidebar,        setSidebar]        = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const [profile,        setProfile]        = useState(null);
  const [editProfile,    setEditProfile]    = useState(null);
  const [isEditingPro,   setIsEditingPro]   = useState(false);
  const [stats,          setStats]          = useState({ activeDrivers:0, totalPassengers:0, completedTrips:0, ongoingTrips:0, complaints:0, paymentsReceived:0, paymentsPending:0 });
  const [polls,          setPolls]          = useState([]);
  const [drivers,        setDrivers]        = useState([]);
  const [routes,         setRoutes]         = useState([]);
  const [trips,          setTrips]          = useState([]);
  const [driverReqs,     setDriverReqs]     = useState([]);
  const [passReqs,       setPassReqs]       = useState([]);
  const [complaints,     setComplaints]     = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [smartResults,   setSmartResults]   = useState([]);
  const [optimizing,     setOptimizing]     = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState('');
  const [confirmingIdx,  setConfirmingIdx]  = useState(null);
  const [activePoll,     setActivePoll]     = useState(null);
  const [selectedPoll,   setSelectedPoll]   = useState(null);
  const [lastUpdated,    setLastUpdated]    = useState(new Date());

  useEffect(() => { checkAuthAndLoad(); }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: sidebar ? 0 : -300,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [sidebar]);

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
      const [p,st,po,dr,req_d,req_p,rt,tr,co,no] = await Promise.allSettled([
        api.getProfile(), api.getStats(), api.getPolls(), api.getDrivers(),
        api.getDriverRequests(), api.getPassengerRequests(),
        api.getRoutes(), api.getTrips(), api.getComplaints(), api.getNotifications(),
      ]);
      if (p.status==='fulfilled'    && p.value)    setProfile(p.value);
      if (st.status==='fulfilled'   && st.value)   setStats(st.value);
      if (po.status==='fulfilled'   && po.value)   setPolls(po.value);
      if (dr.status==='fulfilled'   && dr.value)   setDrivers(dr.value);
      if (req_d.status==='fulfilled')              setDriverReqs(req_d.value || []);
      if (req_p.status==='fulfilled')              setPassReqs(req_p.value || []);
      if (rt.status==='fulfilled')                 setRoutes(rt.value || []);
      if (tr.status==='fulfilled')                 setTrips(tr.value || []);
      if (co.status==='fulfilled')                 setComplaints(co.value || []);
      if (no.status==='fulfilled')                 setNotifications(no.value || []);
      setLastUpdated(new Date());
    } catch (e) {
      if (e.message?.includes('Authentication')) {
        Alert.alert('Session Expired', 'Please login again.', [{
          text: 'OK',
          onPress: () => navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] }),
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll().finally(() => setRefreshing(false));
  }, []);

  const unread     = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const totalBadge = driverReqs.length + passReqs.length + unread + smartResults.length;
  const nav        = (sec) => { setSection(sec); setSidebar(false); };

  // ─── OPTIMIZE ─────────────────────────────────────────────────────────────
  // FIX 3: `optimizer` is now defined at module level, so this works correctly
  const handleOptimize = async (poll) => {
    if (!poll) { Alert.alert('No Poll', 'Select a poll first.'); return; }
    setOptimizing(true);
    setActivePoll(poll);
    setSmartResults([]);
    setOptimizeStatus('Preparing passenger data...');
    try {
      const yesResponses = (poll.responses || []).filter(r => r.response === 'yes');
      if (!yesResponses.length) {
        Alert.alert('No Passengers', 'No passengers responded "Yes".');
        return;
      }

      const passengers = yesResponses.map((r, i) => ({
        id:                r.passengerId || r._id?.$oid || r._id || `p_${i}`,
        name:              r.passengerName || r.name || 'Passenger',
        pickupLat:         parseFloat(r.pickupLat  || r.latitude  || 0),
        pickupLng:         parseFloat(r.pickupLng  || r.longitude || 0),
        pickupAddress:     r.pickupPoint || r.pickupAddress || r.address || '',
        dropLat:           parseFloat(r.dropLat || r.destinationLatitude  || 33.6135),
        dropLng:           parseFloat(r.dropLng || r.destinationLongitude || 73.1998),
        dropAddress:       r.destination || r.dropAddress || r.destinationAddress || 'Riphah International University',
        vehiclePreference: r.vehiclePreference || null,
        timeSlot:          r.selectedTimeSlot || r.timeSlot || null,
      }));

      // FIX 3: optimizer is the module-level instance of RouteOptimizationEngine
      const results = await optimizer.optimize(passengers, (msg) => setOptimizeStatus(msg));

      if (!results.length) {
        Alert.alert('No Routes', 'Could not generate routes from the given passenger data.');
        return;
      }

      setSmartResults(results);
      nav('smart-route');

      const totalPax    = results.reduce((s, r) => s + r.passengerCount, 0);
      const totalFuel   = results.reduce((s, r) => s + (r.rawFuelCostPKR || 0), 0);
      const avgScore    = Math.round(results.reduce((s, r) => s + r.optimizationScore, 0) / results.length);
      const totalLitres = results.reduce((s, r) => s + (r.rawFuelLitres || 0), 0);

      Alert.alert(
        `✅ ${results.length} Route${results.length!==1?'s':''} Ready!`,
        `Passengers: ${totalPax}\nFuel: ${totalLitres.toFixed(1)} L\nCost: ${fmtPKR(totalFuel)}\nEfficiency: ${avgScore}%`,
        [
          { text: 'View Routes', onPress: () => nav('smart-route') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', `Could not build routes: ${err.message}`);
      console.error('handleOptimize error:', err);
    } finally {
      setOptimizing(false);
      setOptimizeStatus('');
    }
  };

  const handleConfirmRoute = async (result, idx) => {
    setConfirmingIdx(idx);
    try {
      if (!activePoll) throw new Error('No active poll selected');
      const destination = result.destination
        || result.passengers?.[0]?.dropAddress
        || result.stops?.find(s => s.type==='dropoff')?.address
        || 'Riphah International University';

      const payload = {
        pollId:       activePoll._id,
        routeName:    `${VEHICLE_INFO[result.vehicleType]?.label||'Vehicle'} Route — ${result.passengerCount} pax · ${result.areaLabel}`,
        timeSlot:     result.passengers?.[0]?.timeSlot || '08:00 AM',
        vehicleType:  result.vehicleType,
        startPoint:   result.stops?.[0]?.address || 'Multiple Pickup Points',
        destination,
        passengers:   result.passengers,
        stops:        result.stops,
        estimatedTime: result.estimatedTime,
        estimatedFuel: result.estimatedFuel,
        estimatedKm:   result.estimatedKm,
        fuelCostPKR:   result.fuelCostPKR,
        fuelType:      result.fuelType,
        fuelRatePerKm: result.fuelRatePerKm,
        transporterId: (await api.getAuthData()).transporterId,
      };

      await api.saveUnassignedRoute(payload);
      setSmartResults(prev => prev.filter((_, i) => i !== idx));

      Alert.alert(
        'Route Saved ✅',
        `${VEHICLE_INFO[result.vehicleType]?.label} · ${result.passengerCount} pax\n⏱ ${result.estimatedTime}  📏 ${result.estimatedKm}\n⛽ ${result.estimatedFuel} (${result.fuelCostPKR})`,
        [
          { text: 'Assign Driver', onPress: () => nav('assign') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save route.');
    } finally {
      setConfirmingIdx(null);
    }
  };

  const handleDiscardRoute = (idx) =>
    Alert.alert('Discard Route?', 'This suggestion will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setSmartResults(prev => prev.filter((_,i) => i!==idx)) },
    ]);

  const logout = () => Alert.alert('Logout', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: async () => {
      await AsyncStorage.multiRemove(['authToken','transporterId','userId','transporterData']);
      navigation.reset({ index:0, routes:[{ name:'TransporterLogin' }] });
    }},
  ]);

  // ─── SIDEBAR ──────────────────────────────────────────────────────────────
  const SidebarView = () => (
    <Animated.View style={[s.sidebar, { transform:[{ translateX:slideAnim }] }]}>
      <View style={s.sidebarHdr}>
        <Avatar uri={profile?.profileImage} name={profile?.name} size={50} />
        <View style={{ marginLeft:14, flex:1 }}>
          <Text style={s.sidebarName} numberOfLines={1}>{profile?.name || 'Transporter'}</Text>
          <Text style={s.sidebarCo}   numberOfLines={1}>{profile?.company || 'Transport Co.'}</Text>
          <View style={s.sidebarStatus}>
            <View style={s.sidebarDot} />
            <Text style={s.sidebarStatusTxt}>Active</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setSidebar(false)} style={s.sidebarClose}>
          <Icon name="close" size={20} color={C.white} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex:1 }}>
        <View style={{ paddingVertical:8 }}>
          {MENU_ITEMS.map(item => {
            const active = section === item.key;
            const badge  = item.key==='notifications' ? unread
              : item.key==='driver-req'  ? driverReqs.length
              : item.key==='pass-req'    ? passReqs.length
              : item.key==='smart-route' ? smartResults.length : 0;
            return (
              <TouchableOpacity key={item.key} style={[s.menuItem, active&&s.menuItemOn]} onPress={() => nav(item.key)}>
                {active && <View style={s.menuBar} />}
                <View style={[s.menuIconWrap, active&&s.menuIconOn]}>
                  <Icon name={item.icon} size={18} color={active?C.black:C.textLight} />
                </View>
                <Text style={[s.menuTxt, active&&s.menuTxtOn]}>{item.label}</Text>
                {badge > 0 && (
                  <View style={s.menuBadge}>
                    <Text style={s.menuBadgeTxt}>{badge>9?'9+':badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={s.menuDivider} />
        <TouchableOpacity style={s.logoutItem} onPress={logout}>
          <View style={[s.menuIconWrap, { backgroundColor:C.errorLight }]}>
            <Icon name="logout" size={18} color={C.error} />
          </View>
          <Text style={[s.menuTxt, { color:C.error, fontWeight:'700' }]}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height:40 }} />
      </ScrollView>
    </Animated.View>
  );

  // ─── OVERVIEW ─────────────────────────────────────────────────────────────
  const OverviewSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
      showsVerticalScrollIndicator={false}>
      <View style={s.welcomeCard}>
        <View style={s.welcomeCardInner}>
          <View style={{ flex:1 }}>
            <Text style={s.welcomeGreet}>Good {new Date().getHours()<12?'Morning':'Afternoon'} 👋</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{profile?.name || 'Transporter'}</Text>
            <Text style={s.welcomeTime}>Updated {lastUpdated.toLocaleTimeString()}</Text>
          </View>
          <Avatar uri={profile?.profileImage} name={profile?.name} size={56} />
        </View>
        <View style={s.welcomeStrip}>
          {[
            { v:stats.activeDrivers,  l:'Drivers'    },
            { v:stats.ongoingTrips,   l:'Live Trips'  },
            { v:stats.completedTrips, l:'Completed'  },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <View style={{ alignItems:'center' }}>
                <Text style={s.stripVal}>{item.v}</Text>
                <Text style={s.stripLbl}>{item.l}</Text>
              </View>
              {i < arr.length-1 && <View style={s.stripDiv} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {totalBadge > 0 && (
        <TouchableOpacity style={s.alertBanner} onPress={() => nav('notifications')}>
          <Icon name="notifications-active" size={16} color={C.white} />
          <Text style={s.alertBannerTxt}>{totalBadge} item{totalBadge!==1?'s':''} need attention</Text>
          <Icon name="chevron-right" size={16} color={C.white} />
        </TouchableOpacity>
      )}

      <Text style={s.sectionLabel}>Fleet Overview</Text>
      <View style={s.statsGrid}>
        <StatCard label="Active Drivers"   value={stats.activeDrivers}   iconName="people"                 onPress={() => nav('assign')}    />
        <StatCard label="Total Passengers" value={stats.totalPassengers}  iconName="groups"                 onPress={() => nav('pass-req')}  />
        <StatCard label="Completed Trips"  value={stats.completedTrips}   iconName="check-circle"           onPress={() => nav('routes')}    />
        <StatCard label="Ongoing Trips"    value={stats.ongoingTrips}     iconName="directions-bus"         onPress={() => nav('tracking')}  />
        <StatCard label="Complaints"       value={stats.complaints}       iconName="report-problem"         onPress={() => nav('complaints')}/>
        <StatCard label="Received (Rs)"    value={stats.paymentsReceived} iconName="account-balance-wallet" onPress={() => nav('payments')}  />
      </View>

      <Text style={s.sectionLabel}>Quick Actions</Text>
      <View style={s.quickGrid}>
        {[
          { icon:'poll',           label:'New Poll',      sec:'poll'         },
          { icon:'auto-awesome',   label:'Smart Routes',  sec:'smart-route'  },
          { icon:'assignment-ind', label:'Assign Driver', sec:'assign'       },
          { icon:'my-location',    label:'Live Tracking', sec:'tracking'     },
        ].map(q => (
          <TouchableOpacity key={q.sec} style={s.quickBtn} onPress={() => nav(q.sec)} activeOpacity={0.75}>
            <View style={s.quickIconWrap}><Icon name={q.icon} size={24} color={C.primaryDark} /></View>
            <Text style={s.quickLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {driverReqs.length > 0 && (
        <TouchableOpacity style={s.pendingBanner} onPress={() => nav('driver-req')}>
          <View style={[s.pendingDot, { backgroundColor:C.warning }]} />
          <Text style={s.pendingBannerTxt}>{driverReqs.length} pending driver request{driverReqs.length!==1?'s':''}</Text>
          <Icon name="chevron-right" size={16} color={C.primaryDark} />
        </TouchableOpacity>
      )}
      {passReqs.length > 0 && (
        <TouchableOpacity style={s.pendingBanner} onPress={() => nav('pass-req')}>
          <View style={[s.pendingDot, { backgroundColor:C.primary }]} />
          <Text style={s.pendingBannerTxt}>{passReqs.length} pending passenger request{passReqs.length!==1?'s':''}</Text>
          <Icon name="chevron-right" size={16} color={C.primaryDark} />
        </TouchableOpacity>
      )}

      <Text style={s.sectionLabel}>Recent Drivers</Text>
      {drivers.length === 0
        ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>🚗</Text><Text style={s.emptyTxt}>No drivers registered yet.</Text></View>
        : drivers.slice(0,4).map((d,i) => <DriverCard key={d._id||i} driver={d} />)
      }
    </ScrollView>
  );

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  const ProfileSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      <View style={s.card}>
        <View style={{ alignItems:'center', paddingVertical:12 }}>
          <Avatar uri={profile?.profileImage} name={profile?.name} size={88} />
          <Text style={[s.cardTitle,{ marginTop:14, fontSize:20 }]}>{profile?.name}</Text>
          <Text style={{ color:C.textLight, fontSize:13, marginTop:3 }}>{profile?.company}</Text>
          <View style={[s.chip,{ marginTop:8, backgroundColor:C.successLight, borderColor:C.success }]}>
            <Text style={[s.chipTxt,{ color:C.success }]}>{profile?.status || 'active'}</Text>
          </View>
        </View>
        <View style={s.profileDivider} />
        {[
          { icon:'email',       label:'Email',      val:profile?.email            },
          { icon:'phone',       label:'Phone',      val:profile?.phone            },
          { icon:'place',       label:'Address',    val:profile?.address          },
          { icon:'credit-card', label:'License',    val:profile?.license          },
          { icon:'business',    label:'Registered', val:profile?.registrationDate },
          { icon:'location-on', label:'Location',   val:profile?.location         },
        ].map((row,i) => row.val && row.val !== 'N/A' && (
          <View key={i} style={[s.detailRow,{ paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.divider }]}>
            <View style={s.profileIconWrap}><Icon name={row.icon} size={15} color={C.primaryDark} /></View>
            <Text style={[s.detailTxt,{ flex:0, color:C.textLight, marginRight:8, minWidth:80 }]}>{row.label}</Text>
            <Text style={[s.detailTxt,{ flex:1, fontWeight:'600', color:C.textDark }]}>{row.val}</Text>
          </View>
        ))}
        {!isEditingPro
          ? <TouchableOpacity style={[s.confirmBtnGreen,{ marginTop:18 }]} onPress={() => { setEditProfile({...profile}); setIsEditingPro(true); }}>
              <Icon name="edit" size={16} color={C.black} />
              <Text style={[s.btnTxt,{color:C.black}]}>Edit Profile</Text>
            </TouchableOpacity>
          : <View style={{ marginTop:18 }}>
              {['name','phone','company','address'].map(field => (
                <View key={field} style={{ marginBottom:12 }}>
                  <Text style={s.inputLabel}>{field.charAt(0).toUpperCase()+field.slice(1)}</Text>
                  <TextInput
                    style={s.input}
                    value={editProfile?.[field] || ''}
                    onChangeText={v => setEditProfile(prev => ({...prev, [field]:v}))}
                    placeholder={`Enter ${field}`}
                    placeholderTextColor={C.textLight} />
                </View>
              ))}
              <View style={s.twoBtn}>
                <TouchableOpacity style={s.discardBtn} onPress={() => setIsEditingPro(false)}>
                  <Icon name="close" size={16} color={C.white} /><Text style={s.btnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.confirmBtnGreen} onPress={async () => {
                  try {
                    await api.updateProfile(editProfile);
                    setProfile(editProfile);
                    setIsEditingPro(false);
                    Alert.alert('Saved', 'Profile updated successfully.');
                  } catch (e) { Alert.alert('Error', e.message); }
                }}>
                  <Icon name="save" size={16} color={C.black} /><Text style={[s.btnTxt,{color:C.black}]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
        }
      </View>
    </ScrollView>
  );

  // ─── POLL SECTION ─────────────────────────────────────────────────────────
  const PollSection = () => {
    const [newPollTitle,   setNewPollTitle]   = useState('');
    const [newPollDate,    setNewPollDate]    = useState('');
    const [newPollTime,    setNewPollTime]    = useState('');
    const [timePickerOpen, setTimePickerOpen] = useState(false);
    const [creating,       setCreating]       = useState(false);

    const handleCreate = async () => {
      if (!newPollTitle.trim()) { Alert.alert('Required', 'Enter a poll title.'); return; }
      setCreating(true);
      try {
        await api.createPoll({ title:newPollTitle, date:newPollDate, timeSlot:newPollTime });
        setNewPollTitle(''); setNewPollDate(''); setNewPollTime('');
        await loadAll();
        Alert.alert('Poll Created', 'Passengers can now respond.');
      } catch (e) { Alert.alert('Error', e.message); }
      finally { setCreating(false); }
    };

    return (
      <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}>
        <TimePicker visible={timePickerOpen} onClose={() => setTimePickerOpen(false)} onSelect={t => setNewPollTime(t)} />
        <View style={s.card}>
          <View style={[s.cardAccentBar,{ backgroundColor:C.primary }]} />
          <Text style={[s.cardTitle,{ marginBottom:14 }]}>Create Availability Poll</Text>
          <Text style={s.inputLabel}>Poll Title</Text>
          <TextInput style={s.input} value={newPollTitle} onChangeText={setNewPollTitle}
            placeholder="e.g. Tomorrow Morning Commute" placeholderTextColor={C.textLight} />
          <Text style={s.inputLabel}>Date (optional)</Text>
          <TextInput style={s.input} value={newPollDate} onChangeText={setNewPollDate}
            placeholder="YYYY-MM-DD" placeholderTextColor={C.textLight} />
          <Text style={s.inputLabel}>Time Slot</Text>
          <TouchableOpacity
            style={[s.input,{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
            onPress={() => setTimePickerOpen(true)}>
            <Text style={{ color:newPollTime?C.textDark:C.textLight, fontWeight:newPollTime?'600':'400' }}>
              {newPollTime || 'Tap to set time'}
            </Text>
            <Icon name="alarm" size={20} color={C.primaryDark} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.confirmBtnGreen,{ marginTop:14 }]} onPress={handleCreate} disabled={creating}>
            {creating
              ? <ActivityIndicator size="small" color={C.black} />
              : <><Icon name="add" size={16} color={C.black} /><Text style={[s.btnTxt,{color:C.black}]}>Create Poll</Text></>}
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>Active Polls ({polls.length})</Text>
        {polls.length === 0
          ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>📋</Text><Text style={s.emptyTxt}>No polls yet. Create one above.</Text></View>
          : polls.map((poll, i) => {
              const yes   = (poll.responses||[]).filter(r => r.response==='yes').length;
              const no    = (poll.responses||[]).filter(r => r.response==='no').length;
              const total = (poll.responses||[]).length;
              const isSel = selectedPoll?._id === poll._id;
              return (
                <View key={poll._id||i} style={[s.card, isSel&&{ borderColor:C.primary, borderWidth:2 }]}>
                  <View style={[s.cardAccentBar,{ backgroundColor:isSel?C.primary:C.border }]} />
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <View style={{ flex:1 }}>
                      <Text style={s.cardTitle} numberOfLines={2}>{poll.title}</Text>
                      <View style={{ flexDirection:'row', gap:10, marginTop:6 }}>
                        {poll.date     && <View style={s.detailRow}><Icon name="event" size={12} color={C.primaryDark}/><Text style={s.detailTxt}>{new Date(poll.date).toLocaleDateString()}</Text></View>}
                        {poll.timeSlot && <View style={s.detailRow}><Icon name="alarm" size={12} color={C.primaryDark}/><Text style={s.detailTxt}>{poll.timeSlot}</Text></View>}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => Alert.alert('Delete Poll?', '', [
                        { text:'Cancel', style:'cancel' },
                        { text:'Delete', style:'destructive', onPress: async () => {
                          try { await api.deletePoll(poll._id); await loadAll(); }
                          catch (e) { Alert.alert('Error', e.message); }
                        }},
                      ])}
                      style={{ padding:4 }}>
                      <Icon name="delete-outline" size={22} color={C.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection:'row', gap:8, marginVertical:12 }}>
                    <View style={[s.chip,{ backgroundColor:C.successLight, borderColor:C.success }]}><Text style={[s.chipTxt,{ color:C.success }]}>✓ {yes} Yes</Text></View>
                    <View style={[s.chip,{ backgroundColor:C.errorLight,   borderColor:C.error   }]}><Text style={[s.chipTxt,{ color:C.error   }]}>✗ {no} No</Text></View>
                    <View style={s.chip}><Text style={s.chipTxt}>{total} Total</Text></View>
                  </View>
                  <View style={s.twoBtn}>
                    <TouchableOpacity
                      style={[s.discardBtn, isSel&&{ backgroundColor:C.primaryDark }]}
                      onPress={() => setSelectedPoll(isSel ? null : poll)}>
                      <Icon name={isSel?'check':'check-box-outline-blank'} size={15} color={C.white} />
                      <Text style={s.btnTxt}>{isSel?'Selected':'Select'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.confirmBtnGreen, optimizing&&{ opacity:0.6 }]}
                      onPress={() => handleOptimize(poll)}
                      disabled={optimizing}>
                      {optimizing && activePoll?._id === poll._id
                        ? <ActivityIndicator size="small" color={C.black} />
                        : <><Icon name="auto-awesome" size={15} color={C.black} /><Text style={[s.btnTxt,{color:C.black}]}>Optimize</Text></>}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
        }
      </ScrollView>
    );
  };

  // ─── SMART ROUTES ─────────────────────────────────────────────────────────
  const SmartRouteSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      {optimizing && (
        <View style={s.optimizingBanner}>
          <ActivityIndicator size="small" color={C.black} />
          <Text style={[s.optimizingTxt,{color:C.black}]}>{optimizeStatus || 'Optimizing routes...'}</Text>
        </View>
      )}
      {smartResults.length === 0 && !optimizing
        ? <View style={[s.card,{ alignItems:'center', paddingVertical:44 }]}>
            <Text style={{ fontSize:52, marginBottom:14 }}>🗺️</Text>
            <Text style={[s.cardTitle,{ textAlign:'center', marginBottom:8 }]}>No Smart Routes Yet</Text>
            <Text style={[s.emptyTxt,{ textAlign:'center' }]}>Go to Availability Polls and tap "Optimize" to generate routes.</Text>
            <TouchableOpacity
              style={[s.confirmBtnGreen,{ marginTop:18, alignSelf:'center', flex:0, paddingHorizontal:24 }]}
              onPress={() => nav('poll')}>
              <Icon name="poll" size={16} color={C.black}/><Text style={[s.btnTxt,{color:C.black}]}>Go to Polls</Text>
            </TouchableOpacity>
          </View>
        : <>
            <View style={[s.card,{ backgroundColor:C.primaryGhost, borderColor:C.border }]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                <Icon name="auto-awesome" size={20} color={C.primaryDark} />
                <Text style={[s.cardTitle,{ color:C.primaryDark }]}>
                  {smartResults.length} Route{smartResults.length!==1?'s':''} Ready
                </Text>
              </View>
              <Text style={{ fontSize:12, color:C.textLight, marginTop:5 }}>
                {smartResults.reduce((s,r) => s+r.passengerCount, 0)} passengers · {fmtPKR(smartResults.reduce((s,r) => s+(r.rawFuelCostPKR||0), 0))} est. fuel
              </Text>
            </View>
            {smartResults.map((result, idx) => (
              <SmartRouteCard
                key={result.id || idx}
                result={result}
                onConfirm={() => handleConfirmRoute(result, idx)}
                onDiscard={() => handleDiscardRoute(idx)}
                isConfirming={confirmingIdx === idx} />
            ))}
          </>
      }
    </ScrollView>
  );

  // ─── ROUTES ───────────────────────────────────────────────────────────────
  const RoutesSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      <Text style={s.sectionLabel}>All Routes ({routes.length})</Text>
      {routes.length === 0
        ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>🗺️</Text><Text style={s.emptyTxt}>No routes found. Generate via Smart Routes.</Text></View>
        : routes.map((route, i) => {
            const vi          = VEHICLE_INFO[route.vehicleType] || VEHICLE_INFO.van;
            const statusColor = route.status==='active'?C.success:route.status==='unassigned'?C.warning:C.textLight;
            const statusBg    = route.status==='active'?C.successLight:route.status==='unassigned'?C.warningLight:C.primaryGhost;
            return (
              <View key={route._id||i} style={s.card}>
                <View style={[s.cardAccentBar,{ backgroundColor:statusColor }]} />
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 }}>
                  <Text style={{ fontSize:24 }}>{vi.icon}</Text>
                  <View style={{ flex:1 }}>
                    <Text style={s.cardTitle} numberOfLines={2}>{route.name || route.routeName || `Route ${i+1}`}</Text>
                    <View style={[s.chip,{ marginTop:5, backgroundColor:statusBg }]}>
                      <Text style={[s.chipTxt,{ color:statusColor }]}>{route.status || 'unassigned'}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ gap:5 }}>
                  {route.startPoint  && <View style={s.detailRow}><Icon name="place"      size={14} color={C.primaryDark}/><Text style={s.detailTxt} numberOfLines={1}>{route.startPoint}</Text></View>}
                  {route.destination && <View style={s.detailRow}><Icon name="flag"       size={14} color={C.primaryDark}/><Text style={s.detailTxt} numberOfLines={1}>{route.destination}</Text></View>}
                  {route.pickupTime  && <View style={s.detailRow}><Icon name="alarm"      size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{route.pickupTime}</Text></View>}
                  {route.estimatedKm && <View style={s.detailRow}><Icon name="straighten" size={14} color={C.primaryDark}/><Text style={s.detailTxt}>{route.estimatedKm} · {route.estimatedTime}</Text></View>}
                </View>
                {route.estimatedFuel && (
                  <FuelBadge
                    fuelType={route.fuelType || PK_FUEL.fuelType[route.vehicleType] || 'petrol'}
                    fuelCostPKR={route.fuelCostPKR}
                    estimatedFuel={route.estimatedFuel}
                    estimatedKm={route.estimatedKm}
                    vehicleType={route.vehicleType || 'van'} />
                )}
                {route.status === 'unassigned' && (
                  <TouchableOpacity style={[s.confirmBtnGreen,{ marginTop:10 }]} onPress={() => nav('assign')}>
                    <Icon name="assignment-ind" size={15} color={C.black}/><Text style={[s.btnTxt,{color:C.black}]}>Assign Driver</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
      }
    </ScrollView>
  );

  // ─── ASSIGN DRIVER ────────────────────────────────────────────────────────
  const AssignSection = () => {
    const unassigned = routes.filter(r => r.status==='unassigned' || !r.assignedDriver);
    const [selectedRoute,  setSelectedRoute]  = useState(null);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [assigning,      setAssigning]      = useState(false);

    const doAssign = async () => {
      if (!selectedRoute || !selectedDriver) { Alert.alert('Select Both', 'Please select a route and a driver.'); return; }
      setAssigning(true);
      try {
        await api.assignDriverToRoute(selectedRoute._id, selectedDriver._id);
        Alert.alert('Driver Assigned ✅', `${selectedDriver.name} assigned to route.`);
        setSelectedRoute(null); setSelectedDriver(null);
        await loadAll();
      } catch (e) { Alert.alert('Error', e.message); }
      finally { setAssigning(false); }
    };

    return (
      <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Unassigned Routes ({unassigned.length})</Text>
        {unassigned.length === 0
          ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>🎉</Text><Text style={s.emptyTxt}>All routes have drivers!</Text></View>
          : unassigned.map((route, i) => {
              const vi  = VEHICLE_INFO[route.vehicleType] || VEHICLE_INFO.van;
              const sel = selectedRoute?._id === route._id;
              return (
                <TouchableOpacity key={route._id||i} style={[s.card, sel&&{ borderColor:C.primary, borderWidth:2 }]} onPress={() => setSelectedRoute(sel?null:route)}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <Text style={{ fontSize:22 }}>{vi.icon}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>{route.name || route.routeName}</Text>
                      <Text style={[s.detailTxt,{ marginTop:3 }]}>{route.passengers?.length||0} pax · {route.estimatedKm||'—'} · {route.pickupTime||route.timeSlot||'—'}</Text>
                    </View>
                    <Icon name={sel?'check-circle':'radio-button-unchecked'} size={24} color={sel?C.primary:C.border} />
                  </View>
                </TouchableOpacity>
              );
            })
        }

        <Text style={s.sectionLabel}>Available Drivers ({drivers.length})</Text>
        {drivers.length === 0
          ? <View style={s.emptyState}><Text style={s.emptyTxt}>No drivers registered yet.</Text></View>
          : drivers.map((driver, i) => {
              const sel = selectedDriver?._id === driver._id;
              return (
                <TouchableOpacity key={driver._id||i} style={[s.card, sel&&{ borderColor:C.primary, borderWidth:2 }]} onPress={() => setSelectedDriver(sel?null:driver)}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <View style={{ flex:1 }}><DriverCard driver={driver} compact /></View>
                    <Icon name={sel?'check-circle':'radio-button-unchecked'} size={24} color={sel?C.primary:C.border} />
                  </View>
                </TouchableOpacity>
              );
            })
        }

        {(selectedRoute || selectedDriver) && (
          <View style={[s.card,{ backgroundColor:C.primaryGhost, borderColor:C.primary, borderWidth:2, marginTop:4 }]}>
            <Text style={[s.cardTitle,{ color:C.primaryDark, marginBottom:10 }]}>Assignment Preview</Text>
            <View style={s.detailRow}>
              <Icon name="map"    size={14} color={C.primaryDark}/>
              <Text style={s.detailTxt}>{selectedRoute ? (selectedRoute.name||'Selected Route') : '— Select a route —'}</Text>
            </View>
            <View style={[s.detailRow,{marginTop:6}]}>
              <Icon name="person" size={14} color={C.primaryDark}/>
              <Text style={s.detailTxt}>{selectedDriver ? selectedDriver.name : '— Select a driver —'}</Text>
            </View>
            <TouchableOpacity
              style={[s.confirmBtnGreen,{ marginTop:14 }, (!selectedRoute||!selectedDriver||assigning)&&{ opacity:0.5 }]}
              onPress={doAssign}
              disabled={!selectedRoute || !selectedDriver || assigning}>
              {assigning
                ? <ActivityIndicator size="small" color={C.black} />
                : <><Icon name="assignment-ind" size={16} color={C.black}/><Text style={[s.btnTxt,{color:C.black}]}>Confirm Assignment</Text></>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  // ─── TRACKING ─────────────────────────────────────────────────────────────
  const TrackingSection = () => {
    const activeTrips = trips.filter(t => t.status==='ongoing' || t.status==='active');
    return (
      <View style={{ flex:1 }}>
        <MapView
          style={{ flex:1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ latitude:33.6135, longitude:73.1998, latitudeDelta:0.15, longitudeDelta:0.15 }}
          showsUserLocation
          showsMyLocationButton>
          {activeTrips.map((trip, i) => trip.currentLat && trip.currentLng && (
            <Marker
              key={i}
              coordinate={{ latitude:parseFloat(trip.currentLat), longitude:parseFloat(trip.currentLng) }}
              title={trip.driverName || 'Driver'}
              description={`${trip.passengerCount || 0} passengers`}
              pinColor={C.primary} />
          ))}
        </MapView>
        <View style={s.trackingOverlay}>
          <Icon name="my-location" size={16} color={C.white} />
          <Text style={s.trackingOverlayTxt}>
            {activeTrips.length === 0 ? 'No active trips right now' : `${activeTrips.length} active trip${activeTrips.length!==1?'s':''} on map`}
          </Text>
        </View>
      </View>
    );
  };

  // ─── REQUESTS ─────────────────────────────────────────────────────────────
  const RequestSection = ({ type }) => {
    const list = type==='driver' ? driverReqs : passReqs;
    const [processing, setProcessing] = useState(null);

    const accept = async (req) => {
      setProcessing(req._id);
      try {
        type==='driver' ? await api.approveDriverRequest(req._id) : await api.approvePassengerRequest(req._id);
        await loadAll();
        Alert.alert('Accepted', `${req.name || req.fullName || 'Request'} approved.`);
      } catch (e) { Alert.alert('Error', e.message); }
      finally { setProcessing(null); }
    };

    const reject = (req) => Alert.alert('Reject?', `Reject ${req.name || req.fullName}?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Reject', style:'destructive', onPress: async () => {
        setProcessing(req._id);
        try {
          type==='driver' ? await api.rejectDriverRequest(req._id) : await api.rejectPassengerRequest(req._id);
          await loadAll();
        } catch (e) { Alert.alert('Error', e.message); }
        finally { setProcessing(null); }
      }},
    ]);

    return (
      <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>Pending {type==='driver'?'Driver':'Passenger'} Requests ({list.length})</Text>
        {list.length === 0
          ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>✅</Text><Text style={s.emptyTxt}>No pending {type} requests.</Text></View>
          : list.map((req, i) => (
              <RequestCard
                key={req._id||i}
                req={{...req, type}}
                onAccept={() => accept(req)}
                onReject={() => reject(req)}
                isProcessing={processing === req._id} />
            ))
        }
      </ScrollView>
    );
  };

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  const PaymentsSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      <View style={s.statsGrid}>
        <StatCard label="Received" value={`Rs. ${stats.paymentsReceived?.toLocaleString?.()||0}`} iconName="account-balance-wallet" />
        <StatCard label="Pending"  value={`Rs. ${stats.paymentsPending?.toLocaleString?.()||0}`}   iconName="pending" />
      </View>
      <View style={s.emptyState}>
        <Text style={{ fontSize:32 }}>💳</Text>
        <Text style={s.emptyTxt}>Detailed payment history coming soon.</Text>
      </View>
    </ScrollView>
  );

  // ─── COMPLAINTS ───────────────────────────────────────────────────────────
  const ComplaintsSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      <Text style={s.sectionLabel}>Complaints ({complaints.length})</Text>
      {complaints.length === 0
        ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>🎉</Text><Text style={s.emptyTxt}>No complaints filed. Keep it up!</Text></View>
        : complaints.map((c, i) => (
            <View key={c._id||i} style={s.card}>
              <View style={[s.cardAccentBar,{ backgroundColor:c.status==='resolved'?C.success:C.error }]} />
              <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
                <Icon name="report-problem" size={18} color={C.error} />
                <Text style={s.cardTitle} numberOfLines={1}>{c.subject || c.title || 'Complaint'}</Text>
              </View>
              <Text style={{ fontSize:13, color:C.textMid, marginBottom:10 }}>{c.description || c.message}</Text>
              {c.passengerName && <View style={s.detailRow}><Icon name="person" size={13} color={C.primaryDark}/><Text style={s.detailTxt}>{c.passengerName}</Text></View>}
              {c.createdAt     && <View style={[s.detailRow,{marginTop:4}]}><Icon name="event" size={13} color={C.primaryDark}/><Text style={s.detailTxt}>{new Date(c.createdAt).toLocaleString()}</Text></View>}
              <View style={[s.chip,{ marginTop:8, backgroundColor:c.status==='resolved'?C.successLight:C.warningLight }]}>
                <Text style={[s.chipTxt,{ color:c.status==='resolved'?C.success:C.warning }]}>{c.status || 'open'}</Text>
              </View>
            </View>
          ))
      }
    </ScrollView>
  );

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  const NotificationsSection = () => (
    <ScrollView style={s.section} contentContainerStyle={{ paddingBottom:24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      showsVerticalScrollIndicator={false}>
      <Text style={s.sectionLabel}>Notifications ({notifications.length})</Text>
      {notifications.length === 0
        ? <View style={s.emptyState}><Text style={{ fontSize:32 }}>🔔</Text><Text style={s.emptyTxt}>No notifications yet.</Text></View>
        : notifications.map((n, i) => (
            <TouchableOpacity
              key={n._id||i}
              style={[s.card, !n.read&&{ borderLeftWidth:4, borderLeftColor:C.primary }]}
              onPress={async () => {
                if (!n.read) {
                  try { await api.markRead(n._id); await loadAll(); } catch {}
                }
              }}
              activeOpacity={0.8}>
              <View style={{ flexDirection:'row', alignItems:'flex-start', gap:12 }}>
                <View style={[s.menuIconWrap,{ backgroundColor:n.read?C.primaryGhost:C.primary, width:38, height:38, borderRadius:10 }]}>
                  <Icon name="notifications" size={18} color={n.read?C.primaryDark:C.black} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={[s.cardTitle,{ fontSize:14, fontWeight:n.read?'600':'800' }]}>
                    {n.title || 'Notification'}
                  </Text>
                  <Text style={{ fontSize:13, color:C.textMid, marginTop:4, lineHeight:18 }}>
                    {n.message || n.body || 'No message content'}
                  </Text>
                  {n.createdAt && (
                    <Text style={{ fontSize:11, color:C.textLight, marginTop:6 }}>
                      {new Date(n.createdAt).toLocaleString('en-PK',{ dateStyle:'medium', timeStyle:'short' })}
                    </Text>
                  )}
                </View>
                {!n.read && <View style={{ width:10, height:10, borderRadius:5, backgroundColor:C.primary, marginTop:6 }} />}
              </View>
            </TouchableOpacity>
          ))
      }
    </ScrollView>
  );

  // ─── SECTION TITLES ───────────────────────────────────────────────────────
  const SECTION_TITLES = {
    'overview':       'Dashboard',
    'profile':        'My Profile',
    'poll':           'Availability Polls',
    'smart-route':    'Smart Routes',
    'routes':         'Routes',
    'assign':         'Assign Driver',
    'tracking':       'Live Tracking',
    'driver-req':     'Driver Requests',
    'pass-req':       'Passenger Requests',
    'payments':       'Payments',
    'complaints':     'Complaints',
    'notifications':  'Notifications',
  };

  const renderSection = () => {
    switch (section) {
      case 'overview':      return <OverviewSection />;
      case 'profile':       return <ProfileSection />;
      case 'poll':          return <PollSection />;
      case 'smart-route':   return <SmartRouteSection />;
      case 'routes':        return <RoutesSection />;
      case 'assign':        return <AssignSection />;
      case 'tracking':      return <TrackingSection />;
      case 'driver-req':    return <RequestSection type="driver" />;
      case 'pass-req':      return <RequestSection type="passenger" />;
      case 'payments':      return <PaymentsSection />;
      case 'complaints':    return <ComplaintsSection />;
      case 'notifications': return <NotificationsSection />;
      default:              return <OverviewSection />;
    }
  };

  // ─── LOADING SCREEN ───────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.loaderScreen}>
      <View style={{ alignItems:'center' }}>
        <View style={s.loaderLogo}><Text style={{ fontSize:32 }}>🚐</Text></View>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop:24 }} />
        <Text style={{ marginTop:14, color:C.textLight, fontWeight:'600', fontSize:14 }}>Loading dashboard...</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setSidebar(!sidebar)} style={s.headerBtn}>
          <Icon name="menu" size={26} color={C.headerText} />
          {totalBadge > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{totalBadge>9?'9+':totalBadge}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex:1, alignItems:'center' }}>
          <Text style={s.headerTitle}>{SECTION_TITLES[section] || 'Dashboard'}</Text>
        </View>
        <TouchableOpacity onPress={() => nav('notifications')} style={s.headerBtn}>
          <Icon name="notifications" size={24} color={C.headerText} />
          {unread > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{unread>9?'9+':unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex:1, backgroundColor:C.offWhite }}>
        {renderSection()}
      </View>

      {/* Sidebar Overlay */}
      {sidebar && (
        <TouchableOpacity
          style={s.sidebarOverlay}
          activeOpacity={1}
          onPress={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <SidebarView />
    </SafeAreaView>
  );
};

// ══════════════════════════════════════════════════════════════════
// STYLESHEET
// ══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root:              { flex:1, backgroundColor:C.offWhite },
  loaderScreen:      { flex:1, backgroundColor:C.white, justifyContent:'center', alignItems:'center' },
  loaderLogo:        { width:80, height:80, borderRadius:20, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', borderWidth:2, borderColor:C.border },
  header:            { backgroundColor:C.headerBg, flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:14, elevation:4, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:4 },
  headerTitle:       { fontSize:17, fontWeight:'900', color:C.white, letterSpacing:0.2 },
  headerBtn:         { padding:6, position:'relative' },
  headerBadge:       { position:'absolute', top:2, right:2, backgroundColor:C.error, borderRadius:9, minWidth:18, height:18, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:C.white },
  headerBadgeTxt:    { fontSize:9, color:C.white, fontWeight:'900' },
  section:           { flex:1, paddingHorizontal:14, paddingTop:14 },
  sectionLabel:      { fontSize:12, fontWeight:'900', color:C.textLight, letterSpacing:1.5, textTransform:'uppercase', marginBottom:10, marginTop:6 },
  sidebar:           { position:'absolute', left:0, top:0, bottom:0, width:280, backgroundColor:C.white, elevation:20, shadowColor:'#000', shadowOffset:{width:2,height:0}, shadowOpacity:0.15, shadowRadius:8, zIndex:100 },
  sidebarOverlay:    { position:'absolute', left:0, top:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.45)', zIndex:99 },
  sidebarHdr:        { backgroundColor:C.headerBg, padding:20, paddingTop:44, flexDirection:'row', alignItems:'center' },
  sidebarName:       { fontSize:15, fontWeight:'900', color:C.white },
  sidebarCo:         { fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 },
  sidebarStatus:     { flexDirection:'row', alignItems:'center', gap:5, marginTop:5 },
  sidebarDot:        { width:7, height:7, borderRadius:4, backgroundColor:C.primary },
  sidebarStatusTxt:  { fontSize:11, color:C.primaryLight, fontWeight:'700' },
  sidebarClose:      { padding:6, marginLeft:'auto' },
  menuItem:          { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, gap:12, position:'relative' },
  menuItemOn:        { backgroundColor:C.primaryGhost },
  menuBar:           { position:'absolute', left:0, top:8, bottom:8, width:3, backgroundColor:C.primary, borderRadius:2 },
  menuIconWrap:      { width:34, height:34, borderRadius:9, backgroundColor:C.offWhite, justifyContent:'center', alignItems:'center' },
  menuIconOn:        { backgroundColor:C.primary },
  menuTxt:           { flex:1, fontSize:14, fontWeight:'600', color:C.textMid },
  menuTxtOn:         { color:C.black, fontWeight:'800' },
  menuBadge:         { backgroundColor:C.error, borderRadius:10, minWidth:20, height:20, justifyContent:'center', alignItems:'center', paddingHorizontal:4 },
  menuBadgeTxt:      { fontSize:10, color:C.white, fontWeight:'900' },
  menuDivider:       { height:1, backgroundColor:C.divider, marginHorizontal:16, marginVertical:8 },
  logoutItem:        { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, gap:12 },
  welcomeCard:       { backgroundColor:C.primary, borderRadius:16, padding:18, marginBottom:14, elevation:3, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.1, shadowRadius:4 },
  welcomeCardInner:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  welcomeGreet:      { fontSize:13, color:C.black, fontWeight:'600', opacity:0.7 },
  welcomeName:       { fontSize:20, fontWeight:'900', color:C.black, marginTop:2 },
  welcomeTime:       { fontSize:11, color:C.black, opacity:0.55, marginTop:3 },
  welcomeStrip:      { flexDirection:'row', justifyContent:'space-around', borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.1)', paddingTop:14 },
  stripVal:          { fontSize:22, fontWeight:'900', color:C.black, textAlign:'center' },
  stripLbl:          { fontSize:11, color:C.black, opacity:0.6, textAlign:'center', marginTop:2 },
  stripDiv:          { width:1, backgroundColor:'rgba(0,0,0,0.12)' },
  alertBanner:       { backgroundColor:C.error, borderRadius:10, flexDirection:'row', alignItems:'center', padding:12, gap:8, marginBottom:10 },
  alertBannerTxt:    { flex:1, color:C.white, fontWeight:'700', fontSize:13 },
  pendingBanner:     { backgroundColor:C.white, borderRadius:10, flexDirection:'row', alignItems:'center', padding:12, gap:10, marginBottom:8, borderWidth:1, borderColor:C.border, elevation:1 },
  pendingDot:        { width:9, height:9, borderRadius:5 },
  pendingBannerTxt:  { flex:1, fontSize:13, fontWeight:'600', color:C.textDark },
  statsGrid:         { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  statCard:          { flex:1, minWidth:(width-52)/2, backgroundColor:C.white, borderRadius:12, padding:14, borderWidth:1.5, borderColor:C.border, elevation:1 },
  statIconWrap:      { width:32, height:32, borderRadius:8, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginBottom:8 },
  statValue:         { fontSize:22, fontWeight:'900', color:C.black },
  statLabel:         { fontSize:11, color:C.textLight, marginTop:2, fontWeight:'600' },
  quickGrid:         { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  quickBtn:          { flex:1, minWidth:(width-52)/2, backgroundColor:C.white, borderRadius:12, padding:14, alignItems:'center', borderWidth:1.5, borderColor:C.border, elevation:1 },
  quickIconWrap:     { width:44, height:44, borderRadius:12, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginBottom:8 },
  quickLabel:        { fontSize:12, fontWeight:'700', color:C.textDark, textAlign:'center' },
  card:              { backgroundColor:C.white, borderRadius:14, padding:14, marginBottom:12, borderWidth:1.5, borderColor:C.border, elevation:2, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:3, overflow:'hidden', position:'relative' },
  cardAccentBar:     { position:'absolute', left:0, top:0, bottom:0, width:4, borderTopLeftRadius:14, borderBottomLeftRadius:14 },
  cardTitle:         { fontSize:15, fontWeight:'800', color:C.textDark, paddingLeft:8 },
  chip:              { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:3, borderRadius:6, backgroundColor:C.primaryGhost, borderWidth:1.5, borderColor:C.border, alignSelf:'flex-start' },
  chipTxt:           { fontSize:11, fontWeight:'700', color:C.primaryDark },
  detailRow:         { flexDirection:'row', alignItems:'center', gap:7 },
  detailTxt:         { fontSize:12, color:C.textMid, flex:1 },
  fuelBadge:         { flexDirection:'row', alignItems:'center', backgroundColor:C.primaryGhost, borderRadius:10, padding:10, marginTop:10, borderWidth:1.5, borderColor:C.border },
  fuelBadgeType:     { fontSize:13, fontWeight:'800', color:C.black },
  fuelBadgeVal:      { fontSize:13, fontWeight:'700', color:C.primaryDark, marginTop:1 },
  fuelBadgeNote:     { fontSize:11, color:C.textLight, marginTop:2 },
  statsRow:          { flexDirection:'row', backgroundColor:C.primaryGhost, borderRadius:10, padding:10, marginBottom:10, borderWidth:1.5, borderColor:C.border },
  statBox:           { flex:1, alignItems:'center', gap:3 },
  statBoxVal:        { fontSize:13, fontWeight:'800', color:C.textDark },
  statBoxLbl:        { fontSize:10, color:C.textLight, fontWeight:'600' },
  statDiv:           { width:1, backgroundColor:C.border },
  scoreBubble:       { width:50, height:50, borderRadius:25, borderWidth:2.5, justifyContent:'center', alignItems:'center', backgroundColor:C.white },
  scoreNum:          { fontSize:16, fontWeight:'900', lineHeight:18 },
  scoreLbl:          { fontSize:9, fontWeight:'700', color:C.textLight },
  vIconWrap:         { width:44, height:44, borderRadius:10, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:C.border },
  srcBadge:          { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:C.offWhite, borderRadius:8, padding:8, marginTop:8, borderWidth:1, borderColor:C.divider },
  srcTxt:            { fontSize:11, color:C.textLight, flex:1 },
  stopsHeader:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:10, marginTop:6, borderTopWidth:1, borderTopColor:C.divider },
  stopsTitle:        { fontSize:13, fontWeight:'800', color:C.textDark, paddingLeft:8 },
  stopRow:           { flexDirection:'row', alignItems:'flex-start', gap:10, paddingVertical:6, paddingLeft:8 },
  stopDot:           { width:10, height:10, borderRadius:5, marginTop:3 },
  stopName:          { fontSize:13, fontWeight:'700', color:C.textDark },
  stopAddr:          { fontSize:11, color:C.textLight, marginTop:1 },
  paxRow:            { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:5, paddingLeft:8 },
  paxAvatar:         { width:30, height:30, borderRadius:15, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:C.border },
  warnBox:           { flexDirection:'row', alignItems:'flex-start', gap:6, backgroundColor:C.warningLight, borderRadius:8, padding:8, marginTop:6, borderWidth:1, borderColor:C.warning },
  warnTxt:           { fontSize:11, color:C.warning, flex:1, fontWeight:'600' },
  optimizingBanner:  { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.primary, borderRadius:10, padding:12, marginBottom:12 },
  optimizingTxt:     { fontSize:13, fontWeight:'700', flex:1 },
  twoBtn:            { flexDirection:'row', gap:10, marginTop:14 },
  btnTxt:            { fontSize:13, fontWeight:'800', color:C.white },
  discardBtn:        { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.error, borderRadius:10, padding:12 },
  rejectBtn:         { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.error, borderRadius:10, padding:12 },
  acceptBtn:         { flex:2, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.primary, borderRadius:10, padding:12 },
  confirmBtnGreen:   { flex:2, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:C.primary, borderRadius:10, padding:12 },
  driverCard:        { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.white, borderRadius:12, padding:12, marginBottom:8, borderWidth:1.5, borderColor:C.border, elevation:1 },
  driverAvatar:      { width:44, height:44, borderRadius:22, backgroundColor:C.primary, justifyContent:'center', alignItems:'center', position:'relative' },
  driverAvatarTxt:   { fontSize:14, fontWeight:'900', color:C.black },
  driverDot:         { position:'absolute', bottom:1, right:1, width:10, height:10, borderRadius:5, borderWidth:1.5, borderColor:C.white },
  driverName:        { fontSize:14, fontWeight:'800', color:C.textDark, flex:1 },
  driverSub:         { fontSize:11, color:C.textLight, marginTop:1 },
  capRow:            { flexDirection:'row', alignItems:'center', gap:8, marginTop:5 },
  capTxt:            { fontSize:11, fontWeight:'700', color:C.textMid, width:30 },
  capBg:             { flex:1, height:5, backgroundColor:C.primaryGhost, borderRadius:3 },
  capFill:           { height:5, borderRadius:3 },
  reqAvatar:         { width:48, height:48, borderRadius:24, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', borderWidth:1.5, borderColor:C.border },
  vBadge:            { flexDirection:'row', alignItems:'center', backgroundColor:C.primaryGhost, borderRadius:10, padding:10, borderWidth:1.5, borderColor:C.border },
  vBadgeLbl:         { fontSize:9, fontWeight:'900', color:C.textLight, letterSpacing:0.8 },
  vBadgeVal:         { fontSize:13, fontWeight:'700', color:C.textDark, marginTop:2 },
  profileDivider:    { height:1, backgroundColor:C.divider, marginVertical:14 },
  profileIconWrap:   { width:28, height:28, borderRadius:7, backgroundColor:C.primaryGhost, justifyContent:'center', alignItems:'center', marginRight:4 },
  input:             { borderWidth:1.5, borderColor:C.border, borderRadius:10, padding:12, fontSize:14, color:C.textDark, backgroundColor:C.white, marginBottom:4 },
  inputLabel:        { fontSize:12, fontWeight:'700', color:C.textMid, marginBottom:6, marginTop:8 },
  trackingOverlay:   { position:'absolute', bottom:20, left:20, right:20, backgroundColor:'rgba(0,0,0,0.7)', borderRadius:12, flexDirection:'row', alignItems:'center', gap:8, padding:12 },
  trackingOverlayTxt:{ color:C.white, fontSize:13, fontWeight:'600', flex:1 },
  emptyState:        { alignItems:'center', paddingVertical:40, gap:10 },
  emptyTxt:          { fontSize:14, color:C.textLight, textAlign:'center', fontWeight:'500', maxWidth:260 },
});

export default TransporterDashboard;