/**
 * lib/greeting.ts
 *
 * Dynamic Greeting Service for REEC Dashboard.
 *
 * Requirements:
 * 1. Morning (5am - 12pm): "Good morning, [Name]"
 * 2. Afternoon (12pm - 5pm): "Good afternoon, [Name]"
 * 3. Evening (5pm - 5am): "Good evening, [Name]"
 * 4. Only when users haven't logged in for a long time (>3 days): "Good to see you back, [Name]"
 * 5. Guest mode: Never show "Good to see you back" — show time-based greeting or "Welcome to REEC, Explorer".
 */

export function getFallbackGreeting(
  name: string | null | undefined,
  isLoggedIn: boolean
): { greeting: string; targetName: string; isLongAbsence: boolean } {
  const fallbackGuest = "Explorer";
  const effectiveName =
    name && name.trim().length > 0 ? name.trim() : isLoggedIn ? "Engineer" : fallbackGuest;
  return {
    greeting: "Good day,",
    targetName: effectiveName,
    isLongAbsence: false,
  };
}

export function getDynamicGreeting(
  isLoggedIn: boolean,
  name: string | null | undefined,
  userId?: string | null
): { greeting: string; targetName: string; isLongAbsence: boolean } {
  const fallbackGuest = "Explorer";
  const effectiveName = name && name.trim().length > 0 ? name.trim() : isLoggedIn ? "Engineer" : fallbackGuest;

  if (!isLoggedIn) {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
    } else if (hour >= 17 || hour < 5) {
      timeGreeting = "Good evening";
    }
    return {
      greeting: `${timeGreeting},`,
      targetName: effectiveName,
      isLongAbsence: false,
    };
  }

  // Check last active time for long absence detection (> 72 hours / 3 days)
  let isLongAbsence = false;
  if (typeof window !== "undefined" && userId) {
    const storageKey = `reec_last_seen_${userId}`;
    const prevSeenStr = localStorage.getItem(storageKey);
    const now = Date.now();

    if (prevSeenStr) {
      const prevSeen = parseInt(prevSeenStr, 10);
      if (!isNaN(prevSeen)) {
        const diffHours = (now - prevSeen) / (1000 * 60 * 60);
        // More than 72 hours (3 days) is considered a long time
        if (diffHours >= 72) {
          isLongAbsence = true;
        }
      }
    }

    // Update last seen to now (debounced by updating once per session/hour)
    localStorage.setItem(storageKey, String(now));
  }

  if (isLongAbsence) {
    return {
      greeting: "Good to see you back,",
      targetName: effectiveName,
      isLongAbsence: true,
    };
  }

  const hour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    timeGreeting = "Good afternoon";
  } else if (hour >= 17 || hour < 5) {
    timeGreeting = "Good evening";
  }

  return {
    greeting: `${timeGreeting},`,
    targetName: effectiveName,
    isLongAbsence: false,
  };
}
