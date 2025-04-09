import React from 'react';
import Chat from '../Chat';

function Messages() {
  return (
    <div className="h-100">
      <h2 className="text-2xl font-bold mb-4">Messages</h2>
      <div className="h-[calc(100vh-12rem)]">
        <Chat isDashboard={true} />
      </div>
    </div>
  );
}

export default Messages;