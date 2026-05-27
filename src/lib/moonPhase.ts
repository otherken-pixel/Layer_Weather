export type MoonPhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

export interface MoonPhaseInfo {
  name: MoonPhaseName;
  /** 0–1, fraction of the lunar cycle elapsed */
  age: number;
  /** 0–100 illumination percentage */
  illumination: number;
  /** Days until next full moon */
  daysToFull: number;
  /** Days until next new moon */
  daysToNew: number;
}

export interface UpcomingPhase {
  name: MoonPhaseName;
  date: Date;
  emoji: string;
}

const LUNAR_CYCLE = 29.53058867;
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();

function lunarAge(date: Date): number {
  const elapsed = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  return ((elapsed % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE;
}

function phaseFromAge(age: number): MoonPhaseName {
  const p = age / LUNAR_CYCLE;
  if (p < 0.033 || p >= 0.967) return "New Moon";
  if (p < 0.192) return "Waxing Crescent";
  if (p < 0.225) return "First Quarter";
  if (p < 0.467) return "Waxing Gibbous";
  if (p < 0.533) return "Full Moon";
  if (p < 0.742) return "Waning Gibbous";
  if (p < 0.775) return "Last Quarter";
  return "Waning Crescent";
}

function illuminationFromAge(age: number): number {
  const p = age / LUNAR_CYCLE;
  return Math.round((1 - Math.cos(2 * Math.PI * p)) / 2 * 100);
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const age = lunarAge(date);
  const daysToFull = age <= LUNAR_CYCLE / 2
    ? LUNAR_CYCLE / 2 - age
    : LUNAR_CYCLE - age + LUNAR_CYCLE / 2;
  const daysToNew = LUNAR_CYCLE - age;

  return {
    name: phaseFromAge(age),
    age,
    illumination: illuminationFromAge(age),
    daysToFull: Math.round(daysToFull),
    daysToNew: Math.round(daysToNew),
  };
}

const PHASE_EMOJIS: Record<MoonPhaseName, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

export function getMoonPhaseEmoji(name: MoonPhaseName): string {
  return PHASE_EMOJIS[name];
}

const MAJOR_PHASE_AGES = [0, LUNAR_CYCLE / 4, LUNAR_CYCLE / 2, (LUNAR_CYCLE * 3) / 4];
const MAJOR_PHASE_NAMES: MoonPhaseName[] = [
  "New Moon",
  "First Quarter",
  "Full Moon",
  "Last Quarter",
];

export function getUpcomingPhases(count: number = 4, from: Date = new Date()): UpcomingPhase[] {
  const age = lunarAge(from);
  const results: UpcomingPhase[] = [];

  for (let cycle = 0; results.length < count; cycle++) {
    for (let i = 0; i < 4 && results.length < count; i++) {
      const targetAge = MAJOR_PHASE_AGES[i];
      const daysIntoCurrentCycle = age % LUNAR_CYCLE;
      let daysAway = targetAge - daysIntoCurrentCycle + cycle * LUNAR_CYCLE;
      if (daysAway <= 0.5) daysAway += LUNAR_CYCLE;

      const phaseDate = new Date(from.getTime() + daysAway * 86_400_000);
      results.push({
        name: MAJOR_PHASE_NAMES[i],
        date: phaseDate,
        emoji: PHASE_EMOJIS[MAJOR_PHASE_NAMES[i]],
      });
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count);
}
