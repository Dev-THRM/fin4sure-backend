// CommonJS wrapper entrypoint for Hostinger / Phusion Passenger
import('./index.js').catch((err) => {
  console.error("Failed to load backend ES Module (index.js):", err);
});
