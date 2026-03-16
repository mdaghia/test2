import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, annoCorrente: new Date().getFullYear() },
  reducers: {
    toggleSidebar: s => { s.sidebarOpen = !s.sidebarOpen; },
    setAnno: (s, a) => { s.annoCorrente = a.payload; },
  },
});

export const { toggleSidebar, setAnno } = uiSlice.actions;
export default uiSlice.reducer;
