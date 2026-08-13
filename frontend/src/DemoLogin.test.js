import React from 'react';
import '@testing-library/jest-dom';

jest.mock('./services/axiosClient', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import api from './services/axiosClient';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  process.env.REACT_APP_DEMO_MODE = 'true';
});

afterEach(() => {
  jest.clearAllMocks();
});

const loginAs = async (username, password = 'anything') => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/^Password$/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await screen.findByText(/enterprise reports overview/i);
};

const openSidebar = () => {
  fireEvent.click(screen.getByLabelText(/open navigation menu/i));
};

test('demo login accepts any non-empty credentials without an API request and redirects to dashboard', async () => {
  await loginAs('demo');

  expect(api.post).not.toHaveBeenCalled();
  expect(api.get).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBe('public-demo-token');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  expect(user).toMatchObject({
    username: 'demo',
    email: 'demo@example.com',
    role: 'user',
    demo: true,
  });
});

test('demo reviewer login stores reviewer role and enables Review Requests navigation', async () => {
  await loginAs('reviewer');
  openSidebar();

  expect(screen.getByRole('button', { name: /review requests/i })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
    username: 'reviewer',
    role: 'reviewer',
  });

  fireEvent.click(screen.getByRole('button', { name: /review requests/i }));

  const queueHeading = await screen.findByText(/report review queue/i);
  expect(queueHeading).toBeInTheDocument();
  expect(await screen.findByText(/provider enrollment summary/i)).toBeInTheDocument();
});

test('demo admin login stores admin role and enables Review Requests navigation', async () => {
  await loginAs('admin');
  openSidebar();

  expect(screen.getByRole('button', { name: /review requests/i })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({
    username: 'admin',
    role: 'admin',
  });

  fireEvent.click(screen.getByRole('button', { name: /review requests/i }));

  const queueHeading = await screen.findByText(/report review queue/i);
  expect(queueHeading).toBeInTheDocument();
  expect(await screen.findByText(/provider enrollment summary/i)).toBeInTheDocument();
});

test('demo standard user cannot access review requests and remains on dashboard', async () => {
  await loginAs('demo');

  expect(screen.queryByRole('button', { name: /review requests/i })).not.toBeInTheDocument();

  window.history.pushState({}, '', '/review-requests');
  fireEvent.popState(window);

  await waitFor(() => {
    expect(screen.getByText(/enterprise reports overview/i)).toBeInTheDocument();
  });
  expect(screen.queryByText(/report review queue/i)).not.toBeInTheDocument();
});
