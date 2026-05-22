# Project File Specification

## Purpose

Project files let users save and reopen label designs.

A project file should store:

- Project metadata
- Steam game metadata
- Template choices
- Asset references
- Editable layers
- Export settings

## Format

The first version should use JSON.

A future version may use a packaged project format that bundles JSON plus local assets.

Possible future extension:

```txt
.sbls
```

## Schema Versioning

Every project file should include a schema version so future versions of the app can migrate older projects.

Example:

```json
{
  "schemaVersion": "0.1.0"
}
```

## Project Shape

```ts
export interface ProjectFile {
  schemaVersion: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  steam?: SteamGameMetadata;
  templates: TemplateInstance[];
  assets: AssetReference[];
  settings: ProjectSettings;
}
```

## Steam Metadata

```ts
export interface SteamGameMetadata {
  appId: number;
  title: string;
  developer?: string[];
  publisher?: string[];
  releaseDate?: string;
  shortDescription?: string;
  longDescription?: string;
  genres?: string[];
  categories?: string[];
  minimumRequirements?: string;
  recommendedRequirements?: string;
  sourceUrl?: string;
}
```

## Asset Reference

```ts
export interface AssetReference {
  id: string;
  type:
    | 'background'
    | 'logo'
    | 'screenshot'
    | 'icon'
    | 'rating'
    | 'publisherLogo'
    | 'developerLogo'
    | 'misc';
  source: 'steam' | 'local' | 'builtIn';
  name: string;
  path?: string;
  url?: string;
  width?: number;
  height?: number;
  attribution?: string;
}
```

## Template Instance

```ts
export interface TemplateInstance {
  id: string;
  templateId: string;
  templateType: 'disc' | 'jewelCase' | 'dvdCase' | 'bluRayCase';
  name: string;
  dimensions: TemplateDimensions;
  layers: DesignLayer[];
}
```

## Design Layer

```ts
export interface DesignLayer {
  id: string;
  type: 'image' | 'text' | 'logo' | 'rating' | 'shape' | 'mask';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  assetId?: string;
  text?: TextLayerData;
  image?: ImageLayerData;
}
```

## Text Layer

```ts
export interface TextLayerData {
  value: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  align: 'left' | 'center' | 'right';
  curved?: boolean;
  curveMode?: 'topArc' | 'bottomArc' | 'ring';
}
```

## Image Layer

```ts
export interface ImageLayerData {
  fitMode: 'contain' | 'cover' | 'stretch' | 'manualCrop';
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  maintainAspectRatio: boolean;
}
```

## MVP Save Behavior

For MVP, it is acceptable to save local asset paths instead of bundling files directly.

Risk:

If the user moves or deletes the image, the project may lose access to that asset.

Future improvement:

Use a packaged project folder or zipped project format that copies assets into the project.

## Future Project Format

A future `.sbls` project could be a zip package:

```txt
project.sbls
  project.json
  assets/
    background-001.png
    logo-001.png
    screenshot-001.jpg
```

This would make projects portable between machines.
