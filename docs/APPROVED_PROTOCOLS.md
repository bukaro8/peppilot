# Approved protocol catalogue

`scripts/peptide-protocols-approved.json` is the reviewed protocol source (schema 1.2.0). It contains 28 catalogue compounds and three approved presets per compound: Conservative, Most Used and Adventurous.

The production seed validates the 28/84 counts, matches compounds by existing slug and upserts each preset by compound and category. Running the seed repeatedly updates reference rows without duplicating presets or changing member protocols and cycle snapshots.

Members always customise a private copy. The copy retains its approved preset reference and a complete JSON snapshot; a cycle then snapshots that private schedule again. Approved reference updates therefore cannot silently change saved drafts, active calendars or injection history.

Open-ended schedules have no generated terminal date, and only requested calendar ranges are projected. As-needed schedules do not generate recurring events. Missing weekdays, routes and daily administration counts must be supplied by the member before a copy can be saved.
