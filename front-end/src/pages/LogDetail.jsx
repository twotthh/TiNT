import React from 'react';
import '../styles/Log.css'; 

import backIcon from '../assets/Back.png'; 

const LogDetail = ({ onNavigate, logData }) => {
  const waveforms = [10, 15, 20, 12, 25, 30, 20, 15, 35, 45, 30, 25, 15, 20, 25, 20, 15, 10, 20, 30, 25, 15, 10];

  if (!logData) return <div style={{padding: '20px', textAlign: 'center'}}>데이터를 불러올 수 없습니다.</div>;

  return (
    <div className="page-wrapper bg-white">
      <header className="page-header">
        <img 
          src={backIcon} 
          alt="back" 
          className="back-icon" 
          onClick={() => onNavigate('log')} 
        />
        <h1 className="header-title">분석 리포트</h1>
        <div className="placeholder"></div>
      </header>

      <main className="detail-content-area">
        <h2 className="detail-subtitle">{logData.time} 기록 상세</h2>
        <section className="detail-section">
          <h3 className="section-title">위험도</h3>
          <div className="risk-score-container">
            <div className="score-text">{logData.score}<span className="score-unit">%</span></div>
            <div className="score-bar-bg">
              <div className="score-bar-fill" style={{ width: `${logData.score}%` }}></div>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3 className="section-title">감지 이유</h3>
          <p className="desc-text">{logData.reason}</p>
        </section>

        <section className="detail-section">
          <h3 className="section-title">대화 내용</h3>
          <p className="desc-text" style={{ marginBottom: '10px', color: '#555', fontWeight: 'bold' }}>
            "{logData.title}"
          </p>
          <div className="audio-player">
            <button className={`play-btn ${logData.type} lg`}>▶</button>
            <div className="waveform-container">
              {waveforms.map((h, i) => (
                <div key={i} className="wave-bar" style={{ height: `${h}px` }}></div>
              ))}
            </div>
            <span className="audio-time">00:11</span>
          </div>
        </section>

        <section className="detail-section">
          <h3 className="section-title">감정 분석</h3>
          <div className="emotion-badges">
            <span className="badge">재미 50%</span>
            <span className="badge">초조 28%</span>
            <span className="badge">분노 12%</span>
            <span className="badge">불안 10%</span>
          </div>
        </section>

        <section className="detail-section">
          <h3 className="section-title">개선 가이드</h3>
          <p className="desc-text">
            즐거운 분위기더라도 감정이 격해질 때는 잠시 대화에서 벗어나 감정을 차단해보세요.
          </p>
        </section>
      </main>
    </div>
  );
};

export default LogDetail;