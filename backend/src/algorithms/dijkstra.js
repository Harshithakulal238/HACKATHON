export function shortestPaths(graph, startNodeId) {
  const start = String(startNodeId)
  if (!graph.nodeIds.has(start)) {
    return { distances: new Map(), previous: new Map() }
  }

  const distances = new Map(
    [...graph.nodeIds].map((nodeId) => [nodeId, Number.POSITIVE_INFINITY]),
  )
  const previous = new Map()
  const unvisited = new Set(graph.nodeIds)
  distances.set(start, 0)

  while (unvisited.size > 0) {
    let current = null
    let shortest = Number.POSITIVE_INFINITY
    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId)
      if (distance < shortest) {
        current = nodeId
        shortest = distance
      }
    }

    if (current === null) {
      break
    }
    unvisited.delete(current)

    for (const edge of graph.adjacency.get(current) ?? []) {
      const neighbor = String(edge.nodeId)
      if (!unvisited.has(neighbor)) {
        continue
      }
      const candidate = shortest + edge.seconds
      if (candidate < distances.get(neighbor)) {
        distances.set(neighbor, candidate)
        previous.set(neighbor, current)
      }
    }
  }

  return { distances, previous }
}

export function reconstructPath(previous, startNodeId, destinationNodeId) {
  const start = String(startNodeId)
  const destination = String(destinationNodeId)
  if (start === destination) {
    return [start]
  }

  const path = [destination]
  let current = destination
  while (current !== start) {
    current = previous.get(current)
    if (current === undefined) {
      return []
    }
    path.unshift(current)
  }

  return path
}
