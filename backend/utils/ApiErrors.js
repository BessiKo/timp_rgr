class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }

  static BadRequest(message = 'Неверный синтаксис или ошибка валидации') { return new ApiError(400, message); }
  static Unauthorized(message = 'Необходима аутентификация') { return new ApiError(401, message); }
  static Forbidden(message = 'Доступ запрещен') { return new ApiError(403, message); }
  static NotFound(message = 'Запрашиваемый ресурс не найден') { return new ApiError(404, message); }
  static TooManyRequests(message = 'Превышен лимит запросов') { return new ApiError(429, message); }
  static Internal(message = 'Внутренняя ошибка сервера') { return new ApiError(500, message); }
  static BadGateway(message = 'Получен некорректный ответ от устройства') { return new ApiError(502, message); }
  static ServiceUnavailable(message = 'Сервер временно не работает') { return new ApiError(503, message); }
}

module.exports = ApiError;