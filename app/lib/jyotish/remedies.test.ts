import { describe, it, expect } from 'vitest'
import { getHouseLord, getOwnedHouses, getFunctionalNature } from './remedies'

// SIGNS index reference: Aries=0, Taurus=1, Gemini=2, Cancer=3, Leo=4,
// Virgo=5, Libra=6, Scorpio=7, Sagittarius=8, Capricorn=9, Aquarius=10, Pisces=11

describe('getHouseLord', () => {
  it('Aries lagna: 1st house is ruled by Mars', () => {
    expect(getHouseLord(1, 0)).toBe('Mars')
  })

  it('Aries lagna: 7th house (Libra) is ruled by Venus', () => {
    expect(getHouseLord(7, 0)).toBe('Venus')
  })

  it('Cancer lagna: 1st house is ruled by Moon', () => {
    expect(getHouseLord(1, 3)).toBe('Moon')
  })
})

describe('getOwnedHouses', () => {
  it('Aries lagna: Mars owns houses 1 and 8', () => {
    expect(getOwnedHouses('Mars', 0).sort()).toEqual([1, 8])
  })

  it('Libra lagna: Saturn owns houses 4 and 5', () => {
    expect(getOwnedHouses('Saturn', 6).sort()).toEqual([4, 5])
  })
})

describe('getFunctionalNature', () => {
  it('classifies a lagna-lord as yogakaraka', () => {
    // Aries lagna, Mars rules the 1st house directly.
    expect(getFunctionalNature('Mars', 0)).toBe('yogakaraka')
  })

  it('classifies Saturn as yogakaraka for Libra lagna (rules 4th kendra + 5th trikona)', () => {
    // The textbook example of a non-lagna-lord yogakaraka.
    expect(getFunctionalNature('Saturn', 6)).toBe('yogakaraka')
  })

  it('classifies a dusthana-only ruler as malefic', () => {
    // Pisces lagna: Sun rules only the 6th house (a dusthana).
    expect(getFunctionalNature('Sun', 11)).toBe('malefic')
  })

  it('classifies a planet owning no houses as neutral', () => {
    // No planet rules zero houses in a real chart, but the function should
    // degrade gracefully rather than throw if it ever happened.
    expect(getFunctionalNature('NotAPlanet', 0)).toBe('neutral')
  })
})
