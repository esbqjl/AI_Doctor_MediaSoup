import React, { useState } from 'react';
import { IoIosChatboxes, IoIosNotifications } from "react-icons/io";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

const TopBar = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  const userName = 'Aaron Thiel';
  const userAvatar = '/images/user_avatar.png'; 
  const logoImage = '/images/logo.png'; 

  
  const userId = '123456';
  const age = 30;
  const gender = 'Male';

  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
  };

  return (
    <div data-component="TopBar">
      <div className="logo-text">
        <img src={logoImage} alt="Logo" className="logo-image" />
        <span className="app-name">Healthi AI</span>
      </div>
      <div className="user-section">
        <div
          className={`user-avatar-container ${showDashboard ? 'active' : ''}`}
          onClick={toggleDashboard}
        >
          <img src={userAvatar} className="user-avatar" alt="User" />
        </div>
        <span className="user-name">{userName}</span>
        {/* <FontAwesomeIcon icon={faChevronDown} className="icon dropdown-arrow" /> */}
        <div className="icon-circle">
          <IoIosChatboxes className="icon chat-icon" />
        </div>
        <div className="icon-circle">
          <IoIosNotifications className="icon notification-icon" />
        </div>
        {showDashboard && (
          <div className="user-dashboard">
            <div className="dashboard-header">
              
              <div className="dashboard-avatar-placeholder"></div>
              <div className="dashboard-user-info">
                <div className="dashboard-user-name">{userName}</div>
                <div className="dashboard-user-id">ID: {userId}</div>
                <div className="dashboard-user-age-gender">
                  Age: {age} | Gender: {gender}
                </div>
              </div>
            </div>
            <div className="dashboard-divider"></div>
            <div className="dashboard-menu">
              <div className="dashboard-menu-item">View Platform</div>
              <div className="dashboard-menu-item">Medical Report</div>
              <div className="dashboard-menu-item">Modify Account</div>
              <div className="dashboard-menu-item">Switch Account</div>
              <div className="dashboard-menu-item">Manage Account</div>
              <div className="dashboard-menu-item">Logout</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
