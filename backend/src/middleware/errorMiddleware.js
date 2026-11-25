export function notFoundHandler(_request, response) {
  response.status(404).json({
    error: {
      message: 'Route not found.',
    },
  })
}

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode ?? error.status ?? 500
  const isClientError = statusCode >= 400 && statusCode < 500

  if (!isClientError) {
    console.error(error)
  }

  response.status(statusCode).json({
    error: {
      message: isClientError
        ? error.message
        : statusCode === 503
          ? error.message
          : 'An unexpected server error occurred.',
    },
  })
}
