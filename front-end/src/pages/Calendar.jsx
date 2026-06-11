import React, { useState, useMemo, useEffect } from 'react';
import '../styles/Calendar.css';

import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import backIcon from '../assets/Back.png';
import forwardIcon from '../assets/Forward.png';

const Calendar = ({ onNavigate, returnPage = 'home', initialDateData }) => {
  const today = new Date();
  const actualYear = today.getFullYear();
  const actualMonth = today.getMonth() + 1;
  const actualDate = today.getDate();
  const selectedYear = initialDateData ? initialDateData.year : actualYear;
  const selectedMonth = initialDateData ? initialDateData.month : actualMonth;
  const selectedDay = initialDateData ? initialDateData.day : actualDate;
  const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`;
  const [currentYear, setCurrentYear] = useState(selectedYear);
  const [calendarLogs, setCalendarLogs] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'tint_results'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupedData = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.timestamp) return;

        const dateObj = new Date(data.timestamp.split(' ')[0]);
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1; 
        const day = dateObj.getDate();
        const dateKey = `${year}-${month}-${day}`;

        let levelScore = 1;
        const levelStr = String(data.tint_danger_level || data.danger_level || data.tint_level || data.level || '').toLowerCase();
        
        if (levelStr.includes('2') || levelStr.includes('주의') || levelStr.includes('caution') || levelStr.includes('medium')) {
          levelScore = 2;
        } else if (levelStr.includes('3') || levelStr.includes('위험') || levelStr.includes('risk') || levelStr.includes('high') || levelStr.includes('danger')) {
          levelScore = 3;
        }

        if (!groupedData[dateKey] || levelScore > groupedData[dateKey].score) {
          groupedData[dateKey] = {
            score: levelScore,
            status: levelScore === 3 ? 'risk' : (levelScore === 2 ? 'caution' : 'safe')
          };
        }
      });

      const finalCalendarData = {};
      Object.keys(groupedData).forEach(key => {
        finalCalendarData[key] = groupedData[key].status;
      });

      setCalendarLogs(finalCalendarData);
    });

    return () => unsubscribe();
  }, []);

  const calendarData = useMemo(() => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const firstDay = new Date(currentYear, month - 1, 1).getDay();
      const daysInMonth = new Date(currentYear, month, 0).getDate();
      months.push({ month, firstDay, daysInMonth });
    }
    return months;
  }, [currentYear]);

  const scrollToMonth = (targetMonth) => {
    setTimeout(() => {
      const scrollArea = document.querySelector('.calendar-scroll-area');
      const monthEl = document.getElementById(`month-${targetMonth}`);
      if (scrollArea && monthEl) {
        scrollArea.scrollTo({
          top: monthEl.offsetTop - scrollArea.offsetTop - 10,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const handleGoToToday = () => {
    onNavigate(returnPage, { year: actualYear, month: actualMonth, day: actualDate });
  };

  useEffect(() => {
    scrollToMonth(selectedMonth);
  }, []);

  const handlePrevYear = () => setCurrentYear(prev => prev - 1);
  const handleNextYear = () => setCurrentYear(prev => prev + 1);

  const handleDateClick = (year, month, day) => {
    onNavigate(returnPage, { year, month, day });
  };

  return (
    <div className="page-wrapper bg-white">
      <header className="tint-calendar-header">
        <button className="back-arrow-btn" onClick={() => onNavigate(returnPage)}>
          <img src={backIcon} alt="뒤로가기" className="nav-icon-img" />
        </button>
        
        <div className="year-nav-container">
          <button className="year-nav-btn" onClick={handlePrevYear}>
            <img src={backIcon} alt="이전 년도" className="nav-icon-img-small" />
          </button>
          <h1 className="header-title">{currentYear}년</h1>
          <button className="year-nav-btn" onClick={handleNextYear}>
            <img src={forwardIcon} alt="다음 년도" className="nav-icon-img-small" />
          </button>
        </div>

        <button className="today-btn" onClick={handleGoToToday}>오늘</button>
      </header>

      <div className="week-header-box">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>

      <main className="calendar-scroll-area">
        {calendarData.map(({ month, firstDay, daysInMonth }) => (
          <div key={month} id={`month-${month}`} className="month-section">
            <h2 className="month-title">{month}월</h2>
            <div className="days-grid">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="day-cell empty"></div>
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${currentYear}-${month}-${day}`; 
                const status = calendarLogs[dateKey]; 
                const isSelected = dateKey === selectedDateStr;
                const dayOfWeek = (firstDay + i) % 7;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div key={day} className="day-cell" onClick={() => handleDateClick(currentYear, month, day)}>
                    <div className={`day-number ${isSelected ? 'today' : ''} ${isWeekend && !isSelected ? 'weekend' : ''}`}>
                      {day}
                    </div>
                    {status && <div className={`status-dot-small ${status}`}></div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default Calendar;