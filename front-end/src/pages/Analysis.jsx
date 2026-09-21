import React, { useState, useEffect } from 'react';
import '../styles/Analysis.css';
import hiCat from '../assets/summary_cat.png'; 
import faceCat from '../assets/card_cat.png'; 
import weekBadge1 from '../assets/Week_Badge1.png';
import weekBadge2 from '../assets/Week_Badge2.png';

import homeOff from '../assets/Home_Off.png';
import chartOn from '../assets/chart_on.png'; 
import logOff from '../assets/Log_Off.png';
import myOff from '../assets/My_Off.png';

import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const Analysis = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('주간'); 

  const [weeklyStats, setWeeklyStats] = useState({ avgScore: 0, dangerCount: 0, maxSafeDays: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ avgScore: 0, dangerCount: 0, maxSafeDays: 0 });
  
  const [weekChart, setWeekChart] = useState(Array(7).fill({ safe: 0, caution: 0, risk: 0 }));
  
  const [heatmapData, setHeatmapData] = useState(Array(84).fill(0));
  const [worstTimeStr, setWorstTimeStr] = useState("데이터 부족");

  const [topWords, setTopWords] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'tint_results'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      let wScore = 0, wDanger = 0, wTotal = 0;
      let mScore = 0, mDanger = 0, mTotal = 0;
      
      const dailyData = { 0:{s:0,c:0,r:0}, 1:{s:0,c:0,r:0}, 2:{s:0,c:0,r:0}, 3:{s:0,c:0,r:0}, 4:{s:0,c:0,r:0}, 5:{s:0,c:0,r:0}, 6:{s:0,c:0,r:0} };
      
      const weeklyDangerDates = {}; 
      const monthlyDangerDates = {};

      const heat2D = Array.from({ length: 7 }, () => Array(12).fill(0));
      
      const wordCounts = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.timestamp) return;

        const logDate = new Date(data.timestamp.replace(/-/g, '/'));
        const dateString = data.timestamp.split(' ')[0]; // YYYY-MM-DD
        const hour = logDate.getHours();
        const dayOfWeek = logDate.getDay();

        const levelStr = String(data.tint_danger_level || data.danger_level || data.level || '').toLowerCase();
        let level = 1;
        if (levelStr.includes('2') || levelStr.includes('주의') || levelStr.includes('caution')) level = 2;
        else if (levelStr.includes('3') || levelStr.includes('위험') || levelStr.includes('risk')) level = 3;
        
        const score = Number(data.tint_danger_score || data.danger_score || data.score || 0);
        const word = data.tint_word || data.word || "";

        if (logDate >= startOfWeek) {
          wTotal++;
          wScore += score;
          if (!weeklyDangerDates[dateString]) weeklyDangerDates[dateString] = 0;
          
          if (level > 1) {
            wDanger++;
            weeklyDangerDates[dateString]++;
          }

          if (level === 1) dailyData[dayOfWeek].s++;
          else if (level === 2) dailyData[dayOfWeek].c++;
          else if (level === 3) dailyData[dayOfWeek].r++;

          const heatCol = Math.floor(hour / 2);
          heat2D[dayOfWeek][heatCol] += score; 
        }

        if (logDate >= startOfMonth) {
          mTotal++;
          mScore += score;
          if (!monthlyDangerDates[dateString]) monthlyDangerDates[dateString] = 0;

          if (level > 1) {
            mDanger++;
            monthlyDangerDates[dateString]++;
            
            if (word && word !== "N/A" && word !== "없음" && word.trim() !== "") {
              wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
          }
        }
      });

      // 주간/월간 연속 안전일수 계산 로직
      const calculateMaxStreak = (startDate, dangerMap) => {
        let maxStreak = 0;
        let currentStreak = 0;
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          if (dangerMap[dStr] > 0) {
            currentStreak = 0;
          } else {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          }
        }
        return maxStreak;
      };

      // 히트맵 데이터 및 가장 위험한 시간대 정제
      let maxHeat = 0;
      let worstDay = 0, worstCol = 0;
      for (let d = 0; d < 7; d++) {
        for (let c = 0; c < 12; c++) {
          if (heat2D[d][c] > maxHeat) {
            maxHeat = heat2D[d][c];
            worstDay = d;
            worstCol = c;
          }
        }
      }
      
      const flatHeatmap = [];
      heat2D.forEach(row => {
        row.forEach(val => {
          flatHeatmap.push(maxHeat > 0 ? (val / maxHeat) : 0); 
        });
      });

      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const worstTimeString = maxHeat > 0 
        ? `${dayNames[worstDay]} ${worstCol * 2}시` 
        : "데이터 부족";

      // 워드 클라우드 빈도순 정렬 (상위 10개)
      const sortedWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => entry[0]);

      // 요일별 그래프 비율
      const newWeekChart = Array(7).fill({ safe: 0, caution: 0, risk: 0 });
      for(let i = 0; i < 7; i++) {
        let dayTotal = dailyData[i].s + dailyData[i].c + dailyData[i].r;
        if (dayTotal > 0) {
          newWeekChart[i] = {
            safe: Math.round((dailyData[i].s / dayTotal) * 100),
            caution: Math.round((dailyData[i].c / dayTotal) * 100),
            risk: Math.round((dailyData[i].r / dayTotal) * 100)
          };
        }
      }

      setWeeklyStats({
        avgScore: wTotal > 0 ? Math.round(wScore / wTotal) : 0,
        dangerCount: wDanger,
        maxSafeDays: calculateMaxStreak(startOfWeek, weeklyDangerDates)
      });

      setMonthlyStats({
        avgScore: mTotal > 0 ? Math.round(mScore / mTotal) : 0,
        dangerCount: mDanger,
        maxSafeDays: calculateMaxStreak(startOfMonth, monthlyDangerDates)
      });
      
      setWeekChart(newWeekChart);
      setHeatmapData(flatHeatmap);
      setWorstTimeStr(worstTimeString);
      setTopWords(sortedWords);
    });

    return () => unsubscribe();
  }, []);

  let monthlyTitle = "기록 부족";
  let monthlySubtitle = "TiNT와 대화를 시작해보세요!";
  if (monthlyStats.avgScore > 0) {
    if (monthlyStats.avgScore >= 50) {
      monthlyTitle = "주의가 필요한 파이터";
      monthlySubtitle = "이번 달은 스트레스 관리가 조금 필요해요";
    } else if (monthlyStats.avgScore >= 20) {
      monthlyTitle = "마인드 컨트롤러";
      monthlySubtitle = "무난하게 감정을 잘 조절하고 있어요!";
    } else {
      monthlyTitle = "평온한 틴트 마스터";
      monthlySubtitle = "훌륭한 자기통제력을 보여주셨어요!";
    }
  }

  const wordStyles = [
    { fontSize: '32px', color: '#FF4C4C', fontWeight: '900', transform: 'translateY(-2px)' },
    { fontSize: '26px', color: '#FF7043', fontWeight: '800', transform: 'translateY(4px)' },
    { fontSize: '24px', color: '#FFC300', fontWeight: '900', transform: 'translateY(-4px)' },
    { fontSize: '20px', color: '#111111', fontWeight: '700', transform: 'translateY(2px)' },
    { fontSize: '19px', color: '#66bb6a', fontWeight: '700', transform: 'translateY(-2px)' },
    { fontSize: '18px', color: '#5C6BC0', fontWeight: '600', transform: 'translateY(6px)' },
    { fontSize: '16px', color: '#111111', fontWeight: '500', transform: 'translateY(-6px)' },
    { fontSize: '15px', color: '#9FA8DA', fontWeight: '400', transform: 'translateY(4px)' },
    { fontSize: '14px', color: '#888888', fontWeight: '400', transform: 'translateY(2px)' },
    { fontSize: '13px', color: '#bdbdbd', fontWeight: '400', transform: 'translateY(-2px)' },
  ];

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
                  <img src={hiCat} alt="고양이" className="summary_cat" style={{ width: '100px', height: '100px', objectFit: 'contain', marginLeft: '-8px'}} />
                </div>
                <div className="ai-stats-col">
                  <div className="stat-item">
                    <span className="stat-label">평균 위험도</span>
                    <span className="stat-val">{weeklyStats.avgScore}<span className="unit">%</span></span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">총 위험 발화</span>
                    <span className="stat-val text-red">{weeklyStats.dangerCount}<span className="unit">회</span></span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">최고 연속 안전</span>
                    <span className="stat-val text-green">{weeklyStats.maxSafeDays}<span className="unit">일</span></span>
                  </div>
                </div>
              </div>
            </section>
  
            <section className="analysis-card"> 
              <h3 className="card-section-title">이번 주 획득 배지</h3>
              <div className="badge-grid">
                <div className="badge-box">
                  <img src={weekBadge1} alt="배지1" className="badge-icon" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                  <div className="badge-info">
                    <div className="badge-name">침착한 케어러</div>
                    <div className="badge-desc">위험 단계 5회 이하 유지</div>
                  </div>
                </div>
                <div className="badge-box">
                  <img src={weekBadge2} alt="배지2" className="badge-icon" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
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
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div className="bar-col" key={day}>
                    <div className="bar-track">
                      <div className="bar-segment r-bg" style={{ height: `${weekChart[idx].risk}%` }}></div>
                      <div className="bar-segment y-bg" style={{ height: `${weekChart[idx].caution}%` }}></div>
                      <div className="bar-segment g-bg" style={{ height: `${weekChart[idx].safe}%` }}></div>
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
                  {heatmapData.map((opacityValue, i) => (
                    <div 
                      key={i} 
                      className="heatmap-cell"
                      style={{ 
                        backgroundColor: '#FF4C4C',
                        opacity: opacityValue > 0 ? Math.max(0.15, opacityValue) : 0.05 
                      }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="heatmap-x-axis">
                <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span>
              </div>
              <div className="insight-box mt-16">
                이번 주 가장 취약했던 시간: <strong>{worstTimeStr}</strong>
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
                  <img src={faceCat} alt="고양이" className="monthly-cat-img" />
                </div>
                <div className="monthly-title-text">
                  <p>이달의 등급은</p>
                  <h4>{monthlyTitle}<br/>입니다!</h4>
                </div>
              </div>
              
              <div className="ai-comment-box" style={{ marginBottom: '16px', border: 'none', backgroundColor: '#F8F9FA' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{monthlySubtitle}</p>
              </div>

              <div className="monthly-stats-row">
                <div className="m-stat-box">
                  <span className="m-stat-label">평균 위험도</span>
                  <span className="m-stat-val">{monthlyStats.avgScore}%</span>
                </div>
                <div className="divider"></div>
                <div className="m-stat-box">
                  <span className="m-stat-label">총 위험 발화</span>
                  <span className="m-stat-val">{monthlyStats.dangerCount}회</span>
                </div>
                <div className="divider"></div>
                <div className="m-stat-box">
                  <span className="m-stat-label">연속 안전</span>
                  <span className="m-stat-val">{monthlyStats.maxSafeDays}일</span>
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
                </ul>
              </div>
            </section>
            
            <section className="analysis-card">
              <h3 className="card-section-title">이달의 언어 안테나 <span className="sub-note">(부정단어)</span></h3>
              <div className="word-cloud-container">
                {topWords.length > 0 ? (
                  topWords.map((word, idx) => (
                    <span key={idx} style={wordStyles[idx]}>
                      {word}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '15px', color: '#999', alignSelf: 'center', margin: 'auto' }}>
                    충분한 데이터가 수집되지 않았습니다.
                  </span>
                )}
              </div>
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
        <div className="nav-item" onClick={() => onNavigate('mypage')}>
          <img src={myOff} alt="마이" className="nav-icon" />
          <span>마이</span>
          </div>
      </nav>
    </div>
  );
};

export default Analysis;