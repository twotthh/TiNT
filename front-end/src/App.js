import React, { useState } from 'react';
import './styles/App.css';

import Splash from './pages/Splash'; 
import Home from './pages/Home';
import Log from './pages/Log';             
import LogDetail from './pages/LogDetail'; 
import Calendar from './pages/Calendar'; // 💡 캘린더 컴포넌트 추가

export default function App() {
  const [currentPage, setCurrentPage] = useState('splash');

  return (
    <div className="app-wrapper">
      {currentPage === 'splash' && <Splash onFinish={() => setCurrentPage('home')} />}
      {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
      {currentPage === 'log' && <Log onNavigate={setCurrentPage} />}
      {currentPage === 'logDetail' && <LogDetail onNavigate={setCurrentPage} />}
      
      {/* 💡 캘린더 페이지 연결 */}
      {currentPage === 'calendar' && <Calendar onNavigate={setCurrentPage} />}
    </div>
  );
}