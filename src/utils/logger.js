const logLevels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.LOG_LEVEL || 'INFO';

function log(level, message, ...args) {
  const levelNum = logLevels[level] || 2;
  const currentLevelNum = logLevels[currentLevel] || 2;
  
  if (levelNum <= currentLevelNum) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`, ...args);
  }
}

export const logger = {
  error: (message, ...args) => log('ERROR', message, ...args),
  warn: (message, ...args) => log('WARN', message, ...args),
  info: (message, ...args) => log('INFO', message, ...args),
  debug: (message, ...args) => log('DEBUG', message, ...args)
};

