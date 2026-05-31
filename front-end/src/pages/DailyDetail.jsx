import React from 'react';
import '../styles/DailyDetail.css';

import thinkCat from '../assets/think_cat.png'; 
import sirenIcon from '../assets/Siren.png';
import increaseIcon from '../assets/Increase.png';
import commentIcon from '../assets/Comment.png';
import goalIcon from '../assets/Goal.png';
// 💡 i.png 에셋 사용을 완전히 제거했습니다!

const DailyDetail = ({ currentDate }) => {
  const dateObj = currentDate || new Date();
  const month = dateObj.getMonth() + 1;
  const date = dateObj.getDate();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];

  return (
    <main className="detail-tab-content">
      
      {/* 1. AI 캐릭터 요약 카드 */}
      <section className="report-card ai-summary-card">
        <div className="ai-character-wrapper">
          <img src={thinkCat} alt="AI TINT" className="ai-character-img" />
        </div>
        <div className="ai-speech-bubble">
          <div className="bubble-date-badge">{month}월 {date}일 {dayName}요일</div>
          <p className="ai-text-main">오후에 위험 발화가 많았어요.</p>
          <p className="ai-text-sub">
            특히, 대화 중 부정 단어 사용이 평소보다 <strong className="highlight-red">16% 늘었어요.</strong>
          </p>
          <p className="ai-text-sub">저녁 시간 이후 감정 관리가 필요해 보여요.</p>
        </div>
      </section>

      {/* 2. 오늘의 요약 */}
      <section className="report-card summary-section">
        <h3 className="card-section-title">오늘의 요약</h3>
        <div className="summary-widget-grid">
          <div className="widget-box">
            <img src={sirenIcon} alt="위험 발화" className="widget-icon-img" />
            <span className="widget-label">위험 발화</span>
            <div className="widget-value">6<span className="widget-unit">회</span></div>
          </div>
          <div className="widget-box">
            <img src={increaseIcon} alt="평균 위험도" className="widget-icon-img" />
            <span className="widget-label">평균 위험도</span>
            <div className="widget-value">42<span className="widget-unit">%</span></div>
          </div>
          <div className="widget-box">
            <img src={commentIcon} alt="대화 점수" className="widget-icon-img" />
            <span className="widget-label">대화 점수</span>
            <div className="widget-value">68<span className="widget-unit">/100</span></div>
          </div>
        </div>
      </section>

      {/* 3. 오늘의 대화 패턴 (새로운 워드 클라우드 디자인 적용) */}
      <section className="report-card pattern-card">
        <h3 className="card-section-title">오늘의 대화 패턴</h3>
        
        <div className="bubble-chart-board">
          {/* 중앙 (가장 큰 비중) */}
          <div className="bubble bubble-lg y-bubble">
             <span className="bubble-text">예민함<br/><strong>42%</strong></span>
          </div>
          {/* 좌측 상단 */}
          <div className="bubble bubble-md r-bubble">
             <span className="bubble-text">짜증<br/><strong>12%</strong></span>
          </div>
          {/* 우측 상단 */}
          <div className="bubble bubble-sm g-bubble">
             <span className="bubble-text">웃음<br/><strong>22%</strong></span>
          </div>
          {/* 우측 하단 */}
          <div className="bubble bubble-xs gr-bubble">
             <span className="bubble-text">기타</span>
          </div>
        </div>
        
        <div className="pattern-insight">
          {/* 💡 에셋 이미지 대신 직접 CSS로 만든 깜찍한 느낌표 배지 사용 */}
          <span className="insight-text-icon">!</span>
          <p>여러 명과 대화 속에서 짜증과 귀찮음 표현 증가</p>
        </div>
      </section>

      {/* 4. 오늘의 위험 순간 Top 3 */}
      <section className="report-card top3-card">
        <h3 className="card-section-title">오늘의 위험 순간 Top 3</h3>
        <ul className="timeline-list">
          <li className="timeline-item">
            <div className="timeline-marker high"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-time">17:30</span>
                <span className="timeline-risk high-text">위험도 76%</span>
              </div>
              <p className="timeline-desc">화를 내고 욕설, 비속어를 단시간에 많이 사용했어요.</p>
            </div>
          </li>
          <li className="timeline-item">
            <div className="timeline-marker mid"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-time">13:30</span>
                <span className="timeline-risk mid-text">위험도 60%</span>
              </div>
              <p className="timeline-desc">짜증과 불만 섞인 말들을 자주 했어요.</p>
            </div>
          </li>
          <li className="timeline-item">
            <div className="timeline-marker low"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-time">11:15</span>
                <span className="timeline-risk low-text">위험도 50%</span>
              </div>
              <p className="timeline-desc">말투가 강하고 감정이 격해졌어요.</p>
            </div>
          </li>
        </ul>
        <button className="view-all-log-btn">전체 로그 보기</button>
      </section>
      
       <section className="report-card suggestion-card">
        <div className="suggestion-header">
          <img src={goalIcon} alt="제안" className="suggestion-icon-img" />
          <h3 className="card-section-title no-margin">오늘의 제안</h3>
        </div>
        <div className="suggestion-body">
          <p>오늘 밤은 따뜻한 차를 마시며 수면을 취해보세요.</p>
          <p>내일은 스피치 재머 작동 횟수를 <strong>1회</strong> 줄여보는 건 어떨까요?</p>
        </div>
      </section>
    </main>
  );
};

export default DailyDetail;