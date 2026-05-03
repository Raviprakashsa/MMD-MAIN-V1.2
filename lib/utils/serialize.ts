import { Buffer } from 'node:buffer';

/**
 * Deep serializes a value, converting all Mongoose/MongoDB types to plain JSON-safe values.
 * Handles: ObjectId, Date, Buffer, nested objects, arrays, and Mongoose documents.
 */
function isObjectId(value: any): boolean {
    if (value && typeof value === 'object') {
        // Standard Mongoose ObjectId
        if ('toHexString' in value && typeof value.toHexString === 'function') {
            return true;
        }
        // Fallback: Check for BSON ObjectId or other variants
        const str = value.toString();
        // Check if it's a valid 24-char hex string AND has a matching constructor/type
        if (/^[0-9a-fA-F]{24}$/.test(str)) {
            if (value.constructor?.name === 'ObjectId' || value._bsontype === 'ObjectID') {
                return true;
            }
        }
    }
    return false;
}

function isBufferOrBinary(value: any): boolean {
    return Buffer.isBuffer(value) || (value && typeof value === 'object' && 'buffer' in value);
}

function isMongooseDocument(value: any): boolean {
    return typeof value === 'object' && value !== null && 'toObject' in value && typeof (value as any).toObject === 'function';
}

function hasToJSON(value: any): boolean {
    return typeof value === 'object' && value !== null && 'toJSON' in value && typeof (value as any).toJSON === 'function';
}

function deepSerialize(value: unknown): unknown {
    // Handle primitives
    if (value === null || value === undefined || typeof value !== 'object') {
        return value;
    }

    // Handle Date
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Handle ObjectId (Check BEFORE Buffer/Binary because ObjectId might have internal buffer)
    if (isObjectId(value)) {
        // Prefer toHexString() if available, otherwise toString()
        return (value as any).toHexString ? (value as any).toHexString() : (value as any).toString();
    }

    // Handle Buffer or MongoDB Binary
    if (isBufferOrBinary(value)) {
        return undefined; // Skip binary data - it shouldn't be passed to client
    }

    // Handle Mongoose document (has toObject method)
    if (isMongooseDocument(value)) {
        return deepSerialize((value as any).toObject());
    }

    // Handle objects with toJSON (but not our plain objects)
    if (hasToJSON(value)) {
        return deepSerialize((value as any).toJSON());
    }

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(deepSerialize);
    }

    // Handle plain objects - recursively serialize all properties
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
        // Skip Mongoose internal properties
        if (key.startsWith('$') || key === '__v') {
            continue;
        }
        result[key] = deepSerialize((value as Record<string, unknown>)[key]);
    }
    return result;
}

/**
 * Serializes a Mongoose document to a plain object with all MongoDB types converted.
 * This ensures data can be safely passed from Server Components to Client Components.
 * 
 * @param doc - Mongoose document or plain object
 * @returns Plain JSON-safe object
 */
export function serializeDoc<T>(doc: T): T & { _id: string } {
    const serialized = deepSerialize(doc) as Record<string, unknown>;

    // Ensure _id is a string
    if (serialized && typeof serialized === 'object' && '_id' in serialized) {
        serialized._id = String(serialized._id ?? '');
    }

    return serialized as T & { _id: string };
}

/**
 * Serializes an array of Mongoose documents to plain JSON-safe objects.
 * 
 * @param docs - Array of Mongoose documents or plain objects
 * @returns Array of plain JSON-safe objects
 */
export function serializeDocs<T>(docs: T[]): Array<T & { _id: string }> {
    return docs.map(serializeDoc);
}
