// Type declarations for @toss/tds-mobile-ait mock
declare module '@toss/tds-mobile-ait' {
  import * as React from 'react';

  interface TDSMobileAITProviderProps {
    children: React.ReactNode;
  }

  export function TDSMobileAITProvider(props: TDSMobileAITProviderProps): React.ReactElement;
}
