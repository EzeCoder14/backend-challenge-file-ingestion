import express from 'express';
import { logger } from './logger';
import { processFile } from './processFile';
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
    logger.info('Health check endpoint hit');
    // Respond with a simple message
    res.status(200).json({ status: 'ok', message: 'Data Generator Service is running' });
});

// Start the file processing
async function start() {
    try {
        logger.info('Starting Data Generator Service...');
        await processFile("./challenge/input/CLIENTES_IN_0425.dat"); // Adjust the file path as needed
    } catch (error) {
        logger.error('Error starting Data Generator Service:', error);
        process.exit(1); 
    }
}

// Start the server and file processing
app.listen(PORT, () => {
    logger.info(`Data Generator Service is running on port ${PORT}`);
    start();
});