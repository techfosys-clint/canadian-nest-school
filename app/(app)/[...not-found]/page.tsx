import { notFound } from 'next/navigation'

/**
 * Catch-all so unmatched URLs trigger the (app) not-found UI.
 * Route-group `not-found.tsx` alone only handles explicit notFound() calls.
 */
export default function CatchAllNotFound() {
  notFound()
}
