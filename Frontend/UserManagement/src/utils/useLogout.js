// src/hooks/useLogout.ts
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { persistor } from '../store/store';
import { destroyDetails } from '../store/UserDetailsSlice';
import {  socketDisconnected } from '../store/socketSlice';

function useLogout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return () => {
    dispatch(destroyDetails());
    dispatch(socketDisconnected());
   console.log('Before purge', localStorage.getItem('persist:root'));
persistor.purge().then(() => {
  console.log('After purge', localStorage.getItem('persist:root'));
  navigate('/login');
});

  };
}

export default useLogout;
