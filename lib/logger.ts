import winston from 'winston';

function serializeMeta(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (Array.isArray(value)) {
    return value.map(serializeMeta);
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    const record = value as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(value)) {
      clean[key] = serializeMeta(record[key]);
    }
    return clean;
  }
  return value;
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaString = '';
      if (Object.keys(meta).length) {
        try {
          const cleanMeta = serializeMeta(meta);
          metaString = `\n${JSON.stringify(cleanMeta, null, 2)}`;
        } catch {
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
