import React, { useState, useEffect } from 'react';
import '../styles/Home.css';
import DailyDetail from './DailyDetail'; 
import DailySnapshot from './DailySnapshot'; 

import tintLogo from '../assets/TiNT.png';
import calendarIcon from '../assets/Calendar.png';
import notificationIcon from '../assets/Notification.png';

import homeSirenIcon from '../assets/Siren.png';
import homeChartIcon from '../assets/Increase.png';
import homeClockIcon from '../assets/Clock.png';
import homeGoalIcon from '../assets/Goal.png';
import homeRecommendIcon from '../assets/Comment.png'; 
import goalFlagIcon from '../assets/Finish.png';

import homeOn from '../assets/Home_on.png';
import chartOff from '../assets/Chart_off.png';
import logOff from '../assets/Log_off.png';
import myOff from '../assets/My_off.png';
import backIcon from '../assets/Back.png'; 

const Home = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('하루');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDayName = (date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const prevDate = new Date(currentDate);
  prevDate.setDate(currentDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(currentDate.getDate() + 1);

  const [safetyPercent] = useState(35);
  const [cautionPercent] = useState(52);
  const [riskPercent] = useState(13);

  const [dash, setDash] = useState({
    safetyLen: 0, cautionLen: 0, riskLen: 0,
    safetyOff: 0, cautionOff: 0, riskOff: 0
  });

  const recommendations = [
    { icon: "🌿", text1: "잠시 숨을 고르고 몸을 천천히 이완해보세요.", text2: "깊은 호흡이 긴장을 안정시키는 데 도움이 돼요." },
    { icon: "☕", text1: "따뜻한 물이나 차를 한 잔 마셔보세요.", text2: "몸을 따뜻하게 하면 마음도 한결 편안해집니다." },
    { icon: "🧘‍♀️", text1: "가벼운 기지개로 굳은 근육을 풀어주세요.", text2: "어깨를 가볍게 돌려주는 것만으로도 아주 좋아요." },
    { icon: "🌤️", text1: "창문을 열고 신선한 공기를 마셔보세요.", text2: "가벼운 환기는 기분 전환과 안정에 효과적입니다." }
  ];

  const [recIndex, setRecIndex] = useState(0);

  const handleNextRecommend = () => {
    setRecIndex((prev) => (prev + 1) % recommendations.length);
  };

  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getClientY = (e) => (e.touches ? e.touches[0].clientY : e.clientY);

  const handleDragStart = (e) => {
    if (e.currentTarget.scrollTop <= 0) {
      setStartY(getClientY(e));
    }
  };

  const handleDragMove = (e) => {
    if (startY === 0) return;
    const currentY = getClientY(e);
    const distance = currentY - startY;

    if (distance > 0 && e.currentTarget.scrollTop <= 0) {
      setPullDistance(distance);
      if (distance > 80) { 
        setIsPulling(true);
      } else {
        setIsPulling(false);
      }
    }
  };

  const handleDragEnd = () => {
    if (isPulling) {
      setDash({
        safetyLen: 0, cautionLen: 0, riskLen: 0,
        safetyOff: 0, cautionOff: 0, riskOff: 0
      });
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1); 
      }, 300);
    }
    setStartY(0);
    setPullDistance(0);
    setIsPulling(false);
  };

  useEffect(() => {
    if (activeTab !== '하루') return;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const gap = 8; 

    const safetyTarget = (safetyPercent / 100) * circumference;
    const cautionTarget = (cautionPercent / 100) * circumference;
    const riskTarget = (riskPercent / 100) * circumference;

    const timer = setTimeout(() => {
      setDash({
        safetyLen: Math.max(0, safetyTarget - gap),
        cautionLen: Math.max(0, cautionTarget - gap),
        riskLen: Math.max(0, riskTarget - gap),
        safetyOff: 0,
        cautionOff: -safetyTarget,
        riskOff: -(safetyTarget + cautionTarget)
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [safetyPercent, cautionPercent, riskPercent, activeTab, refreshTrigger]);

  return (
    <div className="home-wrapper">
      <div 
        className="scrollable-content"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{ 
          position: 'relative',
          overscrollBehaviorY: 'none', 
          touchAction: pullDistance > 0 ? 'none' : 'auto',
          transform: `translateY(${Math.min(pullDistance / 2.5, 60)}px)`, 
          transition: pullDistance === 0 ? 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none' 
        }}
      >
        
        {pullDistance > 20 && (
          <div style={{
            position: 'absolute', top: '-40px', left: '0', width: '100%',
            textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#A0A0A0'
          }}>
            {isPulling ? '🔄 놓아서 새로고침' : '↓ 아래로 당기세요'}
          </div>
        )}

        {activeTab === '하루' ? (
          <>
            <header className="home-header">
              <img src={tintLogo} alt="TiNT Logo" className="logo" />
              <div className="header-icons">
                <img src={calendarIcon} alt="Calendar" className="top-icon" onClick={() => onNavigate('calendar')} style={{ cursor: 'pointer' }} />
                <img src={notificationIcon} alt="Notification" className="top-icon" />
              </div>
            </header>

            <div className="date-navigator">
              <div className="date-item prev-date" onClick={() => setCurrentDate(prevDate)}>
                {prevDate.getMonth() + 1}.{prevDate.getDate()} {getDayName(prevDate)}
              </div>
              
              <div className="date-item current-date">
                <span className="date-number">
                  {currentDate.getMonth() + 1}.{currentDate.getDate()}
                </span>
                {isToday(currentDate) ? (
                  <span className="badge today-badge">오늘</span>
                ) : (
                  <span className="badge day-badge">{getDayName(currentDate)}</span>
                )}
              </div>
              
              <div className="date-item next-date" onClick={() => setCurrentDate(nextDate)}>
                {nextDate.getMonth() + 1}.{nextDate.getDate()} {getDayName(nextDate)}
              </div>
            </div>

            <nav className="top-tabs">
              <span className={`tab ${activeTab === '하루' ? 'active' : ''}`} onClick={() => setActiveTab('하루')}>
                나의 하루
              </span>
              <span className={`tab ${activeTab === '자세히' ? 'active' : ''}`} onClick={() => setActiveTab('자세히')}>
                자세히
              </span>
              <span className={`tab ${activeTab === '한눈에' ? 'active' : ''}`} onClick={() => setActiveTab('한눈에')}>
                한눈에
              </span>
            </nav>

            <main className="main-content">
              <section className="donut-section">
                <div className="donut-chart-container">
                  <svg viewBox="0 0 100 100" className="donut-svg">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F4F5F7" strokeWidth="6" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#A5D6A7" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash.safetyLen} 300`} strokeDashoffset={dash.safetyOff} className="donut-segment" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#FFC300" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash.cautionLen} 300`} strokeDashoffset={dash.cautionOff} className="donut-segment" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#FF4C4C" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${dash.riskLen} 300`} strokeDashoffset={dash.riskOff} className="donut-segment" />
                  </svg>
                  <div className="donut-center-text">
                    <span className="status-label">현재 상태</span>
                    <span className="status-value">주의</span>
                  </div>
                </div>
                
                <div className="donut-legend">
                  <div className="legend-item"><span className="dot green"></span> 안전 <strong>{safetyPercent}%</strong></div>
                  <div className="legend-item"><span className="dot yellow"></span> 주의 <strong>{cautionPercent}%</strong></div>
                  <div className="legend-item"><span className="dot red"></span> 위험 <strong>{riskPercent}%</strong></div>
                </div>
              </section>

              <div className="stats-row">
                <div className="card half-card bouncy-card">
                  <div className="card-header">
                    <span className="card-header-title">오늘 위험 발화</span>
                    <img src={homeSirenIcon} alt="siren" className="card-icon" />
                  </div>
                  <div className="card-body">
                    <span className="big-number">8</span> <span className="unit">회</span>
                  </div>
                  <div className="card-footer">
                    <span className="compare-text">어제보다 <span className="increase">+3회 ▲</span></span>
                  </div>
                </div>

                <div className="card half-card bouncy-card">
                  <div className="card-header">
                    <span className="card-header-title">오늘 평균 위험도</span>
                    <img src={homeChartIcon} alt="chart" className="card-icon" />
                  </div>
                  <div className="card-body">
                    <span className="big-number">38</span> <span className="unit">%</span>
                  </div>
                  <div className="card-footer">
                    <span className="compare-text">어제보다 <span className="increase">+13% ▲</span></span>
                  </div>
                </div>
              </div>

              <div className="card full-card bouncy-card">
                <div className="card-header">
                  <div className="title-with-icon">
                    <img src={homeClockIcon} alt="clock" className="card-icon" />
                    <span className="card-title">오늘의 위험도 변화</span>
                  </div>
                </div>
                <div className="graph-container">
                  <div className="graph-tooltip-wrapper">
                    <div className="graph-tooltip">주의 구간 증가</div>
                  </div>
                  
                  <svg viewBox="0 0 300 70" className="line-graph-svg">
                    <path d="M 10 60 L 60 50 L 110 15 L 160 25 L 190 15 L 230 35 L 280 15" fill="none" stroke="#A5D6A7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="160" cy="25" r="4.5" fill="#FFC300" stroke="#FFF" strokeWidth="2.5" />
                    <circle cx="190" cy="15" r="4.5" fill="#FFC300" stroke="#FFF" strokeWidth="2.5" />
                  </svg>
                  <div className="graph-x-axis">
                    <span>10:00</span><span>11:00</span><span>12:00</span><span>13:00</span><span>14:00</span>
                  </div>
                </div>
              </div>

              <div className="card full-card bouncy-card goal-card">
                <div className="card-header no-margin">
                  <img src={homeGoalIcon} alt="goal" className="card-icon" />
                  <span className="card-title">일주일동안 위험 알림 10번 이하</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: '70%' }}></div>
                  </div>
                  <img src={goalFlagIcon} alt="flag" className="flag-icon" />
                </div>
              </div>

              <div className="card full-card bouncy-card clickable-card" onClick={handleNextRecommend}>
                <div className="card-header no-margin" style={{ marginBottom: '16px', justifyContent: 'space-between' }}>
                  <div className="title-with-icon">
                    <img src={homeRecommendIcon} alt="recommend" className="card-icon" />
                    <span className="card-title">지금 나를 위한 추천</span>
                  </div>
                  <span className="refresh-hint">다른 추천 보기 ↻</span> 
                </div>
                <div className="recommend-box">
                  <div className="recommend-icon-circle">{recommendations[recIndex].icon}</div>
                  <div className="recommend-text">
                    <p>{recommendations[recIndex].text1}</p>
                    <p>{recommendations[recIndex].text2}</p>
                  </div>
                </div>
              </div>
            </main>
          </>
        ) : (
          <>
            <header className="sub-page-header">
              <button className="back-arrow-btn" onClick={() => setActiveTab('하루')}>
                <img src={backIcon} alt="뒤로가기" className="nav-icon-img" />
              </button>
              
              <h1 className="sub-page-title">
                {activeTab === '자세히' ? '하루 리포트' : '한눈에 보기'}
              </h1>
              <div className="header-placeholder"></div>
            </header>

            {activeTab === '자세히' && <DailyDetail currentDate={currentDate} />}
            {activeTab === '한눈에' && <DailySnapshot />}
          </>
        )}
      </div>

      {activeTab === '하루' && (
        <nav className="bottom-nav-bar">
          <div className="nav-item active" onClick={() => onNavigate('home')}>
            <img src={homeOn} alt="홈" className="nav-icon" />
            <span>홈</span>
          </div>
          <div className="nav-item">
            <img src={chartOff} alt="분석" className="nav-icon" />
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
      )}
    </div>
  );
};

export default Home;