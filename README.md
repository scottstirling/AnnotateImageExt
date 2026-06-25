# AnnotateImage Extended with New Features, Fixes and Catalogs

AnnotateImage is a great tool developed with extensive features by PixInsight user Andres del Pozo and Juan Conejero of PixInsight, often in response to PixInsight Forum user requests.  It has a lot of cool features that I would say almost no one knows about.  I will list a couple existing features that are worth it:

- magnitude filtering on catalogs with magnitude values
- automated export of annotation details to a text file
- astronomical catalog layering and prioritization with automatic de-duplication (enabled by default) and highly configurable labels and lines
- optional label display of auxiliary catalog data, where supported, such as "Common name" or "Diameter" or "Type," etc.
- built-in catalogs, dynamic Vizier query catalogs and user-defined (in PixInsight CSV format) Custom catalogs

## New Features

The main features added here are:

### New and Updated Astronomical Catalogs

Many added, updated astronomy, astrophysics and astrophotography catalogs for PixInsight AnnotateImage, especially those that include coverage of the southern celestial hemisphere, corrected and comprehensive catalogs of catalogs, including:

- Blitz, Fich and Stark (BFS), *Catalog of CO Radial Velocities toward Galactic H II Regions* (1982)
- Caldwell's 109 Deep Sky objects with O'Meara updates (2002)
- Classic complements to Sharpless 2 for the southern hemisphere: 
  - Gum's *Southern_HII_Regions* (1955)
  - Rogers, Campbell and Whiteoak (RCW)'s *Catalog of Halpha Emission Regions in the Southern Milky Way* (1960)
- Dutra and Bica's *Dust Clouds* of 2002, incorporating Barnard, LDN, MBM and more in a comprehensive catalog of dark nebula and molecular clouds with DB2002b ID and "Common name" label options
- D. Green's updated *A Catalog of Galactic Supernova Remnants* (2025)
- Kharchenko et al's *Global Survey of Star Clusters in the Milky Way II*, (2013) containing all the open clusters across catalogs and hemispheres with MWSC ID and "Common name" label options
- Magnani, Blitz and Mundy's *Molecular Gas at High Galactic Latitudes* (1985)
- Mandel (Steve) and Wilson (Michael)'s catalog of nine integrated flux nebulae (IFN) aka galactic cirrus, *Catalogue of Unexplored Nebulae* (2004)
- Sandqvist, A. and Lindroos, K.P.'s *Southern Dark Clouds* (1976) and Sandqvist's follow up, *More Southern Dark Dust Clouds* (1977)
- Sugitanixi, Fukui and Ogura (SFO) catalogs of Brightr- Rimmed Clouds in the northern (1991) and southern (1994) hemispheres
- Stirling (my own) catalog of *Very Large Scale Astro Phenomena*, a work in progress focused on very wide field objects and structures sourced from other catalogs and tradition (2026)
- Star cluster individual catalogs:
  - Collinder, P.A., *On Structural Properties of Open Clusters and Their Spatial Distribution* (1931)
  - Melotte, P.J., *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* (1915) with updated coordinates
- Diffuse Nebulae individual catalog:
  - Cederblad, Sven *Catalog of bright diffuse Galactic nebulae* (1945)

### Externalization of catalog registration and layers confifguration

Externalization of catalog registration and layers confifguration to a JSON configuration file: `catalogs-config.json`, including:

- catalog ids, name strings, file names, description strings and label fields
- catalog layer settings, curently supporting label size, line width, label and line colors per catalog layer
- all layer and catalog preferences preserved on execution and resettable to defaults via the reset button if desired
- whether the catalog layer is visible in the layers configuration screen by default
- currently a hard-coded "catalogs" subdirectory for the "system" scripts, but plans to support any file path users want to use to separate from system configs


### Better error handling for Custom catalog users (see Bugs fixed below for more details) and protection for configuration changes and settings.

Settings, files and preferences isolated from out-of-the-box AnnotateImage so you can switch between them or use both without conflict.

### Bugs fixed

#### AnnotateImage layer preferences / settings corrupted if Custom catalog configuration clicks "OK" with empty file path

The script should either continue and preserve the user's settings or stop and give the user a chance to fix the file path.  Out of the box, the annotation script validates Custom catalog file path settings after clicking "OK" on the main dialog.  There is no opportunity to correct the missing file path.  Also, when the user forgets or omits a Custom catalog file path in the layer configuration, and if that layer is enabled, it will cause that layer AND any and all layers below it in priority order to get *wiped out*, requiring a configfuration reset.

To reproduce:
- Add a Custom catalog layer through the Add Layers dialog
- Do not set a value for the custom catalog file path
- Click "OK" on the main AnnotateImage dialog to execute it
- Re-open AnnotateImage script and check preferences/settings and previously added layers, if any were set lower in priority to the Custom catalog, they will be missing.

Fix:

I added code to throw an erorr and log more information if the user has enabled a Custom catalog and clicked OK to run without specifying the file path to it.  The user can add or fix the Custom catalog file path or disable the layer or remove the layer, which will shield it from validation.


#### `Warning: OpenFileDialog.fileName is deprecated: Use OpenFileDialog.filePath instead.`

Every time adding a Custom catalog layer through AnnotateImageDialog, after adding the file path and clicking OK, a warning is logged:

```
** Warning: OpenFileDialog.fileName is deprecated: Use OpenFileDialog.filePath instead.
```

Fixed in `AstronomicalCatalogs.js`, old code commented out, two new lines reference `filePath` instead of `fileName` now and the warning no longer appears:

```js
            // this.dialog.activeFrame.object.catalog.catalogPath = gdd.fileName;
            // path_Edit.text = gdd.fileName;
            this.dialog.activeFrame.object.catalog.catalogPath = gdd.filePath;
            path_Edit.text = gdd.filePath;
```


##### Typo of "nebulaes" for "nebulae" in two catalog descriptions

Updated:
```
PixInsight/include/pjsr/astrometry/AstronomicalCatalogs.js:    this.description = "Catalog of Reflection Nebulae - Van den Bergh (159 nebulaes)";
PixInsight/include/pjsr/astrometry/AstronomicalCatalogs.js:    this.description = "Catalog of HII Regions - Sharpless (313 nebulaes)";
```
To:
```
AstronomicalCatalogs.js:    this.description = "Catalog of Reflection Nebulae - Van den Bergh (159 nebulae)";
AstronomicalCatalogs.js:    this.description = "Catalog of HII Regions - Sharpless (313 nebulae)";
```
