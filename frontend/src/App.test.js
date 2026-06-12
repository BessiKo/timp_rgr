import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { IncidentProvider } from './context/incident';

// Обертка для корректной работы роутера и контекста
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <IncidentProvider>
        {component}
      </IncidentProvider>
    </BrowserRouter>
  );
};

test('renders login page with "Войти" button', () => {
  renderWithProviders(<LoginPage />);
  
  // Ищем кнопку по тексту "Войти" (без учета регистра)
  const loginButton = screen.getByRole('button', { name: /войти/i });
  expect(loginButton).toBeInTheDocument();

  // Ищем поле для ввода email
  const emailInput = screen.getByLabelText(/Email:/i);
  expect(emailInput).toBeInTheDocument();
  
  // Ищем заголовок "Вход в систему"
  const heading = screen.getByText(/Вход в систему/i);
  expect(heading).toBeInTheDocument();
});