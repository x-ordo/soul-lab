import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div className="container">
      <Header title="404" subtitle="페이지가 없습니다." />
      <button className="btn btnPrimary" onClick={() => nav('/')}>
        랜딩으로
      </button>
    </div>
  );
}
