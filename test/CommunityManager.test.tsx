import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityManager from '../pages/admin/CommunityManager';

const {
  mockAuthFetch,
  mockShowNotification,
  mockConfirm,
  mockApplyBalance,
} = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
  mockConfirm: vi.fn(),
  mockApplyBalance: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch, applyBalance: mockApplyBalance }),
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
      <CommunityManager />
    </MemoryRouter>,
  );
}

describe('CommunityManager', () => {
  let defaultFetch: (url: string, options?: RequestInit) => Promise<any>;

  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    mockConfirm.mockReset();
    mockApplyBalance.mockReset();
    mockConfirm.mockResolvedValue(false);
    defaultFetch = async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method !== 'GET') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      const path = parsed.pathname;
      const page = Number(parsed.searchParams.get('page') || 1);
      const limit = Number(parsed.searchParams.get('limit') || 0);
      const search = parsed.searchParams.get('search');

      if (path === '/api/community/topics') {
        if (limit === 1) return { topics: [], total: 25, page: 1, limit: 1, pinnedCount: 2 };
        return {
          topics: [{
            id: `topic-page-${page}`,
            title: `Topic page ${page}`,
            content: 'Content of the topic',
            author: { id: 'user-1', displayName: 'Ada' },
            category: { id: 'category-1', name: 'General' },
            likes: 5,
            commentCount: 3,
            isPinned: false,
            isLocked: false,
            createdAt: '2025-01-01T00:00:00.000Z',
          }],
          total: search ? 1 : 25,
          page,
          limit: 20,
          pinnedCount: 2,
        };
      }

      if (path === '/api/community/categories') {
        if (!parsed.search) {
          return [{ id: 'category-1', name: 'General', description: 'General chat', icon: 'chat', order: 0 }];
        }
        if (limit === 1) return { data: [], total: 4, page: 1, totalPages: 1 };
        return {
          data: [{
            id: 'category-1',
            name: 'General',
            description: 'General chat',
            icon: 'chat',
            order: 0,
            topicCount: 10,
            memberCount: 6,
          }],
          total: search ? 1 : 4,
          page,
          totalPages: 1,
        };
      }

      if (path === '/api/community/topics/topic-page-1') {
        return {
          id: 'topic-page-1',
          title: 'Topic page 1',
          comments: [{
            id: 'comment-1',
            content: 'Nice topic',
            likes: 2,
            parentCommentId: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            user: { id: 'user-2', displayName: 'Bob' },
            replies: [{
              id: 'comment-2',
              content: 'I agree',
              likes: 0,
              parentCommentId: 'comment-1',
              createdAt: '2025-01-01T01:00:00.000Z',
              user: { id: 'user-3', displayName: 'Cara' },
              replies: [],
            }],
          }],
        };
      }

      return {};
    };
    mockAuthFetch.mockImplementation(defaultFetch);
  });

  it('loads server-backed topic pages and reports community totals', async () => {
    renderPage();

    expect(await screen.findAllByText('Topic page 1')).toHaveLength(2);
    expect(screen.getByText('Showing 1 to 20 of 25 topics')).toBeTruthy();
    expect(screen.getAllByText('25')).toHaveLength(2);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findAllByText('Topic page 2')).toHaveLength(2);
    await waitFor(() => {
      const pageTwoCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/community/topics'
          && parsed.searchParams.get('page') === '2'
          && parsed.searchParams.get('limit') === '20';
      });
      expect(pageTwoCall).toBeTruthy();
    });
  });

  it('sends search and sorting parameters to the server', async () => {
    renderPage();

    await screen.findAllByText('Topic page 1');
    fireEvent.change(screen.getByPlaceholderText('Search by title, content, or author...'), {
      target: { value: 'afro' },
    });
    fireEvent.change(screen.getByLabelText('Sort By'), {
      target: { value: 'likes' },
    });

    await waitFor(() => {
      const filteredCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/community/topics'
          && parsed.searchParams.get('search') === 'afro'
          && parsed.searchParams.get('sortBy') === 'likes';
      });
      expect(filteredCall).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });

  it('pins topics and applies the reward balance update', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        return { isPinned: true, reward: { balance: 120 } };
      }
      return defaultFetch(url, options);
    });

    renderPage();
    await screen.findAllByText('Topic page 1');

    fireEvent.click(screen.getAllByRole('button', { name: 'Pin' })[0]);

    await waitFor(() => {
      const pinCall = mockAuthFetch.mock.calls.find(([url, opts]) =>
        String(url) === '/api/community/topics/topic-page-1/pin' && opts?.method === 'PATCH');
      expect(pinCall).toBeTruthy();
    });
    expect(mockApplyBalance).toHaveBeenCalledWith(120);
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Topic pinned!', type: 'success' }),
    );
  });

  it('edits topics and deletes them after confirmation', async () => {
    mockConfirm.mockResolvedValue(true);
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method === 'DELETE') return { success: true };
      if (method === 'PATCH') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname !== '/api/community/topics') return {};
      if (parsed.searchParams.get('limit') === '1') {
        return { topics: [], total: 25, page: 1, limit: 1, pinnedCount: 2 };
      }
      return {
        topics: [{
          id: 'topic-page-1',
          title: 'Topic page 1',
          content: 'Content of the topic',
          author: { displayName: 'Ada' },
          category: { name: 'General' },
          likes: 5,
          commentCount: 3,
          createdAt: '2025-01-01T00:00:00.000Z',
        }],
        total: 25,
        page: 1,
        limit: 20,
        pinnedCount: 2,
      };
    });

    renderPage();
    await screen.findAllByText('Topic page 1');

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Edit topic' });
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Renamed Topic' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/community/topics/topic-page-1' && options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({ title: 'Renamed Topic' });
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete Topic' }));
    });
    await waitFor(() => {
      const deleteCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/community/topics/topic-page-1' && options?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
  });

  it('loads paginated categories and creates new ones', async () => {
    renderPage();

    await screen.findAllByText('Topic page 1');
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));

    expect(await screen.findAllByText('General')).toHaveLength(2);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add category' });
    fireEvent.change(within(dialog).getByLabelText('Category Name'), {
      target: { value: 'Music Talk' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Category' }));

    await waitFor(() => {
      const postCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/community/categories' && options?.method === 'POST');
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({ name: 'Music Talk' });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Category created successfully!', type: 'success' }),
    );
  });

  it('shows nested comments for a topic and deletes them after confirmation', async () => {
    mockConfirm.mockResolvedValue(true);
    renderPage();

    await screen.findAllByText('Topic page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Comments' })[0]);

    expect(await screen.findByText('Nice topic')).toBeTruthy();
    expect(screen.getByText('I agree')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Cara')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete Comment' }));
    });
    await waitFor(() => {
      const deleteCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/community/comments/comment-1' && options?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Back to Topics/ }));
    expect(await screen.findAllByText('Topic page 1')).toHaveLength(2);
  });
});
