# Lyrics Validation and Audit Workflow

## Validation at Write Time

The translation save/update path now enforces:

- non-empty `originalLyrics` and `translatedLyrics`
- max length guard (`80,000` chars)
- normalization for line endings and whitespace

## Fingerprint and Consistency

Every saved translation now stores:

- `lyricFingerprint` based on normalized lyric lengths

This enables quick detection of source/render drift.

## Audit Queue

Use `getSuspectTranslations()` from `firebaseService` to list suspect rows:

- empty lyric fields
- placeholder content values
- malformed markdown artifacts in cultural context

These results should be reviewed in admin triage and corrected in batches.
