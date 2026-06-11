import React from 'react';
import '../styles/LogDetail.css'; 
import backIcon from '../assets/Back.png'; 
import muteIcon from '../assets/Mute.png';

const getEmoClass = (emoName) => {
  const validEmos = ['기쁨', '놀람', '분노', '혐오', '슬픔', '불안', '공감', '부러움'];
  return validEmos.includes(emoName) ? `emo-${emoName}` : 'emo-default';
};

const LogDetail = ({ onNavigate, logData }) => {
  if (!logData) return <div style={{padding: '20px', textAlign: 'center'}}>데이터를 불러올 수 없습니다.</div>;

  const barColor = logData.type === 'risk' ? '#FF4C4C' : (logData.type === 'caution' ? '#FFC300' : '#A5D6A7');

  const handleBackClick = () => {
    if (logData.fullTimestamp) {
      const dateParts = logData.fullTimestamp.split(' ')[0].split('-');
      onNavigate('log', {
        year: parseInt(dateParts[0], 10),
        month: parseInt(dateParts[1], 10),
        day: parseInt(dateParts[2], 10)
      });
    } else {
      onNavigate('log'); 
    }
  };

  return (
    <div className="page-wrapper bg-white">
      <header className="page-header">
        <img src={backIcon} alt="back" className="back-icon" onClick={handleBackClick} style={{cursor: 'pointer'}} />
        <h1 className="header-title">분석 리포트</h1>
        <div className="placeholder"></div>
      </header>

      <main className="detail-content-area">
        <h2 className="detail-subtitle">{logData.time} 기록 상세</h2>
        
        <section className="detail-section">
          <h3 className="section-title">위험도</h3>
          <div className="risk-score-container">
            <div className="score-text" style={{ color: barColor }}>
              {logData.score}<span className="score-unit">%</span>
            </div>
            <div className="score-bar-bg">
              <div className="score-bar-fill" style={{ width: `${logData.score}%`, backgroundColor: barColor }}></div>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h3 className="section-title">감지 이유</h3>
          {logData.word && logData.word !== "N/A" && logData.word !== "없음" && (
            <p style={{ marginBottom: '8px', fontSize: '13px', color: '#FF4C4C', fontWeight: 'bold' }}>
              핵심 감지 단어: '{logData.word}'
            </p>
          )}
          <p className="desc-text">{logData.reason}</p>
        </section>

        <section className="detail-section">
          <h3 className="section-title">대화 내용</h3>
          <p className="desc-text" style={{ marginBottom: '15px', color: '#555', fontWeight: 'bold' }}>
            "{logData.title}"
          </p>
          <div className="audio-player-container">
            {logData.audioUrl && logData.type !== 'safe' ? (
              <audio controls controlsList="nodownload" src={logData.audioUrl} />
            ) : (
              <div className="no-audio-box">
                <img src={muteIcon} alt="음성 없음" style={{ width: '40px', opacity: 0.6 }} />
                <p className="no-audio-text">안전한 일상 대화로 판별되어<br/>음성 파일이 저장되지 않았습니다.</p>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h3 className="section-title">세부 감정 분석</h3>
          <div className="emotion-badges">
            {logData.emotions && Object.keys(logData.emotions).length > 0 ? (
              Object.entries(logData.emotions).map(([key, val]) => (
                <div key={key} className={`emo-badge ${getEmoClass(key)}`}>
                  <span>{key}</span>
                  <strong>{val}%</strong>
                </div>
              ))
            ) : (
              <span className="badge">데이터 없음</span>
            )}
          </div>
        </section>

        <section className="detail-section guide-box">
          <h3 className="section-title" style={{ color: '#4a4a4a' }}> 개선 가이드</h3>
          <p className="desc-text" style={{ color: '#6d6d6d' }}>{logData.guide}</p>
        </section>
      </main>
    </div>
  );
};

export default LogDetail;