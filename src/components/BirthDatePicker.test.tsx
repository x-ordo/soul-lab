import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BirthDatePicker from './BirthDatePicker';
import type { BirthInfo } from '../lib/storage';

const defaultValue: BirthInfo = {
  yyyymmdd: '',
  calendar: 'solar',
  leapMonth: false,
};

const filledValue: BirthInfo = {
  yyyymmdd: '19901225',
  calendar: 'solar',
  leapMonth: false,
};

// Helper to get selects by id
const getYearSelect = () => document.getElementById('birth-year') as HTMLSelectElement;
const getMonthSelect = () => document.getElementById('birth-month') as HTMLSelectElement;
const getDaySelect = () => document.getElementById('birth-day') as HTMLSelectElement;

describe('BirthDatePicker', () => {
  describe('Basic Rendering', () => {
    it('renders year, month, day selects', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(getYearSelect()).toBeInTheDocument();
      expect(getMonthSelect()).toBeInTheDocument();
      expect(getDaySelect()).toBeInTheDocument();
    });

    it('renders calendar type segmented control', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(screen.getByRole('radiogroup', { name: /양력\/음력 선택/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '양력' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '음력' })).toBeInTheDocument();
    });

    it('has fieldset with sr-only legend', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(screen.getByRole('group', { name: '생년월일 선택' })).toBeInTheDocument();
    });

    it('renders placeholder options', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(within(getYearSelect()).getByText('년')).toBeInTheDocument();
      expect(within(getMonthSelect()).getByText('월')).toBeInTheDocument();
      expect(within(getDaySelect()).getByText('일')).toBeInTheDocument();
    });
  });

  describe('Calendar Type Selection', () => {
    it('solar is selected by default', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(screen.getByRole('radio', { name: '양력' })).toBeChecked();
    });

    it('calls onChange when switching to lunar', () => {
      const handleChange = vi.fn();
      render(<BirthDatePicker value={defaultValue} onChange={handleChange} />);
      fireEvent.click(screen.getByRole('radio', { name: '음력' }));
      expect(handleChange).toHaveBeenCalledWith({
        ...defaultValue,
        calendar: 'lunar',
        leapMonth: false,
      });
    });

    it('shows leap month checkbox when lunar selected', () => {
      const lunarValue: BirthInfo = { ...defaultValue, calendar: 'lunar' };
      render(<BirthDatePicker value={lunarValue} onChange={() => {}} />);
      expect(screen.getByRole('checkbox', { name: '윤달' })).toBeInTheDocument();
    });

    it('hides leap month checkbox when solar selected', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(screen.queryByRole('checkbox', { name: '윤달' })).not.toBeInTheDocument();
    });

    it('calls onChange when toggling leap month', () => {
      const handleChange = vi.fn();
      const lunarValue: BirthInfo = { ...defaultValue, calendar: 'lunar' };
      render(<BirthDatePicker value={lunarValue} onChange={handleChange} />);
      fireEvent.click(screen.getByRole('checkbox', { name: '윤달' }));
      expect(handleChange).toHaveBeenCalledWith({
        ...lunarValue,
        leapMonth: true,
      });
    });
  });

  describe('Date Selection', () => {
    it('displays parsed date values', () => {
      render(<BirthDatePicker value={filledValue} onChange={() => {}} />);
      expect(getYearSelect()).toHaveValue('1990');
      expect(getMonthSelect()).toHaveValue('12');
      expect(getDaySelect()).toHaveValue('25');
    });

    it('calls onChange when year changes', () => {
      const handleChange = vi.fn();
      render(<BirthDatePicker value={filledValue} onChange={handleChange} />);
      fireEvent.change(getYearSelect(), { target: { value: '1995' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...filledValue,
        yyyymmdd: '19951225',
      });
    });

    it('calls onChange when month changes', () => {
      const handleChange = vi.fn();
      render(<BirthDatePicker value={filledValue} onChange={handleChange} />);
      fireEvent.change(getMonthSelect(), { target: { value: '6' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...filledValue,
        yyyymmdd: '19900625',
      });
    });

    it('calls onChange when day changes', () => {
      const handleChange = vi.fn();
      render(<BirthDatePicker value={filledValue} onChange={handleChange} />);
      fireEvent.change(getDaySelect(), { target: { value: '15' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...filledValue,
        yyyymmdd: '19901215',
      });
    });
  });

  describe('Day Adjustment', () => {
    it('adjusts day when month changes to shorter month', () => {
      const handleChange = vi.fn();
      const jan31: BirthInfo = { ...defaultValue, yyyymmdd: '19900131' };
      render(<BirthDatePicker value={jan31} onChange={handleChange} />);
      // Change to February (28 days in 1990)
      fireEvent.change(getMonthSelect(), { target: { value: '2' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...jan31,
        yyyymmdd: '19900228', // Day adjusted from 31 to 28
      });
    });

    it('shows correct days for February in leap year', () => {
      const feb2000: BirthInfo = { ...defaultValue, yyyymmdd: '20000201' };
      render(<BirthDatePicker value={feb2000} onChange={() => {}} />);
      // 2000 is a leap year, February should have 29 days
      const daySelect = getDaySelect();
      expect(daySelect.querySelectorAll('option')).toHaveLength(30); // 29 days + placeholder
    });

    it('shows 28 days for February in non-leap year', () => {
      const feb1990: BirthInfo = { ...defaultValue, yyyymmdd: '19900201' };
      render(<BirthDatePicker value={feb1990} onChange={() => {}} />);
      const daySelect = getDaySelect();
      expect(daySelect.querySelectorAll('option')).toHaveLength(29); // 28 days + placeholder
    });
  });

  describe('Error State', () => {
    it('displays error message when error is true', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} error errorMessage="생년월일을 선택해주세요" />);
      expect(screen.getByText('생년월일을 선택해주세요')).toBeInTheDocument();
      expect(screen.getByText('생년월일을 선택해주세요').closest('[role="alert"]')).toBeInTheDocument();
    });

    it('applies error styling to selects', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} error errorMessage="Error" />);
      expect(getYearSelect()).toHaveClass('form-select--error');
    });

    it('sets aria-describedby on selects when error', () => {
      render(<BirthDatePicker value={defaultValue} onChange={() => {}} error errorMessage="Error" />);
      const describedBy = getYearSelect().getAttribute('aria-describedby');
      expect(describedBy).toContain('birthdate-error');
    });
  });

  describe('Partial Date Handling', () => {
    it('handles year only selection', () => {
      const handleChange = vi.fn();
      render(<BirthDatePicker value={defaultValue} onChange={handleChange} />);
      fireEvent.change(getYearSelect(), { target: { value: '1990' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...defaultValue,
        yyyymmdd: '19900000',
      });
    });

    it('handles year and month selection', () => {
      const handleChange = vi.fn();
      const yearOnly: BirthInfo = { ...defaultValue, yyyymmdd: '19900000' };
      render(<BirthDatePicker value={yearOnly} onChange={handleChange} />);
      fireEvent.change(getMonthSelect(), { target: { value: '6' } });
      expect(handleChange).toHaveBeenCalledWith({
        ...yearOnly,
        yyyymmdd: '19900600',
      });
    });
  });

  describe('Form Components Integration', () => {
    it('uses FormSegmentedControl for calendar type', () => {
      const { container } = render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(container.querySelector('.form-segmented-control')).toBeInTheDocument();
    });

    it('uses FormSelect for date dropdowns', () => {
      const { container } = render(<BirthDatePicker value={defaultValue} onChange={() => {}} />);
      expect(container.querySelectorAll('.form-select')).toHaveLength(3);
    });

    it('uses FormCheckbox for leap month', () => {
      const lunarValue: BirthInfo = { ...defaultValue, calendar: 'lunar' };
      const { container } = render(<BirthDatePicker value={lunarValue} onChange={() => {}} />);
      expect(container.querySelector('.form-checkbox-input')).toBeInTheDocument();
    });

    it('applies glow effect on selected values', () => {
      render(<BirthDatePicker value={filledValue} onChange={() => {}} />);
      expect(getYearSelect()).toHaveClass('form-select--selected');
    });
  });
});
