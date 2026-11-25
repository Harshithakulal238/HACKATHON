import {
  completeExhibit,
  extendVisitorSession,
  finishVisitorSession,
  getVisitorMap,
  getVisitorSession,
  recordVisitorInteraction,
  scanExhibit,
  startVisitorSession,
  submitVisitorFeedback,
} from '../services/visitorSessionService.js'

export async function start(request, response) {
  const session = await startVisitorSession(request.body?.token)
  response.status(200).json(session)
}

export async function getSession(request, response) {
  const session = await getVisitorSession(request.visitorSession.id)
  response.status(200).json(session)
}

export async function getMap(request, response) {
  const map = await getVisitorMap(request.visitorSession.id)
  response.status(200).json(map)
}

export async function scan(request, response) {
  const result = await scanExhibit(request.visitorSession.id, request.body)
  response.status(200).json(result)
}

export async function complete(request, response) {
  const result = await completeExhibit(
    request.visitorSession.id,
    request.params.exhibitId,
    request.body,
  )
  response.status(200).json(result)
}

export async function extend(request, response) {
  const result = await extendVisitorSession(
    request.visitorSession.id,
    request.body,
  )
  response.status(200).json(result)
}

export async function finish(request, response) {
  const result = await finishVisitorSession(request.visitorSession.id)
  response.status(200).json(result)
}

export async function feedback(request, response) {
  const result = await submitVisitorFeedback(
    request.visitorSession.id,
    request.params.exhibitId,
    request.body,
  )
  response.status(201).json({ feedback: result })
}

export async function interaction(request, response) {
  const result = await recordVisitorInteraction(
    request.visitorSession.id,
    request.body,
  )
  response.status(201).json(result)
}
