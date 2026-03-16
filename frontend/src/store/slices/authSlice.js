import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.login(creds);
    localStorage.setItem('tax_token', data.token);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login fallito');
  }
});

export const loadMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authAPI.me();
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { utente: null, token: localStorage.getItem('tax_token'), loading: false, error: null },
  reducers: {
    logout(state) {
      state.utente = null;
      state.token = null;
      localStorage.removeItem('tax_token');
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: b => {
    b.addCase(login.pending,  s => { s.loading = true; s.error = null; })
     .addCase(login.fulfilled, (s, a) => { s.loading = false; s.token = a.payload.token; s.utente = a.payload.utente; })
     .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(loadMe.fulfilled, (s, a) => { s.utente = a.payload; })
     .addCase(loadMe.rejected,  s => { s.token = null; localStorage.removeItem('tax_token'); });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
