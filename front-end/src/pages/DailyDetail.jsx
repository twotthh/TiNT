import React, { useState, useEffect } from 'react';
import '../styles/DailyDetail.css';

import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import thinkCat from '../assets/think_cat.png'; 
import sirenIcon from '../assets/Siren.png';
import increaseIcon from '../assets/Increase.png';
import ScoreIcon from '../assets/Chat_score.png';
import SuggestionIcon from '../assets/Today_suggest.png';

const DailyDetail = ({ currentDate }) => {
  const dateObj = currentDate || new Date();
  const month = dateObj.getMonth() + 1;
  const date = dateObj.getDate();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    dangerCount: 0,
    avgScore: 0,
    talkScore: 100,
    top3: [],
    emotions: [],
    topEmotion: '평온',
  });

  useEffect(() => {
    const q = query(collection(db, 'tint_results'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const year = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const targetDateString = `${year}-${m}-${d}`;

      let totalScore = 0;
      let dCount = 0;
      const parsedLogs = [];
      const emotionMap = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.startsWith(targetDateString)) {
          const levelStr = String(data.tint_danger_level || data.danger_level || data.level || data.tint_level || '').toLowerCase();
          let level = 1;
          if (levelStr.includes('2') || levelStr.includes('주의') || levelStr.includes('caution')) level = 2;
          else if (levelStr.includes('3') || levelStr.includes('위험') || levelStr.includes('risk')) level = 3;

          const score = Number(data.tint_danger_score || data.danger_score || data.tint_score || data.score || 0);
          
          if (level > 1) dCount++;
          totalScore += score;

          const ems = data.tint_emotions || data.emotions || {};
          Object.entries(ems).forEach(([key, val]) => {
            emotionMap[key] = (emotionMap[key] || 0) + Number(val);
          });

          parsedLogs.push({
            id: doc.id,
            time: data.timestamp.substring(11, 16),
            level,
            score,
            reason: data.tint_reason || data.gpt_reason || data.reason || '상세 분석 내용이 없습니다.',
          });
        }
      });

      const totalLogs = parsedLogs.length;
      const avgScore = totalLogs > 0 ? Math.round(totalScore / totalLogs) : 0;

      const top3 = parsedLogs
        .filter(l => l.level > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const sortedEmotions = Object.entries(emotionMap)
        .map(([name, val]) => ({ name, value: val }))
        .sort((a, b) => b.value - a.value);

      const totalEmotionValue = sortedEmotions.reduce((sum, e) => sum + e.value, 0);
      const emotionsWithPercent = sortedEmotions.map(e => ({
        name: e.name,
        percent: totalEmotionValue > 0 ? Math.round((e.value / totalEmotionValue) * 100) : 0
      }));

      setStats({
        dangerCount: dCount,
        avgScore,
        talkScore: totalLogs === 0 ? 0 : Math.max(0, 100 - avgScore), 
        top3,
        emotions: emotionsWithPercent,
        topEmotion: emotionsWithPercent.length > 0 ? emotionsWithPercent[0].name : '평온'
      });
      setLogs(parsedLogs);
    });

    return () => unsubscribe();
  }, [currentDate]);

  const bubbleStyles = ['y-bubble', 'r-bubble', 'g-bubble', 'gr-bubble'];

  let suggestion1 = "오늘 밤은 따뜻한 차를 마시며 수면을 취해보세요.";
  let suggestion2 = `내일은 오늘 평균 위험도(${stats.avgScore}%)보다 조금 더 낮은 점수를 목표로 해볼까요?`;

  if (stats.avgScore === 0) {
    suggestion1 = "기록된 대화가 없습니다.";
    suggestion2 = "TiNT와 함께 건강한 대화 습관을 만들어봐요!";
  } else if (stats.avgScore < 20) {
    suggestion1 = "정말 평온하고 안정적인 하루를 보내셨네요! 훌륭해요~";
    suggestion2 = "지금의 좋은 에너지와 긍정적인 마음을 내일도 유지해 볼까요?";
  } else if (stats.avgScore < 50) {
    suggestion1 = "무난한 하루였어요! 중간중간 스트레칭으로 긴장을 풀어주세요.";
    suggestion2 = "내일은 긍정적인 단어를 조금 더 많이 사용해 보는 건 어떨까요?";
  } else {
    suggestion1 = "오늘은 스트레스가 조금 쌓인 것 같아요. 따뜻한 차 한 잔 어때요? 🍵";
    suggestion2 = "내일은 스피치 재머가 켜지지 않도록, 화가 날 때 심호흡을 먼저 해봐요!";
  }

  return (
    <main className="detail-tab-content">
      <section className="report-card ai-summary-card">
        <div className="ai-character-wrapper">
          <img src={thinkCat} alt="AI TINT" className="ai-character-img" />
        </div>
        <div className="ai-speech-bubble">
          <div className="bubble-date-badge">{month}월 {date}일 {dayName}요일</div>
          {stats.avgScore === 0 ? (
            <p className="ai-text-main">기록된 발화가 없습니다.</p>
          ) : (
            <>
              <p className="ai-text-main">
                오늘의 주된 감정은 <strong>'{stats.topEmotion}'</strong> 이네요.
              </p>
              <p className="ai-text-sub">
                평균 위험도는 <strong className={stats.avgScore > 50 ? "highlight-red" : ""}>{stats.avgScore}%</strong>로 측정되었어요.
              </p>
              <p className="ai-text-sub">
                {stats.avgScore > 50 ? "마음의 안정을 취하고 심호흡을 해보세요." : "안정적이고 좋은 대화 흐름을 유지하고 있어요!"}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="report-card summary-section">
        <h3 className="card-section-title">오늘의 요약</h3>
        <div className="summary-widget-grid">
          <div className="widget-box">
            <img src={sirenIcon} alt="위험 발화" className="widget-icon-img" />
            <span className="widget-label">위험 발화</span>
            <div className="widget-value">{stats.dangerCount}<span className="widget-unit">회</span></div>
          </div>
          <div className="widget-box">
            <img src={increaseIcon} alt="평균 위험도" className="widget-icon-img" />
            <span className="widget-label">평균 위험도</span>
            <div className="widget-value">{stats.avgScore}<span className="widget-unit">%</span></div>
          </div>
          <div className="widget-box">
            <img src={ScoreIcon} alt="대화 점수" className="widget-icon-img" />
            <span className="widget-label">대화 점수</span>
            <div className="widget-value">{stats.talkScore}<span className="widget-unit">/100</span></div>
          </div>
        </div>
      </section>

      <section className="report-card pattern-card">
        <h3 className="card-section-title">오늘의 감정 패턴</h3>
        <div className="bubble-chart-board">
          {stats.emotions.length === 0 ? (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#999', fontWeight: 'bold' }}>
              감정 데이터가 없습니다.
            </div>
          ) : (
            stats.emotions.slice(0, 4).map((emo, idx) => (
              <div key={idx} className={`bubble ${idx === 0 ? 'bubble-lg' : (idx === 1 ? 'bubble-md' : 'bubble-sm')} ${bubbleStyles[idx]}`}>
                <span className="bubble-text">{emo.name}<br/><strong>{emo.percent}%</strong></span>
              </div>
            ))
          )}
        </div>
        
        <div className="pattern-insight">
          <span className="insight-text-icon">!</span>
          <p>
            {stats.emotions.length > 0 
              ? `오늘 대화 중 '${stats.topEmotion}' 감정이 가장 두드러지게 나타났어요.` 
              : "충분한 대화가 수집되지 않았어요."}
          </p>
        </div>
      </section>

      <section className="report-card top3-card">
        <h3 className="card-section-title">오늘의 위험 순간 Top 3</h3>
        {stats.top3.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#A0A0A0', fontWeight: 'bold' }}>
            위험(주의) 구간이 없습니다. 완벽해요!
          </div>
        ) : (
          <ul className="timeline-list">
            {stats.top3.map((log, index) => {
              const isHigh = log.level === 3;
              return (
                <li className="timeline-item" key={index}>
                  <div className={`timeline-marker ${isHigh ? 'high' : 'mid'}`}></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-time">{log.time}</span>
                      <span className={`timeline-risk ${isHigh ? 'high-text' : 'mid-text'}`}>위험도 {log.score}%</span>
                    </div>
                    <p className="timeline-desc">{log.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      
      <section className="report-card suggestion-card">
        <div className="suggestion-header">
          <img src={SuggestionIcon} alt="제안" className="suggestion-icon-img" />
          <h3 className="card-section-title no-margin">오늘의 제안</h3>
        </div>
        <div className="suggestion-body">
          <p>{suggestion1}</p>
          <p>{suggestion2}</p>
        </div>
      </section>
    </main>
  );
};

export default DailyDetail;