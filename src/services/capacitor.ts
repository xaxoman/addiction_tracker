import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';

export class CapacitorService {
  private static instance: CapacitorService;

  private constructor() {}

  public static getInstance(): CapacitorService {
    if (!CapacitorService.instance) {
      CapacitorService.instance = new CapacitorService();
    }
    return CapacitorService.instance;
  }

  /**
   * Initialize Capacitor services
   */
  public async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Initialize status bar
      await this.initializeStatusBar();
      
      // Initialize splash screen
      await this.initializeSplashScreen();
      
      // Initialize app listeners
      this.initializeAppListeners();
      
      // Initialize keyboard listeners
      this.initializeKeyboardListeners();
      
      console.log('Capacitor services initialized successfully');
    } catch (error) {
      console.error('Error initializing Capacitor services:', error);
    }
  }

  /**
   * Check if running on a native platform
   */
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get platform information
   */
  public getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Provide haptic feedback
   */
  public async vibrate(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
    if (!this.isNative()) return;
    
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }

  /**
   * Set status bar style based on theme
   */
  public async setStatusBarStyle(isDark: boolean): Promise<void> {
    if (!this.isNative()) return;

    try {
      await StatusBar.setStyle({
        style: isDark ? Style.Dark : Style.Light
      });
    } catch (error) {
      console.warn('Status bar style not available:', error);
    }
  }

  /**
   * Show/hide status bar
   */
  public async setStatusBarVisibility(visible: boolean): Promise<void> {
    if (!this.isNative()) return;

    try {
      if (visible) {
        await StatusBar.show();
      } else {
        await StatusBar.hide();
      }
    } catch (error) {
      console.warn('Status bar visibility control not available:', error);
    }
  }
  private async initializeStatusBar(): Promise<void> {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1f2937' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  }

  private async initializeSplashScreen(): Promise<void> {
    // Hide splash screen after a delay
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 2000);
  }

  private initializeAppListeners(): void {
    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
      // You can add custom logic here, like pausing timers when app goes to background
    });

    // Handle app URL open (for deep linking)
    App.addListener('appUrlOpen', (event) => {
      console.log('App opened with URL:', event.url);
      // Handle deep links here
    });

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }

  private initializeKeyboardListeners(): void {
    // Handle keyboard show/hide events
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show with height:', info.keyboardHeight);
      // Adjust UI for keyboard
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
      // Reset UI
      document.body.style.paddingBottom = '0px';
    });
  }

  /**
   * Show keyboard
   */
  public async showKeyboard(): Promise<void> {
    if (!this.isNative()) return;
    
    try {
      await Keyboard.show();
    } catch (error) {
      console.warn('Cannot show keyboard:', error);
    }
  }

  /**
   * Hide keyboard
   */
  public async hideKeyboard(): Promise<void> {
    if (!this.isNative()) return;
    
    try {
      await Keyboard.hide();
    } catch (error) {
      console.warn('Cannot hide keyboard:', error);
    }
  }
}

// Export singleton instance
export const capacitorService = CapacitorService.getInstance();
