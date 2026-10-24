// Where am I: the feature's public API, what the shells import. Add a line
// when something outside the feature needs more; nothing outside imports its
// inner files (.claude/CLAUDE.md, Import rules).
export { useGazeHush } from './dot-gaze';
export { CommuterLocation } from './commuter-location';
export { ContributorLocation } from './contributor-location';
