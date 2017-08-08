import { combineReducers } from 'redux';
import { ddpReducer } from 'ddp-client';

const rootReducer = combineReducers({
  ddp: ddpReducer,
});

export default rootReducer;
