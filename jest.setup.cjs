const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch for Stripe in Jest
global.fetch = global.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))); 