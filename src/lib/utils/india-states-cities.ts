import { State, City } from 'country-state-city';

// Get all states of India
export const STATES = State.getStatesOfCountry('IN').map(state => state.name).sort();

// Get cities by state name
export function getCitiesByState(stateName: string): string[] {
  const state = State.getStatesOfCountry('IN').find(s => s.name === stateName);
  if (!state) return [];
  
  return City.getCitiesOfState('IN', state.isoCode)
    .map(city => city.name)
    .sort();
}

// Country codes for phone input
export const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
];
