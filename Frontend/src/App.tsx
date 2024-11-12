import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Multi from './pages/Multi';
import Chat from './pages/One-to-one';
import DynamicChat from './pages/DynamicChat';
import LandingPage from './pages/LandingPage';


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
       
        <Route path="/" element={<LandingPage />} />
        
        
        <Route path="/chat" element={<Chat />} />
        <Route path="/Multi" element={<Multi />} />
        

      </Routes>
    </Router>
  );
};

export default App;
