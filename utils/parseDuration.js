// utils/parseDuration.js

export function parseISO8601Duration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
    const hours = parseInt(match?.[1] || 0, 10);
    const minutes = parseInt(match?.[2] || 0, 10);
    const seconds = parseInt(match?.[3] || 0, 10);
  
    const parts = [];
  
    if (hours > 0) parts.push(hours);
    parts.push(hours > 0 ? String(minutes).padStart(2, '0') : minutes);
    parts.push(String(seconds).padStart(2, '0'));
  
    return parts.join(':');
  }
  