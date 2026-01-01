import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FormTextarea from './FormTextarea';

describe('FormTextarea', () => {
  describe('Basic Rendering', () => {
    it('renders without label', () => {
      render(<FormTextarea placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<FormTextarea label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with default rows', () => {
      render(<FormTextarea data-testid="textarea" />);
      expect(screen.getByTestId('textarea')).toHaveAttribute('rows', '3');
    });

    it('renders with custom minRows', () => {
      render(<FormTextarea data-testid="textarea" minRows={5} />);
      expect(screen.getByTestId('textarea')).toHaveAttribute('rows', '5');
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<FormTextarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('has error class when error provided', () => {
      render(<FormTextarea data-testid="textarea" error="Error" />);
      expect(screen.getByTestId('textarea')).toHaveClass('form-textarea--error');
    });

    it('sets aria-invalid when error provided', () => {
      render(<FormTextarea data-testid="textarea" error="Error" />);
      expect(screen.getByTestId('textarea')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error message has alert role', () => {
      render(<FormTextarea error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });

  describe('Success State', () => {
    it('has success class when success is true', () => {
      render(<FormTextarea data-testid="textarea" success />);
      expect(screen.getByTestId('textarea')).toHaveClass('form-textarea--success');
    });
  });

  describe('Character Counter', () => {
    it('shows character counter when maxLength provided', () => {
      render(<FormTextarea maxLength={100} defaultValue="Hello" />);
      expect(screen.getByText('5 / 100')).toBeInTheDocument();
    });

    it('updates counter on input', () => {
      render(<FormTextarea maxLength={50} data-testid="textarea" />);
      const textarea = screen.getByTestId('textarea');
      fireEvent.change(textarea, { target: { value: 'Test input' } });
      expect(screen.getByText('10 / 50')).toBeInTheDocument();
    });

    it('shows progress bar when maxLength provided', () => {
      render(<FormTextarea maxLength={100} defaultValue="Test" />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('hides progress bar when showProgress is false', () => {
      render(<FormTextarea maxLength={100} showProgress={false} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Progress States', () => {
    it('shows warning state at 80% threshold', () => {
      render(<FormTextarea maxLength={100} defaultValue={'x'.repeat(80)} />);
      expect(screen.getByText('80 / 100')).toHaveClass('form-textarea-counter--warning');
    });

    it('shows danger state at 95% threshold', () => {
      render(<FormTextarea maxLength={100} defaultValue={'x'.repeat(95)} />);
      expect(screen.getByText('95 / 100')).toHaveClass('form-textarea-counter--danger');
    });

    it('respects custom warning threshold', () => {
      render(<FormTextarea maxLength={100} warningThreshold={0.5} defaultValue={'x'.repeat(50)} />);
      expect(screen.getByText('50 / 100')).toHaveClass('form-textarea-counter--warning');
    });

    it('respects custom danger threshold', () => {
      render(<FormTextarea maxLength={100} dangerThreshold={0.7} defaultValue={'x'.repeat(70)} />);
      expect(screen.getByText('70 / 100')).toHaveClass('form-textarea-counter--danger');
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as controlled component', () => {
      const handleChange = vi.fn();
      render(<FormTextarea value="controlled" onChange={handleChange} data-testid="textarea" />);
      expect(screen.getByTestId('textarea')).toHaveValue('controlled');
    });

    it('works as uncontrolled component with defaultValue', () => {
      render(<FormTextarea defaultValue="default" data-testid="textarea" />);
      expect(screen.getByTestId('textarea')).toHaveValue('default');
    });

    it('calls onChange handler', () => {
      const handleChange = vi.fn();
      render(<FormTextarea onChange={handleChange} data-testid="textarea" />);
      fireEvent.change(screen.getByTestId('textarea'), { target: { value: 'new' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('disables textarea when disabled prop is true', () => {
      render(<FormTextarea disabled data-testid="textarea" />);
      expect(screen.getByTestId('textarea')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('associates label with textarea', () => {
      render(<FormTextarea label="Comments" />);
      const textarea = screen.getByLabelText('Comments');
      expect(textarea).toBeInTheDocument();
    });

    it('sets aria-describedby for error and counter', () => {
      render(<FormTextarea label="Text" error="Error" maxLength={100} />);
      const textarea = screen.getByLabelText('Text');
      expect(textarea).toHaveAttribute('aria-describedby');
    });

    it('counter has aria-live polite', () => {
      render(<FormTextarea maxLength={100} />);
      const counter = screen.getByText(/\/ 100/);
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });
  });
});
