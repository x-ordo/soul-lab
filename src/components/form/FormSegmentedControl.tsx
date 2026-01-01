import React, { useId, useRef, useEffect, useState } from 'react';

export interface SegmentOption { value: string; label: string; disabled?: boolean; }

export interface FormSegmentedControlProps {
  label?: string;
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  'aria-label'?: string;
}

const FormSegmentedControl: React.FC<FormSegmentedControlProps> = ({ label, options, value, onChange, name: providedName, disabled = false, size = 'md', fullWidth = false, 'aria-label': ariaLabel }) => {
  const generatedName = useId();
  const groupName = providedName || generatedName;
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const selectedIndex = options.findIndex((opt) => opt.value === value);
    if (selectedIndex === -1) { setIndicatorStyle({ opacity: 0 }); return; }
    const buttons = containerRef.current.querySelectorAll<HTMLLabelElement>('.form-segment-option');
    const selectedButton = buttons[selectedIndex];
    if (selectedButton) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();
      setIndicatorStyle({ width: buttonRect.width, transform: `translateX(${buttonRect.left - containerRect.left}px)`, opacity: 1 });
    }
  }, [value, options]);

  const containerClasses = ['form-segmented-control', `form-segmented-control--${size}`, fullWidth && 'form-segmented-control--full', disabled && 'form-segmented-control--disabled'].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      {label && <div className="form-label">{label}</div>}
      <div ref={containerRef} className={containerClasses} role="radiogroup" aria-label={ariaLabel || label}>
        <div className="form-segment-indicator" style={indicatorStyle} aria-hidden="true" />
        {options.map((option) => {
          const isSelected = option.value === value;
          const isDisabled = disabled || option.disabled;
          const optionId = `${groupName}-${option.value}`;
          return (
            <label key={option.value} htmlFor={optionId} className={['form-segment-option', isSelected && 'form-segment-option--selected', isDisabled && 'form-segment-option--disabled'].filter(Boolean).join(' ')}>
              <input type="radio" id={optionId} name={groupName} value={option.value} checked={isSelected} disabled={isDisabled} onChange={() => onChange(option.value)} className="form-segment-input" />
              <span className="form-segment-label">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

FormSegmentedControl.displayName = 'FormSegmentedControl';
export default FormSegmentedControl;
