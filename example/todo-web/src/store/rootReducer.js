import { combineReducers } from 'redux';
import DDPClient from 'ddp-redux';

const rootReducer = combineReducers({
  ddp: DDPClient.reducer(),
});

export default rootReducer;
