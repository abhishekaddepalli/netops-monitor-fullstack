import React, { useState, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';

// Load fetch if Node < 18
import fetch from 'node-fetch';

// Read the transpiled MonitorDetail component (Vite built it, we can just require it)
import MonitorDetail from './src/pages/MonitorDetail.jsx';

// Wait, JSX needs to be compiled. We can run this script using `npx vite-node test-render.js`!

async function run() {
  console.log("Fetching API data...");
  const monitorRes = await fetch('http://103.194.228.207:8000/api/monitors/2');
  const monitorData = await monitorRes.json();
  
  const checksRes = await fetch('http://103.194.228.207:8000/api/monitors/2/checks?per_page=200');
  const checksData = await checksRes.json();

  const smRes = await fetch('http://103.194.228.207:8000/api/monitors/2/server-metrics?per_page=60');
  let smData = { data: [] };
  if (smRes.ok) {
    smData = await smRes.json();
  }

  // Mock all the hooks and API clients
  jest.mock('./src/context/AuthContext', () => ({
    useAuth: () => ({ isOperatorOrAbove: true })
  }));
  
  // We actually need a simpler way.
  // I will just redefine the hooks inside MonitorDetail!
}

run();
