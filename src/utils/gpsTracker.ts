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
  if (meters < 10 || totalSeconds < 3) return '--:-- /km';
  const km = meters / 1000;
  const secondsPerKm = totalSeconds / km;

  if (secondsPerKm > 3600) return '--:-- /km'; // Parado ou excessivamente lento (> 60 min/km)

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

  private isSimulated = false;
  private simulationInterval: any = null;
  private currentPhaseForSim: PhaseType = 'warmup';

  private listeners: ((metrics: GpsRunMetrics) => void)[] = [];

  public startTracking(preferSimulation = false) {
    this.stopTracking();
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

    // 1. Immediately request single initial fix to trigger browser/mobile permission prompt promptly
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
          maximumAge: 10000,
        }
      );
    } catch (e) {
      console.warn('getCurrentPosition error:', e);
    }

    // 2. Start active watchPosition
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
          maximumAge: 2000,
        }
      );
    } catch {
      this.status = 'disabled';
      this.notify();
    }

    // 3. Fallback polling every 4 seconds in case watchPosition idles or stalls on background mobile Chrome/Safari
    this.fallbackPollId = setInterval(() => {
      if (this.isSimulated || this.status === 'denied' || this.status === 'disabled') return;
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.processPosition(pos),
          () => {}, // ignore occasional poll timeout
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 5000,
          }
        );
      }
    }, 4000);
  }

  private processPosition(position: GeolocationPosition) {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const now = position.timestamp || Date.now();

    this.latestAccuracy = accuracy;

    // Se a precisão for pior que 80 metros, marcamos como searching temporariamente
    // mas não travamos se já tivermos um ponto prévio
    if (accuracy > 80 && !this.lastCoord) {
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

      const timeDeltaSeconds = Math.max(0.5, (now - this.lastCoord.timestamp) / 1000);

      // Calcular velocidade derivada caso o browser reporte speed nulo
      const calculatedSpeedMs = dist / timeDeltaSeconds;

      // Filtrar ruído:
      // - Descartar se for jitter parado (menos de 1 metro com precisão razoável)
      // - Descartar salto impossível para humano correndo (> 45 km/h ou 12.5 m/s) com acurácia baixa
      const isTeleportAnomaly = calculatedSpeedMs > 15 && accuracy > 30;

      if (dist >= 1.2 && !isTeleportAnomaly) {
        this.totalDistanceMeters += dist;

        if (speed !== null && speed >= 0) {
          this.latestSpeedKmh = speed * 3.6;
        } else {
          this.latestSpeedKmh = Math.min(35, calculatedSpeedMs * 3.6);
        }
      } else if (dist < 1.2 && (speed === null || speed === 0)) {
        // Atleta parado
        this.latestSpeedKmh = 0;
      }
    } else {
      if (speed !== null && speed >= 0) {
        this.latestSpeedKmh = speed * 3.6;
      }
    }

    this.lastCoord = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp: now,
    };

    this.notify();
  }

  private handleGpsError(error: GeolocationPositionError) {
    console.warn('GPS Error:', error);
    if (error.code === error.PERMISSION_DENIED) {
      this.status = 'denied';
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      this.status = 'disabled';
    } else {
      // Timeout temporário: continua buscando
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

    this.simulationInterval = setInterval(() => {
      // Velocidade estimada conforme o tipo da fase esportiva
      let speedMs = 2.5; // ~9.0 km/h corrida leve / trote
      if (this.currentPhaseForSim === 'high_intensity') {
        speedMs = 4.3; // ~15.5 km/h tiro forte
      } else if (this.currentPhaseForSim === 'warmup') {
        speedMs = 2.2; // ~7.9 km/h aquecimento
      } else if (this.currentPhaseForSim === 'walk') {
        speedMs = 1.4; // ~5.0 km/h caminhada
      } else if (this.currentPhaseForSim === 'rest') {
        speedMs = 0; // parado
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
    const metrics = this.getMetrics(1);
    for (const listener of this.listeners) {
      listener(metrics);
    }
  }
}
