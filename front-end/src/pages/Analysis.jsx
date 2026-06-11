import React, { useState } from 'react';
import '../styles/Analysis.css';
import hiCat from '../assets/hi_cat.png'; // 임시 캐릭터
import iIcon from '../assets/i.png'; 

import homeOff from '../assets/Home_off.png';
import chartOn from '../assets/Chart_on.png'; 
import logOff from '../assets/Log_off.png';
import myOff from '../assets/My_off.png';

const Analysis = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('주간'); 

  return (
    <div className="page-wrapper bg-light-gray">
      <header className="analysis-header">
        <h1 className="header-title">분석</h1>
      </header>

      <div className="tab-toggle-wrapper">
        <div className="tab-toggle-container">
          <div 
            className={`tab-toggle-btn ${activeTab === '주간' ? 'active' : ''}`}
            onClick={() => setActiveTab('주간')}
          >
            주간
          </div>
          <div 
            className={`tab-toggle-btn ${activeTab === '월간' ? 'active' : ''}`}
            onClick={() => setActiveTab('월간')}
          >
            월간
          </div>
        </div>
      </div>

      <main className="analysis-scroll-content">
        {activeTab === '주간' && (<div className="fade-in-section">

            <section className="analysis-card">
              <h3 className="card-section-title">이번 주 종합 요약</h3>
              <div className="ai-summary-grid">
                <div className="ai-char-col">
                  <img src={hiCat} alt="고양이" className="ai-cat-img" />
                </div>
                <div className="ai-stats-col">
                  <div className="stat-item">
                    <span className="stat-label">평균 위험도</span>
                    <span className="stat-val">38<span className="unit">%</span></span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">총 위험 발화</span>
                    <span className="stat-val text-red">156<span className="unit">회</span></span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">최고 연속 안전</span>
                    <span className="stat-val text-green">5<span className="unit">일</span></span>
                  </div>
                </div>
              </div>
            </section>

            <section className="analysis-card">
              <h3 className="card-section-title">이번 주 획득 배지</h3>
              <div className="badge-grid">
                <div className="badge-box">
                  <div className="badge-icon shield">🛡️</div>
                  <div className="badge-info">
                    <div className="badge-name">침착한 케어러</div>
                    <div className="badge-desc">위험 단계 5회 이하 유지</div>
                  </div>
                </div>
                <div className="badge-box">
                  <div className="badge-icon timer">⏱️</div>
                  <div className="badge-info">
                    <div className="badge-name">마인드 컨트롤러</div>
                    <div className="badge-desc">연속 3일 안전 유지</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="analysis-card">
              <div className="title-with-legend">
                <h3 className="card-section-title no-margin">요일별 누적 위험도</h3>
                <div className="chart-legend">
                  <span><div className="dot g-dot"></div>안전</span>
                  <span><div className="dot y-dot"></div>주의</span>
                  <span><div className="dot r-dot"></div>위험</span>
                </div>
              </div>
              
              <div className="bar-chart-container">
                <div className="vulnerable-tooltip" style={{ left: '26%' }}>취약</div>
                
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div className="bar-col" key={day}>
                    <div className="bar-track">
                      <div className="bar-segment r-bg" style={{ height: `${[10, 25, 15, 10, 30, 40, 20][idx]}%` }}></div>
                      <div className="bar-segment y-bg" style={{ height: `${[20, 35, 40, 30, 35, 20, 40][idx]}%` }}></div>
                      <div className="bar-segment g-bg" style={{ height: `${[70, 40, 45, 60, 35, 40, 40][idx]}%` }}></div>
                    </div>
                    <span className="bar-label">{day}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="analysis-card">
              <h3 className="card-section-title">24시간 주간 히트맵</h3>
              <div className="heatmap-container">
                <div className="heatmap-y-axis">
                  <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                </div>
                <div className="heatmap-grid-area">
                  {Array.from({ length: 7 * 12 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="heatmap-cell"
                      style={{ opacity: (i % 7 === 5 && i > 50) ? 0.8 : Math.random() * 0.3 }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="heatmap-x-axis">
                <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span>
              </div>
              <div className="insight-box mt-16">
                이번 주 가장 위험했던 시간: <strong>금요일 22시</strong>
              </div>
            </section>
          </div>
        )}

        {activeTab === '월간' && (
          <div className="fade-in-section">

            <section className="analysis-card ai-monthly-card">
              <h3 className="card-section-title">이달의 TiNT 리포트</h3>
              <div className="monthly-title-area">
                <div className="monthly-cat-bg">
                  <img src={hiCat} alt="고양이" className="monthly-cat-img" />
                </div>
                <div className="monthly-title-text">
                  <p>이달의 등급은</p>
                  <h4>마인드 컨트롤러<br/>입니다! 👑</h4>
                </div>
              </div>
              
              <div className="monthly-stats-row">
                <div className="m-stat-box">
                  <span className="m-stat-label">평균 위험도</span>
                  <span className="m-stat-val">32%</span>
                  <span className="m-stat-trend text-green">▼ 15%</span>
                </div>
                <div className="divider"></div>
                <div className="m-stat-box">
                  <span className="m-stat-label">총 위험 발화</span>
                  <span className="m-stat-val">412회</span>
                  <span className="m-stat-trend text-green">▼ 18%</span>
                </div>
                <div className="divider"></div>
                <div className="m-stat-box">
                  <span className="m-stat-label">연속 안전</span>
                  <span className="m-stat-val">14일</span>
                  <span className="m-stat-trend text-red">▲ 7일</span>
                </div>
              </div>
            </section>

            <section className="analysis-card">
              <h3 className="card-section-title">대화 문맥 변화 분석 <span className="sub-note">(전월 비교)</span></h3>
              <div className="donut-flex-container">
                <div className="css-donut-chart"></div>
                <ul className="donut-legend-list">
                  <li><div className="dot y-bg"></div> 게임 관련 대화 <strong className="text-red">+20%</strong></li>
                  <li><div className="dot g-bg"></div> 학업 스트레스 <strong className="text-green">-35%</strong></li>
                  <li><div className="dot b-bg"></div> 가족/형제 대화 <strong className="text-green">-20%</strong></li>
                  <li><div className="dot p-bg"></div> 친구/관계 <strong className="text-red">+10%</strong></li>
                  <li><div className="dot gr-bg"></div> 기타 <strong className="text-red">+5%</strong></li>
                </ul>
              </div>
              <div className="ai-comment-box">
                <span className="comment-badge">AI 코멘트</span>
                <p>지난달 대비 <strong>가족 톤 관련 대화</strong>에서 20% 감소율이 긍정적인 변화로 감지됐어요.</p>
              </div>
            </section>

            <section className="analysis-card">
              <div className="title-with-legend">
                <h3 className="card-section-title no-margin">나의 습관 단어장</h3>
                <div className="chart-legend">
                  <span><div className="dot p-bg"></div>이번 달</span>
                  <span><div className="dot gr-bg"></div>지난 달</span>
                </div>
              </div>
              
              <div className="line-chart-mock">
                <svg viewBox="0 0 300 100" className="mock-svg-line">
                  <path d="M 15 80 L 105 40 L 195 60 L 285 20" fill="none" stroke="#E0E0E0" strokeWidth="3" strokeDasharray="5 5" />
                  <path d="M 15 60 L 105 20 L 195 80 L 285 40" fill="none" stroke="#9FA8DA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  
                  <circle cx="15" cy="60" r="5" fill="#5C6BC0" />
                  <circle cx="105" cy="20" r="5" fill="#5C6BC0" />
                  <circle cx="195" cy="80" r="5" fill="#5C6BC0" />
                  <circle cx="285" cy="40" r="5" fill="#5C6BC0" />
                </svg>
                <div className="chart-x-labels">
                  <span>1주차</span>
                  <span>2주차</span>
                  <span>3주차</span>
                  <span>4주차</span>
                </div>
              </div>
            </section>

            <section className="analysis-card">
              <h3 className="card-section-title">이달의 언어 안테나 <span className="sub-note">(부정단어)</span></h3>
              
              <div className="word-cloud-container">
                <span style={{ fontSize: '26px', color: '#111111', fontWeight: '900', transform: 'translateY(4px)' }}>게임</span>
                <span style={{ fontSize: '18px', color: '#FF4C4C', transform: 'translateY(-6px)' }}>왜</span>
                <span style={{ fontSize: '14px', color: '#888888', transform: 'translateY(2px)' }}>친구</span>
                <span style={{ fontSize: '32px', color: '#FFC300', fontWeight: '900', transform: 'translateY(-2px)' }}>공부</span>
                <span style={{ fontSize: '16px', color: '#5C6BC0', transform: 'translateY(6px)' }}>짜증나</span>
                
                <span style={{ fontSize: '22px', color: '#FF7043', fontWeight: '800', transform: 'translateY(2px)' }}>스트레스</span>
                <span style={{ fontSize: '15px', color: '#9FA8DA', transform: 'translateY(-4px)' }}>귀찮아</span>
                <span style={{ fontSize: '19px', color: '#66bb6a', fontWeight: '700', transform: 'translateY(4px)' }}>작작해</span>
                <span style={{ fontSize: '16px', color: '#111111', transform: 'translateY(-2px)' }}>미친것</span>
                <span style={{ fontSize: '14px', color: '#bdbdbd', transform: 'translateY(5px)' }}>ㅋㅋ</span>
              </div>
            </section>

            <section className="analysis-card family-guide-card">
              <h3 className="card-section-title">👨‍👩‍👧‍👦 TiNT 월간 패밀리 가이드</h3>
              <p className="guide-text">
                이달의 분석 결과 학업 스트레스로 인한 <strong>존댓말(Level 2)이 감소</strong>했습니다.<br/><br/>
                자녀가 귀가하는 <strong>18시 경 긍정적인 피드백</strong>을 먼저 건네주시면 안정에 도움이 됩니다.
              </p>
            </section>
          </div>
        )}
      </main>

      <nav className="bottom-nav-bar">
        <div className="nav-item" onClick={() => onNavigate('home')}>
          <img src={homeOff} alt="홈" className="nav-icon" />
          <span>홈</span>
        </div>
        <div className="nav-item active">
          <img src={chartOn} alt="분석" className="nav-icon" />
          <span>분석</span>
        </div>
        <div className="nav-item" onClick={() => onNavigate('log')}>
          <img src={logOff} alt="로그" className="nav-icon" />
          <span>로그</span>
        </div>
        <div className="nav-item">
          <img src={myOff} alt="마이" className="nav-icon" />
          <span>마이</span>
        </div>
      </nav>
    </div>
  );
};

export default Analysis;