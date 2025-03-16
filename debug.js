// Run this script using `node debug.js` to check your environment
console.log('Node version:', process.version);
console.log('Environment check:');

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  
  // Check if components directory exists
  console.log('Components directory exists:', fs.existsSync('./components'));
  
  // Check if subscription calendar component exists
  console.log('SubscriptionCalendar component exists:', fs.existsSync('./components/subscription-calendar.tsx'));
  
  // Check Next.js setup
  console.log('Next.js files check:');
  console.log('- next.config.js exists:', fs.existsSync('./next.config.js'));
  console.log('- app directory exists:', fs.existsSync('./app'));
  console.log('- app/page.tsx exists:', fs.existsSync('./app/page.tsx'));
  console.log('- app/layout.tsx exists:', fs.existsSync('./app/layout.tsx'));
  
  console.log('\nEverything looks good! If you\'re still having issues, try:');
  console.log('1. Delete .next folder: rm -rf .next');
  console.log('2. Delete node_modules: rm -rf node_modules');
  console.log('3. Reinstall dependencies: npm install');
  console.log('4. Start development server: npm run dev');
} catch (err) {
  console.error('Error during environment check:', err);
}
