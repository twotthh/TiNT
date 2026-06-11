import React, { useState, useEffect } from 'react';
import '../styles/Home.css';
import DailyDetail from './DailyDetail'; 
import DailySnapshot from './DailySnapshot'; 

import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

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

const Home = ({ onNavigate, initialDateData }) => {
  const [activeTab, setActiveTab] = useState('하루');

  const [currentDate, setCurrentDate] = useState(() => {
    if (initialDateData && initialDateData.year) {
      return new Date(initialDateData.year, initialDateData.month - 1, initialDateData.day);
    }
    return new Date();
  });

  useEffect(() => {
    if (!initialDateData) {
      setCurrentDate(new Date());
    }
  }, [initialDateData]);

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

  const [safetyPercent, setSafetyPercent] = useState(0);
  const [cautionPercent, setCautionPercent] = useState(0);
  const [riskPercent, setRiskPercent] = useState(0);
  const [dangerCount, setDangerCount] = useState(0);
  const [avgDangerScore, setAvgDangerScore] = useState(0);
  const [hasDataToday, setHasDataToday] = useState(false); 
  const [graphPoints, setGraphPoints] = useState([]);

  const [dash, setDash] = useState({
    safetyLen: 0, cautionLen: 0, riskLen: 0,
    safetyOff: 0, cautionOff: 0, riskOff: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'tint_results'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const targetDateString = `${year}-${month}-${day}`;

      const todayLogs = snapshot.docs
        .map(doc => doc.data())
        .filter(data => data.timestamp && data.timestamp.startsWith(targetDateString));

      if (todayLogs.length === 0) {
        setSafetyPercent(0); setCautionPercent(0); setRiskPercent(0);
        setDangerCount(0); setAvgDangerScore(0);
        setHasDataToday(false);
        setGraphPoints([]); 
        return;
      }

      setHasDataToday(true);

      let safe = 0, caution = 0, risk = 0, totalScore = 0;
      
      todayLogs.forEach(log => {
        const levelStr = String(log.tint_danger_level || log.danger_level || log.level || log.tint_level || '').toLowerCase();
        
        if (levelStr.includes('1') || levelStr.includes('안전') || levelStr.includes('safe') || levelStr.includes('low')) {
          safe++;
        } else if (levelStr.includes('2') || levelStr.includes('주의') || levelStr.includes('caution') || levelStr.includes('medium')) {
          caution++;
        } else if (levelStr.includes('3') || levelStr.includes('위험') || levelStr.includes('risk') || levelStr.includes('high') || levelStr.includes('danger')) {
          risk++;
        }

        totalScore += Number(log.tint_danger_score || log.danger_score || log.tint_score || log.score || 0);
      });

      const total = todayLogs.length;
      
      setSafetyPercent(Math.round((safe / total) * 100));
      setCautionPercent(Math.round((caution / total) * 100));
      setRiskPercent(Math.round((risk / total) * 100));
      setDangerCount(caution + risk);
      setAvgDangerScore(Math.round(totalScore / total));

      const sortedLogs = [...todayLogs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const newGraphPoints = sortedLogs.map((log, index) => {
        const score = Number(log.tint_danger_score || log.danger_score || log.tint_score || log.score || 0);
        const x = sortedLogs.length === 1 ? 150 : 10 + (index / (sortedLogs.length - 1)) * 280;
        const y = 60 - (score / 100 * 50); 
        const timeStr = log.timestamp ? log.timestamp.substring(11, 16) : '';
        const levelStr = String(log.tint_danger_level || log.danger_level || log.level || log.tint_level || '').toLowerCase();
        let normalizedLevel = 'Level 1';
        if (levelStr.includes('2') || levelStr.includes('주의') || levelStr.includes('caution')) normalizedLevel = 'Level 2';
        else if (levelStr.includes('3') || levelStr.includes('위험') || levelStr.includes('risk')) normalizedLevel = 'Level 3';

        return { x, y, score, level: normalizedLevel, time: timeStr };
      });

      setGraphPoints(newGraphPoints);
    });

    return () => unsubscribe();
  }, [currentDate]);

  useEffect(() => {
    if (activeTab !== '하루') return;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const gap = (safetyPercent === 0 && cautionPercent === 0 && riskPercent === 0) ? 0 : 8; 

    const safetyTarget = (safetyPercent / 100) * circumference;
    const cautionTarget = (cautionPercent / 100) * circumference;
    const riskTarget = (riskPercent / 100) * circumference;

    const timer = setTimeout(() => {
      setDash({
        safetyLen: Math.max(0, safetyTarget - (safetyTarget > 0 ? gap : 0)),
        cautionLen: Math.max(0, cautionTarget - (cautionTarget > 0 ? gap : 0)),
        riskLen: Math.max(0, riskTarget - (riskTarget > 0 ? gap : 0)),
        safetyOff: 0,
        cautionOff: -safetyTarget,
        riskOff: -(safetyTarget + cautionTarget)
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [safetyPercent, cautionPercent, riskPercent, activeTab]);

  const recommendations = [
    { icon: "🌿", text1: "잠시 숨을 고르고 몸을 천천히 이완해보세요.", text2: "깊은 호흡이 긴장을 안정시키는 데 도움이 돼요." },
    { icon: "☕", text1: "따뜻한 물이나 차를 한 잔 마셔보세요.", text2: "몸을 따뜻하게 하면 마음도 한결 편안해집니다." },
    { icon: "🧘‍♀️", text1: "가벼운 기지개로 굳은 근육을 풀어주세요.", text2: "어깨를 가볍게 돌려주는 것만으로도 아주 좋아요." },
    { icon: "🌤️", text1: "창문을 열고 신선한 공기를 마셔보세요.", text2: "가벼운 환기는 기분 전환과 안정에 효과적입니다." }
  ];
  const [recIndex, setRecIndex] = useState(0);
  const handleNextRecommend = () => setRecIndex((prev) => (prev + 1) % recommendations.length);

  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const getClientY = (e) => (e.touches ? e.touches[0].clientY : e.clientY);
  const handleDragStart = (e) => { if (e.currentTarget.scrollTop <= 0) setStartY(getClientY(e)); };
  const handleDragMove = (e) => {
    if (startY === 0) return;
    const distance = getClientY(e) - startY;
    if (distance > 0 && e.currentTarget.scrollTop <= 0) {
      setPullDistance(distance);
      setIsPulling(distance > 80);
    }
  };
  const handleDragEnd = () => {
    if (isPulling) {
      setDash({ safetyLen: 0, cautionLen: 0, riskLen: 0, safetyOff: 0, cautionOff: 0, riskOff: 0 });
      setTimeout(() => { setCurrentDate(new Date()); }, 300);
    }
    setStartY(0); setPullDistance(0); setIsPulling(false);
  };

  let currentStatusText = '기록 없음';
  if (hasDataToday) {
    if (riskPercent === 0 && cautionPercent === 0 && safetyPercent === 0) currentStatusText = '기록 없음';
    else if (riskPercent >= cautionPercent && riskPercent >= safetyPercent) currentStatusText = '위험';
    else if (cautionPercent >= riskPercent && cautionPercent >= safetyPercent) currentStatusText = '주의';
    else currentStatusText = '안전';
  }

  let pathD = '';
  if (graphPoints.length === 1) {
    pathD = `M 10 ${graphPoints[0].y} L 290 ${graphPoints[0].y}`;
  } else if (graphPoints.length > 1) {
    pathD = graphPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  let axisLabels = [];
  if (graphPoints.length > 0 && graphPoints.length <= 5) {
    axisLabels = graphPoints.map(p => p.time);
  } else if (graphPoints.length > 5) {
    axisLabels = [
      graphPoints[0].time,
      graphPoints[Math.floor(graphPoints.length * 0.25)].time,
      graphPoints[Math.floor(graphPoints.length * 0.5)].time,
      graphPoints[Math.floor(graphPoints.length * 0.75)].time,
      graphPoints[graphPoints.length - 1].time,
    ];
  }

  let maxPoint = null;
  if (graphPoints.length > 0) {
    maxPoint = graphPoints.reduce((max, p) => (p.score > max.score ? p : max), graphPoints[0]);
    if (maxPoint.score === 0) {
      maxPoint = graphPoints[graphPoints.length - 1];
    }
  }

  return (
    <div className="home-wrapper">
      <div 
        className="scrollable-content"
        onTouchStart={handleDragStart} onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart} onMouseMove={handleDragMove} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}
        style={{ 
          position: 'relative', overscrollBehaviorY: 'none', touchAction: pullDistance > 0 ? 'none' : 'auto',
          transform: `translateY(${Math.min(pullDistance / 2.5, 60)}px)`, 
          transition: pullDistance === 0 ? 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none' 
        }}
      >
        {pullDistance > 20 && (
          <div style={{ position: 'absolute', top: '-40px', left: '0', width: '100%', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#A0A0A0' }}>
            {isPulling ? ' 놓아서 새로고침' : '↓ 아래로 당기세요'}
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
                <span className="date-number">{currentDate.getMonth() + 1}.{currentDate.getDate()}</span>
                {isToday(currentDate) ? <span className="badge today-badge">오늘</span> : <span className="badge day-badge">{getDayName(currentDate)}</span>}
              </div>
              <div className="date-item next-date" onClick={() => setCurrentDate(nextDate)}>
                {nextDate.getMonth() + 1}.{nextDate.getDate()} {getDayName(nextDate)}
              </div>
            </div>

            <nav className="top-tabs">
              <span className={`tab ${activeTab === '하루' ? 'active' : ''}`} onClick={() => setActiveTab('하루')}>나의 하루</span>
              <span className={`tab ${activeTab === '자세히' ? 'active' : ''}`} onClick={() => setActiveTab('자세히')}>자세히</span>
              <span className={`tab ${activeTab === '한눈에' ? 'active' : ''}`} onClick={() => setActiveTab('한눈에')}>한눈에</span>
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
                    <span className="status-value" style={{ fontSize: hasDataToday ? '24px' : '18px', color: hasDataToday ? (currentStatusText === '위험' ? '#FF4C4C' : currentStatusText === '주의' ? '#FFC300' : '#A5D6A7') : '#A0A0A0' }}>
                      {currentStatusText}
                    </span>
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
                    <span className="big-number">{dangerCount}</span> <span className="unit">회</span>
                  </div>
                </div>

                <div className="card half-card bouncy-card">
                  <div className="card-header">
                    <span className="card-header-title">오늘 평균 위험도</span>
                    <img src={homeChartIcon} alt="chart" className="card-icon" />
                  </div>
                  <div className="card-body">
                    <span className="big-number">{avgDangerScore}</span> <span className="unit">%</span>
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
                <div className="graph-container" style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {!hasDataToday ? (
                    <div style={{ textAlign: 'center', color: '#A0A0A0', padding: '20px 0' }}>
                      오늘 기록된 위험도 데이터가 없습니다.
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative', width: '100%', height: '70px', marginTop: '15px' }}>
                        
                        {(() => {
                          let maxPoint = graphPoints.reduce((max, p) => (p.score > max.score ? p : max), graphPoints[0]);
                          if (maxPoint.score === 0) maxPoint = graphPoints[graphPoints.length - 1]; 
                          
                          let tooltipTx = '-50%'; 
                          let tailPos = '50%'; 
                          
                          if (maxPoint.x < 50) {
                            tooltipTx = '-20%'; 
                            tailPos = '20%';   
                          } else if (maxPoint.x > 250) {
                            tooltipTx = '-80%'; 
                            tailPos = '80%'; 
                          }

                          return maxPoint && (
                            <div style={{
                              position: 'absolute',
                              left: `${(maxPoint.x / 300) * 100}%`,
                              top: `${maxPoint.y}px`, 
                              transform: `translate(${tooltipTx}, -100%)`, 
                              marginTop: '-12px', 
                              zIndex: 10,
                              transition: 'transform 0.3s ease, left 0.3s ease'
                            }}>
                              <div 
                                className="graph-tooltip" 
                                style={{
                                  '--tooltip-bg': maxPoint.level === 'Level 3' ? '#FFEBEB' : (maxPoint.level === 'Level 2' ? '#FFF3C4' : '#F4F4F4'),
                                  '--tooltip-color': maxPoint.level === 'Level 3' ? '#FF4C4C' : (maxPoint.level === 'Level 2' ? '#E6A800' : '#888888'),
                                  '--tail-pos': tailPos
                                }}
                              >
                                {maxPoint.level === 'Level 3' ? '위험 구간 발견' : (maxPoint.level === 'Level 2' ? '주의 구간 발견' : '안정적인 상태')}
                              </div>
                            </div>
                          );
                        })()}
                        
                        <svg viewBox="0 0 300 70" className="line-graph-svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                          <path d={pathD} fill="none" stroke="#A5D6A7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                          {(() => {
                            let maxPoint = graphPoints.reduce((max, p) => (p.score > max.score ? p : max), graphPoints[0]);
                            if (maxPoint.score === 0) maxPoint = graphPoints[graphPoints.length - 1];
                            return maxPoint && maxPoint.level !== 'Level 1' && (
                              <circle 
                                cx={maxPoint.x} cy={maxPoint.y} r="4.5"
                                stroke={maxPoint.level === 'Level 3' ? '#FF4C4C' : '#FFC300'} 
                                className="pulse-circle" 
                              />
                            );
                          })()}

                          {graphPoints.map((p, i) => {
                            let circleColor = '#A5D6A7'; 
                            if (p.level === 'Level 2') circleColor = '#FFC300'; 
                            else if (p.level === 'Level 3') circleColor = '#FF4C4C'; 
                            return <circle key={i} cx={p.x} cy={p.y} r="4.5" fill={circleColor} stroke="#FFF" strokeWidth="2.5" />;
                          })}
                        </svg>
                      </div>
                      
                      <div className="graph-x-axis" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 5px', marginTop: '10px' }}>
                        {axisLabels.map((time, idx) => (
                          <span key={idx}>{time}</span>
                        ))}
                      </div>
                    </>
                  )}
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
              <h1 className="sub-page-title">{activeTab === '자세히' ? '하루 리포트' : '한눈에 보기'}</h1>
              <div className="header-placeholder"></div>
            </header>
            {activeTab === '자세히' && <DailyDetail currentDate={currentDate} />}
            {activeTab === '한눈에' && <DailySnapshot currentDate={currentDate} />}
          </>
        )}
      </div>

      {activeTab === '하루' && (
        <nav className="bottom-nav-bar">
          <div className="nav-item active" onClick={() => onNavigate('home')}><img src={homeOn} alt="홈" className="nav-icon" /><span>홈</span></div>
          <div className="nav-item" onClick={() => onNavigate('analysis')}><img src={chartOff} alt="분석" className="nav-icon" /><span>분석</span></div>
          <div className="nav-item" onClick={() => onNavigate('log')}><img src={logOff} alt="로그" className="nav-icon" /><span>로그</span></div>
          <div className="nav-item"><img src={myOff} alt="마이" className="nav-icon" /><span>마이</span></div>
        </nav>
      )}
    </div>
  );
};

export default Home;