import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaString = '';
      if (Object.keys(meta).length) {
        try {
          metaString = `\n${JSON.stringify(meta, null, 2)}`;
        } catch (e) {
          metaString = `\n[Error serializing meta data]`;
        }
      }
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'ai-requests.log' }),
  ],
});

export default logger;
