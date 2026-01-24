/**
 * Unit Tests for useOrganization Hook
 *
 * Tests data fetching with React Query, mutations, cache invalidation,
 * and error states.
 *
 * @author Claude Code Agent (QA Fix Session 4)
 * @date 2026-01-23
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useOrganization,
  useOrganizationMembers,
  useCreateOrganization,
  useUpdateOrganization,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '../useOrganization';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

// Helper to create QueryClient for tests
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // was cacheTime in React Query v4
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component for React Query
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch organization data successfully', async () => {
    // Arrange
    const mockOrganization = {
      id: 'org-123',
      name: 'Test Investment Firm',
      slug: 'test-investment-firm',
      created_at: '2026-01-23T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockOrganization), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useOrganization('org-123'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOrganization);
    expect(mockFetch).toHaveBeenCalledWith('/api/organizations/org-123');
  });

  it('should handle fetch errors', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Organization not found' }), { status: 404 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useOrganization('org-999'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });

  it('should cache organization data', async () => {
    // Arrange
    const mockOrganization = {
      id: 'org-123',
      name: 'Test Investment Firm',
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockOrganization), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act: First render
    const { result: result1 } = renderHook(() => useOrganization('org-123'), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Second render with same ID
    const { result: result2 } = renderHook(() => useOrganization('org-123'), { wrapper });

    // Assert: Should use cached data, not fetch again
    expect(result2.current.data).toEqual(mockOrganization);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should handle loading state', () => {
    // Arrange
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useOrganization('org-123'), { wrapper });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe('useOrganizationMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch organization members successfully', async () => {
    // Arrange
    const mockMembers = [
      { id: 'member-1', user_id: 'user-1', role: 'admin', status: 'active' },
      { id: 'member-2', user_id: 'user-2', role: 'analyst', status: 'active' },
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockMembers), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useOrganizationMembers('org-123'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMembers);
    expect(result.current.data).toHaveLength(2);
  });

  it('should handle empty members list', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useOrganizationMembers('org-123'), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('useCreateOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create organization successfully', async () => {
    // Arrange
    const newOrg = { id: 'org-new', name: 'New Firm' };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(newOrg), { status: 201 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    result.current.mutate({
      name: 'New Firm',
      slug: 'new-firm',
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(newOrg);
  });

  it('should handle create errors', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Name already exists' }), { status: 400 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    result.current.mutate({
      name: 'Duplicate Firm',
      slug: 'duplicate-firm',
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should invalidate organizations query on success', async () => {
    // Arrange
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-new' }), { status: 201 })
    );

    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useCreateOrganization(), { wrapper });

    result.current.mutate({ name: 'New Firm', slug: 'new-firm' });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['organizations'] });
  });
});

describe('useUpdateOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update organization successfully', async () => {
    // Arrange
    const updatedOrg = { id: 'org-123', name: 'Updated Firm' };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(updatedOrg), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useUpdateOrganization(), { wrapper });

    result.current.mutate({
      organizationId: 'org-123',
      data: {
        name: 'Updated Firm',
      },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(updatedOrg);
  });

  it('should invalidate organization query on success', async () => {
    // Arrange
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'org-123' }), { status: 200 })
    );

    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useUpdateOrganization(), { wrapper });

    result.current.mutate({
      organizationId: 'org-123',
      data: { name: 'Updated' },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['organization', 'org-123'] });
  });
});

describe('useInviteMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invite member successfully', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useInviteMember(), { wrapper });

    result.current.mutate({
      organizationId: 'org-123',
      data: {
        email: 'newmember@example.com',
        role: 'analyst',
      },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should invalidate members query on success', async () => {
    // Arrange
    const queryClient = createTestQueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useInviteMember(), { wrapper });

    result.current.mutate({
      organizationId: 'org-123',
      data: { email: 'test@example.com', role: 'analyst' },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['organization', 'org-123', 'members'] });
  });
});

describe('useUpdateMemberRole', () => {
  it('should update member role successfully', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useUpdateMemberRole(), { wrapper });

    result.current.mutate({
      organizationId: 'org-123',
      memberId: 'member-123',
      data: { role: 'admin' },
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});

describe('useRemoveMember', () => {
  it('should remove member successfully', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const queryClient = createTestQueryClient();
    const wrapper = createWrapper(queryClient);

    // Act
    const { result } = renderHook(() => useRemoveMember(), { wrapper });

    result.current.mutate({ organizationId: 'org-123', memberId: 'member-123' });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
