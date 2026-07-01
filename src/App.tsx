import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Game from './pages/Game';
import Home from './pages/Home';
import Login from './pages/Login';
import Nickname from './pages/Nickname';
import NotFound from './pages/NotFound';
import Ranking from './pages/Ranking';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/game" element={<Game />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nickname" element={<Nickname />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
