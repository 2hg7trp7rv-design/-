import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import Layout from './components/Layout';
import { useGameStore } from './store/gameStore';

describe('app routing and game chrome', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().clearAllData();
  });

  it('shows a cute not-found screen for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/missing-tunnel']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/Lost in the burrow/i)).toBeInTheDocument();
  });

  it('does not start direct game visits automatically', () => {
    render(
      <MemoryRouter initialEntries={['/game']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /tap to start/i })).toBeInTheDocument();
  });

  it('shows the login page for online ranking sign-in', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /save scores online/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Firebase is not configured/i).length).toBeGreaterThan(0);
  });

  it('hides the bottom navbar during active game states', () => {
    useGameStore.setState({ gameStatus: 'playing' });

    render(
      <MemoryRouter initialEntries={['/game']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/game" element={<div>Game body</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Game body')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: /primary navigation/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the bottom navbar on non-game pages', () => {
    render(
      <MemoryRouter initialEntries={['/ranking']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/ranking" element={<div>Ranking body</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Ranking body')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
  });
});
