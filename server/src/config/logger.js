import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

// Set transport to Console for 'podman logs'.
// Production gets structured JSON (for future log aggregation); dev gets
// a colorized one-liner. 'http' is included in both so morgan's
// request-logging stream (below) still shows up.
const logger = winston.createLogger({
  level: isProduction ? 'http' : 'debug',
  format: isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
        )
      ),
  transports: [new winston.transports.Console()],
});

export default logger;
