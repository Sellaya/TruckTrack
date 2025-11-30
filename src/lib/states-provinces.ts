/**
 * US States and Canadian Provinces with abbreviations
 */

export interface StateProvince {
  name: string;
  abbreviation: string;
}

export const US_STATES: StateProvince[] = [
  { name: 'Alabama', abbreviation: 'AL' },
  { name: 'Alaska', abbreviation: 'AK' },
  { name: 'Arizona', abbreviation: 'AZ' },
  { name: 'Arkansas', abbreviation: 'AR' },
  { name: 'California', abbreviation: 'CA' },
  { name: 'Colorado', abbreviation: 'CO' },
  { name: 'Connecticut', abbreviation: 'CT' },
  { name: 'Delaware', abbreviation: 'DE' },
  { name: 'Florida', abbreviation: 'FL' },
  { name: 'Georgia', abbreviation: 'GA' },
  { name: 'Hawaii', abbreviation: 'HI' },
  { name: 'Idaho', abbreviation: 'ID' },
  { name: 'Illinois', abbreviation: 'IL' },
  { name: 'Indiana', abbreviation: 'IN' },
  { name: 'Iowa', abbreviation: 'IA' },
  { name: 'Kansas', abbreviation: 'KS' },
  { name: 'Kentucky', abbreviation: 'KY' },
  { name: 'Louisiana', abbreviation: 'LA' },
  { name: 'Maine', abbreviation: 'ME' },
  { name: 'Maryland', abbreviation: 'MD' },
  { name: 'Massachusetts', abbreviation: 'MA' },
  { name: 'Michigan', abbreviation: 'MI' },
  { name: 'Minnesota', abbreviation: 'MN' },
  { name: 'Mississippi', abbreviation: 'MS' },
  { name: 'Missouri', abbreviation: 'MO' },
  { name: 'Montana', abbreviation: 'MT' },
  { name: 'Nebraska', abbreviation: 'NE' },
  { name: 'Nevada', abbreviation: 'NV' },
  { name: 'New Hampshire', abbreviation: 'NH' },
  { name: 'New Jersey', abbreviation: 'NJ' },
  { name: 'New Mexico', abbreviation: 'NM' },
  { name: 'New York', abbreviation: 'NY' },
  { name: 'North Carolina', abbreviation: 'NC' },
  { name: 'North Dakota', abbreviation: 'ND' },
  { name: 'Ohio', abbreviation: 'OH' },
  { name: 'Oklahoma', abbreviation: 'OK' },
  { name: 'Oregon', abbreviation: 'OR' },
  { name: 'Pennsylvania', abbreviation: 'PA' },
  { name: 'Rhode Island', abbreviation: 'RI' },
  { name: 'South Carolina', abbreviation: 'SC' },
  { name: 'South Dakota', abbreviation: 'SD' },
  { name: 'Tennessee', abbreviation: 'TN' },
  { name: 'Texas', abbreviation: 'TX' },
  { name: 'Utah', abbreviation: 'UT' },
  { name: 'Vermont', abbreviation: 'VT' },
  { name: 'Virginia', abbreviation: 'VA' },
  { name: 'Washington', abbreviation: 'WA' },
  { name: 'West Virginia', abbreviation: 'WV' },
  { name: 'Wisconsin', abbreviation: 'WI' },
  { name: 'Wyoming', abbreviation: 'WY' },
];

export const CANADIAN_PROVINCES: StateProvince[] = [
  { name: 'Alberta', abbreviation: 'AB' },
  { name: 'British Columbia', abbreviation: 'BC' },
  { name: 'Manitoba', abbreviation: 'MB' },
  { name: 'New Brunswick', abbreviation: 'NB' },
  { name: 'Newfoundland and Labrador', abbreviation: 'NL' },
  { name: 'Northwest Territories', abbreviation: 'NT' },
  { name: 'Nova Scotia', abbreviation: 'NS' },
  { name: 'Nunavut', abbreviation: 'NU' },
  { name: 'Ontario', abbreviation: 'ON' },
  { name: 'Prince Edward Island', abbreviation: 'PE' },
  { name: 'Quebec', abbreviation: 'QC' },
  { name: 'Saskatchewan', abbreviation: 'SK' },
  { name: 'Yukon', abbreviation: 'YT' },
];

export type Country = 'USA' | 'Canada';

export function getStateProvincesByCountry(country: Country): StateProvince[] {
  return country === 'USA' ? US_STATES : CANADIAN_PROVINCES;
}

export function getStateProvinceLabel(country: Country): string {
  return country === 'USA' ? 'State' : 'Province';
}

