import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelectPageModal, type SelectedAccount } from '../whatsapp_automation/components/SelectPageModal';
import type { LinkedPage, LinkMetaResponse } from '../whatsapp_automation/types';

// ============================================================
// Mock API Client
// ============================================================

const mockApiClient = {
  post: vi.fn(),
};

vi.mock('@/lib/apiClient', () => ({
  default: mockApiClient,
}));

// ============================================================
// Mock Data
// ============================================================

const createMockPage = (overrides: Partial<LinkedPage> = {}): LinkedPage => ({
  page_id: `page_${Math.random().toString(36).substr(2, 9)}`,
  page_name: 'Test Page',
  waba_id: 'waba_123',
  phone_number_id: 'phone_123',
  instagram_account_id: undefined,
  ...overrides,
});

// ============================================================
// Tests
// ============================================================

describe('SelectPageModal', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnSelect = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderModal = (props: Partial<{
    isOpen: boolean;
    requireWhatsApp: boolean;
    workspaceId: string;
  }> = {}) => {
    return render(
      <SelectPageModal
        isOpen={props.isOpen ?? true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        requireWhatsApp={props.requireWhatsApp ?? false}
        workspaceId={props.workspaceId ?? 'test-workspace'}
      />
    );
  };

  describe('Loading State', () => {
    it('shows loading skeletons when fetching pages', async () => {
      // Never resolve the promise to keep loading state
      mockApiClient.post.mockImplementation(() => new Promise(() => {}));

      renderModal();

      // Should show skeleton loading states
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no pages are linked', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/no linked accounts/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/connect your facebook page/i)).toBeInTheDocument();
    });

    it('shows link to connect account when empty', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /connect account/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message on API failure', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: false,
        status: 500,
        data: {
          error: 'Server error',
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch linked accounts/i)).toBeInTheDocument();
      });
    });

    it('shows specific message for 401 error', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: false,
        status: 401,
        data: {},
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      });
    });

    it('shows specific message for 429 error', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: false,
        status: 429,
        data: {},
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: false,
        status: 500,
        data: {
          error: 'Error',
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries API call when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      mockApiClient.post.mockResolvedValueOnce({
        ok: false,
        status: 500,
        data: { error: 'Error' },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Second call succeeds
      mockApiClient.post.mockResolvedValueOnce({
        ok: true,
        data: {
          success: true,
          linked: [createMockPage({ page_name: 'My Page' })],
        },
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('My Page')).toBeInTheDocument();
      });
    });
  });

  describe('Page List', () => {
    it('displays list of linked pages', async () => {
      const pages = [
        createMockPage({ page_name: 'Page One' }),
        createMockPage({ page_name: 'Page Two' }),
      ];

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: pages,
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Page One')).toBeInTheDocument();
        expect(screen.getByText('Page Two')).toBeInTheDocument();
      });
    });

    it('shows WhatsApp badge for pages with WABA linked', async () => {
      const page = createMockPage({ 
        page_name: 'My Page',
        waba_id: 'waba_123',
        phone_number_id: 'phone_123',
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      });
    });

    it('shows Instagram badge for pages with Instagram linked', async () => {
      const page = createMockPage({ 
        page_name: 'My Page',
        instagram_account_id: 'ig_123',
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Instagram')).toBeInTheDocument();
      });
    });
  });

  describe('Page Selection', () => {
    it('can select a page', async () => {
      const user = userEvent.setup();
      const page = createMockPage({ page_name: 'My Page' });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('My Page')).toBeInTheDocument();
      });

      // Click on the page card
      const pageButton = screen.getByText('My Page').closest('button');
      if (pageButton) {
        await user.click(pageButton);
      }

      // Confirm button should now be enabled
      const confirmButton = screen.getByRole('button', { name: /select my page/i });
      expect(confirmButton).not.toBeDisabled();
    });

    it('shows checkmark on selected page', async () => {
      const user = userEvent.setup();
      const page = createMockPage({ page_name: 'My Page' });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('My Page')).toBeInTheDocument();
      });

      const pageButton = screen.getByText('My Page').closest('button');
      if (pageButton) {
        await user.click(pageButton);
      }

      // aria-pressed should be true
      expect(pageButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onSelect with correct data when confirmed', async () => {
      const user = userEvent.setup();
      const page = createMockPage({ 
        page_id: 'page_123',
        page_name: 'My Page',
        waba_id: 'waba_456',
        phone_number_id: 'phone_789',
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('My Page')).toBeInTheDocument();
      });

      // Select the page
      const pageButton = screen.getByText('My Page').closest('button');
      if (pageButton) {
        await user.click(pageButton);
      }

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /select my page/i });
      await user.click(confirmButton);

      expect(mockOnSelect).toHaveBeenCalledWith({
        page_id: 'page_123',
        page_name: 'My Page',
        waba_id: 'waba_456',
        phone_number_id: 'phone_789',
        instagram_account_id: undefined,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('WhatsApp Requirement', () => {
    it('disables pages without WhatsApp when requireWhatsApp is true', async () => {
      const pageWithoutWA = createMockPage({ 
        page_name: 'No WhatsApp',
        waba_id: undefined,
        phone_number_id: undefined,
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [pageWithoutWA],
        },
      });

      renderModal({ requireWhatsApp: true });

      await waitFor(() => {
        expect(screen.getByText('No WhatsApp')).toBeInTheDocument();
      });

      const pageButton = screen.getByText('No WhatsApp').closest('button');
      expect(pageButton).toBeDisabled();
      expect(screen.getByText(/whatsapp business account not linked/i)).toBeInTheDocument();
    });

    it('shows alert when no pages have WhatsApp and it is required', async () => {
      const pageWithoutWA = createMockPage({ 
        page_name: 'No WhatsApp',
        waba_id: undefined,
        phone_number_id: undefined,
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [pageWithoutWA],
        },
      });

      renderModal({ requireWhatsApp: true });

      await waitFor(() => {
        expect(screen.getByText(/whatsapp not linked/i)).toBeInTheDocument();
        expect(screen.getByText(/none of your facebook pages have a whatsapp business account linked/i)).toBeInTheDocument();
      });
    });

    it('allows selecting pages with WhatsApp when requireWhatsApp is true', async () => {
      const user = userEvent.setup();
      const pageWithWA = createMockPage({ 
        page_name: 'With WhatsApp',
        waba_id: 'waba_123',
        phone_number_id: 'phone_123',
      });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [pageWithWA],
        },
      });

      renderModal({ requireWhatsApp: true });

      await waitFor(() => {
        expect(screen.getByText('With WhatsApp')).toBeInTheDocument();
      });

      const pageButton = screen.getByText('With WhatsApp').closest('button');
      expect(pageButton).not.toBeDisabled();

      if (pageButton) {
        await user.click(pageButton);
      }

      const confirmButton = screen.getByRole('button', { name: /select with whatsapp/i });
      expect(confirmButton).not.toBeDisabled();
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      
      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [],
        },
      });

      renderModal();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('fetches pages when modal opens', async () => {
      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [],
        },
      });

      renderModal({ isOpen: true, workspaceId: 'ws_123' });

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/link-meta', {
          workspace_id: 'ws_123',
          action: 'list',
        });
      });
    });

    it('resets selection when modal closes and reopens', async () => {
      const user = userEvent.setup();
      const page = createMockPage({ page_name: 'My Page' });

      mockApiClient.post.mockResolvedValue({
        ok: true,
        data: {
          success: true,
          linked: [page],
        },
      });

      const { rerender } = renderModal();

      await waitFor(() => {
        expect(screen.getByText('My Page')).toBeInTheDocument();
      });

      // Select a page
      const pageButton = screen.getByText('My Page').closest('button');
      if (pageButton) {
        await user.click(pageButton);
      }

      // Close modal
      rerender(
        <SelectPageModal
          isOpen={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // Reopen modal
      rerender(
        <SelectPageModal
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // Confirm button should be in default state (no page selected)
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /select account/i });
        expect(confirmButton).toBeDisabled();
      });
    });
  });
});
