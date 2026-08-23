# AnnotateImageExt's Dynamic Catalogs Configuration: `catalogs-config.json` 

This document defines the JSON schema for declaring and configuring astronomical catalog layers and corresponding data files used in **AnnotateImageExt**. The `catalog-config.json` consists of a top-level JSON array containing individual catalog configuration objects.

## `catalogs-config.json` Property Glossary

| Property | Type | Requirement | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `className` | `string` | **Required** | *None* | Internal JavaScript class identifier responsible for managing this catalog. Must be a valid JavaScript identifier starting with a letter or underscore. |
| `id` | `string` | **Required** | *None* | Unique short string used as a primary key to reference the catalog. |
| `name` | `string` | **Required** | *None* | User-friendly display name of the catalog. |
| `file` | `string` | **Required** | *None* | PixInsight Custom catalog CSV file name, relative to AnnotateImageExt's **ext** directory. |
| `description` | `string` | **Required** | *None* | Summary detailing the catalog origin, historical author, and total object count. |
| `fields` | `array` | **Required** | *None* | Sequential array of strings mapping out columns parsed from the CSV (e.g., `"Name"`, `"Coordinates"`). |
| `visible` | `boolean` | `Optional` | `false` | Determines if the catalog overlays are turned on by default in the viewport. |
| `defaultSet` | `boolean` | `Optional` | `false` | Flag indicating whether this catalog is included in the default Layers screen. |
| `labelColor` | `string` | `Optional` | `"0xffffffff"` | ARGB hex color formatting for rendered on-screen font elements. |
| `labelSize` | `integer` | `Optional` | `12` | Size metric of the target rendered label font. |
| `lineColor` | `string` | `Optional` | `"0xffffffff"` | ARGB hex color formatting for bounding shapes or overlay boundaries. |
| `lineWidth` | `integer` | `Optional` | `1` | Bounding shape frame line thickness dimension in pixels. |

## Examples

```json
[
  {
    "className": "BFSCatalog",
    "id": "BFS",
    "name": "Blitz, Fich & Stark (BFS)",
    "file": "BFS-Galactic-HII-Regions-1982-for-PixInsight.csv",
    "description": "Catalog of HII Regions (Blitz, Fich & Stark, 1982) (361 objects)",
    "fields": ["Name", "Coordinates", "Diameter"],
    "visible": false,
    "labelColor": "0x70ffffff",
    "labelSize": 16,
    "lineColor": "0x70ffffff",
    "lineWidth": 4
  },
  {
    "className": "CaldwellCatalog",
    "id": "Caldwell",
    "name": "Caldwell",
    "file": "Caldwell-Deep-Sky-109-with-OMeara-2002-updates-for-PixInsight.csv",
    "description": "Caldwell Objects (Caldwell and O'Meara, 2002) (109 objects)",
    "fields": ["Name", "Coordinates", "Diameter", "Magnitude"],
    "defaultSet": true,
    "visible": true
  }
]
```
