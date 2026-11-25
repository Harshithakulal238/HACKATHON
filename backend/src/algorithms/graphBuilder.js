export function buildGraph(nodes, walkingPaths) {
  const nodeIds = new Set(nodes.map((node) => String(node.id)))
  const adjacency = new Map(
    [...nodeIds].map((nodeId) => [nodeId, []]),
  )

  for (const path of walkingPaths) {
    const from = String(path.fromNodeId)
    const to = String(path.toNodeId)
    if (!nodeIds.has(from) || !nodeIds.has(to)) {
      throw new Error('Walking paths must reference nodes in the graph.')
    }

    const seconds = Number(path.estimatedWalkingSeconds)
    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
      throw new Error('Walking path weights must be positive integers.')
    }

    adjacency.get(from).push({ nodeId: to, seconds })
    if (path.isBidirectional) {
      adjacency.get(to).push({ nodeId: from, seconds })
    }
  }

  return { nodeIds, adjacency }
}
