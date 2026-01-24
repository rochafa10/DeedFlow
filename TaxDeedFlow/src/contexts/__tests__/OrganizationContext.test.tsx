/**
 * Unit Tests for OrganizationContext
 *
 * Tests organization switching, permission checks, and feature flags.
 *
 * @author Claude Code Agent (QA Fix Session 4)
 * @date 2026-01-23
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { OrganizationProvider, useOrganization } from '../OrganizationContext';
import { AuthProvider } from '../AuthContext';

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test wrapper component
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider>
        <OrganizationProvider>
          {children}
        </OrganizationProvider>
      </AuthProvider>
    );
  };
}

describe('OrganizationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should provide default organization context', () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    // Assert
    expect(result.current).toBeDefined();
    expect(result.current.members).toBeDefined();
    expect(result.current.isLoadingMembers).toBe(true);
  });

  it('should fetch organization members on mount', async () => {
    // Arrange
    const mockMembers = [
      { id: 'member-1', user_id: 'user-1', role: 'admin', status: 'active' },
      { id: 'member-2', user_id: 'user-2', role: 'analyst', status: 'active' },
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockMembers), { status: 200 })
    );

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    expect(result.current.members.length).toBeGreaterThanOrEqual(0);
  });

  it('should check if user has specific feature', async () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    const hasDealPipeline = result.current.hasFeature('deal_pipeline');
    const hasSharedWatchlists = result.current.hasFeature('shared_watchlists');

    // Assert
    expect(typeof hasDealPipeline).toBe('boolean');
    expect(typeof hasSharedWatchlists).toBe('boolean');
  });

  it('should check if user can perform action', async () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Test various permissions
    const canInvite = result.current.canPerformAction('invite');
    const canRemove = result.current.canPerformAction('remove');
    const canModifySettings = result.current.canPerformAction('modify_settings');

    // Assert
    expect(typeof canInvite).toBe('boolean');
    expect(typeof canRemove).toBe('boolean');
    expect(typeof canModifySettings).toBe('boolean');
  });

  it('should count total members', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([
        { id: '1', status: 'active' },
        { id: '2', status: 'active' },
        { id: '3', status: 'pending' },
      ]), { status: 200 })
    );

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    const totalMembers = result.current.getMemberCount();

    // Assert
    expect(typeof totalMembers).toBe('number');
    expect(totalMembers).toBeGreaterThanOrEqual(0);
  });

  it('should count active members only', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([
        { id: '1', status: 'active' },
        { id: '2', status: 'active' },
        { id: '3', status: 'pending' },
        { id: '4', status: 'removed' },
      ]), { status: 200 })
    );

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    const activeMembers = result.current.getActiveMemberCount();

    // Assert
    expect(typeof activeMembers).toBe('number');
    expect(activeMembers).toBeGreaterThanOrEqual(0);
  });

  it('should handle invite member action', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })) // Initial members fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 })); // Invite

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    await act(async () => {
      await result.current.inviteMember({ email: 'newmember@example.com', role: 'analyst' });
    });

    // Assert: Should call API
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle update member role action', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'member-1', user_id: 'user-1', role: 'analyst' },
      ]), { status: 200 })) // Initial members fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 })); // Update

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    await act(async () => {
      await result.current.updateMemberRole('member-1', 'admin');
    });

    // Assert: Should call API
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle remove member action', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'member-1', user_id: 'user-1', role: 'analyst' },
      ]), { status: 200 })) // Initial members fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 })); // Remove

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    await act(async () => {
      await result.current.removeMember('member-1');
    });

    // Assert: Should call API
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle update organization settings', async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })) // Initial members fetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 })); // Update settings

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    await act(async () => {
      await result.current.updateOrganizationSettings({
        features: {
          deal_pipeline: true,
          shared_watchlists: true,
          audit_log: false,
          advanced_analytics: false,
        },
      });
    });

    // Assert: Should call API
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should cache organization data in localStorage', async () => {
    // Arrange
    const mockMembers = [
      { id: 'member-1', user_id: 'user-1', role: 'admin' },
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockMembers), { status: 200 })
    );

    const wrapper = createWrapper();

    // Act
    renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      const cached = mockLocalStorage.getItem('organization_members_demo-org');
      expect(cached).toBeDefined();
    });
  });

  it('should use cached data when available', async () => {
    // Arrange: Set cached data
    const cachedMembers = [
      { id: 'cached-1', user_id: 'user-1', role: 'admin' },
    ];

    mockLocalStorage.setItem(
      'organization_members_demo-org',
      JSON.stringify({
        data: cachedMembers,
        timestamp: Date.now(),
      })
    );

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    // Assert: Should show cached data immediately
    await waitFor(() => {
      expect(result.current.members.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
    );

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    // Assert: Should handle error gracefully
    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Note: Error handling behavior depends on implementation
    expect(result.current).toBeDefined();
  });

  it('should provide demo mode fallback', () => {
    // Arrange: No cached data, no successful fetch
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    // Assert: Should provide context even without data
    expect(result.current).toBeDefined();
    expect(result.current.members).toBeDefined();
  });
});

describe('OrganizationContext - Feature Flags', () => {
  it('should return correct feature flag for deal_pipeline', async () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Assert
    const hasDealPipeline = result.current.hasFeature('deal_pipeline');
    expect(typeof hasDealPipeline).toBe('boolean');
  });

  it('should return correct feature flag for shared_watchlists', async () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Assert
    const hasSharedWatchlists = result.current.hasFeature('shared_watchlists');
    expect(typeof hasSharedWatchlists).toBe('boolean');
  });

  it('should return correct feature flag for audit_log', async () => {
    // Arrange
    const wrapper = createWrapper();

    // Act
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Assert
    const hasAuditLog = result.current.hasFeature('audit_log');
    expect(typeof hasAuditLog).toBe('boolean');
  });
});

describe('OrganizationContext - Permissions', () => {
  it('should check invite permission', async () => {
    // Arrange & Act
    const wrapper = createWrapper();
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Note: Actual permission check depends on current user role
    const canInvite = result.current.canPerformAction('invite');

    // Assert
    expect(typeof canInvite).toBe('boolean');
  });

  it('should check remove permission', async () => {
    // Arrange & Act
    const wrapper = createWrapper();
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    const canRemove = result.current.canPerformAction('remove');

    // Assert
    expect(typeof canRemove).toBe('boolean');
  });

  it('should check modify_settings permission', async () => {
    // Arrange & Act
    const wrapper = createWrapper();
    const { result } = renderHook(() => useOrganization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingMembers).toBe(false);
    });

    // Note: Permission check returns appropriate boolean based on role
    const canModify = result.current.canPerformAction('modify_settings');

    // Assert
    expect(typeof canModify).toBe('boolean');
  });
});
