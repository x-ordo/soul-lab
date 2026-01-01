import React, { forwardRef, useId } from 'react';

export interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type' | 'size'> {
  label: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, description, error, size = 'md', id: providedId, disabled, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const descriptionId = `${id}-description`;
    const describedBy = [description && descriptionId, error && errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;
    const containerClasses = ['form-checkbox-container', `form-checkbox-container--${size}`, error && 'form-checkbox-container--error', disabled && 'form-checkbox-container--disabled'].filter(Boolean).join(' ');

    return (
      <div className="form-field">
        <label htmlFor={id} className={containerClasses}>
          <div className="form-checkbox-wrapper">
            <input ref={ref} type="checkbox" id={id} className="form-checkbox-input" disabled={disabled} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props} />
            <div className="form-checkbox-box" aria-hidden="true">
              <svg className="form-checkbox-check" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <div className="form-checkbox-content">
            <span className="form-checkbox-label">{label}</span>
            {description && <span id={descriptionId} className="form-checkbox-description">{description}</span>}
          </div>
        </label>
        {error && <div id={errorId} className="form-error-message" role="alert">{error}</div>}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
export default FormCheckbox;
