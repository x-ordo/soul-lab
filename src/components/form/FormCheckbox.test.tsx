import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormCheckbox from './FormCheckbox';

describe('FormCheckbox', () => {
  describe('Basic Rendering', () => {
    it('renders with label', () => {
      render(<FormCheckbox label="Accept terms" />);
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('renders checkbox input', () => {
      render(<FormCheckbox label="Check me" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<FormCheckbox label="Newsletter" description="Receive weekly updates" />);
      expect(screen.getByText('Receive weekly updates')).toBeInTheDocument();
    });
  });

  describe('Checked State', () => {
    it('is unchecked by default', () => {
      render(<FormCheckbox label="Option" />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('can be checked', () => {
      render(<FormCheckbox label="Option" defaultChecked />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<FormCheckbox label="Option" onChange={handleChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalled();
    });

    it('works as controlled component', () => {
      const handleChange = vi.fn();
      render(<FormCheckbox label="Option" checked={true} onChange={handleChange} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<FormCheckbox label="Terms" error="You must accept the terms" />);
      expect(screen.getByText('You must accept the terms')).toBeInTheDocument();
    });

    it('has error class when error provided', () => {
      const { container } = render(<FormCheckbox label="Terms" error="Error" />);
      expect(container.querySelector('.form-checkbox-container--error')).toBeInTheDocument();
    });

    it('sets aria-invalid when error provided', () => {
      render(<FormCheckbox label="Terms" error="Error" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error message has alert role', () => {
      render(<FormCheckbox label="Terms" error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });

  describe('Disabled State', () => {
    it('disables checkbox when disabled prop is true', () => {
      render(<FormCheckbox label="Option" disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('has disabled class on container when disabled', () => {
      const { container } = render(<FormCheckbox label="Option" disabled />);
      expect(container.querySelector('.form-checkbox-container--disabled')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies sm size class', () => {
      const { container } = render(<FormCheckbox label="Option" size="sm" />);
      expect(container.querySelector('.form-checkbox-container--sm')).toBeInTheDocument();
    });

    it('applies md size class by default', () => {
      const { container } = render(<FormCheckbox label="Option" />);
      expect(container.querySelector('.form-checkbox-container--md')).toBeInTheDocument();
    });

    it('applies lg size class', () => {
      const { container } = render(<FormCheckbox label="Option" size="lg" />);
      expect(container.querySelector('.form-checkbox-container--lg')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('associates label with checkbox', () => {
      render(<FormCheckbox label="Accept" />);
      const checkbox = screen.getByLabelText('Accept');
      expect(checkbox).toBeInTheDocument();
    });

    it('sets aria-describedby for description', () => {
      render(<FormCheckbox label="Newsletter" description="Weekly emails" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby');
    });

    it('sets aria-describedby for error', () => {
      render(<FormCheckbox label="Terms" error="Required" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby');
    });

    it('sets aria-describedby for both description and error', () => {
      render(<FormCheckbox label="Terms" description="Read carefully" error="Required" />);
      const checkbox = screen.getByRole('checkbox');
      const describedBy = checkbox.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(describedBy!.split(' ').length).toBeGreaterThanOrEqual(2);
    });

    it('clicking label toggles checkbox', () => {
      render(<FormCheckbox label="Option" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(screen.getByText('Option'));
      expect(checkbox).toBeChecked();
    });
  });

  describe('Custom ID', () => {
    it('uses provided id', () => {
      render(<FormCheckbox label="Option" id="custom-id" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id');
    });

    it('generates id when not provided', () => {
      render(<FormCheckbox label="Option" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('id');
    });
  });

  describe('Check Icon', () => {
    it('renders check icon svg', () => {
      const { container } = render(<FormCheckbox label="Option" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('check icon container is aria-hidden', () => {
      const { container } = render(<FormCheckbox label="Option" />);
      expect(container.querySelector('.form-checkbox-box')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
