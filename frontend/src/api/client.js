const API_BASE_URL = process.env.REACT_APP_API_URL || '/api'

export const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  })
  
  if (options.skipRedirect) {
    return response
  }
  
  return handleApiResponse(response)
}

export const interpretError = (status, data) => {
  if (data && data.error) return data.error;

  switch (status) {
    case 400: return 'Некорректные данные запроса. Проверьте правильность заполнения полей.';
    case 401: return 'Время сессии истекло, пожалуйста, войдите заново.';
    case 403: return 'Ошибка доступа: у вас нет прав для выполнения этого действия.';
    case 404: return 'Запрашиваемый ресурс не найден.';
    case 409: return 'Конфликт данных (возможно, такая запись уже существует).';
    case 429: return 'Слишком много запросов. Подождите немного.';
    case 500: return 'Внутренняя ошибка сервера. Обратитесь к системному администратору.';
    case 502:
    case 503: return 'Сервер временно недоступен. Попробуйте позже.';
    default: return `Неизвестная ошибка системы (Код: ${status}).`;
  }
};

export const handleApiResponse = async (response) => {
  if (response.status === 401) {
    window.location.href = '/'
    throw new Error('Сессия завершена')
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(interpretError(response.status, errorData))
  }
  return response
}

export const validateInput = (value, type) => {
  if (value === undefined || value === null) return false
  const strValue = String(value).trim()
  if (strValue.length > 100) return false
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)
  if (type === 'password') return strValue.length >= 8 && /[A-Z]/.test(strValue) && /[0-9]/.test(strValue)
  return true
}

export const verifyRoleAccess = (userRole, allowedRoles) => {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}
