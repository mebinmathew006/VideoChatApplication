import React from 'react'
import './App.css'
import AppRoutes from './router/AppRoutes'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from "react-toastify";
import { Provider } from 'react-redux';
import store from '../src/store/store'
function App() {

  return (
    <BrowserRouter>
            <ToastContainer />
            <Provider store={store}>
            <AppRoutes />

            </Provider>
          </BrowserRouter>
  )
}

export default App
