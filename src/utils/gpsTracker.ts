import { GpsRunMetrics, PhaseType, TrackPoint } from '../types/workout';

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function formatDistanceHuman(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatPaceMinKm(meters: number, totalSeconds: number): string {
  if (meters < 15 || totalSeconds < 3) return '--:-- /km';
  const km = meters / 1000;
  const secondsPerKm = totalSeconds / km;

  if (secondsPerKm > 3600) return '--:-- /km'; // Parado ou muito lento (> 60 min/km)

  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} /km`;
}

export class GpsTrackerEngine {
  private watchId: number | null = null;
  private fallbackPollId: any = null;
  private lastCoord: Coordinate | null = null;
  private totalDistanceMeters = 0;
  private latestSpeedKmh = 0;
  private latestAccuracy: number | null = null;
  private status: GpsRunMetrics['gpsStatus'] = 'searching';

  private trackPoints: TrackPoint[] = [];
  private lastRecordedTime = 0;

  private isSimulated = false;
  private simulationInterval: any = null;
  private currentPhaseForSim: PhaseType = 'warmup';
  private simLat = -23.55052; // Base reference point (São Paulo)
  private simLng = -46.633308;
  private simHeading = 0.5; // Radians

  private listeners: ((metrics: GpsRunMetrics) => void)[] = [];

  public startTracking(preferSimulation = false) {
    this.stopTracking();
    this.totalDistanceMeters = 0;
    this.lastCoord = null;
    this.latestSpeedKmh = 0;
    this.trackPoints = [];
    this.lastRecordedTime = 0;

    if (preferSimulation) {
      this.startSimulatedGps();
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      this.status = 'disabled';
      this.notify();
      return;
    }

    this.status = 'searching';
    this.notify();

    // 1. Immediately request initial fix with fallback for cached / fast location
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.processPosition(pos);
        },
        (err) => {
          this.handleGpsError(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    } catch (e) {
      console.warn('getCurrentPosition error:', e);
    }

    // 2. Start active watchPosition with high accuracy and fast refresh
    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.processPosition(position);
        },
        (error) => {
          this.handleGpsError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 1000,
        }
      );
    } catch {
      this.status = 'disabled';
      this.notify();
    }

    // 3. Robust background mobile fallback polling:
    // When screen locks or browser tab loses focus, mobile OS might throttle watchPosition.
    // Periodic getCurrentPosition keeps the hardware GPS antenna active and feeds missed distance.
    this.fallbackPollId = setInterval(() => {
      if (this.isSimulated || this.status === 'denied' || this.status === 'disabled') return;
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.processPosition(pos),
          () => {}, // ignore occasional timeout
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 2000,
          }
        );
      }
    }, 3000);
  }

  private processPosition(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const now = position.timestamp || Date.now();

    this.latestAccuracy = accuracy;

    // Filter out very poor satellite signals (accuracy > 65m) to avoid erratic jumps
    if (accuracy > 65 && !this.lastCoord) {
      this.status = 'searching';
      this.notify();
      return;
    }

    this.status = 'active';

    if (this.lastCoord) {
      const dist = calculateHaversineDistance(
        this.lastCoord.lat,
        this.lastCoord.lng,
        latitude,
        longitude
      );

      const timeDeltaSeconds = Math.max(0.2, (now - this.lastCoord.timestamp) / 1000);
      const calculatedSpeedMs = dist / timeDeltaSeconds;

      // Smart noise and GPS drift filter:
      // 1. Min movement threshold: ignore tiny stationary noise (below 1.8 meters)
      // 2. Max plausible human running speed: discard teleports (> 11.5 m/s or ~41 km/h) unless high precision
      const isTeleportAnomaly = calculatedSpeedMs > 12 && accuracy > 20;
      const isNoise = dist < Math.max(1.8, (accuracy || 10) * 0.25);

      if (!isNoise && !isTeleportAnomaly) {
        this.totalDistanceMeters += dist;

        if (speed !== null && speed >= 0) {
          this.latestSpeedKmh = speed * 3.6;
        } else {
          this.latestSpeedKmh = Math.min(32, calculatedSpeedMs * 3.6);
        }

        this.lastCoord = {
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: now,
        };

        // Record point for route trail every ~2.5 seconds or 8 meters
        if (now - this.lastRecordedTime >= 2500 || dist >= 8) {
          this.trackPoints.push({
            lat: latitude,
            lng: longitude,
            timestamp: now,
            phase: this.currentPhaseForSim,
            speedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
          });
          this.lastRecordedTime = now;
        }
      } else if (dist < 1.5 && (speed === null || speed === 0)) {
        // Runner paused or stopped
        this.latestSpeedKmh = 0;
      }
    } else {
      if (speed !== null && speed >= 0) {
        this.latestSpeedKmh = speed * 3.6;
      }
      this.lastCoord = {
        lat: latitude,
        lng: longitude,
        accuracy,
        timestamp: now,
      };

      this.trackPoints.push({
        lat: latitude,
        lng: longitude,
        timestamp: now,
        phase: this.currentPhaseForSim,
        speedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
      });
      this.lastRecordedTime = now;
    }

    this.notify();
  }

  private handleGpsError(error: GeolocationPositionError) {
    console.warn('GPS Error:', error);
    if (error.code === error.PERMISSION_DENIED) {
      this.status = 'denied';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      this.status = 'disabled';
    } else {
      if (this.status !== 'active') {
        this.status = 'searching';
      }
    }
    this.notify();
  }

  public updateCurrentPhaseForSim(phase: PhaseType) {
    this.currentPhaseForSim = phase;
  }

  public startSimulatedGps() {
    this.stopTracking();
    this.isSimulated = true;
    this.status = 'simulated';
    this.latestAccuracy = 3;
    this.simLat = -23.55052;
    this.simLng = -46.633308;
    this.simHeading = 0.5;

    // Initial point
    this.trackPoints.push({
      lat: this.simLat,
      lng: this.simLng,
      timestamp: Date.now(),
      phase: this.currentPhaseForSim,
      speedKmh: 9.0,
    });

    this.simulationInterval = setInterval(() => {
      // Estimated running pace per interval block
      let speedMs = 2.6; // ~9.4 km/h trote leve
      if (this.currentPhaseForSim === 'high_intensity') {
        speedMs = 4.4; // ~15.8 km/h tiro forte
      } else if (this.currentPhaseForSim === 'warmup') {
        speedMs = 2.2; // ~7.9 km/h aquecimento
      } else if (this.currentPhaseForSim === 'walk') {
        speedMs = 1.4; // ~5.0 km/h caminhada
      } else if (this.currentPhaseForSim === 'rest') {
        speedMs = 0;
      }

      this.latestSpeedKmh = speedMs * 3.6;
      this.totalDistanceMeters += speedMs;

      if (speedMs > 0) {
        // Curve path slightly like a running track or park loop
        this.simHeading += (Math.random() - 0.48) * 0.08;
        // ~1 meter in latitude is approx 0.000009 degrees
        const deltaLat = (speedMs * Math.cos(this.simHeading)) / 111111;
        const deltaLng = (speedMs * Math.sin(this.simHeading)) / (111111 * Math.cos((this.simLat * Math.PI) / 180));

        this.simLat += deltaLat;
        this.simLng += deltaLng;

        this.trackPoints.push({
          lat: this.simLat,
          lng: this.simLng,
          timestamp: Date.now(),
          phase: this.currentPhaseForSim,
          speedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
        });
      }

      this.notify();
    }, 1000);

    this.notify();
  }

  public stopTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.fallbackPollId) {
      clearInterval(this.fallbackPollId);
      this.fallbackPollId = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulated = false;
  }

  public getMetrics(totalElapsedSeconds: number): GpsRunMetrics {
    return {
      distanceMeters: Math.round(this.totalDistanceMeters * 10) / 10,
      formattedDistance: formatDistanceHuman(this.totalDistanceMeters),
      currentSpeedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
      averagePaceMinKm: formatPaceMinKm(this.totalDistanceMeters, totalElapsedSeconds),
      gpsStatus: this.status,
      accuracyMeters: this.latestAccuracy,
      trackPoints: [...this.trackPoints],
    };
  }

  public subscribe(callback: (metrics: GpsRunMetrics) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const metrics = this.getMetrics(1);
    for (const listener of this.listeners) {
      listener(metrics);
    }
  }
}
