// RoomContext.js
import React, { createContext, useContext, useState } from 'react';

const RoomContext = createContext(null);

export const useRoomContext = () => useContext(RoomContext);

export function RoomProvider({ children, roomClient }) {
  // 添加管理组件可见性的状态
  const [visibility, setVisibility] = useState({
    DateDisplay: false,
    DoctorSchedule: false,
    HealthSummary: false,
    Highlights: false,
  });

  // 定义切换可见性的函数
  const toggleVisibility = (componentName) => {
    setVisibility((prev) => ({
      ...prev,
      [componentName]: !prev[componentName],
    }));
  };

  const contextValue = {
    roomClient,
    visibility,
    toggleVisibility,
  };

  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  );
}

export function withRoomContext(Component) {
  return (props) => (
    <RoomContext.Consumer>
      {(context) => <Component {...props} roomClient={context.roomClient} />}
    </RoomContext.Consumer>
  );
}

export default RoomContext;
