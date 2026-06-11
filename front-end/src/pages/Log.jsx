import React, { useState, useEffect } from 'react';
import '../styles/Log.css';

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

import homeOff from '../assets/Home_off.png';
import chartOff from '../assets/Chart_off.png';
import logOn from '../assets/Log_on.png'; 
import myOff from '../assets/My_off.png';
import forwardIcon from '../assets/Forward.png';

const Log = ({ onNavigate, initialDateData }) => {
  const [logData, setLogData] = useState([]);
  const [activeTab, setActiveTab] = useState('전체');
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

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
          date.getMonth() === today.getMonth() && 
          date.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    const q = query(collection(db, 'tint_results'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const targetDateString = `${year}-${month}-${day}`;
      const fetchedLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        const timeOnly = data.timestamp ? data.timestamp.substring(11, 16) : '--:--';

        let typeClass = 'safe';
        if (data.tint_danger_level === 'Level 2' || data.danger_level === 'Level 2') typeClass = 'caution';
        else if (data.tint_danger_level === 'Level 3' || data.danger_level === 'Level 3') typeClass = 'risk';

        return {
          id: doc.id,
          fullTimestamp: data.timestamp || '', 
          time: timeOnly,
          type: typeClass,
          title: data.user_text,      
          reason: data.tint_reason || data.gpt_reason || "분석 내용이 없습니다.",
          score: data.tint_danger_score || data.danger_score || 0,
          word: data.tint_word || "",
          emotions: data.tint_emotions || {},
          guide: data.tint_guide || "안전한 대화입니다.",
          audioUrl: data.audio_url || "",
          hasAudio: typeClass !== 'safe' && data.audio_url !== ""
        };
      })
      .filter(log => log.fullTimestamp.startsWith(targetDateString)); 
      
      setLogData(fetchedLogs);
    });

    return () => unsubscribe();
  }, [currentDate]); 

  const filteredLogs = logData.filter(log => {
    if (activeTab === '전체') return true;
    if (activeTab === '안전') return log.type === 'safe';
    if (activeTab === '주의') return log.type === 'caution';
    if (activeTab === '위험') return log.type === 'risk';
    return true;
  });

  return (
    <div className="page-wrapper">
      <header className="page-header center-title">
        <h1 className="header-title">
          {isToday(currentDate) ? "오늘의 로그" : `${currentDate.getMonth() + 1}월 ${currentDate.getDate()}일 로그`}
        </h1>
      </header>

      <div className="log-tabs">
        <div className={`log-tab ${activeTab === '전체' ? 'active' : ''}`} onClick={() => setActiveTab('전체')}>전체</div>
        <div className={`log-tab ${activeTab === '안전' ? 'active' : ''}`} onClick={() => setActiveTab('안전')}>안전</div>
        <div className={`log-tab ${activeTab === '주의' ? 'active' : ''}`} onClick={() => setActiveTab('주의')}>주의</div>
        <div className={`log-tab ${activeTab === '위험' ? 'active' : ''}`} onClick={() => setActiveTab('위험')}>위험</div>
      </div>

      <main className="log-content-area">
        <div className="timeline-container">
          {filteredLogs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              해당하는 기록이 없습니다.
            </div>
          )}

          {filteredLogs.map((log, index) => (
            <div className="timeline-item" key={log.id}>
              <div className="time-col">{log.time}</div>
              
              <div className="line-col">
                <div className={`status-dot ${log.type}`}></div>
                {index !== filteredLogs.length - 1 && <div className="timeline-line"></div>}
              </div>
              
              <div 
                className="content-col"
                onClick={() => onNavigate('logDetail', log)}
                style={{ cursor: 'pointer' }}
              >
                <p className="log-title">{log.title}</p>
                <p className="log-reason">{log.reason}</p>
              </div>
              
              <div className="action-col">
                {log.hasAudio ? (
                  <button 
                    className={`play-btn ${log.type}`} 
                    onClick={() => onNavigate('logDetail', log)}
                  >
                    ▶
                  </button>
                ) : (
                  <img 
                    src={forwardIcon} 
                    alt="상세보기" 
                    onClick={() => onNavigate('logDetail', log)}
                    style={{ width: '22px', height: '22px', cursor: 'pointer', opacity: 0.4 }} 
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div 
          className="view-all-date" 
          onClick={() => onNavigate('calendar')}
          style={{ cursor: 'pointer' }}
        >
          <span>날짜 전체 보기</span>
        </div>
      </main>

      <nav className="bottom-nav-bar">
        <div className="nav-item" onClick={() => onNavigate('home')}><img src={homeOff} alt="홈" className="nav-icon" /><span>홈</span></div>
        <div className="nav-item" onClick={() => onNavigate('analysis')}><img src={chartOff} alt="분석" className="nav-icon" /><span>분석</span></div>
        <div className="nav-item active" onClick={() => onNavigate('log')}><img src={logOn} alt="로그" className="nav-icon" /><span>로그</span></div>
        <div className="nav-item"><img src={myOff} alt="마이" className="nav-icon" /><span>마이</span></div>
      </nav>
    </div>
  );
};

export default Log;