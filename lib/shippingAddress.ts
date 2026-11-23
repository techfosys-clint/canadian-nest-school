export const bangladeshDivisions = ['Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'] as const

export interface DeliveryAddress {
  street: string
  area: string
  city: string
  district: string
  division: string
  postalCode: string
  landmark: string
  country: 'Bangladesh'
}

export function parseDeliveryAddress(value: unknown): DeliveryAddress | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const fields = ['street', 'area', 'city', 'district', 'division', 'postalCode', 'landmark'] as const
  if (fields.some(field => data[field] !== undefined && typeof data[field] !== 'string')) return null
  const address = Object.fromEntries(fields.map(field => [field, String(data[field] ?? '').trim()])) as unknown as DeliveryAddress
  if (fields.some(field => address[field].length > 250)) return null
  if (!address.street || !address.area || !address.city || !address.district ||
      !bangladeshDivisions.some(division => division === address.division)) return null
  address.postalCode = address.postalCode.replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
  if (address.postalCode && !/^\d{4}$/.test(address.postalCode)) return null
  if (data.country !== 'Bangladesh') return null
  return { ...address, country: 'Bangladesh' }
}

export function formatDeliveryAddress(address: DeliveryAddress): string {
  return [address.street, address.area, address.city, address.district,
    address.division, address.postalCode, address.country,
    address.landmark ? 'Landmark: ' + address.landmark : ''].filter(Boolean).join(', ')
}
