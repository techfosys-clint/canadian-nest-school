import { expect, it } from 'vitest'
import { parseDeliveryAddress, formatDeliveryAddress } from './shippingAddress'

const address = {
  street: 'House 12, Road 5', area: 'Dhanmondi', city: 'Dhaka',
  district: 'Dhaka', division: 'Dhaka', postalCode: '১২০৯', landmark: '', country: 'Bangladesh',
}

it('accepts Bangladesh addresses and normalizes Bengali postal digits', () => {
  const parsed = parseDeliveryAddress(address)!
  expect(parsed.postalCode).toBe('1209')
  expect(formatDeliveryAddress(parsed)).toContain('Dhaka, 1209, Bangladesh')
  expect(parseDeliveryAddress({ ...address, postalCode: '' })).not.toBeNull()
})

it('rejects incomplete addresses, unsupported countries and invalid postal codes', () => {
  expect(parseDeliveryAddress({ ...address, street: '' })).toBeNull()
  expect(parseDeliveryAddress({ ...address, country: 'Canada' })).toBeNull()
  expect(parseDeliveryAddress({ ...address, division: 'Unknown' })).toBeNull()
  expect(parseDeliveryAddress({ ...address, postalCode: '12345' })).toBeNull()
})
