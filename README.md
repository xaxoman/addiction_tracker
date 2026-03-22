# Break Free - Addiction Tracker

A modern Progressive Web App (PWA) built with React, TypeScript, and Ionic Capacitor to help users track and overcome their addictions. Monitor your progress, visualize your savings, and stay motivated on your journey to freedom.

## 🚀 Features

- **Addiction Tracking**: Monitor your progress in breaking free from various addictions
- **Progress Visualization**: View your journey with intuitive charts and statistics
- **Savings Calculator**: Calculate money saved by overcoming costly habits
- **PWA Support**: Install as a native app on mobile and desktop
- **Cross-Platform**: Runs as web app, Android app, and iOS app
- **Offline Support**: Works offline with service worker caching
- **Haptic Feedback**: Native haptic feedback on mobile devices
- **Dark/Light Theme**: Adaptive theming with system preference detection
- **Modern UI**: Clean, responsive design built with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite with PWA plugin
- **Mobile Framework**: Ionic Capacitor
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Workbox service worker
- **Native Features**: Haptics, Status Bar, Splash Screen, Keyboard management

## 📋 Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd project
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Create a production build with PWA:
```bash
npm run build:pwa
```

Preview the production build:
```bash
npm run preview
```

## 📱 Mobile Development

### Android Development

1. Build and sync to Android:
```bash
npm run build:android
```

2. Run on Android device with live reload:
```bash
npm run dev:mobile
```

3. Build APK:
- Open Android Studio from the project
- Build > Build Bundle(s) / APK(s) > Build APK(s)

### iOS Development (macOS only)

1. Install iOS platform:
```bash
npm install @capacitor/ios
npx cap add ios
```

2. Build and sync to iOS:
```bash
npm run build:ios
```

## 🧪 Code Quality

Run ESLint to check code quality:
```bash
npm run lint
```

## 📱 PWA Features

The app includes PWA (Progressive Web App) capabilities:
- Theme color configuration
- Responsive design for mobile devices
- Optimized for various screen sizes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions, please open an issue in the repository.

---
