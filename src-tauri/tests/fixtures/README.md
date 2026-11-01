# Package capacity fixtures

These are normalized snapshots from the production blank Disc and Jewel Case
factories, with four registered image owners set to a shared marker. They are
shared by TypeScript transport tests and native real-codec/write tests. Tests
replace `data:image/bmp;base64,SBLS_CAPACITY_BITMAP` with a generated valid
1024 x 1024 BI_RGB bitmap; the marker itself is not a loadable image.

Built-in leaves are portable nulls with their compatibility provenance retained.
The Disc fixture retains disabled additional artwork and uses the supported
ESRB T metadata state. The saved time and fixture asset identifiers are fixed.
No local paths, user projects, or binary image payloads belong in these fixtures.
