// Main export file for shared code

// Export core types and functions
export * from './subscription-logic';

// Export hooks (will work in any React environment)
export * from './hooks/useStorage';

// Export utilities
export * from './utils/platform';
export * from './utils/date-helpers';

// Note: Storage adapters aren't exported directly as they're loaded dynamically
// based on the platform detection in useStorage.ts
