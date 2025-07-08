import prom from 'prom-client';

export const metrics = new prom.Registry();
prom.collectDefaultMetrics({ register: metrics });

const processedRecords = new prom.Counter({
    name: 'processed_records_total',
    help: 'Total number of processed records',
    registers: [metrics],
});

const errorRecords = new prom.Counter({
    name: 'error_records_total',
    help: 'Total number of records that encountered errors during processing',
    registers: [metrics],
}); 

export function incrementProcessedRecords() {
    processedRecords.inc();
}

export function incrementErrorRecords() {
    errorRecords.inc();
}