export function notFoundHandler(_request, response) {
  response.status(404).json({
    error: {
      message: 'Route not found.',
    },
  })
}

export function errorHandler(error, _request, response, _next) {
  console.error(error)

  response.status(error.statusCode ?? 500).json({
    error: {
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : 'An unexpected server error occurred.',
    },
  })
}
