// PRIVATE INSTALLATION PROPOSAL. Enabling requires a separately reviewed release.
// These are UI switches, NEVER server authorization or proof of food provenance.
export const PILOT_GUIDE_INSTALL=Object.freeze({
 enabled:false,
 publicationEnabled:false,
 // Select an approved template and its exact server-backed IDs before activation.
 // No test goal, freshness policy, legal record or clinical evidence is embedded.
 template:Object.freeze([]),
 foodIds:Object.freeze([])
});
