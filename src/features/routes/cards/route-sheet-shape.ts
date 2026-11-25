import type { SheetShape } from '@/shared/ui/sheet-gesture';

/**
 * The route list's and a trip's sheet (Figma 4884:38931, 4885:42997): 80 shows at Low, the first
 * card's mode and the top of its name, or a trip's Start and where it leaves from; full height
 * fills the screen, no strip of map above it (4885:42122, 4885:42957). A place's card keeps every
 * card's shape (CARD_SHAPE).
 */
export const ROUTE_SHEET_SHAPE: SheetShape = { lowPx: 80, isMaxFull: true };
