import React, { useState, useEffect } from 'react';
import '../styles/Notification.css';
import backIcon from '../assets/Back.png';
import cautionIcon from '../assets/Notification_Caution.png';
import dangerIcon from '../assets/Notification_Danger.png';

import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const Notification = ({ onNavigate }) => {
    const [alerts, setAlerts] = useState([]);
    
    useEffect(() => {
        const q = query(collection(db, 'tint_results'), orderBy('timestamp', 'desc'), limit(30));
        const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = [];
        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const level = String(data.tint_danger_level || data.danger_level || '').toLowerCase();

            if (level.includes('2') || level.includes('3') || level.includes('주의') || level.includes('위험')) {
                fetchedAlerts.push({
                    id: doc.id,
                    ...data,
                    type: (level.includes('3') || level.includes('위험')) ? 'risk' : 'caution'
                });
            }
        });
        setAlerts(fetchedAlerts);
    });
    
    return () => unsubscribe();
}, []);

const handleAlertClick = (alert) => {
    const mappedData = {
        id: alert.id,
        time: alert.timestamp ? alert.timestamp.substring(11, 16) : '',
        fullTimestamp: alert.timestamp,
        type: alert.type,
        score: alert.tint_danger_score || 0,
        title: alert.user_text || '내용 없음',
        reason: alert.tint_reason || '',
        word: alert.tint_word || '',
        guide: alert.tint_guide || '',
        audioUrl: alert.audio_url || '',
        emotions: alert.tint_emotions || {}
    };
    onNavigate('logDetail', mappedData);
};

const formatTime = (ts) => {
    if (!ts) return '';
    const parts = ts.split(' ');
    if (parts.length === 2) {
        const date = parts[0].substring(5).replace('-', '/'); 
        const time = parts[1].substring(0, 5); 
        return `${date} ${time}`;
    }
    return ts;
};

return (
<div className="noti-wrapper bg-white">
    <header className="noti-header">
        <button className="back-btn-left" onClick={() => onNavigate('home')} style={{ marginLeft: '-8px' }}>
            <img src={backIcon} alt="뒤로가기" />
            </button>
            <h1 className="header-title">알림</h1>
            <div style={{ width: '40px' }}></div> 
            </header>
            
            <main className="noti-content">
                {alerts.length === 0 ? (
                    <div className="noti-empty">
                        <span className="noti-empty-emoji">🕊️</span>
                        <p>최근 알림이 없습니다.</p>
                        <p className="noti-empty-sub">평온한 하루가 이어지고 있어요!</p>
                        </div>
                        ) : (
                        <ul className="noti-list">
                            {alerts.map((alert) => (
                                <li 
                                key={alert.id} 
                                className={`noti-item ${alert.type === 'risk' ? 'item-risk' : 'item-caution'}`}
                                onClick={() => handleAlertClick(alert)}
                                >
                                    <div className="noti-item-icon">
                                        <img 
                                            src={alert.type === 'risk' ? dangerIcon : cautionIcon} 
                                            alt="알림" 
                                            style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
                                        />
                                        </div>
                                        <div className="noti-item-info">
                                            <div className="noti-item-top">
                                                <span className="noti-title">
                                                    {alert.type === 'risk' ? '위험 발화가 감지되었어요!' : '주의 발화가 감지되었어요!'}
                                                    </span>
                                                    <span className="noti-time">{formatTime(alert.timestamp)}</span>
                                                    </div>
                                                    <p className="noti-text">"{alert.user_text}"</p>
                                                    </div>
                                                    </li>
                                                ))}
                                                </ul>
                                            )}
                                            </main>
                                            </div>
                                            );
                                        };

export default Notification;