// The Overture place files' shape (.scratch/establishments, step E3c): the same index and cells
// as the OSM establishment files (scripts/establishments/establishment-file.mjs), in a folder of
// their own and under Overture's licences, so no Overture row ever enters the ODbL files.
// overture.mjs writes them, check.mjs and the unit checks read them back.

/** The folder the index and the cells are written to, served at /data/overture/v1/. */
export const OVERTURE_DIR = 'public/data/overture/v1';
export const OVERTURE_BUCKET = 's3://overturemaps-us-west-2/release';

/** The kinds the files hold, each drawn with the marker of the OSM kind of the same name. */
export const OVERTURE_KINDS = [
  'restaurant',
  'fast_food',
  'cafe',
  'clinic',
  'dentist',
  'school',
  'college',
  'convenience',
  'supermarket',
  'pharmacy',
  'laundry',
];

/**
 * Overture's category of each place pull.py keeps (its basic category, or for a grocery its
 * primary one), and the kind it is drawn as.
 */
export const KIND_OF_CATEGORY = {
  restaurant: 'restaurant',
  casual_eatery: 'restaurant',
  fast_food_restaurant: 'fast_food',
  food_court: 'fast_food',
  coffee_shop: 'cafe',
  cafe: 'cafe',
  dental_clinic: 'dentist',
  primary_care_or_general_clinic: 'clinic',
  pediatric_clinic: 'clinic',
  vision_or_eye_care_clinic: 'clinic',
  specialized_health_care: 'clinic',
  health_care: 'clinic',
  diagnostics_imaging_or_lab_service: 'clinic',
  elementary_school: 'school',
  high_school: 'school',
  middle_school: 'school',
  preschool: 'school',
  college_university: 'college',
  convenience_store: 'convenience',
  grocery_store: 'supermarket',
  produce_store: 'supermarket',
  butcher_shop: 'supermarket',
  fishmonger: 'supermarket',
  food_and_beverage_store: 'supermarket',
  pharmacy_and_drug_store: 'pharmacy',
  laundry_service: 'laundry',
};

export const OVERTURE_ATTRIBUTION = '© Overture Maps Foundation';

/** What the Overture files say about themselves, in establishmentFiles' terms (OSM_FILES' shape). */
export const OVERTURE_FILES = {
  // Each row comes from one or more of Overture's sources, under its own licence; the files carry
  // all three texts (LICENSE-*.txt, NOTICE and README.md beside them).
  license: 'CDLA-Permissive-2.0 AND Apache-2.0 AND CC0-1.0',
  attribution: OVERTURE_ATTRIBUTION,
  licenseNote:
    'From Overture Maps Places. Rows from Meta, Microsoft and Overture are under the Community ' +
    'Data License Agreement – Permissive 2.0, rows from Foursquare under the Apache License 2.0 ' +
    '(with its NOTICE), rows from AllThePlaces under CC0 1.0; the texts are in this folder. Not ' +
    'OpenStreetMap data and never merged into it. Built by scripts/landmarks/build.sh.',
  source: OVERTURE_BUCKET,
  dateKey: 'release',
  kinds: OVERTURE_KINDS,
  // The first 16 hex digits of the place's Overture (GERS) id, after an "o": never an OSM id.
  idPattern: /^o[0-9a-f]{16}$/,
  idName: 'an Overture id (o and 16 hex digits)',
  extraKeys: ['brand'],
};

/** The row id of an Overture id: "o" and its first 16 hex digits. */
export function overtureIdOf(gersId) {
  return `o${gersId.replaceAll('-', '').slice(0, 16).toLowerCase()}`;
}
