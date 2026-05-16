const sessions = new Map();

function getDefaultState() {
  return {
    step: 'start',
    selectedCity: null,
    selectedProject: null,
    cityProjects: [],
    pendingMediaType: null,
    userName: null,
    userNumber: null,
  };
}

function getSession(phoneNumber) {
  if (!sessions.has(phoneNumber)) {
    sessions.set(phoneNumber, getDefaultState());
  }
  return sessions.get(phoneNumber);
}

function setSession(phoneNumber, updates) {
  const current = getSession(phoneNumber);
  sessions.set(phoneNumber, { ...current, ...updates });
}

function resetSession(phoneNumber) {
  sessions.set(phoneNumber, getDefaultState());
}

module.exports = { getSession, setSession, resetSession };
