import 'dotenv/config';
import app from './app.js';
import logger from './config/logger.js';

const DEFAULT_PORT = 4000;

const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
