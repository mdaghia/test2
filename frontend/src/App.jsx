import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { loadMe } from './store/slices/authSlice';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contribuenti from './pages/Contribuenti';
import Dichiarazioni from './pages/Dichiarazioni';
import Versamenti from './pages/Versamenti';
import Atti from './pages/Atti';
import Elaborazioni from './pages/Elaborazioni';
import Configurazione from './pages/Configurazione';

function RequireAuth({ children }) {
  const { token } = useSelector(s => s.auth);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.auth);

  useEffect(() => { if (token) dispatch(loadMe()); }, [dispatch, token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="contribuenti" element={<Contribuenti />} />
          <Route path="dichiarazioni" element={<Dichiarazioni />} />
          <Route path="versamenti" element={<Versamenti />} />
          <Route path="atti" element={<Atti />} />
          <Route path="elaborazioni" element={<Elaborazioni />} />
          <Route path="configurazione" element={<Configurazione />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} />
    </BrowserRouter>
  );
}
