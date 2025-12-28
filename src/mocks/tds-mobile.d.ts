// Type declarations for @toss/tds-mobile mock
declare module '@toss/tds-mobile' {
  import * as React from 'react';

  interface ButtonProps {
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    color?: 'primary' | 'dark' | 'danger' | 'light';
    variant?: 'fill' | 'weak';
    display?: 'inline' | 'block' | 'full';
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
    style?: React.CSSProperties;
  }

  export function Button(props: ButtonProps): React.ReactElement;

  interface BadgeProps {
    children: React.ReactNode;
    size?: 'xsmall' | 'small' | 'medium' | 'large';
    color?: 'blue' | 'teal' | 'green' | 'red' | 'gray';
    variant?: 'fill' | 'weak';
    style?: React.CSSProperties;
  }

  export function Badge(props: BadgeProps): React.ReactElement;

  interface AgreementSingleCheckboxFieldProps {
    children: string;
    type?: 'medium' | 'medium-bold' | 'big';
    necessity?: 'none' | 'mandatory' | 'optional';
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    arrowType?: 'none' | 'link' | 'collapsible';
    indent?: number;
  }

  interface AgreementDescriptionProps {
    children: React.ReactNode;
    indent?: number;
  }

  interface AgreementButtonProps {
    children: React.ReactNode;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    inputType?: 'checkbox' | 'radio';
  }

  export const AgreementV4: {
    SingleCheckboxField: React.FC<AgreementSingleCheckboxFieldProps>;
    Description: React.FC<AgreementDescriptionProps>;
    Button: React.FC<AgreementButtonProps>;
  };

  interface BottomSheetProps {
    open: boolean;
    onClose?: () => void;
    header?: React.ReactNode;
    headerDescription?: React.ReactNode;
    cta?: React.ReactNode;
    children?: React.ReactNode;
  }

  interface BottomSheetHeaderProps {
    children: React.ReactNode;
  }

  interface BottomSheetHeaderDescriptionProps {
    children: React.ReactNode;
  }

  interface BottomSheetCTAProps {
    label: string;
    onClick?: () => void;
  }

  interface BottomSheetDoubleCTAProps {
    primaryLabel: string;
    secondaryLabel: string;
    onPrimaryClick?: () => void;
    onSecondaryClick?: () => void;
  }

  interface BottomSheetComponent extends React.FC<BottomSheetProps> {
    Header: React.FC<BottomSheetHeaderProps>;
    HeaderDescription: React.FC<BottomSheetHeaderDescriptionProps>;
    CTA: React.FC<BottomSheetCTAProps>;
    DoubleCTA: React.FC<BottomSheetDoubleCTAProps>;
  }

  export const BottomSheet: BottomSheetComponent;

  interface TextFieldProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    variant?: 'box' | 'line' | 'big' | 'hero';
    error?: boolean;
    errorMessage?: string;
    inputMode?: 'text' | 'numeric' | 'tel' | 'email';
    maxLength?: number;
    style?: React.CSSProperties;
  }

  export function TextField(props: TextFieldProps): React.ReactElement;

  export function Spinner(props: { size?: number }): React.ReactElement;

  export function TDSMobileAITProvider(props: { children: React.ReactNode }): React.ReactElement;
}
