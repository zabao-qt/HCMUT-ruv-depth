import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Header from './components/Header';
import Profiles from './pages/Profiles';
import ProfileDashboard from './pages/ProfileDashboard';

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profiles" element={<Profiles />} />
        <Route path="/profiles/:profileId" element={<ProfileDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
