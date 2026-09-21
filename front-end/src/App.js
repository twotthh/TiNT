import React, { useState } from 'react';
import './styles/App.css';

import Splash from './pages/Splash'; 
import Home from './pages/Home';
import Log from './pages/Log';             
import LogDetail from './pages/LogDetail'; 
import Calendar from './pages/Calendar';
import Analysis from './pages/Analysis';
import LiveAlertBanner from './components/LiveAlertBanner';
import MyPage from './pages/MyPage'; 
import GoalList from './pages/GoalList';
import GoalCreate from './pages/GoalCreate';
import Notification from './pages/Notification';

export default function App() {
  const [currentPage, setCurrentPage] = useState('splash');
  const [globalDate, setGlobalDate] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null); 
  const [calendarSource, setCalendarSource] = useState('home');

  const handleNavigate = (page, data = null) => {
    if (page === 'calendar') {
      setCalendarSource(currentPage);
    }
    setCurrentPage(page);
    
    if (data) {
      if (data.year !== undefined) {
        setGlobalDate(data);
      } else if (data.id !== undefined) {
        setSelectedLog(data); 
      }
    } else {
      if (page === 'home' || page === 'log' || page === 'analysis' || page === 'mypage' || page === 'goalList' || page === 'goalCreate') {
        setGlobalDate(null);
        setSelectedLog(null); 
      }
    }
  };

  return (
    <div className="app-wrapper">
      {currentPage !== 'splash' && <LiveAlertBanner />}
      {currentPage === 'splash' && <Splash onFinish={() => handleNavigate('home')} />}
      {currentPage === 'home' && <Home onNavigate={handleNavigate} initialDateData={globalDate} />}
      {currentPage === 'log' && <Log onNavigate={handleNavigate} initialDateData={globalDate} />}
      {currentPage === 'logDetail' && <LogDetail onNavigate={handleNavigate} logData={selectedLog} />}
      {currentPage === 'calendar' && (<Calendar onNavigate={handleNavigate} returnPage={calendarSource} initialDateData={globalDate} />)}
      {currentPage === 'analysis' && <Analysis onNavigate={handleNavigate} />}
      {currentPage === 'mypage' && <MyPage onNavigate={handleNavigate} />}
      {currentPage === 'goalList' && <GoalList onNavigate={handleNavigate} />}
      {currentPage === 'goalCreate' && <GoalCreate onNavigate={handleNavigate} goalData={selectedLog} />}
      {currentPage === 'notification' && <Notification onNavigate={handleNavigate} />}
    </div>
  );
}