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

  if (secondsPerKm > 3600) return '--:-- /km'; // Stopped or extremely slow (> 60 min/km)

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

  // Anti-Drift and Stationary Jitter Suppression
  private isPaused = false;
  private isStationary = true;
  private stationaryAnchor: Coordinate | null = null;
  private consecutiveMovementTicks = 0;
  private consecutiveStationaryTicks = 0;
  private lastPositionReceivedAt = 0;

  private listeners: ((metrics: GpsRunMetrics) => void)[] = [];

  public startTracking(preferSimulation = false) {
    this.stopTracking();
    this.totalDistanceMeters = 0;
    this.lastCoord = null;
    this.latestSpeedKmh = 0;
    this.trackPoints = [];
    this.lastRecordedTime = 0;
    this.isStationary = true;
    this.stationaryAnchor = null;
    this.consecutiveMovementTicks = 0;
    this.consecutiveStationaryTicks = 0;
    this.lastPositionReceivedAt = 0;
    this.isPaused = false;

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

    // 1. Initial fix request
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
          maximumAge: 4000,
        }
      );
    } catch (e) {
      console.warn('getCurrentPosition error:', e);
    }

    // 2. Active watchPosition stream
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

    // 3. Keep-alive watchdog fallback:
    // Only fires if watchPosition has gone completely silent for > 8 seconds
    // to prevent concurrent overlapping GPS calls that cause artificial coordinate jitter.
    this.fallbackPollId = setInterval(() => {
      if (this.isSimulated || this.status === 'denied' || this.status === 'disabled' || this.isPaused) return;
      const now = Date.now();
      if (now - this.lastPositionReceivedAt < 8000) return;

      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.processPosition(pos),
          () => {},
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 3000,
          }
        );
      }
    }, 5000);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.latestSpeedKmh = 0;
      this.isStationary = true;
      if (this.lastCoord) {
        this.stationaryAnchor = { ...this.lastCoord };
      }
      this.notify();
    }
  }

  private processPosition(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const now = position.timestamp || Date.now();
    this.lastPositionReceivedAt = Date.now();

    this.latestAccuracy = accuracy;

    // Discard stale or duplicate timestamps
    if (this.lastCoord && position.timestamp && position.timestamp <= this.lastCoord.timestamp) {
      return;
    }

    // Filter out very poor satellite signals (accuracy > 45m)
    if (accuracy > 45 && !this.lastCoord) {
      this.status = 'searching';
      this.notify();
      return;
    }

    this.status = 'active';

    // If workout is paused, DO NOT accumulate distance or track points
    if (this.isPaused) {
      this.latestSpeedKmh = 0;
      this.isStationary = true;
      this.lastCoord = {
        lat: latitude,
        lng: longitude,
        accuracy,
        timestamp: now,
      };
      this.stationaryAnchor = { ...this.lastCoord };
      this.notify();
      return;
    }

    if (this.lastCoord) {
      const distFromLast = calculateHaversineDistance(
        this.lastCoord.lat,
        this.lastCoord.lng,
        latitude,
        longitude
      );

      const timeDeltaSeconds = Math.max(0.3, (now - this.lastCoord.timestamp) / 1000);
      const calculatedSpeedMs = distFromLast / timeDeltaSeconds;

      // Hardware speed evaluation:
      // Modern mobile devices provide position.coords.speed in m/s
      const hasHardwareSpeed = speed !== null && speed !== undefined && !isNaN(speed) && speed >= 0;
      const hwSpeedMs = hasHardwareSpeed ? (speed as number) : null;

      // Device indicates stopped if hardware speed is below 0.65 m/s (~2.3 km/h)
      // or if calculated displacement speed is below 0.75 m/s (~2.7 km/h) and distance < 6m
      const indicatesStopped =
        (hwSpeedMs !== null && hwSpeedMs < 0.65) ||
        (calculatedSpeedMs < 0.75 && distFromLast < 6.0);

      // Discard impossible teleport / multipath reflection anomalies (> 12 m/s or ~43.2 km/h)
      const isTeleportAnomaly = calculatedSpeedMs > 12.0 && accuracy > 12;

      // ANTI-DRIFT STATIONARY ANCHOR FILTER:
      // Eliminates false distance accumulation when user is standing still, resting, or indoors.
      if (this.isStationary) {
        if (!this.stationaryAnchor) {
          this.stationaryAnchor = { ...this.lastCoord };
        }

        const distFromAnchor = calculateHaversineDistance(
          this.stationaryAnchor.lat,
          this.stationaryAnchor.lng,
          latitude,
          longitude
        );

        // Dynamic breakout radius: must travel outside satellite uncertainty bubble (min 8m, max 25m)
        const breakoutRadius = Math.max(8.0, Math.min(25.0, (accuracy || 10) * 0.9));
        const hasBreakoutSpeed =
          (hwSpeedMs !== null && hwSpeedMs >= 0.8) || calculatedSpeedMs >= 0.85;

        if (distFromAnchor > breakoutRadius && hasBreakoutSpeed && !isTeleportAnomaly) {
          this.consecutiveMovementTicks++;
          // Require 2 consecutive movement signals to confirm true departure from stationary position
          if (this.consecutiveMovementTicks >= 2) {
            this.isStationary = false;
            this.stationaryAnchor = null;
            this.consecutiveMovementTicks = 0;
            this.consecutiveStationaryTicks = 0;

            // Legitimate running movement confirmed!
            this.totalDistanceMeters += distFromLast;
            this.latestSpeedKmh =
              hwSpeedMs !== null ? hwSpeedMs * 3.6 : Math.min(30, calculatedSpeedMs * 3.6);

            this.lastCoord = { lat: latitude, lng: longitude, accuracy, timestamp: now };
            this.recordTrackPoint(latitude, longitude, now);
          } else {
            this.latestSpeedKmh = 0;
          }
        } else {
          // Stationary: ZERO distance added, speed is 0.0 km/h
          this.consecutiveMovementTicks = 0;
          this.latestSpeedKmh = 0;
          // Gently update anchor coordinate if user is resting with strong fix
          if (accuracy < 12) {
            this.lastCoord = { lat: latitude, lng: longitude, accuracy, timestamp: now };
          }
        }
      } else {
        // User is currently moving
        if (indicatesStopped) {
          this.consecutiveStationaryTicks++;
          if (this.consecutiveStationaryTicks >= 2 || (hwSpeedMs !== null && hwSpeedMs < 0.4)) {
            // User came to a stop
            this.isStationary = true;
            this.stationaryAnchor = { lat: latitude, lng: longitude, accuracy, timestamp: now };
            this.latestSpeedKmh = 0;
            this.consecutiveStationaryTicks = 0;
            this.consecutiveMovementTicks = 0;
            this.lastCoord = { lat: latitude, lng: longitude, accuracy, timestamp: now };
          } else {
            this.latestSpeedKmh = 0;
          }
        } else if (!isTeleportAnomaly && distFromLast >= 2.0) {
          // Genuine running/jogging/walking step
          this.consecutiveStationaryTicks = 0;
          this.totalDistanceMeters += distFromLast;

          if (hwSpeedMs !== null) {
            this.latestSpeedKmh = hwSpeedMs * 3.6;
          } else {
            this.latestSpeedKmh = Math.min(32, calculatedSpeedMs * 3.6);
          }

          this.lastCoord = { lat: latitude, lng: longitude, accuracy, timestamp: now };
          this.recordTrackPoint(latitude, longitude, now);
        }
      }
    } else {
      // First coordinate registered
      if (speed !== null && speed >= 0) {
        this.latestSpeedKmh = speed * 3.6;
      }
      this.lastCoord = {
        lat: latitude,
        lng: longitude,
        accuracy,
        timestamp: now,
      };
      this.stationaryAnchor = { ...this.lastCoord };
      this.isStationary = speed === null || speed < 0.65;

      this.recordTrackPoint(latitude, longitude, now);
    }

    this.notify();
  }

  private recordTrackPoint(lat: number, lng: number, timestamp: number) {
    if (timestamp - this.lastRecordedTime >= 2500 || this.trackPoints.length === 0) {
      this.trackPoints.push({
        lat,
        lng,
        timestamp,
        phase: this.currentPhaseForSim,
        speedKmh: Math.round(this.latestSpeedKmh * 10) / 10,
      });
      this.lastRecordedTime = timestamp;
    }
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
      if (this.isPaused) {
        this.latestSpeedKmh = 0;
        this.notify();
        return;
      }

      // Estimated running pace per interval block
      let speedMs = 2.6; // ~9.4 km/h trote leve
      if (this.currentPhaseForSim === 'high_intensity') {
        speedMs = 4.4; // ~15.8 km/h tiro forte
      } else if (this.currentPhaseForSim === 'warmup') {
        speedMs = 2.2; // ~7.9 km/h aquecimento
      } else if (this.currentPhaseForSim === 'walk') {
        speedMs = 1.4; // ~5.0 km/h caminhada
      } else if (this.currentPhaseForSim === 'rest') {
        speedMs = 0; // Pausa / descanso parado: velocidade 0 e distância 0
      }

      this.latestSpeedKmh = speedMs * 3.6;
      this.totalDistanceMeters += speedMs;

      if (speedMs > 0) {
        // Curve path slightly like a running track or park loop
        this.simHeading += (Math.random() - 0.48) * 0.08;
        // ~1 meter in latitude is approx 0.000009 degrees
        const deltaLat = (speedMs * Math.cos(this.simHeading)) / 111111;
        const deltaLng =
          (speedMs * Math.sin(this.simHeading)) /
          (111111 * Math.cos((this.simLat * Math.PI) / 180));

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
      currentCoord: this.lastCoord
        ? { lat: this.lastCoord.lat, lng: this.lastCoord.lng }
        : this.isSimulated
        ? { lat: this.simLat, lng: this.simLng }
        : undefined,
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
