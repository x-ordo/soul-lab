import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

        <label className="checkRow">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span className="p">{COMPLIANCE_COPY.termsTitle}</span>
        </label>

        <label className="checkRow">
          <input type="checkbox" checked={thirdParty} onChange={(e) => setThirdParty(e.target.checked)} />
          <span className="p">{COMPLIANCE_COPY.thirdTitle}</span>
        </label>

        <div className="small" style={{ marginTop: 8 }}>
          {COMPLIANCE_COPY.thirdExplain.map((t) => (
            <div key={t}>• {t}</div>
          ))}
        </div>

        <label className="checkRow" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span className="p">{COMPLIANCE_COPY.marketingTitle}</span>
        </label>

        <hr className="hr" />
        <div className="h2">{COMPLIANCE_COPY.birthTitle}</div>
        <div className="small">{COMPLIANCE_COPY.birthHint}</div>

        <input
          className="input"
          value={birth}
          onChange={(e) => setBirth(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
          placeholder="YYYYMMDD"
          inputMode="numeric"
        />

        {err ? <div className="small" style={{ marginTop: 8, color: '#d92d20' }}>{err}</div> : null}
      </div>

      <button className="btn btnPrimary" disabled={!canGo} onClick={onContinue}>
        동의하고 분석 시작
      </button>

      <div className="footer">{COMPLIANCE_COPY.privacyFoot}</div>
    </div>
  );
}
