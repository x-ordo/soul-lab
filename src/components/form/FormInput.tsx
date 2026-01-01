import React, { forwardRef, useState, useId } from 'react';

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  success?: boolean;
  shake?: boolean;
  showPasswordToggle?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, success, shake, showPasswordToggle, type = 'text', id: providedId, 'aria-describedby': ariaDescribedBy, disabled, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordField = type === 'password';
    const actualType = isPasswordField && showPassword ? 'text' : type;
    const inputClasses = ['form-input', error && 'form-input--error', success && 'form-input--success', shake && error && 'form-shake'].filter(Boolean).join(' ');
    const describedBy = [error && errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <div className="form-field">
        {label && <label htmlFor={id} className="form-label">{label}</label>}
        <div className={isPasswordField && showPasswordToggle ? 'form-password-wrapper' : undefined}>
          <input ref={ref} id={id} type={actualType} className={inputClasses} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} disabled={disabled} style={isPasswordField && showPasswordToggle ? { paddingRight: '48px' } : undefined} {...props} />
          {isPasswordField && showPasswordToggle && (
            <button type="button" className="form-password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          )}
        </div>
        {error && <div id={errorId} className="form-error-message" role="alert">{error}</div>}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
export default FormInput;
