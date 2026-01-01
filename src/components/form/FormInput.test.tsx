import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormInput from './FormInput';

describe('FormInput', () => {
  describe('rendering', () => {
    it('renders input element', () => {
      render(<FormInput aria-label="Test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<FormInput label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<FormInput placeholder="Enter text" aria-label="Test" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message', () => {
      render(<FormInput error="Invalid input" aria-label="Test" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid input');
    });

    it('sets aria-invalid when error is present', () => {
      render(<FormInput error="Error" aria-label="Test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('applies shake animation class when shake and error are true', () => {
      render(<FormInput error="Error" shake aria-label="Test" />);
      expect(screen.getByRole('textbox')).toHaveClass('form-shake');
    });

    it('does not apply shake class without error', () => {
      render(<FormInput shake aria-label="Test" />);
      expect(screen.getByRole('textbox')).not.toHaveClass('form-shake');
    });
  });

  describe('success state', () => {
    it('applies success class when success is true', () => {
      render(<FormInput success aria-label="Test" />);
      expect(screen.getByRole('textbox')).toHaveClass('form-input--success');
    });
  });

  describe('password toggle', () => {
    it('renders password toggle button for password inputs', () => {
      render(<FormInput type="password" showPasswordToggle aria-label="Password" />);
      expect(screen.getByRole('button', { name: /비밀번호 보기/i })).toBeInTheDocument();
    });

    it('does not render password toggle for non-password inputs', () => {
      render(<FormInput type="text" showPasswordToggle aria-label="Text" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('toggles password visibility on button click', () => {
      render(<FormInput type="password" showPasswordToggle aria-label="Password" />);
      const input = screen.getByLabelText('Password');
      const button = screen.getByRole('button');

      expect(input).toHaveAttribute('type', 'password');

      fireEvent.click(button);
      expect(input).toHaveAttribute('type', 'text');

      fireEvent.click(button);
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<FormInput disabled aria-label="Test" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('controlled input', () => {
    it('updates value on change', () => {
      const handleChange = vi.fn();
      render(<FormInput value="test" onChange={handleChange} aria-label="Test" />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('connects label to input via htmlFor', () => {
      render(<FormInput label="Username" id="username" />);
      const label = screen.getByText('Username');
      const input = screen.getByLabelText('Username');
      expect(label).toHaveAttribute('for', 'username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('associates error message via aria-describedby', () => {
      render(<FormInput error="Error" id="test" aria-label="Test" />);
      const input = screen.getByRole('textbox');
      const errorId = input.getAttribute('aria-describedby');
      expect(document.getElementById(errorId!)).toHaveTextContent('Error');
    });
  });
});
