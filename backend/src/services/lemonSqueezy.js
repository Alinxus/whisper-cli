import axios from 'axios';

// Create Lemon Squeezy API instance
export const lemonSqueezyApiInstance = axios.create({
  baseURL: 'https://api.lemonsqueezy.com/v1',
  headers: {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`
  }
});

// Add request interceptor for logging
lemonSqueezyApiInstance.interceptors.request.use(
  (config) => {
    console.log(`[Lemon Squeezy] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Lemon Squeezy] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
lemonSqueezyApiInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[Lemon Squeezy] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default lemonSqueezyApiInstance;
