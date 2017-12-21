const storage = {
  set: (key, value) => localStorage.setItem(key, value),
  del: key => localStorage.removeItem(key),
  get: key => localStorage.getItem(key),
};

export default storage;
