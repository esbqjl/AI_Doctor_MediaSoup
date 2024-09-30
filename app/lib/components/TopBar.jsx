import React from 'react';
import { IoIosChatboxes, IoIosNotifications } from "react-icons/io"; // 引入所需图标
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

const TopBar = () => {
  const userName = 'Aaron Thiel';
  const userAvatar = '/images/user_avatar.png'; // 确保这个路径正确
  const logoImage = '/images/logo.png'; // 确保这个路径正确

  return (
    <div data-component="TopBar">
      <div className="logo-text">
        <img src={logoImage} alt="Logo" className="logo-image" />
        <span className="app-name">Healthi AI</span>
      </div>
      <div className="user-section">
        <img src={userAvatar}  className="user-avatar" />
        <span className="user-name">{userName}</span>
        <FontAwesomeIcon icon={faChevronDown} className="icon dropdown-arrow" />
        <div className="icon-circle">
          <IoIosChatboxes className="icon chat-icon" />
        </div>
        <div className="icon-circle">
          <IoIosNotifications className="icon notification-icon" />
        </div>
      </div>
    </div>
  );
}; 

export default TopBar;
