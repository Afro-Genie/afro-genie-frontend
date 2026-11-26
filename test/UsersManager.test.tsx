import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersManager from '../pages/admin/UsersManager';

const {
  mockAuthFetch,
  mockShowNotification,
  mockConfirm,
} = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

vi.mock('../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showNotification: mockShowNotification,
    hideNotification: vi.fn(),
  }),
}));

vi.mock('../hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirmState: null,
    confirm: mockConfirm,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersManager />
    </MemoryRouter>,
  );
}

describe('UsersManager', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    mockConfirm.mockReset();
    mockConfirm.mockResolvedValue(false);
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method !== 'GET') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname !== '/api/admin/users') return {};
      const page = Number(parsed.searchParams.get('page') || 1);
      const search = parsed.searchParams.get('search');
      const role = parsed.searchParams.get('role');
      return {
        data: [{
          id: `user-page-${page}`,
          email: `user${page}@example.com`,
          displayName: `User page ${page}`,
          photoUrl: '',
          role: 'USER',
          createdAt: '2025-01-01T00:00:00.000Z',
          lastLoginAt: null,
        }],
        total: search || role ? 1 : 45,
        totalPages: search || role ? 1 : 3,
        nextCursor: null,
        roleCounts: { USER: 40, ADMIN: 2, MODERATOR: 3 },
      };
    });
  });

  it('loads server-backed pages and reports role totals', async () => {
    renderPage();

    expect(await screen.findAllByText('User page 1')).toHaveLength(2);
    expect(screen.getByText('Showing 1 to 20 of 45 users')).toBeTruthy();
    expect(screen.getAllByText('45')).toHaveLength(2);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findAllByText('User page 2')).toHaveLength(2);
    await waitFor(() => {
      const pageTwoCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/users'
          && parsed.searchParams.get('page') === '2'
          && parsed.searchParams.get('limit') === '20';
      });
      expect(pageTwoCall).toBeTruthy();
    });
  });

  it('sends search and role filters to the server', async () => {
    renderPage();

    await screen.findAllByText('User page 1');
    fireEvent.change(screen.getByPlaceholderText('Search by name or email...'), {
      target: { value: 'ada' },
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'admin' },
    });

    await waitFor(() => {
      const filteredCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/users'
          && parsed.searchParams.get('search') === 'ada'
          && parsed.searchParams.get('role') === 'ADMIN';
      });
      expect(filteredCall).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });

  it('updates a user role through the admin API', async () => {
    renderPage();

    await screen.findAllByText('User page 1');
    fireEvent.change(screen.getAllByLabelText('Role for User page 1')[0], {
      target: { value: 'moderator' },
    });

    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/users/user-page-1/role' && options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({ role: 'MODERATOR' });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User role updated successfully!', type: 'success' }),
    );
  });

  it('requires confirmation before promoting a user to admin', async () => {
    mockConfirm.mockResolvedValue(false);
    renderPage();

    await screen.findAllByText('User page 1');
    fireEvent.change(screen.getAllByLabelText('Role for User page 1')[0], {
      target: { value: 'admin' },
    });

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Promote to Admin' }));
    });
    const patchCall = mockAuthFetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(patchCall).toBeUndefined();
  });

  it('asks for confirmation before deleting a user', async () => {
    mockConfirm.mockResolvedValue(true);
    renderPage();

    await screen.findAllByText('User page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete User' }));
    });
    await waitFor(() => {
      const deleteCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/users/user-page-1' && options?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'User deleted successfully!', type: 'success' }),
    );
  });
});
