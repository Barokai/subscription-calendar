// Utility to detect platform at runtime

export const Platform = {
  get isWeb(): boolean {
    return typeof window !== 'undefined' && !this.isReactNative;
  },
  get isReactNative(): boolean {
    return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  },
  get isServer(): boolean {
    return typeof window === 'undefined';
  },
  // Return a string identifying the platform for conditional UI
  get name(): string {
    if (this.isReactNative) return 'react-native';
    if (this.isWeb) return 'web';
    return 'server';
  }
};
