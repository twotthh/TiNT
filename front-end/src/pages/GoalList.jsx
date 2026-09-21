import React, { useState, useEffect } from 'react';
import '../styles/GoalList.css';
import backIcon from '../assets/Back.png';

import { collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

function getDaysPassed(startDateStr) {
  if (!startDateStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(today - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  return diffDays;
}

const GoalList = ({ onNavigate }) => {
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'user_goals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGoals(fetched);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('정말 이 목표를 삭제할까요?')) {
      try {
        await deleteDoc(doc(db, 'user_goals', id));
      } catch (error) {
        console.error('삭제 에러:', error);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  const handleEdit = (goal) => {
    onNavigate('goalCreate', goal);
  };

  const handleRestart = async (id) => {
    if (window.confirm('기록을 리셋하고 오늘부터 다시 시작할까요?')) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      try {
        await updateDoc(doc(db, 'user_goals', id), {
          startDate: todayStr
        });
      } catch (error) {
        console.error('리셋 에러:', error);
        alert('다시 시작에 실패했습니다.');
      }
    }
  };

  return (
    <div className="goal-wrapper bg-white">
      <header className="goal-header">
        <button className="back-btn-left" onClick={() => onNavigate('mypage')}>
          <img src={backIcon} alt="뒤로가기" />
        </button>
        <h1 className="header-title">목표 목록</h1>
        <button
          className="add-btn-right"
          onClick={() => onNavigate('goalCreate')}
          aria-label="목표 추가"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </header>

      <main className="goal-list-content">
        {goals.length === 0 ? (
          <div className="goal-empty-state">
            <p className="empty-title">아직 설정한 목표가 없어요</p>
            <p className="empty-sub">오른쪽 위 + 버튼을 눌러 첫 목표를 만들어보세요</p>
          </div>
        ) : (
          <ul className="goal-cards">
            {goals.map((goal) => {
              let currentStreak = getDaysPassed(goal.startDate); 
              
              if (isNaN(currentStreak)) currentStreak = 0; 
              
              const achieved = currentStreak >= goal.days;
              const progressPercent = Math.min(100, Math.round(((currentStreak + 1) / goal.days) * 100));

              return (
                <li className="goal-card" key={goal.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span 
                          className={`goal-card-days-badge ${achieved ? 'achieved' : ''}`}
                          style={{ margin: 0, marginLeft: '-4px' }} 
                        >
                      {goal.days}일
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="goal-action-btn" onClick={() => handleEdit(goal)}>수정</button>
                      {achieved ? (
                        <button className="goal-action-btn" onClick={() => handleRestart(goal.id)} style={{ color: '#92AA83' }}>다시 시작</button>
                      ) : (
                        <button className="goal-action-btn delete-btn" onClick={() => handleDelete(goal.id)}>삭제</button>
                      )}
                    </div>
                  </div>

                  <div className="goal-card-top" style={{ marginTop: '0' }}>
                    <div className="goal-card-info">
                      <h3 className="goal-card-title">{goal.title}</h3>
                      <p className="goal-card-desc">
                        {achieved
                          ? '목표 달성 완료!'
                          : `${currentStreak + 1}일째 진행 중 · 목표 ${goal.days}일`}
                      </p>
                    </div>
                  </div>
                  <div className="goal-progress-track">
                    <div
                      className={`goal-progress-fill ${achieved ? 'achieved' : ''}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default GoalList;