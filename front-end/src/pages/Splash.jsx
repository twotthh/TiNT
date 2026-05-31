import React, { useEffect, useState } from 'react';
import '../styles/Splash.css';

import T from '../assets/T.png';
import i from '../assets/i.png';
import N from '../assets/N.png';
import hi from '../assets/hi_cat.png';

const Splash = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        if (onFinish) onFinish();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onFinish]);

  return (
    <div className="splash-container">
      <div className="logo-container">
        <img src={T} alt="T" className="logo-letter letter-1" />
        <img src={i} alt="i" className="logo-letter letter-2" />
        <img src={N} alt="N" className="logo-letter letter-3" />
        <img src={T} alt="T" className="logo-letter letter-4" />
      </div>

      <div className="cat-container">
        <img src={hi} alt="Cat" className="cat-image" />
      </div>

      <div className="loading-container">
        <span className="loading-text">로딩중..</span>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;