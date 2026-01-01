import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormSegmentedControl from './FormSegmentedControl';

const defaultOptions = [
  { value: 'solar', label: '양력' },
  { value: 'lunar', label: '음력' },
];

describe('FormSegmentedControl', () => {
  describe('Basic Rendering', () => {
    it('renders all options', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByText('양력')).toBeInTheDocument();
      expect(screen.getByText('음력')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<FormSegmentedControl label="Calendar Type" options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByText('Calendar Type')).toBeInTheDocument();
    });

    it('has radiogroup role', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('sets aria-label from label prop', () => {
      render(<FormSegmentedControl label="Type" options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Type');
    });

    it('sets aria-label from aria-label prop', () => {
      render(<FormSegmentedControl aria-label="Custom Label" options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  describe('Selection', () => {
    it('shows selected option as checked', () => {
      render(<FormSegmentedControl options={defaultOptions} value="lunar" onChange={() => {}} />);
      const lunarRadio = screen.getByRole('radio', { name: '음력' });
      expect(lunarRadio).toBeChecked();
    });

    it('calls onChange when option clicked', () => {
      const handleChange = vi.fn();
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={handleChange} />);
      fireEvent.click(screen.getByText('음력'));
      expect(handleChange).toHaveBeenCalledWith('lunar');
    });

    it('has selected class on selected option', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      const solarLabel = screen.getByText('양력').closest('label');
      expect(solarLabel).toHaveClass('form-segment-option--selected');
    });
  });

  describe('Disabled State', () => {
    it('disables all options when disabled', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} disabled />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => expect(radio).toBeDisabled());
    });

    it('has disabled class on container when disabled', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} disabled />);
      expect(screen.getByRole('radiogroup')).toHaveClass('form-segmented-control--disabled');
    });

    it('disables individual option', () => {
      const optionsWithDisabled = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
      ];
      render(<FormSegmentedControl options={optionsWithDisabled} value="a" onChange={() => {}} />);
      expect(screen.getByRole('radio', { name: 'B' })).toBeDisabled();
    });

    it('has disabled class on disabled option label', () => {
      const optionsWithDisabled = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
      ];
      render(<FormSegmentedControl options={optionsWithDisabled} value="a" onChange={() => {}} />);
      const disabledLabel = screen.getByText('B').closest('label');
      expect(disabledLabel).toHaveClass('form-segment-option--disabled');
    });
  });

  describe('Sizes', () => {
    it('applies sm size class', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} size="sm" />);
      expect(screen.getByRole('radiogroup')).toHaveClass('form-segmented-control--sm');
    });

    it('applies md size class by default', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByRole('radiogroup')).toHaveClass('form-segmented-control--md');
    });

    it('applies lg size class', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} size="lg" />);
      expect(screen.getByRole('radiogroup')).toHaveClass('form-segmented-control--lg');
    });
  });

  describe('Full Width', () => {
    it('applies full width class when fullWidth is true', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} fullWidth />);
      expect(screen.getByRole('radiogroup')).toHaveClass('form-segmented-control--full');
    });

    it('does not apply full width class by default', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(screen.getByRole('radiogroup')).not.toHaveClass('form-segmented-control--full');
    });
  });

  describe('Radio Input Accessibility', () => {
    it('renders radio inputs for each option', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);
    });

    it('radio inputs have same name', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} name="calendar" />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => expect(radio).toHaveAttribute('name', 'calendar'));
    });

    it('generates name when not provided', () => {
      render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      const radios = screen.getAllByRole('radio');
      const name = radios[0].getAttribute('name');
      expect(name).toBeTruthy();
      radios.forEach((radio) => expect(radio).toHaveAttribute('name', name));
    });
  });

  describe('Indicator', () => {
    it('renders indicator element', () => {
      const { container } = render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(container.querySelector('.form-segment-indicator')).toBeInTheDocument();
    });

    it('indicator is aria-hidden', () => {
      const { container } = render(<FormSegmentedControl options={defaultOptions} value="solar" onChange={() => {}} />);
      expect(container.querySelector('.form-segment-indicator')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
