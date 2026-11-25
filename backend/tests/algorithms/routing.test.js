import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildGraph } from '../../src/algorithms/graphBuilder.js'
import { reconstructPath, shortestPaths } from '../../src/algorithms/dijkstra.js'
import { selectGreedyRoute } from '../../src/algorithms/greedyRouteSelector.js'

test('Dijkstra selects the lowest-cost path and handles disconnected nodes', () => {
  const graph = buildGraph(
    [{ id: 'entrance' }, { id: 'gallery' }, { id: 'exit' }, { id: 'isolated' }],
    [
      { fromNodeId: 'entrance', toNodeId: 'gallery', estimatedWalkingSeconds: 10, isBidirectional: true },
      { fromNodeId: 'gallery', toNodeId: 'exit', estimatedWalkingSeconds: 15, isBidirectional: true },
      { fromNodeId: 'entrance', toNodeId: 'exit', estimatedWalkingSeconds: 50, isBidirectional: true },
    ],
  )
  const result = shortestPaths(graph, 'entrance')

  assert.equal(result.distances.get('exit'), 25)
  assert.deepEqual(reconstructPath(result.previous, 'entrance', 'exit'), [
    'entrance',
    'gallery',
    'exit',
  ])
  assert.equal(Number.isFinite(result.distances.get('isolated')), false)
})

test('greedy selection includes walking, exhibit time, and the exit within the budget', () => {
  const graph = buildGraph(
    [{ id: 'entrance' }, { id: 'near' }, { id: 'far' }, { id: 'exit' }],
    [
      { fromNodeId: 'entrance', toNodeId: 'near', estimatedWalkingSeconds: 60, isBidirectional: true },
      { fromNodeId: 'near', toNodeId: 'far', estimatedWalkingSeconds: 120, isBidirectional: true },
      { fromNodeId: 'near', toNodeId: 'exit', estimatedWalkingSeconds: 60, isBidirectional: true },
      { fromNodeId: 'far', toNodeId: 'exit', estimatedWalkingSeconds: 60, isBidirectional: true },
    ],
  )
  const route = selectGreedyRoute({
    graph,
    startNodeId: 'entrance',
    exitNodeId: 'exit',
    candidates: [
      { id: '1', nodeId: 'near', categoryId: '10', name: 'Near exhibit', estimatedVisitMinutes: 2, isAvailable: true },
      { id: '2', nodeId: 'far', categoryId: '10', name: 'Far exhibit', estimatedVisitMinutes: 5, isAvailable: true },
    ],
    interestCategoryIds: ['10'],
    availableSeconds: 240,
  })

  assert.deepEqual(route.stops.map((stop) => stop.exhibitId), ['1'])
  assert.equal(route.estimatedSeconds, 240)
  assert.equal(route.canReachExit, true)
})

test('route selection excludes unavailable, unrelated, and exit-infeasible exhibits', () => {
  const graph = buildGraph(
    [{ id: 'entrance' }, { id: 'stop' }, { id: 'exit' }],
    [
      { fromNodeId: 'entrance', toNodeId: 'stop', estimatedWalkingSeconds: 20, isBidirectional: true },
      { fromNodeId: 'stop', toNodeId: 'exit', estimatedWalkingSeconds: 20, isBidirectional: true },
    ],
  )
  const route = selectGreedyRoute({
    graph,
    startNodeId: 'entrance',
    exitNodeId: 'exit',
    candidates: [
      { id: '1', nodeId: 'stop', categoryId: '10', name: 'Unavailable', estimatedVisitMinutes: 1, isAvailable: false },
      { id: '2', nodeId: 'stop', categoryId: '11', name: 'Unrelated', estimatedVisitMinutes: 1, isAvailable: true },
      { id: '3', nodeId: 'stop', categoryId: '10', name: 'Too long', estimatedVisitMinutes: 2, isAvailable: true },
    ],
    interestCategoryIds: ['10'],
    availableSeconds: 100,
  })

  assert.deepEqual(route.stops, [])
  assert.deepEqual(route.exitPath, ['entrance', 'stop', 'exit'])
  assert.equal(route.estimatedSeconds, 40)
})
