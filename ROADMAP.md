# Poupscan development roadmap

## Stage 1 — Browser MVP (included)
- Product homepage and responsive workspace.
- Manual roof marking on a user-supplied image.
- Transparent occupancy calculation and CSV report.
- Local-only image handling and no automatic device geolocation.

## Stage 2 — Geospatial study areas
- User-drawn polygon or imported boundary (GeoJSON).
- Coordinate reference system and image georeferencing support.
- Building-footprint import from reliable, licensed sources.
- Map view with clear data-source attribution and dates.

## Stage 3 — Building detection
- Evaluate suitable open building-footprint models and imagery licensing.
- Produce candidate polygons with confidence scores.
- Allow users to add, remove, split and merge detections.
- Record model name/version, image date/resolution and processing settings.

## Stage 4 — Population model
- Estimate floor area / dwelling counts where the data supports it.
- Separate residential, commercial, industrial and public-use structures.
- Use geographically appropriate household-size and occupancy statistics.
- Report a calibrated interval, assumptions and sensitivity analysis.

## Stage 5 — Validation and planning tools
- Compare estimates with census/field-survey reference data.
- Show error metrics and known coverage gaps.
- Add ward/settlement summaries and planning indicators (school, clinic, water).
- Export reproducible reports with sources and methodology.

## Non-negotiable product principles
- Never label a model estimate as an official population count.
- Show sources, dates, assumptions and uncertainty.
- Do not infer a user's location; study areas are explicitly selected by the user.
- Respect imagery/data licensing and privacy requirements.

## MapScan update (v0.2)

- Added Google Maps JavaScript API satellite-map view, manual place search, and user-clicked boundary selection.
- Added boundary area calculation, selected-point count, undo/clear controls, and CSV export of the boundary.
- Google Maps is only the visual navigation layer. Do not use Google satellite imagery for AI/object detection or extract imagery tiles. The automated analysis pipeline must use separately licensed imagery or building-footprint data with explicit ML/commercial rights.

## Next milestones

1. Select and document a licensed imagery provider or building-footprint dataset for computer-vision use.
2. Add GeoJSON import/export for boundaries from authoritative or openly licensed sources.
3. Build a building-footprint detection service with human review/editing and measurable precision/recall.
4. Add residential/non-residential classification and floor/household estimation only where defensible evidence exists.
5. Calibrate occupancy estimates against census or field-survey reference areas.
