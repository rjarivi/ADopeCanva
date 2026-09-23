/**
 * First tool migrated to the manifest registry (Phase 0 proof).
 * Metadata moved to manifest.json; the component stays in views/tools/
 * until the full migration (kept as a re-export so nothing is duplicated).
 */
export { QrGenerator as default } from '../../views/tools/QrGenerator';
