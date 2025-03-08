import { z } from 'zod'

// Define schemas for Google Places API responses
const placeSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  formatted_address: z.string(),
  types: z.array(z.string()),
  price_level: z.number().optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().optional(),
  geometry: z.object({
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  }),
  photos: z
    .array(
      z.object({
        photo_reference: z.string(),
        height: z.number(),
        width: z.number(),
      }),
    )
    .optional(),
  website: z.string().optional(),
  url: z.string().optional(), // Google Maps URL
})

const placesResponseSchema = z.object({
  results: z.array(placeSchema),
  status: z.string(),
  next_page_token: z.string().optional(),
})

export type Place = z.infer<typeof placeSchema>
export type PlacesResponse = z.infer<typeof placesResponseSchema>

/**
 * Search for restaurants near a location
 */
export async function searchNearbyRestaurants({
  latitude,
  longitude,
  radius = 5000, // Default 5km radius
  type = 'restaurant',
  minPrice,
  maxPrice,
  minRating,
  pageToken,
}: {
  latitude: number
  longitude: number
  radius?: number
  type?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  pageToken?: string
}): Promise<PlacesResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    throw new Error('Google Places API key is not set')
  }

  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${apiKey}`

  if (pageToken) {
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${pageToken}&key=${apiKey}`
  }

  const response = await fetch(url)
  const data = await response.json()

  try {
    const parsed = placesResponseSchema.parse(data)
    
    // Filter results if needed
    let results = parsed.results

    if (minPrice !== undefined) {
      results = results.filter(place => 
        place.price_level !== undefined && place.price_level >= minPrice
      )
    }

    if (maxPrice !== undefined) {
      results = results.filter(place => 
        place.price_level !== undefined && place.price_level <= maxPrice
      )
    }

    if (minRating !== undefined) {
      results = results.filter(place => 
        place.rating !== undefined && place.rating >= minRating
      )
    }

    return {
      ...parsed,
      results,
    }
  } catch (error) {
    console.error('Error parsing Google Places API response:', error)
    throw new Error('Invalid response from Google Places API')
  }
}

/**
 * Get photo URL from photo reference
 */
export function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  
  if (!apiKey) {
    throw new Error('Google Places API key is not set')
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`
}

/**
 * Calculate walking distance in minutes (approximate)
 * Average walking speed is about 5 km/h or 1.4 m/s
 */
export function calculateWalkingTimeMinutes(
  distanceMeters: number
): number {
  // Average walking speed: 1.4 m/s
  const walkingSpeedMps = 1.4
  const timeSeconds = distanceMeters / walkingSpeedMps
  return Math.round(timeSeconds / 60)
} 