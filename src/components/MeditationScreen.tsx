import React, { useState, useEffect } from 'react';

interface MeditationScreenProps {
  onComplete: () => void;
  duration?: number; // seconds
}

const MEDITATION_MESSAGES = [
  { text: '눈을 감고...', subtext: '깊은 숨을 들이쉬세요' },
  { text: '마음을 비우세요', subtext: '오늘의 기운이 다가옵니다' },
  { text: '당신의 운명이', subtext: '서서히 드러납니다' },
];

export default function MeditationScreen({ onComplete, duration = 5 }: MeditationScreenProps) {
  const [phase, setPhase] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const phaseInterval = duration * 1000 / MEDITATION_MESSAGES.length;

    const timer = setInterval(() => {
      setPhase((prev) => {
        if (prev >= MEDITATION_MESSAGES.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, phaseInterval);

    const completeTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, duration * 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  const message = MEDITATION_MESSAGES[phase];

  return (
    <div
      className="meditation-overlay"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Floating particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              borderRadius: '50%',
              background: i % 3 === 0
                ? 'rgba(255, 215, 0, 0.6)'
                : 'rgba(147, 112, 219, 0.6)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glowing orb */}
      <div className="meditation-orb" />

      {/* Message */}
      <div
        className="meditation-text mystical-title"
        key={phase}
        style={{
          animation: 'fadeIn 0.8s ease',
        }}
      >
        {message.text}
      </div>
      <div
        className="meditation-subtitle"
        key={`sub-${phase}`}
        style={{
          animation: 'fadeIn 1s ease 0.3s both',
        }}
      >
        {message.subtext}
      </div>

      {/* Progress indicator */}
      <div style={{
        position: 'absolute',
        bottom: 60,
        display: 'flex',
        gap: 8,
      }}>
        {MEDITATION_MESSAGES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i <= phase
                ? 'rgba(147, 112, 219, 0.8)'
                : 'rgba(255, 255, 255, 0.2)',
              transition: 'background 0.3s ease',
              boxShadow: i <= phase ? '0 0 10px rgba(147, 112, 219, 0.5)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
