import React, { forwardRef, useId } from 'react';

export interface FormSelectOption { value: string; label: string; disabled?: boolean; }

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  success?: boolean;
  options: FormSelectOption[];
  placeholder?: string;
  showGlow?: boolean;
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, success, options, placeholder, showGlow = true, id: providedId, 'aria-describedby': ariaDescribedBy, disabled, value, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hasValue = value !== undefined && value !== '';
    const selectClasses = ['form-select', error && 'form-select--error', success && 'form-select--success', hasValue && showGlow && 'form-select--selected', !hasValue && 'form-select--placeholder'].filter(Boolean).join(' ');
    const describedBy = [error && errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div className="form-field">
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <div className="form-select-wrapper">
          <select ref={ref} id={id} className={selectClasses} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} disabled={disabled} value={value} {...props}>
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </select>
          <div className="form-select-arrow" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        {error && <div id={errorId} className="form-error-message" role="alert">{error}</div>}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
export default FormSelect;
