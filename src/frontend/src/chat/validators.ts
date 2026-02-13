export function validateAddress(address: string): { valid: boolean; error?: string } {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, error: 'Address cannot be empty' };
  }
  if (trimmed.length < 5) {
    return { valid: false, error: 'Please provide a complete address' };
  }
  return { valid: true };
}

export function validateContactInfo(contactInfo: string): { valid: boolean; error?: string } {
  const trimmed = contactInfo.trim();
  if (!trimmed) {
    return { valid: false, error: 'Contact information cannot be empty' };
  }
  
  // Check if it looks like an email or phone
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /[\d\s\-\(\)\+]{7,}/;
  
  if (!emailRegex.test(trimmed) && !phoneRegex.test(trimmed)) {
    return { valid: false, error: 'Please provide a valid email or phone number' };
  }
  
  return { valid: true };
}

export function validateTimeWindow(timeWindow: string): { valid: boolean; error?: string; parsed?: { start: bigint; end: bigint } } {
  const trimmed = timeWindow.trim().toLowerCase();
  
  const timeWindows: Record<string, { start: number; end: number }> = {
    'morning': { start: 8, end: 12 },
    'afternoon': { start: 12, end: 17 },
    'evening': { start: 17, end: 20 },
    'asap': { start: 8, end: 20 }, // Full day window for ASAP
  };
  
  if (timeWindows[trimmed]) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(timeWindows[trimmed].start, 0, 0, 0);
    
    const start = BigInt(tomorrow.getTime() * 1_000_000);
    const endDate = new Date(tomorrow);
    endDate.setHours(timeWindows[trimmed].end, 0, 0, 0);
    const end = BigInt(endDate.getTime() * 1_000_000);
    
    return { valid: true, parsed: { start, end } };
  }
  
  return { valid: false, error: 'Please select a valid time window (morning, afternoon, evening, or asap)' };
}

export function validateBookingId(input: string): { valid: boolean; error?: string; parsed?: bigint } {
  const trimmed = input.trim();
  
  // Support both numeric IDs and BK-prefixed format
  let numericPart = trimmed;
  
  if (trimmed.toLowerCase().startsWith('bk')) {
    numericPart = trimmed.substring(2).replace(/\D/g, '');
  } else {
    numericPart = trimmed.replace(/\D/g, '');
  }
  
  if (!numericPart) {
    return { valid: false, error: 'Please provide a valid booking ID (e.g., BK10245 or 10245)' };
  }
  
  try {
    const parsed = BigInt(numericPart);
    if (parsed <= 0) {
      return { valid: false, error: 'Booking ID must be a positive number' };
    }
    return { valid: true, parsed };
  } catch {
    return { valid: false, error: 'Invalid booking ID format' };
  }
}
