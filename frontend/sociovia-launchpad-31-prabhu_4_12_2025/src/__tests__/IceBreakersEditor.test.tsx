import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IceBreakersEditor, type MessageMode } from '../whatsapp_automation/components/IceBreakersEditor';
import type { IceBreaker } from '../whatsapp_automation/types';

// ============================================================
// Mock Data
// ============================================================

const createMockIceBreaker = (overrides: Partial<IceBreaker> = {}): IceBreaker => ({
  id: `ib_${Math.random().toString(36).substr(2, 9)}`,
  title: 'Learn more',
  payload: 'LEARN_MORE',
  ...overrides,
});

// ============================================================
// Tests
// ============================================================

describe('IceBreakersEditor', () => {
  let mockOnModeChange: ReturnType<typeof vi.fn>;
  let mockOnIceBreakersChange: ReturnType<typeof vi.fn>;
  let mockOnPrefilledMessageChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnModeChange = vi.fn();
    mockOnIceBreakersChange = vi.fn();
    mockOnPrefilledMessageChange = vi.fn();
  });

  const renderComponent = (props: Partial<{
    mode: MessageMode;
    iceBreakers: IceBreaker[];
    prefilledMessage: string;
  }> = {}) => {
    return render(
      <IceBreakersEditor
        mode={props.mode ?? 'ice_breakers'}
        iceBreakers={props.iceBreakers ?? []}
        prefilledMessage={props.prefilledMessage ?? ''}
        onModeChange={mockOnModeChange}
        onIceBreakersChange={mockOnIceBreakersChange}
        onPrefilledMessageChange={mockOnPrefilledMessageChange}
      />
    );
  };

  describe('Mode Selection', () => {
    it('renders both mode options', () => {
      renderComponent();

      expect(screen.getByText('Ice Breakers')).toBeInTheDocument();
      expect(screen.getByText('Pre-filled Message')).toBeInTheDocument();
    });

    it('shows ice breakers mode as selected when mode is ice_breakers', () => {
      renderComponent({ mode: 'ice_breakers' });

      const iceBreakersRadio = screen.getByLabelText(/ice breakers/i);
      expect(iceBreakersRadio).toBeChecked();
    });

    it('shows prefilled mode as selected when mode is prefilled', () => {
      renderComponent({ mode: 'prefilled' });

      const prefilledRadio = screen.getByLabelText(/pre-filled message/i);
      expect(prefilledRadio).toBeChecked();
    });

    it('calls onModeChange when switching modes', async () => {
      const user = userEvent.setup();
      renderComponent({ mode: 'ice_breakers' });

      // Click on prefilled option
      const prefilledLabel = screen.getByText('Pre-filled Message').closest('label');
      if (prefilledLabel) {
        await user.click(prefilledLabel);
      }

      expect(mockOnModeChange).toHaveBeenCalledWith('prefilled');
    });
  });

  describe('Ice Breakers Mode', () => {
    it('shows add ice breaker button in ice_breakers mode', () => {
      renderComponent({ mode: 'ice_breakers' });

      expect(screen.getByRole('button', { name: /add ice breaker/i })).toBeInTheDocument();
    });

    it('displays existing ice breakers', () => {
      const iceBreakers = [
        createMockIceBreaker({ title: 'Learn more' }),
        createMockIceBreaker({ title: 'Get pricing' }),
      ];

      renderComponent({ mode: 'ice_breakers', iceBreakers });

      expect(screen.getByDisplayValue('Learn more')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Get pricing')).toBeInTheDocument();
      expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    it('can add a new ice breaker', async () => {
      const user = userEvent.setup();
      renderComponent({ mode: 'ice_breakers', iceBreakers: [] });

      const addButton = screen.getByRole('button', { name: /add ice breaker/i });
      await user.click(addButton);

      expect(mockOnIceBreakersChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.any(String),
          title: '',
          payload: '',
        })
      ]);
    });

    it('can remove an ice breaker', async () => {
      const user = userEvent.setup();
      const iceBreaker = createMockIceBreaker({ title: 'Learn more' });
      
      renderComponent({ mode: 'ice_breakers', iceBreakers: [iceBreaker] });

      const removeButton = screen.getByRole('button', { name: /remove ice breaker/i });
      await user.click(removeButton);

      expect(mockOnIceBreakersChange).toHaveBeenCalledWith([]);
    });

    it('can edit ice breaker title', async () => {
      const user = userEvent.setup();
      const iceBreaker = createMockIceBreaker({ title: 'Learn more' });
      
      renderComponent({ mode: 'ice_breakers', iceBreakers: [iceBreaker] });

      const input = screen.getByDisplayValue('Learn more');
      await user.clear(input);
      await user.type(input, 'New title');

      expect(mockOnIceBreakersChange).toHaveBeenCalled();
    });

    it('shows character count for ice breaker title', () => {
      const iceBreaker = createMockIceBreaker({ title: 'Hello' });
      
      renderComponent({ mode: 'ice_breakers', iceBreakers: [iceBreaker] });

      expect(screen.getByText('5/20')).toBeInTheDocument();
    });

    it('shows error when title exceeds 20 characters', () => {
      const iceBreaker = createMockIceBreaker({ title: 'This is a very long title that exceeds the limit' });
      
      renderComponent({ mode: 'ice_breakers', iceBreakers: [iceBreaker] });

      expect(screen.getByText(/label exceeds 20 character limit/i)).toBeInTheDocument();
    });

    it('disables add button when 4 ice breakers exist', () => {
      const iceBreakers = Array.from({ length: 4 }, (_, i) => 
        createMockIceBreaker({ title: `Button ${i + 1}` })
      );

      renderComponent({ mode: 'ice_breakers', iceBreakers });

      const addButton = screen.getByRole('button', { name: /add ice breaker/i });
      expect(addButton).toBeDisabled();
      expect(screen.getByText('4 / 4')).toBeInTheDocument();
    });

    it('shows info alert when no ice breakers exist', () => {
      renderComponent({ mode: 'ice_breakers', iceBreakers: [] });

      expect(screen.getByText(/add at least one ice breaker button/i)).toBeInTheDocument();
    });
  });

  describe('Pre-filled Message Mode', () => {
    it('shows textarea in prefilled mode', () => {
      renderComponent({ mode: 'prefilled' });

      expect(screen.getByPlaceholderText(/hi! i'm interested/i)).toBeInTheDocument();
    });

    it('displays existing prefilled message', () => {
      renderComponent({ 
        mode: 'prefilled', 
        prefilledMessage: 'Hello, I need help!' 
      });

      expect(screen.getByDisplayValue('Hello, I need help!')).toBeInTheDocument();
    });

    it('can edit prefilled message', async () => {
      const user = userEvent.setup();
      renderComponent({ mode: 'prefilled', prefilledMessage: '' });

      const textarea = screen.getByPlaceholderText(/hi! i'm interested/i);
      await user.type(textarea, 'New message');

      expect(mockOnPrefilledMessageChange).toHaveBeenCalled();
    });

    it('shows character count for prefilled message', () => {
      renderComponent({ 
        mode: 'prefilled', 
        prefilledMessage: 'Hello' 
      });

      expect(screen.getByText('5/256')).toBeInTheDocument();
    });

    it('shows preview when message is entered', () => {
      renderComponent({ 
        mode: 'prefilled', 
        prefilledMessage: 'Hello, I would like to know more!' 
      });

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Hello, I would like to know more!')).toBeInTheDocument();
    });

    it('hides ice breakers UI in prefilled mode', () => {
      renderComponent({ mode: 'prefilled' });

      expect(screen.queryByRole('button', { name: /add ice breaker/i })).not.toBeInTheDocument();
    });
  });

  describe('Mutual Exclusivity Notice', () => {
    it('shows notice when switching to prefilled with existing ice breakers', () => {
      const iceBreakers = [createMockIceBreaker({ title: 'Test' })];
      
      renderComponent({ 
        mode: 'prefilled', 
        iceBreakers,
        prefilledMessage: '' 
      });

      expect(screen.getByText(/ice breakers will be disabled/i)).toBeInTheDocument();
    });

    it('shows notice when switching to ice breakers with existing prefilled message', () => {
      renderComponent({ 
        mode: 'ice_breakers', 
        iceBreakers: [],
        prefilledMessage: 'Existing message' 
      });

      expect(screen.getByText(/pre-filled message will be disabled/i)).toBeInTheDocument();
    });
  });

  describe('Message Type Info', () => {
    it('shows tooltip trigger for message type information', () => {
      renderComponent();

      expect(screen.getByText(/understanding message types and costs/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels for radio group', () => {
      renderComponent();

      expect(screen.getByRole('radiogroup', { name: /choose conversation starter type/i })).toBeInTheDocument();
    });

    it('has proper list structure for ice breakers', () => {
      const iceBreakers = [
        createMockIceBreaker({ title: 'Button 1' }),
        createMockIceBreaker({ title: 'Button 2' }),
      ];

      renderComponent({ mode: 'ice_breakers', iceBreakers });

      expect(screen.getByRole('list', { name: /ice breaker buttons/i })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });
});
