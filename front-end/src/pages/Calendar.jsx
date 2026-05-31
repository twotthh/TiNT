import React, { useState, useMemo, useEffect } from 'react';
import '../styles/Calendar.css';

// 💡 텍스트 화살표 대신 에셋 이미지 불러오기
import backIcon from '../assets/Back.png';
import forwardIcon from '../assets/Forward.png';

const Calendar = ({ onNavigate }) => {
  const today = new Date();
  const actualYear = today.getFullYear();
  const actualMonth = today.getMonth() + 1;
  const actualDate = today.getDate();
  const todayStr = `${actualYear}-${actualMonth}-${actualDate}`;

  const [currentYear, setCurrentYear] = useState(actualYear);

  const mockData = {
    "2026-5-1": "safe", "2026-5-5": "caution", "2026-5-7": "risk",
    "2026-5-12": "safe", "2026-5-15": "caution", "2026-5-18": "safe",
    "2026-5-22": "risk", "2026-5-28": "safe", "2026-5-31": "caution",
    "2026-6-2": "safe", "2026-6-5": "safe", "2026-6-10": "risk"
  };

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
    setCurrentYear(actualYear);
    scrollToMonth(actualMonth);
  };

  useEffect(() => {
    scrollToMonth(actualMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrevYear = () => setCurrentYear(prev => prev - 1);
  const handleNextYear = () => setCurrentYear(prev => prev + 1);

  // 💡 날짜 클릭 시 실행되는 함수 (DB 없이 임시 구현)
  const handleDateClick = (year, month, day) => {
    const clickedDate = `${year}년 ${month}월 ${day}일`;
    // 1. 눌렀다는 피드백을 알림으로 줌
    alert(`${clickedDate} 리포트로 이동합니다.\n(현재는 임시 화면인 홈으로 연결됩니다.)`);
    // 2. 실제 홈 화면으로 보내버림
    onNavigate('home');
  };

  return (
    <div className="page-wrapper bg-white">
      <header className="tint-calendar-header">
        {/* 💡 텍스트 대신 Back.png 사용 */}
        <button className="back-arrow-btn" onClick={() => onNavigate('home')}>
          <img src={backIcon} alt="뒤로가기" className="nav-icon-img" />
        </button>
        
        <div className="year-nav-container">
          {/* 💡 이전 연도 버튼 (Back.png) */}
          <button className="year-nav-btn" onClick={handlePrevYear}>
            <img src={backIcon} alt="이전 년도" className="nav-icon-img-small" />
          </button>
          
          <h1 className="header-title">{currentYear}년</h1>
          
          {/* 💡 다음 연도 버튼 (Forward.png) */}
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
                const status = mockData[dateKey]; 
                const isToday = dateKey === todayStr;

                const dayOfWeek = (firstDay + i) % 7;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div 
                    key={day} 
                    className="day-cell" 
                    onClick={() => handleDateClick(currentYear, month, day)} // 💡 클릭 이벤트 추가
                  >
                    {/* 💡 동그라미로 변경될 영역 */}
                    <div className={`day-number ${isToday ? 'today' : ''} ${isWeekend && !isToday ? 'weekend' : ''}`}>
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