import { reconstructPath, shortestPaths } from './dijkstra.js'

export function selectGreedyRoute({
  graph,
  startNodeId,
  exitNodeId,
  candidates,
  interestCategoryIds,
  availableSeconds,
}) {
  const interests = new Set(interestCategoryIds.map(String))
  const remaining = candidates
    .filter(
      (candidate) =>
        candidate.isAvailable &&
        interests.has(String(candidate.categoryId)),
    )
    .map((candidate) => ({
      ...candidate,
      id: String(candidate.id),
      nodeId: String(candidate.nodeId),
      categoryId: String(candidate.categoryId),
      visitSeconds: Number(candidate.estimatedVisitMinutes) * 60,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))

  if (
    !Number.isSafeInteger(availableSeconds) ||
    availableSeconds < 0 ||
    !graph.nodeIds.has(String(startNodeId)) ||
    !graph.nodeIds.has(String(exitNodeId))
  ) {
    return {
      stops: [],
      exitPath: [],
      estimatedSeconds: 0,
      canReachExit: false,
    }
  }

  const stops = []
  let currentNodeId = String(startNodeId)
  let elapsedSeconds = 0

  while (remaining.length > 0) {
    const fromCurrent = shortestPaths(graph, currentNodeId)
    const choices = []

    for (const candidate of remaining) {
      const walkingSeconds = fromCurrent.distances.get(candidate.nodeId)
      if (!Number.isFinite(walkingSeconds)) {
        continue
      }

      const fromCandidate = shortestPaths(graph, candidate.nodeId)
      const exitSeconds = fromCandidate.distances.get(String(exitNodeId))
      const totalIfSelected =
        elapsedSeconds + walkingSeconds + candidate.visitSeconds + exitSeconds
      if (!Number.isFinite(exitSeconds) || totalIfSelected > availableSeconds) {
        continue
      }

      choices.push({
        candidate,
        walkingSeconds,
        totalIfSelected,
        pathNodeIds: reconstructPath(
          fromCurrent.previous,
          currentNodeId,
          candidate.nodeId,
        ),
      })
    }

    if (choices.length === 0) {
      break
    }

    choices.sort((left, right) => {
      const leftCost = left.walkingSeconds + left.candidate.visitSeconds
      const rightCost = right.walkingSeconds + right.candidate.visitSeconds
      return leftCost - rightCost || left.candidate.id.localeCompare(right.candidate.id)
    })

    const choice = choices[0]
    stops.push({
      exhibitId: choice.candidate.id,
      nodeId: choice.candidate.nodeId,
      name: choice.candidate.name,
      walkingSeconds: choice.walkingSeconds,
      visitMinutes: choice.candidate.estimatedVisitMinutes,
      pathNodeIds: choice.pathNodeIds,
    })
    elapsedSeconds +=
      choice.walkingSeconds + choice.candidate.visitSeconds
    currentNodeId = choice.candidate.nodeId
    remaining.splice(
      remaining.findIndex((candidate) => candidate.id === choice.candidate.id),
      1,
    )
  }

  const finalPaths = shortestPaths(graph, currentNodeId)
  const exitSeconds = finalPaths.distances.get(String(exitNodeId))
  const exitPath = Number.isFinite(exitSeconds)
    ? reconstructPath(finalPaths.previous, currentNodeId, exitNodeId)
    : []

  if (Number.isFinite(exitSeconds)) {
    elapsedSeconds += exitSeconds
  }

  return {
    stops,
    exitPath,
    exitWalkingSeconds: Number.isFinite(exitSeconds) ? exitSeconds : null,
    estimatedSeconds: elapsedSeconds,
    canReachExit: Number.isFinite(exitSeconds),
    fitsBudget: Number.isFinite(exitSeconds) && elapsedSeconds <= availableSeconds,
  }
}
