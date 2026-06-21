# Notes on PixInsight AnnotateImage Customization

## Adding a New Catalog Layer to AnnotateImage

### Adding a File Catalog as a Layer in AnnotateImage

Two main code changes are required, plus a local catalog file formatted properly.  Paths are relative to the PixInsight install root.

1. Define the catalog that loads from the same directory as the script itself by default

`include/pjsr/astrometry/AstronomicalCatalogs.js` - core of catalog configuration code for all File and Vizier catalogs in `CatalogRegistery`

```js
/*
 * Caldwell Catalog (local CSV file) of 109 "best of" targets
 */
var CaldwellCatalog = class extends LocalFileCatalog {
   constructor() {
      super( "Caldwell", "Caldwell", "Caldwell-Deep-Sky-109-with-OMeara-2002-updates-for-PixInsight.csv" ); // csv file path in script directory by default
      this.description = "Caldwell catalog (109 objects)"; // description to display in the AnnotateImage AddLayer dialog.
      this.fields = [ "Name", "Magnitude", "RA", "DEC", "Diameter" ]; // adjust fields as desired
   }

   GetConstructor() {
      return "new CaldwellCatalog()";
   }
};

CatalogRegistry.register( new CaldwellCatalog );
```


2. Define an annotation layer using the catalog class defined above.
 
`src/scripts/AnnotateImage/AnnotationEngine.js` - ties defined catalogs to an array of annotation layers 

```js
    layer = new CatalogLayer( new CaldwellCatalog );
    layer.visible = true;
    layer.gprops.lineColor = 0xff8080ff;
    layer.gprops.labelColor = 0xff8080ff;
    layer.gprops.labelSize = 16;
    this.layers.push( layer );
```

## Script Customization Env Setup

### Setup Isolated Script Env

1. Copy the script and dependencies to a local directory structure mirroring the PixInsight installation paths.

Copy:
```
include/pjsr/astrometry/AstronomicalCatalogs.js
src/scripts/AnnotateImage/AnnotateImage.js
src/scripts/AnnotateImage/AnnotateImage.xsgn
src/scripts/AnnotateImage/AnnotateImageDialog.js
src/scripts/AnnotateImage/AnnotationEngine.js
src/scripts/AnnotateImage/ConstellationBorders.json
src/scripts/AnnotateImage/ConstellationLabels.json
src/scripts/AnnotateImage/ConstellationLines.json
src/scripts/AnnotateImage/Entity.js
src/scripts/AnnotateImage/GraphicProperties.js
src/scripts/AnnotateImage/Layer.js
```

2. Rename or remove the signature file to backup and enable customizations to be run.
`src/scripts/AnnotateImage/AnnotateImage.xsgn.bak`

3. Update AnnotateImage.js to load local directory paths for dev instead of PixInsight installtion. Comment out the original include line (for now, workaround for local dev).
Rename a copy of `AnnotateImage.js` to `src/scripts/AnnotateImage/AnnotateImageExt.js`

```js
// TODO: remove dev hack to load dev version of catalogs
// #include <pjsr/astrometry/AstronomicalCatalogs.js>
// #include "../include/pjsr/astrometry/AstronomicalCatalogs.js"
```
### Change namespace for Settings / Preferences to isolate dev and custom script from product AnnotateImage at runtime

If this is not done, then AnnotateImage and AnnotateImageExt will overwrite each other's settings.

In `src/scripts/AnnotateImage/AnnotateImageExt.js` change the `ANNOT_SETTINGS_MODULE` and `SETTINGS_MODULE` header constants:

From:

```js
#define TITLE "Annotate Image"
#define ANNOT_SETTINGS_MODULE "AnnotateImage"
[...]
    #define SETTINGS_MODULE "AnnotateImage"
```

To:

```js
#define TITLE "Annotate Image Ext"
#define ANNOT_SETTINGS_MODULE "AnnotateImageExt"
[...]
    #define SETTINGS_MODULE "AnnotateImageExt"
```

### Change configuration for PixInsight's Scripts menu

In `src/scripts/AnnotateImage/AnnotateImage.js` change the menu paths and / or script names in the `feature-id` header:

```
#feature-id    AnnotateImageExt : Astrometry > AnnotateImageExt | Render > AnnotateImageExt
```

### File catalogs required vs optional headers

For example from the `Messier.csv`, the first 7 headers are required, whether the columns have values or not, and Common name and the rest are passed through as label options:
```
  id,alpha,delta,magnitude,diameter,axisRatio,posAngle,Common name,NGC/IC,PGC
```

### Optional: update the AnnotateImageDialog to ensure whether the out-of-the-box or dev version is running at runtime.
I updated the main dialog just to mark it as different from the default.

Changed the information label text from:
```js
       this.information_Label.text = "<p><b>AnnotateImage v" + VERSION + "</b> &mdash; "
```

To:
```js
       this.information_Label.text = "<p><b>AnnotateImageExt v" + VERSION + "</b> &mdash; "
```

### Adding a Vizier Query Catalog as a Layer in AnnotateImage



### Bug Fixes for PixInsight AnnotateImage

#### AnnotateImage preferences / settings reset if Custom catalog configuration clicks "OK" with empty field

The script should continue and preserve settings, not reset or delete all previous settings when one Custom catalog configuration step is missed.

To reproduce:
  - Add a Custom catalog layer through the Add Layers dialog
  - Do not set a value for the custom catalog file path
  - Click "OK" to execute AnnotateImage
  - Re-open AnnotateImage script and check preferences/settings and previously added layers, they will be missing if not totally reset to defaults

To fix:
  - TBD!
  - In theory, just check if the Custom layer has a file input in the field before allowing OK on the main script.  Or, drop the new Custom layer and log a warning to the user but continue functioning and preserve other preferences/settings.

TODO: update

#### `Warning: OpenFileDialog.fileName is deprecated: Use OpenFileDialog.filePath instead.`

Every time adding a Custom catalog layer through the legacy AnnotateImageDialog, after adding the file path and clicking OK, a warning is logged to the console:

```
** Warning: OpenFileDialog.fileName is deprecated: Use OpenFileDialog.filePath instead.
```

Fixed in `AstronomicalCatalogs.js`, old code commented out, two new lines referencing filePath instead of fileName at ll. 4305 - 4309:

```js
           // AnnotateImageExt bug fix, fileName is deprecated
            // this.dialog.activeFrame.object.catalog.catalogPath = gdd.fileName;
            this.dialog.activeFrame.object.catalog.catalogPath = gdd.filePath;
            // path_Edit.text = gdd.fileName;
            path_Edit.text = gdd.filePath;
```

#### Fix for Inconsistent spelling / typo "nebulaes" for "nebulae"

```
$ grep nebulaes -R .
./include/pjsr/astrometry/AstronomicalCatalogs.js:      this.description = "Catalog of Reflection Nebulae - Van den Bergh (159 nebulaes)";
./include/pjsr/astrometry/AstronomicalCatalogs.js:      this.description = "Catalog of HII Regions - Sharpless (313 nebulaes)";
```

### Question: why two versions of AstronomicalCatalogs with js and jsh extensions?

```
include/pjsr/astrometry/AstronomicalCatalogs.js
src/scripts/AdP/AstronomicalCatalogs.jsh
```

The `include/pjsr/astrometry/AstronomicalCatalogs.js` is included as part of the core PixInsight Javascript Runtime (PJSR).  It has no dependency on source code in the src/scripts directory.

The `src/scripts/AdP/AstronomicalCatalogs.jsh` is part of/included by both `src/scripts/ImageSolver/ImageSolver.js` and `src/scripts/AnnotateImage/AnnotateImage.js`.

### Why are there two sets of local catalog csv files, such as Messier.csv, shipped with PixInsight? 

There are copies of the local, file-based astronomical catalogs shipped with PixInsight in two places, for example:

  1. PixInsight/include/pjsr/astrometry/Messier.csv
  2. PixInsight/src/scripts/AdP/Messier.csv

Here is the set of depdencies to other scripts that are included by `AnnotateImage.js`:

```js
#include <pjsr/astrometry/AstrometricMetadata.js>
// #include <pjsr/astrometry/AstronomicalCatalogs.js> except this one and the next line, which is just for dev but ... maybe need to copy somewhere else 
#include "../../../include/pjsr/astrometry/AstronomicalCatalogs.js"
#include <pjsr/astrometry/UtilityControls.js>
#include <pjsr/controls/GeodeticCoordinatesEditor.js>
#include <pjsr/controls/ImageView.js>
#include "AnnotateImageDialog.js"
#include "AnnotationEngine.js"
#include "Entity.js"
#include "GraphicProperties.js"
#include "Layer.js"
```


There is no direct dependency to `AstronomicalCatalogs.jsh` from `AnnotateImage.js` or its sub-scripts.  `AnnotateImage.js` is an uncomplicated wrapper that instantiates an instance of `AnnotationEngine.js`, which ties to the astrometry code.

And `AstronomicalCatalogs.jsh` does not have a main function to be run standalone.  It is only used by other scripts.  But it is not in fact used by `AnnotateImage.js`.

But there are dependencies from other scripts shipped with PixInsight to `AdP/AstronomicalCatalogs.jsh`, namely:

```
/opt/PixInsight/src/scripts/AdP/ImageSolver.js
/opt/PixInsight/src/scripts/AdP/AperturePhotometry.js
/opt/PixInsight/src/scripts/AdP/MosaicPlanner.js
```


