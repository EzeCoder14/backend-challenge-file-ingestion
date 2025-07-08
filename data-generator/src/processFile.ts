import fs from 'fs';
import { createInterface } from 'readline';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { logger } from './logger';
import { pool } from './db'; // Assuming you have a db.ts file that exports a connection pool
import { incrementErrorRecords, incrementProcessedRecords } from './metrics';


interface CustomerRecord {
    NombreCompleto: string;
    DNI: number;
    Estado: string;
    FechaIngreso: string;
    EsPEP: boolean;
    EsSujetoObligado: boolean | null;
    FechaCreacion: string;
}

export async function processFile(filePath: string): Promise<void> {
    if (!isMainThread) {
        // Worker thread logic
        const lines: string[] = workerData.lines;
        const records: CustomerRecord[] = [];
        for (const line of lines) {
            const record = parseLine(line);
            if (record) {
                records.push(record);
            }
        }
        parentPort?.postMessage(records);
        return;
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = createInterface({
        input: fileStream
    });
    let batch: CustomerRecord[] = [];
    const BATCH_SIZE = 1000; // Adjust batch size as needed

    for await (const line of rl) {
        incrementProcessedRecords();
        const record = parseLine(line);
        if (record) {
            batch.push(record);
            if (batch.length >= BATCH_SIZE) {
                await saveBatch(batch);
                batch = []; // Reset the batch
            }
        }
    }

    if (batch.length > 0) {
        await saveBatch(batch); // Save any remaining records
    }

    fileStream.close();
    logger.info(`File processed successfully: ${filePath}`);
}

function parseLine(line:string): CustomerRecord | null {
    try {
        const [Nombre, Apellido, dni, estado, fechaIngreso, esPEP, esSujetoObligado] = line.split('|');

        // Validate and parse the fields
        if (!Nombre || !Apellido || Nombre.length + Apellido.length > 100) { 
            logger.warn(`Invalid line format: ${line}`);
            incrementErrorRecords();
            return null; // Return null if the line is invalid
        }

        if (!dni || isNaN(parseInt(dni, 10)) || Number(dni) < 10000000 || Number(dni) > 99999999) {
            logger.warn(`Invalid line format: ${line}`);
            incrementErrorRecords();
            return null;
        }

        if (!estado || !['Activo', 'Inactivo'].includes(estado.trim())) {
            logger.warn(`Invalid line format: ${line}`);
            incrementErrorRecords();
            return null;
        }

        if (!isValidDate(fechaIngreso)) {
            logger.warn(`Invalid date in line: ${line}`);
            incrementErrorRecords();
            return null;
        }

        const record: CustomerRecord = {
            NombreCompleto: `${Nombre} ${Apellido}`.trim(),
            DNI: parseInt(dni.trim(), 10),
            Estado: estado.trim(), 
            FechaIngreso: formatDate(fechaIngreso.trim()),
            EsPEP: esPEP.trim().toLowerCase() === 'true',
            EsSujetoObligado: esSujetoObligado ? esSujetoObligado.trim().toLowerCase() === 'true' : null,
            FechaCreacion: new Date().toISOString() // Current date in YYYY-MM-DD format
        };
        return record;
    } catch (error) {
        logger.error(`Error parsing line: ${line}`, error);
        return null; // Return null if parsing fails
    }
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr === '0000-00-00' || dateStr === '99/99/9999') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

async function saveBatch(batch:CustomerRecord[]) {
    try {
        const request = pool.request();
        for (const record of batch) {
            request.input('NombreCompleto', record.NombreCompleto);
            request.input('DNI', record.DNI);
            request.input('Estado', record.Estado);
            request.input('FechaIngreso', record.FechaIngreso);
            request.input('EsPEP', record.EsPEP);
            request.input('EsSujetoObligado', record.EsSujetoObligado);
            request.input('FechaCreacion', record.FechaCreacion);

            await request.query(`
                INSERT INTO Customers (NombreCompleto, DNI, Estado, FechaIngreso, EsPEP, EsSujetoObligado, FechaCreacion)
                VALUES (@NombreCompleto, @DNI, @Estado, @FechaIngreso, @EsPEP, @EsSujetoObligado, @FechaCreacion)
            `);
        }
        logger.info(`Batch of ${batch.length} records saved successfully.`);
    } catch (error) {
        logger.error('Error saving batch to database:', error);
    }
}