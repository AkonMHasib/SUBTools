// FirestoreService.js - Backward-compatibility alias for DatabaseService
import DatabaseService, { DatabaseService as DatabaseServiceClass } from "./DatabaseService";

export const FirestoreService = DatabaseService;
export { DatabaseService };
export default DatabaseService;
