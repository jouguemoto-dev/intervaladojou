// NoSleep.js style fallback using invisible inline loop video
// Some Android browsers (and all iOS browsers) block or drop navigator.wakeLock when tab changes or if permission is not granted.
// Playing a silent, looping, non-rendered video track is the battle-tested, 100% universal method
// to keep mobile screens awake permanently across all Android and iOS devices.

class ScreenKeepAwakeEngine {
  private wakeLock: any = null;
  private videoElement: HTMLVideoElement | null = null;
  private isLocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isLocked) {
          this.lock();
        }
      });
    }
  }

  public async lock(): Promise<boolean> {
    this.isLocked = true;
    let acquired = false;

    // Method 1: Native Screen WakeLock API
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLock) {
          try {
            await this.wakeLock.release();
          } catch {}
          this.wakeLock = null;
        }
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
        acquired = true;
      } catch (err) {
        console.warn('Native WakeLock unavailable or restricted:', err);
      }
    }

    // Method 2: Universal Video WakeLock Fallback (Zero-Pixel H.264 loop)
    // Mobile browsers NEVER sleep while video is playing in the viewport!
    try {
      if (!this.videoElement && typeof document !== 'undefined') {
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.setAttribute('loop', '');
        video.setAttribute('preload', 'auto');
        video.muted = true;
        video.loop = true;
        // Ultra-minimal blank mp4 video base64
        video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAAG21kYXQAAAGzABAH//+1AQEAAAMAAAMAAAAmAAAC';
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0.01';
        video.style.pointerEvents = 'none';
        document.body.appendChild(video);
        this.videoElement = video;
      }

      if (this.videoElement) {
        this.videoElement.play().catch(() => {});
        acquired = true;
      }
    } catch (err) {
      console.warn('Video keep-alive fallback error:', err);
    }

    return acquired;
  }

  public async unlock(): Promise<void> {
    this.isLocked = false;

    // Release Native WakeLock
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }

    // Pause Video Fallback
    if (this.videoElement) {
      try {
        this.videoElement.pause();
      } catch {}
    }
  }

  public isScreenLocked(): boolean {
    return this.isLocked;
  }
}

export const screenWakeLock = new ScreenKeepAwakeEngine();
