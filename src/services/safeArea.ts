import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

export class SafeAreaService {
  private static instance: SafeAreaService;

  private constructor() {}

  public static getInstance(): SafeAreaService {
    if (!SafeAreaService.instance) {
      SafeAreaService.instance = new SafeAreaService();
    }
    return SafeAreaService.instance;
  }

  /**
   * Initialize safe area handling
   */
  public async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Get status bar info and adjust padding
      await this.adjustForStatusBar();
      
      // Listen for orientation changes
      window.addEventListener('orientationchange', () => {
        setTimeout(() => this.adjustForStatusBar(), 100);
      });

      console.log('Safe area service initialized');
    } catch (error) {
      console.error('Error initializing safe area service:', error);
    }
  }

  /**
   * Adjust padding for status bar
   */
  private async adjustForStatusBar(): Promise<void> {
    try {
      const info = await StatusBar.getInfo();
      
      // Get the status bar height (usually 24px on most Android devices)
      let statusBarHeight = 0;
      
      if (Capacitor.getPlatform() === 'android') {
        // For Android, we can estimate or use a fixed value
        statusBarHeight = 24; // Standard Android status bar height in dp
        
        // Convert dp to px based on device pixel ratio
        const scale = window.devicePixelRatio || 1;
        statusBarHeight = statusBarHeight * scale;
      } else if (Capacitor.getPlatform() === 'ios') {
        // For iOS, the safe area is usually handled better by CSS
        statusBarHeight = info.visible ? 44 : 0; // iOS status bar height
      }

      // Apply padding to the root element or header
      this.applySafeAreaPadding(statusBarHeight);
      
    } catch (error) {
      console.warn('Could not get status bar info:', error);
      // Fallback: apply standard padding
      this.applySafeAreaPadding(24);
    }
  }

  /**
   * Apply safe area padding to elements
   */
  private applySafeAreaPadding(topPadding: number): void {
    // Apply to custom CSS variable
    document.documentElement.style.setProperty('--safe-area-inset-top', `${topPadding}px`);
    
    // Apply to body class for conditional styling
    document.body.classList.add('has-safe-area');
    
    // Apply directly to header if CSS variables don't work
    const header = document.querySelector('header');
    if (header) {
      header.style.paddingTop = `${topPadding + 16}px`; // 16px base padding + status bar
    }
  }

  /**
   * Get current safe area insets
   */
  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    // Try to get from CSS environment variables
    const computedStyle = getComputedStyle(document.documentElement);
    
    return {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0')
    };
  }
}

// Export singleton instance
export const safeAreaService = SafeAreaService.getInstance();
