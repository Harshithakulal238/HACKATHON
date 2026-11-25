import { getAnalytics } from '../services/analyticsService.js'

export async function overview(request, response) {
  const analytics = await getAnalytics(request.user.museumId, request.query)
  response.status(200).json({ analytics })
}
