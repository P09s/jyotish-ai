// Shared classical Jyotish reference data — sign lords, Yogakaraka logic, and
// Navaratna gemstone remedies. Single source of truth so dasha-fal and chat
// routes can never drift out of sync on gemstone/house-lordship rules.

export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

export const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}

export const KENDRA = [1,4,7,10]
export const TRIKONA = [1,5,9]
export const DUSTHANA = [6,8,12]
export const CLASSICAL_PLANETS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

export function getHouseLord(houseNum: number, lagnaSignIdx: number): string {
  const signIdx = (lagnaSignIdx + houseNum - 1) % 12
  return SIGN_LORD[SIGNS[signIdx]]
}

export function getOwnedHouses(planetName: string, lagnaSignIdx: number): number[] {
  const owned: number[] = []
  for (let h = 1; h <= 12; h++) if (getHouseLord(h, lagnaSignIdx) === planetName) owned.push(h)
  return owned
}

// Yogakaraka concept (BPHS) — a planet's real gemstone suitability depends on
// which houses it RULES for this specific Lagna, not on which dasha is running.
export function getFunctionalNature(planetName: string, lagnaSignIdx: number): 'yogakaraka' | 'benefic' | 'neutral' | 'malefic' {
  const owned = getOwnedHouses(planetName, lagnaSignIdx)
  if (owned.length === 0) return 'neutral'
  const rulesLagna   = owned.includes(1)
  const rulesKendra  = owned.some(h => KENDRA.includes(h))
  const rulesTrikona = owned.some(h => TRIKONA.includes(h))
  const onlyDusthana = owned.every(h => DUSTHANA.includes(h))
  if (rulesLagna) return 'yogakaraka'
  if (rulesKendra && rulesTrikona) return 'yogakaraka'
  if (rulesTrikona) return 'benefic'
  if (onlyDusthana) return 'malefic'
  return 'neutral'
}

export interface Remedy {
  gemstone: string; gemstoneSanskrit: string; substitute: string
  color: string; day: string; mantra: string; charity: string; caution: string
}

// Gemstones — especially Blue Sapphire (Saturn), Hessonite (Rahu) and Cat's Eye
// (Ketu) — are classically considered powerful and can backfire if wrong for the
// person, so every entry includes a lower-cost substitute stone and a caution to
// trial it and consult a qualified astrologer before committing to the primary gem.
export const REMEDIES: Record<string, Remedy> = {
  Sun:     { gemstone: 'Ruby',            gemstoneSanskrit: 'Manikya',         substitute: 'Red Garnet or Red Spinel', color: 'Red, Orange, Copper',     day: 'Sunday',    mantra: 'Om Suryaya Namaha',      charity: 'Wheat, jaggery, or copper items to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Ruby, and confirm fit with an astrologer first.' },
  Moon:    { gemstone: 'Pearl',           gemstoneSanskrit: 'Moti',            substitute: 'Moonstone',                color: 'White, Cream, Silver',     day: 'Monday',    mantra: 'Om Chandraya Namaha',    charity: 'Rice, milk, or white clothes to those in need',    caution: 'Trial the substitute stone for a few weeks before wearing Pearl, and confirm fit with an astrologer first.' },
  Mars:    { gemstone: 'Red Coral',       gemstoneSanskrit: 'Moonga',          substitute: 'Carnelian',                color: 'Red',                      day: 'Tuesday',   mantra: 'Om Angarakaya Namaha',   charity: 'Red lentils (masoor dal) or jaggery to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Red Coral, and confirm fit with an astrologer first.' },
  Mercury: { gemstone: 'Emerald',         gemstoneSanskrit: 'Panna',           substitute: 'Peridot or Green Onyx',    color: 'Green',                    day: 'Wednesday', mantra: 'Om Budhaya Namaha',      charity: 'Green moong dal or green clothes to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Emerald, and confirm fit with an astrologer first.' },
  Jupiter: { gemstone: 'Yellow Sapphire', gemstoneSanskrit: 'Pukhraj',         substitute: 'Yellow Topaz or Citrine',  color: 'Yellow, Gold',             day: 'Thursday',  mantra: 'Om Brihaspataye Namaha', charity: 'Turmeric, chana dal, or yellow items to those in need', caution: 'Trial the substitute stone for a few weeks before wearing Yellow Sapphire, and confirm fit with an astrologer first.' },
  Venus:   { gemstone: 'Diamond',         gemstoneSanskrit: 'Heera',           substitute: 'White Sapphire or Zircon', color: 'White, Pastel Pink',      day: 'Friday',    mantra: 'Om Shukraya Namaha',     charity: 'Rice, sugar, or white/pastel clothes to those in need', caution: 'A high-value stone — most people trial the substitute first and consult a qualified astrologer before committing to a Diamond.' },
  Saturn:  { gemstone: 'Blue Sapphire',   gemstoneSanskrit: 'Neelam',          substitute: 'Amethyst',                 color: 'Dark Blue, Black',        day: 'Saturday',  mantra: 'Om Shanicharaya Namaha', charity: 'Black sesame, mustard oil, or iron items to those in need', caution: 'Classical texts consider Blue Sapphire the most powerful and unpredictable gem — always trial the substitute for a few weeks first, and only wear it under a qualified astrologer\'s guidance.' },
  Rahu:    { gemstone: 'Hessonite',       gemstoneSanskrit: 'Gomed',           substitute: 'Orange Zircon',            color: 'Smoky, Multicolor',       day: 'Saturday',  mantra: 'Om Rahave Namaha',       charity: 'Mustard seeds or blankets to those in need', caution: 'A shadow-planet gemstone — best worn only after a trial period and consultation with a qualified astrologer.' },
  Ketu:    { gemstone: "Cat's Eye",       gemstoneSanskrit: 'Vaidurya / Lehsunia', substitute: 'Tiger Eye',            color: 'Grey, Brown, Multicolor', day: 'Tuesday',   mantra: 'Om Ketave Namaha',       charity: 'Sesame seeds or blankets to those in need', caution: 'A shadow-planet gemstone — best worn only after a trial period and consultation with a qualified astrologer.' },
}