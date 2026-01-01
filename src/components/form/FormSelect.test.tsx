import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormSelect from './FormSelect';

const defaultOptions = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
  { value: 'opt3', label: 'Option 3' },
];

describe('FormSelect', () => {
  describe('Basic Rendering', () => {
    it('renders without label', () => {
      render(<FormSelect options={defaultOptions} data-testid="select" />);
      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<FormSelect label="Choose option" options={defaultOptions} />);
      expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<FormSelect options={defaultOptions} />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<FormSelect options={defaultOptions} placeholder="Select an option" />);
      expect(screen.getByText('Select an option')).toBeInTheDocument();
    });

    it('placeholder is disabled', () => {
      render(<FormSelect options={defaultOptions} placeholder="Select..." data-testid="select" />);
      const placeholder = screen.getByText('Select...') as HTMLOptionElement;
      expect(placeholder).toHaveAttribute('disabled');
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<FormSelect options={defaultOptions} error="Please select an option" />);
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    it('has error class when error provided', () => {
      render(<FormSelect options={defaultOptions} error="Error" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('form-select--error');
    });

    it('sets aria-invalid when error provided', () => {
      render(<FormSelect options={defaultOptions} error="Error" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error message has alert role', () => {
      render(<FormSelect options={defaultOptions} error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });

  describe('Success State', () => {
    it('has success class when success is true', () => {
      render(<FormSelect options={defaultOptions} success data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('form-select--success');
    });
  });

  describe('Value Selection', () => {
    it('displays selected value', () => {
      render(<FormSelect options={defaultOptions} value="opt2" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveValue('opt2');
    });

    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<FormSelect options={defaultOptions} onChange={handleChange} data-testid="select" />);
      fireEvent.change(screen.getByTestId('select'), { target: { value: 'opt3' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('has selected glow class when value selected', () => {
      render(<FormSelect options={defaultOptions} value="opt1" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('form-select--selected');
    });

    it('has placeholder class when no value', () => {
      render(<FormSelect options={defaultOptions} value="" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('form-select--placeholder');
    });
  });

  describe('Disabled Options', () => {
    it('renders disabled option', () => {
      const optionsWithDisabled = [
        { value: 'opt1', label: 'Option 1' },
        { value: 'opt2', label: 'Option 2', disabled: true },
      ];
      render(<FormSelect options={optionsWithDisabled} />);
      const disabledOption = screen.getByText('Option 2') as HTMLOptionElement;
      expect(disabledOption).toHaveAttribute('disabled');
    });
  });

  describe('Disabled State', () => {
    it('disables select when disabled prop is true', () => {
      render(<FormSelect options={defaultOptions} disabled data-testid="select" />);
      expect(screen.getByTestId('select')).toBeDisabled();
    });
  });

  describe('Glow Effect', () => {
    it('shows glow by default when value selected', () => {
      render(<FormSelect options={defaultOptions} value="opt1" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('form-select--selected');
    });

    it('hides glow when showGlow is false', () => {
      render(<FormSelect options={defaultOptions} value="opt1" showGlow={false} data-testid="select" />);
      expect(screen.getByTestId('select')).not.toHaveClass('form-select--selected');
    });
  });

  describe('Accessibility', () => {
    it('associates label with select', () => {
      render(<FormSelect label="Category" options={defaultOptions} />);
      const select = screen.getByLabelText('Category');
      expect(select).toBeInTheDocument();
    });

    it('sets aria-describedby for error', () => {
      render(<FormSelect label="Category" options={defaultOptions} error="Required" />);
      const select = screen.getByLabelText('Category');
      expect(select).toHaveAttribute('aria-describedby');
    });
  });
});
