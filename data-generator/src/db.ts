import sql from 'mssql';
import { logger } from './logger';

export const pool = new sql.ConnectionPool({
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'snow',
    server: process.env.DB_HOST || 'sqlserver',
    database: process.env.DB_NAME || 'CustomerDB',
    pool: {max: 10, min: 0, idleTimeoutMillis: 30000},
    options: {
        encrypt: false, // Use encryption for the connection
        trustServerCertificate: true, // Trust the server certificate
    },
});

pool.connect().catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1); // Exit the process if the connection fails
});

