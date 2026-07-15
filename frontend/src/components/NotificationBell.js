import React, { useState } from "react";
import { Bell } from "lucide-react";
import "./NotificationBell.css";

const NotificationBell = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications] = useState([]);

  return (
    <div className="notification-bell">
      <Bell
        size={20}
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ cursor: "pointer" }}
      />
      {notifications.length > 0 && (
        <span className="badge">{notifications.length}</span>
      )}
      {showDropdown && (
        <div className="notification-dropdown">
          <h4>Notifications</h4>
          {notifications.length === 0 ? (
            <div className="notification-empty">No new notifications</div>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className={`notification-item ${notif.read ? "" : "unread"}`}>
                {notif.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
