import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'

function parseDate(value, field) {
  if (value === undefined) {
    return null
  }
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  ) {
    throw createHttpError(400, `${field} must use YYYY-MM-DD format.`)
  }
  return value
}

export async function getAnalytics(museumId, query) {
  const from = parseDate(query.from, 'from')
  const to = parseDate(query.to, 'to')
  if (from && to && from > to) {
    throw createHttpError(400, 'from must not be later than to.')
  }
  const parameters = [museumId, from, to]

  const [
    tourResult,
    eventResult,
    languageResult,
    exhibitResult,
    feedbackResult,
  ] = await Promise.all([
    databasePool.query(
      `SELECT COUNT(*)::integer AS "totalTours",
              COUNT(*) FILTER (WHERE status = 'completed')::integer AS "completedTours"
       FROM public.visitor_sessions
       WHERE museum_id = $1
         AND ($2::date IS NULL OR created_at >= $2::date)
         AND ($3::date IS NULL OR created_at < $3::date + INTERVAL '1 day')`,
      parameters,
    ),
    databasePool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'EXHIBIT_SCANNED')::integer AS "exhibitScans",
         COUNT(*) FILTER (WHERE event_type = 'EXHIBIT_SKIPPED')::integer AS "skippedExhibits",
         COUNT(*) FILTER (WHERE event_type = 'ROUTE_UPDATED')::integer AS "routeChanges",
         COUNT(*) FILTER (WHERE event_type = 'AUDIO_STARTED')::integer AS "audioStarts",
         COUNT(*) FILTER (WHERE event_type = 'AUDIO_COMPLETED')::integer AS "audioCompletions"
       FROM public.visitor_events AS event
       JOIN public.visitor_sessions AS session ON session.id = event.session_id
       WHERE session.museum_id = $1
         AND ($2::date IS NULL OR event.created_at >= $2::date)
         AND ($3::date IS NULL OR event.created_at < $3::date + INTERVAL '1 day')`,
      parameters,
    ),
    databasePool.query(
      `SELECT event.language, COUNT(*)::integer AS count
       FROM public.visitor_events AS event
       JOIN public.visitor_sessions AS session ON session.id = event.session_id
       WHERE session.museum_id = $1
         AND event.event_type = 'LANGUAGE_SELECTED'
         AND event.language IS NOT NULL
         AND ($2::date IS NULL OR event.created_at >= $2::date)
         AND ($3::date IS NULL OR event.created_at < $3::date + INTERVAL '1 day')
       GROUP BY event.language
       ORDER BY event.language`,
      parameters,
    ),
    databasePool.query(
      `SELECT exhibit.id::text AS id, exhibit.name,
              (SELECT COUNT(*)::integer
               FROM public.visitor_events AS event
               JOIN public.visitor_sessions AS session ON session.id = event.session_id
               WHERE event.exhibit_id = exhibit.id
                 AND event.event_type = 'EXHIBIT_SCANNED'
                 AND session.museum_id = $1
                 AND ($2::date IS NULL OR event.created_at >= $2::date)
                 AND ($3::date IS NULL OR event.created_at < $3::date + INTERVAL '1 day')
              ) AS "scanCount",
              (SELECT COUNT(*)::integer
               FROM public.visitor_events AS event
               JOIN public.visitor_sessions AS session ON session.id = event.session_id
               WHERE event.exhibit_id = exhibit.id
                 AND event.event_type = 'AUDIO_STARTED'
                 AND session.museum_id = $1
                 AND ($2::date IS NULL OR event.created_at >= $2::date)
                 AND ($3::date IS NULL OR event.created_at < $3::date + INTERVAL '1 day')
              ) AS "audioStarts",
              (SELECT COUNT(*)::integer
               FROM public.visitor_events AS event
               JOIN public.visitor_sessions AS session ON session.id = event.session_id
               WHERE event.exhibit_id = exhibit.id
                 AND event.event_type = 'AUDIO_COMPLETED'
                 AND session.museum_id = $1
                 AND ($2::date IS NULL OR event.created_at >= $2::date)
                 AND ($3::date IS NULL OR event.created_at < $3::date + INTERVAL '1 day')
              ) AS "audioCompletions",
              (SELECT AVG(feedback.rating)::numeric(4, 2)
               FROM public.visitor_feedback AS feedback
               JOIN public.visitor_sessions AS session ON session.id = feedback.session_id
               WHERE feedback.exhibit_id = exhibit.id
                 AND session.museum_id = $1
                 AND ($2::date IS NULL OR feedback.created_at >= $2::date)
                 AND ($3::date IS NULL OR feedback.created_at < $3::date + INTERVAL '1 day')
              ) AS "averageRating",
              (SELECT COUNT(*)::integer
               FROM public.visitor_feedback AS feedback
               JOIN public.visitor_sessions AS session ON session.id = feedback.session_id
               WHERE feedback.exhibit_id = exhibit.id
                 AND session.museum_id = $1
                 AND ($2::date IS NULL OR feedback.created_at >= $2::date)
                 AND ($3::date IS NULL OR feedback.created_at < $3::date + INTERVAL '1 day')
              ) AS "feedbackCount"
       FROM public.exhibits AS exhibit
       WHERE exhibit.museum_id = $1
       ORDER BY "scanCount" DESC, exhibit.name`,
      parameters,
    ),
    databasePool.query(
      `SELECT COUNT(*)::integer AS count,
              AVG(feedback.rating)::numeric(4, 2) AS "averageRating"
       FROM public.visitor_feedback AS feedback
       JOIN public.visitor_sessions AS session ON session.id = feedback.session_id
       WHERE session.museum_id = $1
         AND ($2::date IS NULL OR feedback.created_at >= $2::date)
         AND ($3::date IS NULL OR feedback.created_at < $3::date + INTERVAL '1 day')`,
      parameters,
    ),
  ])

  const tours = tourResult.rows[0]
  const events = eventResult.rows[0]
  const audioStarts = events.audioStarts
  return {
    totalTours: tours.totalTours,
    completedTours: tours.completedTours,
    completionRate:
      tours.totalTours === 0
        ? null
        : Number(((tours.completedTours / tours.totalTours) * 100).toFixed(1)),
    exhibitScans: events.exhibitScans,
    skippedExhibits: events.skippedExhibits,
    routeChanges: events.routeChanges,
    audioStarts,
    audioCompletions: events.audioCompletions,
    audioCompletionRate:
      audioStarts === 0
        ? null
        : Number(((events.audioCompletions / audioStarts) * 100).toFixed(1)),
    languages: languageResult.rows,
    feedback: feedbackResult.rows[0],
    exhibits: exhibitResult.rows,
  }
}
