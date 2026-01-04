import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MultiLocationPicker } from '../whatsapp_automation/components/MultiLocationPicker';
import type { AudienceLocation } from '../whatsapp_automation/types';

// ============================================================
// Mock Data
// ============================================================

const createMockLocation = (overrides: Partial<AudienceLocation> = {}): AudienceLocation => ({
  id: `loc_${Math.random().toString(36).substr(2, 9)}`,
  query: 'Mumbai',
  type: 'city',
  city: 'Mumbai',
  country: 'India',
  lat: 19.076,
  lon: 72.8777,
  radius_meters: 25000,
  included: true,
  ...overrides,
});

// ============================================================
// Tests
// ============================================================

describe('MultiLocationPicker', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  it('renders with no locations and shows add button', () => {
    render(
      <MultiLocationPicker
        locations={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Target Locations')).toBeInTheDocument();
    expect(screen.getByText(/Add another location/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('can add a new location', async () => {
    const user = userEvent.setup();
    
    render(
      <MultiLocationPicker
        locations={[]}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add another location/i });
    await user.click(addButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    const newLocations = mockOnChange.mock.calls[0][0];
    expect(newLocations).toHaveLength(1);
    expect(newLocations[0]).toHaveProperty('id');
    expect(newLocations[0]).toHaveProperty('included', true);
  });

  it('displays existing locations', () => {
    const locations = [
      createMockLocation({ query: 'Mumbai' }),
      createMockLocation({ query: 'Delhi' }),
    ];

    render(
      <MultiLocationPicker
        locations={locations}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('2 / 10')).toBeInTheDocument();
    // The inputs should have the location queries as values
    const inputs = screen.getAllByPlaceholderText(/enter city, region, or country/i);
    expect(inputs).toHaveLength(2);
  });

  it('can remove a location', async () => {
    const user = userEvent.setup();
    const location = createMockLocation({ query: 'Mumbai' });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove location/i });
    await user.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('can edit location query', async () => {
    const user = userEvent.setup();
    const location = createMockLocation({ query: 'Mumbai' });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    const input = screen.getByDisplayValue('Mumbai');
    await user.clear(input);
    await user.type(input, 'Bangalore');

    // onChange should be called for each character typed
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('disables add button when max locations (10) reached', () => {
    const locations = Array.from({ length: 10 }, (_, i) => 
      createMockLocation({ query: `Location ${i + 1}` })
    );

    render(
      <MultiLocationPicker
        locations={locations}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByRole('button', { name: /add another location/i });
    expect(addButton).toBeDisabled();
    expect(screen.getByText('10 / 10')).toBeInTheDocument();
    expect(screen.getByText(/maximum of 10 locations reached/i)).toBeInTheDocument();
  });

  it('shows alert when no locations exist', () => {
    render(
      <MultiLocationPicker
        locations={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/at least one location is required/i)).toBeInTheDocument();
  });

  it('can toggle include/exclude for a location', async () => {
    const user = userEvent.setup();
    const location = createMockLocation({ included: true });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    // Find the checkbox by its label
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith([
      expect.objectContaining({ included: false })
    ]);
  });

  it('shows map button for each location', () => {
    const location = createMockLocation({ query: 'Mumbai' });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByRole('button', { name: /set on map/i })).toBeInTheDocument();
  });

  it('displays radius information', () => {
    const location = createMockLocation({ 
      query: 'Mumbai',
      radius_meters: 30000 // 30km
    });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/radius: 30 km/i)).toBeInTheDocument();
  });

  it('respects custom maxLocations prop', () => {
    const locations = Array.from({ length: 5 }, (_, i) => 
      createMockLocation({ query: `Location ${i + 1}` })
    );

    render(
      <MultiLocationPicker
        locations={locations}
        onChange={mockOnChange}
        maxLocations={5}
      />
    );

    const addButton = screen.getByRole('button', { name: /add another location/i });
    expect(addButton).toBeDisabled();
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('opens map modal when Set on Map is clicked', async () => {
    const user = userEvent.setup();
    const location = createMockLocation({ query: 'Mumbai' });

    render(
      <MultiLocationPicker
        locations={[location]}
        onChange={mockOnChange}
      />
    );

    const mapButton = screen.getByRole('button', { name: /set on map/i });
    await user.click(mapButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText(/Set Location Radius/i)).toBeInTheDocument();
    });
  });
});
