import { GpsRunMetrics, PhaseType } from '../types/workout';

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
  if (meters < 15 || totalSeconds < 5) return '--:-- /km';
  const km = meters / 1000;
  const secondsPerKm = totalSeconds / km;

  if (secondsPerKm > 3600) return '--:-- /km'; // Stationary or extremely slow

  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.floor(secondsPerKm % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} /km`;
}

export class GpsTrackerEngine {
  private watchId: number | null = null;
  private lastCoord: Coordinate | null = null;
  private totalDistanceMeters = 0;
  private latestSpeedKmh = 0;
  private latestAccuracy: number | null = null;
  private status: GpsRunMetrics['gpsStatus'] = 'searching';

  private isSimulated = false;
  private simulationInterval: any = null;
  private currentPhaseForSim: PhaseType = 'warmup';

  private listeners: ((metrics: GpsRunMetrics) => void)[] = [];

  public startTracking(preferSimulation = false) {
    this.totalDistanceMeters = 0;
    this.lastCoord = null;
    this.latestSpeedKmh = 0;

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

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed } = position.coords;
          const now = position.timestamp || Date.now();

          this.latestAccuracy = accuracy;

          // Reject inaccurate GPS points (e.g. accuracy > 35m) to prevent jumpy noise
          if (accuracy > 35) {
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

            // Filter out micro-jitter when standing still (less than 1.5m)
            if (dist >= 1.5) {
              this.totalDistanceMeters += dist;
            }
          }

          // Use browser reported speed or fallback
          if (speed !== null && speed >= 0) {
            this.latestSpeedKmh = speed * 3.6;
          }

          this.lastCoord = {
            lat: latitude,
            lng: longitude,
            accuracy,
            timestamp: now,
          };

          this.notify();
        },
        (error) => {
          console.warn('GPS Error or Permission Denied:', error);
          if (error.code === error.PERMISSION_DENIED) {
            this.status = 'denied';
          } else {
            this.status = 'disabled';
          }
          this.notify();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        }
      );
    } catch {
      this.status = 'disabled';
      this.notify();
    }
  }

  public updateCurrentPhaseForSim(phase: PhaseType) {
    this.currentPhaseForSim = phase;
  }

  public startSimulatedGps() {
    this.stopTracking();
    this.isSimulated = true;
    this.status = 'simulated';
    this.latestAccuracy = 4;

    this.simulationInterval = setInterval(() => {
      // Speed according to phase (m/s)
      let speedMs = 2.5; // ~9 km/h trot
      if (this.currentPhaseForSim === 'high_intensity') {
        speedMs = 4.2; // ~15.1 km/h sprint
      } else if (this.currentPhaseForSim === 'walk') {
        speedMs = 1.4; // ~5.0 km/h walk
      } else if (this.currentPhaseForSim === 'rest') {
        speedMs = 0;
      }

      this.latestSpeedKmh = speedMs * 3.6;
      this.totalDistanceMeters += speedMs;
      this.notify();
    }, 1000);

    this.notify();
  }

  public stopTracking() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulated = false;
  }

  public getMetrics(totalElapsedSeconds: number): GpsRunMetrics {
    return {
      distanceMeters: this.totalDistanceMeters,
      formattedDistance: formatDistanceHuman(this.totalDistanceMeters),
      currentSpeedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
      averagePaceMinKm: formatPaceMinKm(this.totalDistanceMeters, totalElapsedSeconds),
      gpsStatus: this.status,
      accuracyMeters: this.latestAccuracy,
    };
  }

  public subscribe(callback: (metrics: GpsRunMetrics) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    // Notify subscribers
    const dummyElapsed = 1;
    const metrics = this.getMetrics(dummyElapsed);
    for (const listener of this.listeners) {
      listener(metrics);
    }
  }
}
