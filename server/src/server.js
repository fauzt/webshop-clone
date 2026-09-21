import 'dotenv/config';
import app from './app.js';

const DEFAULT_PORT = 4000;

const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // eslint-disable-line no-console
