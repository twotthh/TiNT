import React, { useState, useEffect } from 'react';
import '../styles/GoalCreate.css';
import backIcon from '../assets/Back.png';

import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const goalOptions = [
  { days: 3, title: '3일 연속', desc: '작심삼일 타파! 가볍게 시작해요' },
  { days: 7, title: '7일 연속', desc: '좋은 습관의 시작 (추천)' },
  { days: 14, title: '14일 연속', desc: '마인드 컨트롤러' },
  { days: 30, title: '30일 연속', desc: '완벽한 습관 형성! 바른 말 예쁜 말 마스터' }
];

const GoalCreate = ({ onNavigate, goalData }) => {
  const isEditMode = !!goalData; 
  
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setTitle(goalData.title);
      setSelectedDays(goalData.days);
    }
  }, [isEditMode, goalData]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('목표 제목을 입력해주세요.');
      return;
    }
    setSaving(true);

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    try {
      if (isEditMode) {
        await updateDoc(doc(db, 'user_goals', goalData.id), {
          title: title.trim(),
          days: selectedDays,
        });
      } else {
        await addDoc(collection(db, 'user_goals'), {
          title: title.trim(),
          days: selectedDays,
          createdAt: serverTimestamp(),
          startDate: todayStr,
        });
      }
      onNavigate('goalList');
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="goal-wrapper bg-white">
      <header className="goal-header">
        <button className="back-btn-left" onClick={() => onNavigate('goalList')}>
          <img src={backIcon} alt="뒤로가기" />
        </button>
        <h1 className="header-title">{isEditMode ? '목표 수정' : '목표 추가'}</h1>
      </header>

      <main className="goal-content">
        <section className="goal-title-section">
          <h2 className="section-title">목표 제목</h2>
          <input
            className="goal-title-input"
            type="text"
            placeholder="혼자 있을 때도 욕하지 않기"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={30}
          />
        </section>

        <div className="divider-thick"></div>

        <div className="goal-selection-section">
          <h2 className="section-title">목표 기간을 선택해주세요</h2>
          <p className="section-subtitle">나에게 맞는 적절한 기간을 두는 게 좋아요</p>

          <div className="goal-list">
            {goalOptions.map((option) => {
              const isActive = selectedDays === option.days;
              return (
                <div
                  key={option.days}
                  className={`goal-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedDays(option.days)}
                >
                  <div className="goal-item-info">
                    <h3 className="goal-item-title">{option.title}</h3>
                    <p className="goal-item-desc">{option.desc}</p>
                  </div>
                  {isActive && (
                    <div className="check-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <div className="goal-footer">
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : (isEditMode ? '수정하기' : '저장하기')}
        </button>
      </div>
    </div>
  );
};

export default GoalCreate;