import React, { forwardRef, useState, useId, useCallback } from 'react';

export interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  error?: string;
  success?: boolean;
  showProgress?: boolean;
  warningThreshold?: number;
  dangerThreshold?: number;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, success, maxLength, showProgress = true, warningThreshold = 0.8, dangerThreshold = 0.95, autoResize, minRows = 3, maxRows = 10, id: providedId, 'aria-describedby': ariaDescribedBy, disabled, value, defaultValue, onChange, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const counterId = `${id}-counter`;
    const [internalValue, setInternalValue] = useState(defaultValue?.toString() || '');
    const currentValue = value !== undefined ? value.toString() : internalValue;
    const charCount = currentValue.length;

    const getProgressState = useCallback(() => {
      if (!maxLength) return 'normal';
      const ratio = charCount / maxLength;
      if (ratio >= dangerThreshold) return 'danger';
      if (ratio >= warningThreshold) return 'warning';
      return 'normal';
    }, [charCount, maxLength, warningThreshold, dangerThreshold]);

    const progressState = getProgressState();
    const progressPercent = maxLength ? Math.min((charCount / maxLength) * 100, 100) : 0;

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (value === undefined) setInternalValue(e.target.value);
      onChange?.(e);
      if (autoResize && e.target) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
        const minHeight = lineHeight * minRows;
        const maxHeight = lineHeight * maxRows;
        textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`;
      }
    }, [value, onChange, autoResize, minRows, maxRows]);

    const textareaClasses = ['form-textarea', error && 'form-textarea--error', success && 'form-textarea--success'].filter(Boolean).join(' ');
    const progressClasses = ['form-textarea-progress-fill', progressState === 'warning' && 'form-textarea-progress-fill--warning', progressState === 'danger' && 'form-textarea-progress-fill--danger'].filter(Boolean).join(' ');
    const counterClasses = ['form-textarea-counter', progressState === 'warning' && 'form-textarea-counter--warning', progressState === 'danger' && 'form-textarea-counter--danger'].filter(Boolean).join(' ');
    const describedBy = [error && errorId, maxLength && counterId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div className="form-field">
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <textarea ref={ref} id={id} className={textareaClasses} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} disabled={disabled} value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={handleChange} rows={minRows} maxLength={maxLength} {...props} />
        {maxLength && (
          <div className="form-textarea-footer">
            {showProgress && <div className="form-textarea-progress"><div className={progressClasses} style={{ width: `${progressPercent}%` }} role="progressbar" aria-valuenow={charCount} aria-valuemin={0} aria-valuemax={maxLength} /></div>}
            <div id={counterId} className={counterClasses} aria-live="polite">{charCount} / {maxLength}</div>
          </div>
        )}
        {error && <div id={errorId} className="form-error-message" role="alert">{error}</div>}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';
export default FormTextarea;
