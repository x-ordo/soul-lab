import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, AgreementV4, TextField } from '@toss/tds-mobile';
import Header from '../components/Header';
import { COMPLIANCE_COPY } from '../lib/complianceCopy';
import { getAgreement, setAgreement, getBirthDate, setBirthDate } from '../lib/storage';
import { track } from '../lib/analytics';

function isYYYYMMDD(v: string) {
  return /^\d{8}$/.test(v);
}

export default function AgreementPage() {
  React.useEffect(() => { track('agreement_view'); }, []);

  const nav = useNavigate();
  const saved = useMemo(() => getAgreement(), []);
  const savedBd = useMemo(() => getBirthDate() ?? '', []);

  const [terms, setTerms] = useState(!!saved?.terms);
  const [thirdParty, setThirdParty] = useState(!!saved?.thirdParty);
  const [marketing, setMarketing] = useState(!!saved?.marketing);
  const [birth, setBirth] = useState(savedBd);
  const [err, setErr] = useState<string | null>(null);

  const canGo = terms && isYYYYMMDD(birth);

  const onContinue = () => {
    track('agreement_continue', { thirdParty, marketing });
    setErr(null);
    if (!isYYYYMMDD(birth)) {
      track('agreement_error', { reason: 'birth_invalid' });
      setErr('생년월일을 YYYYMMDD로 입력하세요. 예: 19990101');
      return;
    }
    if (!terms) {
      track('agreement_error', { reason: 'terms_required' });
      setErr('약관 동의는 필수입니다.');
      return;
    }
    setBirthDate(birth);
    setAgreement({ terms, thirdParty, marketing });
    track('agreement_saved', { thirdParty, marketing });
    nav('/loading', { replace: true });
  };

  return (
    <div className="container">
      <Header title={COMPLIANCE_COPY.headline} subtitle={COMPLIANCE_COPY.sub} />

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="h2">요약</div>
        <ul className="ul">
          {COMPLIANCE_COPY.bullets.map((b) => (
            <li key={b} className="p">{b}</li>
          ))}
        </ul>
        <hr className="hr" />

        <div className="h2">동의</div>

        <AgreementV4.SingleCheckboxField
          type="medium"
          necessity="mandatory"
          checked={terms}
          onCheckedChange={setTerms}
        >
          {COMPLIANCE_COPY.termsTitle}
        </AgreementV4.SingleCheckboxField>

        <AgreementV4.SingleCheckboxField
          type="medium"
          necessity="optional"
          checked={thirdParty}
          onCheckedChange={setThirdParty}
        >
          {COMPLIANCE_COPY.thirdTitle}
        </AgreementV4.SingleCheckboxField>

        <AgreementV4.Description indent={1}>
          {COMPLIANCE_COPY.thirdExplain.map((t, i) => (
            <div key={i}>• {t}</div>
          ))}
        </AgreementV4.Description>

        <AgreementV4.SingleCheckboxField
          type="medium"
          necessity="optional"
          checked={marketing}
          onCheckedChange={setMarketing}
        >
          {COMPLIANCE_COPY.marketingTitle}
        </AgreementV4.SingleCheckboxField>

        <hr className="hr" />
        <div className="h2">{COMPLIANCE_COPY.birthTitle}</div>
        <div className="small">{COMPLIANCE_COPY.birthHint}</div>

        <div style={{ marginTop: 8 }}>
          <TextField
            value={birth}
            onChange={(v) => setBirth(v.replace(/[^0-9]/g, '').slice(0, 8))}
            placeholder="YYYYMMDD"
            inputMode="numeric"
            maxLength={8}
            error={!!err}
            errorMessage={err ?? undefined}
          />
        </div>
      </div>

      <Button
        size="large"
        color="primary"
        variant="fill"
        display="full"
        disabled={!canGo}
        onClick={onContinue}
      >
        동의하고 분석 시작
      </Button>

      <div className="footer">{COMPLIANCE_COPY.privacyFoot}</div>
    </div>
  );
}
