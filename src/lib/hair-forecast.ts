export interface HairForecast {
  shortTitle: string;
  actionableAdvice: string;
}

export function getHairForecast(weather: {
  humidity: number;
  windSpeed: number;
  precipProb: number;
  temp: number;
}): HairForecast {
  const { humidity, windSpeed, precipProb } = weather;

  // Priority 1: Rain
  if (precipProb > 30) {
    return {
      shortTitle: "Rain Ruin Risk",
      actionableAdvice: "Protect your style — pack an umbrella or opt for a secure updo.",
    };
  }

  // Priority 2: Wind
  if (windSpeed > 15) {
    return {
      shortTitle: "Tangle Warning",
      actionableAdvice: "Tie it up! Strong winds will knot loose hair fast.",
    };
  }

  // Priority 3: Humidity
  if (humidity > 85) {
    return {
      shortTitle: "Extreme Frizz Alert",
      actionableAdvice: "Battle mode: anti-frizz serum and an updo are your best friends.",
    };
  }

  if (humidity > 60) {
    return {
      shortTitle: "Frizz Warning",
      actionableAdvice: "High humidity — smooth serum or a bun will save the day.",
    };
  }

  if (humidity < 40) {
    return {
      shortTitle: "Static Alert",
      actionableAdvice: "Dry air = static. Use a hydrating leave-in before heading out.",
    };
  }

  // Priority 4: Ideal conditions
  return {
    shortTitle: "Great Hair Day!",
    actionableAdvice: "Conditions are ideal — wear it down and own it.",
  };
}
