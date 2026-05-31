import React, { useState, useEffect } from 'react';
import '../styles/Log.css';

import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; 

import homeOff from '../assets/Home_off.png';
import chartOff from '../assets/Chart_off.png';
import logOn from '../assets/Log_on.png'; 
import myOff from '../assets/My_off.png';

const Log = ({ onNavigate }) => {
  const [logData, setLogData] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'tint_results'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        const timeOnly = data.timestamp ? data.timestamp.substring(11, 16) : '--:--';
        let typeClass = 'safe';
        if (data.danger_level === 'Level 2') typeClass = 'caution';
        else if (data.danger_level === 'Level 3') typeClass = 'risk';

        return {
          id: doc.id,
          time: timeOnly,
          type: typeClass,
          title: data.user_text,      
          reason: data.gpt_reason,
          score: data.danger_score || 0, 
          hasAudio: typeClass !== 'safe' 
        };
      });
      
      setLogData(fetchedLogs);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="page-wrapper">
      <header className="page-header center-title">
        <h1 className="header-title">오늘의 로그</h1>
      </header>

      <div className="log-tabs">
        <div className="log-tab active">전체</div>
        <div className="log-tab">안전</div>
        <div className="log-tab">주의</div>
        <div className="log-tab">위험</div>
      </div>

      <main className="log-content-area">
        <div className="timeline-container">
          {logData.length === 0 && (
             <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
               아직 기록된 로그가 없습니다.
             </div>
          )}

          {logData.map((log, index) => (
            <div className="timeline-item" key={log.id}>
              <div className="time-col">{log.time}</div>
              
              <div className="line-col">
                <div className={`status-dot ${log.type}`}></div>
                {index !== logData.length - 1 && <div className="timeline-line"></div>}
              </div>
              
              <div className="content-col">
                <p className="log-title">{log.title}</p>
                <span className="log-reason">이유 : {log.reason}</span>
              </div>
              
              <div className="action-col">
                {log.hasAudio && (
                  <button 
                    className={`play-btn ${log.type}`} 
                    onClick={() => onNavigate('logDetail', log)}
                  >
                    ▶
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="view-all-date">
          <span>날짜 전체 보기</span>
        </div>
      </main>

      <nav className="bottom-nav-bar">
        <div className="nav-item" onClick={() => onNavigate('home')}>
          <img src={homeOff} alt="홈" className="nav-icon" />
          <span>홈</span>
        </div>
        <div className="nav-item">
          <img src={chartOff} alt="분석" className="nav-icon" />
          <span>분석</span>
        </div>
        <div className="nav-item active">
          <img src={logOn} alt="로그" className="nav-icon" />
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

export default Log;