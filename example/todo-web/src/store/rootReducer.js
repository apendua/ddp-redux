import { combineReducers } from 'redux';
import DDPClient from 'ddp-client';

const rootReducer = combineReducers({
  ddp: DDPClient.reducer(),
});

export default rootReducer;
