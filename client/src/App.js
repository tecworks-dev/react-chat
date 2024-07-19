import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  MessageCircle,
  Search,
  Settings,
  User,
  LogOut,
  Plus,
  X,
} from "lucide-react";

const API_URL = "/api";
const App = () => {
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [currentChatSearchTerm, setCurrentChatSearchTerm] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [newContactUsername, setNewContactUsername] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState("");
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  useEffect(() => {
    if (currentUser) {
      fetchContacts();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (selectedContact) {
        const userId = impersonatedUser ? impersonatedUser.id : currentUser.id;
        fetchMessages(userId, selectedContact.id);
      } else if (globalSearchTerm !== "") {
        performGlobalSearch();
      }
    }
  }, [currentUser, impersonatedUser, selectedContact, globalSearchTerm]);
  const fetchMessages = async (userId, contactId) => {
    try {
      const response = await axios.get(
        `${API_URL}/messages/${userId}/${contactId}`
      );
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };
const fetchContacts = async (userId = currentUser.id) => {
  try {
    const response = await axios.get(`${API_URL}/contacts/${userId}`);
    setContacts(response.data);
  } catch (error) {
    console.error('Error fetching contacts:', error);
  }
};
/*
  const fetchContacts = async () => {
    try {
      const userId = impersonatedUser ? impersonatedUser.id : currentUser.id;
      const response = await axios.get(`${API_URL}/contacts/${userId}`);
      setContacts(response.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };
*/
  const performGlobalSearch = async () => {
    if (currentUser && globalSearchTerm.trim() !== "") {
      try {
        const response = await axios.get(
          `${API_URL}/search/${currentUser.id}/${globalSearchTerm}`
        );
        setGlobalSearchResults(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (error) {
        console.error("Error performing global search:", error);
        setGlobalSearchResults([]);
      }
    } else {
      setGlobalSearchResults([]);
    }
  };
  const switchUserPerspective = async (targetUserId) => {
    try {
      const response = await axios.post(`${API_URL}/switch-user`, {
        adminId: currentUser.id,
        targetUserId,
      });
      setImpersonatedUser(response.data);
      // Fetch contacts and messages for the impersonated user
      fetchContacts(response.data.id);
      setSelectedContact(null);
      setMessages([]);
    } catch (error) {
      console.error("Error switching user perspective:", error);
      alert("Failed to switch user perspective");
    }
  };

  const fetchAllMessages = async (userId) => {
    try {
      const response = await axios.get(`${API_URL}/messages/${userId}`);
      setMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching all messages:", error);
      setMessages([]); // Set to empty array on error
    }
  };
  const filteredMessages = messages.filter((message) => {
    const messageContent = message.content || "";
    const messageFrom =
      message.from || `User ${message.from_user}` || "Unknown";
    const messageTo = message.to || `User ${message.to_user}` || "Unknown";

    const matchesGlobalSearch =
      messageContent.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      messageFrom.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
      messageTo.toLowerCase().includes(globalSearchTerm.toLowerCase());

    const matchesCurrentChatSearch = messageContent
      .toLowerCase()
      .includes(currentChatSearchTerm.toLowerCase());

    const isRelevantToCurrentChat =
      selectedContact &&
      ((message.from_user === currentUser.id &&
        message.to_user === selectedContact.id) ||
        (message.to_user === currentUser.id &&
          message.from_user === selectedContact.id));

    if (globalSearchTerm !== "") {
      return matchesGlobalSearch;
    } else if (selectedContact) {
      return (
        isRelevantToCurrentChat &&
        (currentChatSearchTerm === "" || matchesCurrentChatSearch)
      );
    } else {
      return false; // Don't show any messages when no contact is selected and no global search
    }
  });

  const handleSendMessage = async () => {
    if (inputMessage.trim() && selectedContact) {
      try {
        await axios.post(`${API_URL}/messages`, {
          fromUser: currentUser.id,
          toUser: selectedContact.id,
          content: inputMessage,
        });
        setInputMessage("");
        // Refresh messages You might want to implement a more efficient way to update
        // messages
        const response = await axios.get(
          `${API_URL}/messages/${currentUser.id}/${selectedContact.id}`
        );
        setMessages(response.data);
        //fetchMessages();
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match");
      return;
    }
    if (newPassword.trim() === "") {
      alert("Password cannot be empty");
      return;
    }
    try {
      await axios.put(`${API_URL}/change-password`, {
        userId: currentUser.id,
        newPassword: newPassword,
      });
      setNewPassword("");
      setConfirmNewPassword("");
      setIsSettingsOpen(false);
      alert("Password changed successfully");
    } catch (error) {
      console.error("Error changing password:", error);
      alert("Failed to change password. Please try again.");
    }
  };

  const handleBroadcastMessage = async () => {
    if (broadcastMessage.trim() && currentUser && currentUser.isAdmin) {
      try {
        await axios.post(`${API_URL}/broadcast`, {
          fromUser: currentUser.id,
          content: broadcastMessage,
        });
        setBroadcastMessage("");
        // You might want to update the messages or show a success notification here
      } catch (error) {
        console.error("Error broadcasting message:", error);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: loginUsername,
        password: loginPassword,
      });
      setCurrentUser(response.data);
      setLoginUsername("");
      setLoginPassword("");
    } catch (error) {
      console.error("Login error:", error);
      alert("Invalid credentials");
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/register`, {
        username: registerUsername,
        password: registerPassword,
      });
      setRegisterUsername("");
      setRegisterPassword("");
      setIsRegistering(false);
      alert("Registration successful. Please log in.");
    } catch (error) {
      console.error("Registration error:", error);
      alert("Username already exists or registration failed");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedContact(null);
    setContacts([]);
    setMessages([]);
  };

  const handleAddContact = async () => {
    if (!currentUser) return;

    try {
      await axios.post(`${API_URL}/contacts`, {
        userId: currentUser.id,
        contactUsername: newContactUsername,
      });
      setNewContactUsername("");
      fetchContacts();
    } catch (error) {
      console.error("Error adding contact:", error);
      alert("User not found or already in contacts");
    }
  };

  const handleKeyPress = (event, action) => {
    if (event.key === "Enter") {
      event.preventDefault();
      action();
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          {isRegistering ? (
            <>
              {" "}
              <h2 className="text-2xl font-bold mb-4">Register</h2>{" "}
              <input
                type="text"
                placeholder="Username"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                className="w-full p-2 mb-4 border rounded"
              />{" "}
              <input
                type="password"
                placeholder="Password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                className="w-full p-2 mb-4 border rounded"
              />{" "}
              <button
                onClick={handleRegister}
                className="w-full bg-blue-500 text-white p-2 rounded mb-2"
              >
                Register
              </button>
              <button
                onClick={() => setIsRegistering(false)}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded"
              >
                Back to Login
              </button>{" "}
            </>
          ) : (
            <>
              {" "}
              <h2 className="text-2xl font-bold mb-4">Login</h2>{" "}
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                className="w-full p-2 mb-4 border rounded"
              />{" "}
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                className="w-full p-2 mb-4 border rounded"
              />{" "}
              <button
                onClick={handleLogin}
                className="w-full bg-blue-500 text-white p-2 rounded mb-2"
              >
                {" "}
                Login{" "}
              </button>
              <button
                onClick={() => setIsRegistering(true)}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded"
              >
                Register
              </button>{" "}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Contacts</h2>
          <div className="flex items-center">
            <Settings
              className="text-gray-500 mr-2 cursor-pointer"
              onClick={() => setIsSettingsOpen(true)}
            />
            <LogOut
              className="text-gray-500 cursor-pointer"
              onClick={handleLogout}
            />
          </div>
        </div>
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Add contact by username"
            value={newContactUsername}
            onChange={(e) => setNewContactUsername(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddContact)}
            className="flex-1 p-2 border rounded-l"
          />
          <button
            onClick={handleAddContact}
            className="bg-blue-500 text-white px-4 rounded-r"
          >
            <Plus size={20} />
          </button>
        </div>

        <ul>
       

          {currentUser.isAdmin && !impersonatedUser && (
            <li className="font-semibold mb-2">All Users:</li>
          )}
		  
{currentUser.isAdmin && impersonatedUser && (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
    <p className="font-bold">Viewing as: {impersonatedUser.username}</p>
    <button
      onClick={() => {
        setImpersonatedUser(null);
        setCurrentUser({ ...currentUser, originalAdmin: undefined });
        fetchContacts(currentUser.id);
        setSelectedContact(null);
        setMessages([]);
      }}
      className="text-sm text-blue-500 hover:text-blue-700"
    >
      Switch back to admin
    </button>
  </div>
)}
          {contacts.map((contact) => (
    <li
      key={contact.id}
      className={`flex items-center p-2 rounded-lg cursor-pointer ${
        selectedContact?.id === contact.id ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
      }`}
    >
      <User className="mr-2" />
      <span onClick={() => setSelectedContact(contact)}>{contact.username}</span>
      {currentUser.isAdmin && !impersonatedUser && (
        <button
          onClick={() => switchUserPerspective(contact.id)}
          className="ml-auto text-sm text-blue-500 hover:text-blue-700"
        >
          Switch to
        </button>
      )}
    </li>
            ))}
        </ul>
      </div>

      {/* Middle Column */}
      <div className="w-2/4 flex flex-col">
        {/* Current Chat Search */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center">
            <Search className="text-gray-500 mr-2" />
            <input
              type="text"
              placeholder="Search in current chat..."
              className="w-full border border-gray-300 rounded-lg p-2"
              value={currentChatSearchTerm}
              onChange={(e) => setCurrentChatSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="bg-white p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">
                  {selectedContact.username}
                </h3>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 ${
                      message.from === currentUser.username ||
                      message.from_user === currentUser.id
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    <div className="font-semibold">
                      {message.from ||
                        (message.from_user === currentUser.id
                          ? "You"
                          : `User ${message.from_user}`)}
                      {message.to === "broadcast" && " (Broadcast)"}
                    </div>
                    <div
                      className={`inline-block p-2 rounded-lg ${
                        message.from === currentUser.username ||
                        message.from_user === currentUser.id
                          ? "bg-blue-500 text-white"
                          : "bg-white"
                      }`}
                    >
                      {message.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {message.timestamp
                        ? new Date(message.timestamp).toLocaleString()
                        : "Unknown time"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="flex">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 p-2 border rounded-l-lg"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={handleSendMessage}
                    className="bg-blue-500 text-white px-4 py-2 rounded-r-lg"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : globalSearchTerm !== "" ? (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold mb-4">
                Global Search Results
              </h3>
              {globalSearchResults.length > 0 ? (
                globalSearchResults.map((message) => (
                  <div key={message.id} className="mb-4 border-b pb-2">
                    <div className="font-semibold">
                      From: {message.from_username} To: {message.to_username}
                    </div>
                    <div className="bg-white p-2 rounded-lg mt-1">
                      {message.content}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {message.timestamp
                        ? new Date(message.timestamp).toLocaleString()
                        : "Unknown time"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 mt-4">
                  No messages found.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a contact to start chatting or use global search
            </div>
          )}
        </div>

        {/* Broadcast Message Input (Admin Only) */}
        {currentUser.isAdmin && (
          <div className="border-t border-gray-200 p-4">
            <div className="mb-2 text-sm text-gray-600">
              Broadcast Message (sends to all users)
            </div>
            <div className="flex">
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleBroadcastMessage)}
                className="flex-1 border border-gray-300 rounded-l-lg p-2"
                placeholder="Type a broadcast message..."
              />
              <button
                onClick={handleBroadcastMessage}
                className="bg-red-500 text-white px-4 rounded-r-lg hover:bg-red-600"
              >
                Broadcast
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg w-96">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Settings</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Change Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-1/4 bg-white border-l border-gray-200 p-4">
        <div className="flex items-center mb-6">
          <Search className="text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Global search..."
            className="w-full border border-gray-300 rounded-lg p-2"
            value={globalSearchTerm}
            onChange={(e) => {
              setGlobalSearchTerm(e.target.value);
              setSelectedContact(null);
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                performGlobalSearch();
              }
            }}
          />
        </div>
        <h3 className="font-semibold mb-2">User Info</h3>
        <p>Logged in as: {currentUser.username}</p>
        <p>Role: {currentUser.isAdmin ? "Admin" : "User"}</p>
        {/*  {!currentUser.isAdmin && (
	  <p>Contact count: {currentUser.contacts.length}</p>
        )}*/}
      </div>
    </div>
  );
};

export default App;
