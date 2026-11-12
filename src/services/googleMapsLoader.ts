/**
 * Google Maps JavaScript API Client Loader
 * 
 * Safely loads Google Maps JS SDK using VITE_GOOGLE_MAPS_API_KEY.
 * Provides a singleton Promise that avoids duplicate script injections.
 */

let loadPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMapsScript(): Promise<typeof google.maps> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available for Google Maps'));
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return reject(new Error('VITE_GOOGLE_MAPS_API_KEY is missing from environment.'));
    }

    // Check if script already exists in document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(checkInterval);
          resolve((window as any).google.maps);
        }
      }, 50);
      return;
    }

    const callbackName = `__initGoogleMaps_${Date.now()}`;
    (window as any)[callbackName] = () => {
      delete (window as any)[callbackName];
      resolve((window as any).google.maps);
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      delete (window as any)[callbackName];
      loadPromise = null;
      reject(new Error(`Failed to load Google Maps JavaScript API script: ${err}`));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

