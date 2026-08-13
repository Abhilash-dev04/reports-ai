import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import reviewerService from './services/reviewerService';
import ReviewerQueue from './components/ReviewerQueue';

jest.mock('./services/reviewerService', () => ({
  listRequests: jest.fn(),
  getRequest: jest.fn(),
  startReview: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  retrySync: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  process.env.REACT_APP_DEMO_MODE = 'true';
  jest.clearAllMocks();
});

test('reviewer queue handles empty response without crashing', async () => {
  reviewerService.listRequests.mockResolvedValue(null);

  render(<ReviewerQueue />);

  await waitFor(() => {
    expect(screen.getByText(/no review requests found/i)).toBeInTheDocument();
  });
});
