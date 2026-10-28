import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { router } from './app/router';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
