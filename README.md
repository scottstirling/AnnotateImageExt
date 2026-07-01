# AnnotateImage Extended with New Features, Fixes and Catalogs

## Installation

### PixInsight version required:  PixInsight 1.9.4, build 1695 (released 6/21/2026)
### Repository URL:  https://pixinsight.stirlingastrophoto.com/scripts/AnnotateImageExt/

- In PixInsight menus, go to RESOURCES-->Updates-->Manage Repositories
- Use the "Add" button to add the repository URL (including the slash at the end): https://pixinsight.stirlingastrophoto.com/scripts/AnnotateImageExt/
- Go to RESOURCES-->Updates-->Check for Updates and download the update
- Restart PixInsight to finish the installation

## Introduction
Before I go into what I've done with `AnnotateImageExt`, I want to recognize `AnnotateImage` as a great tool developed with extensive useful features by PixInsight user Andres del Pozo and lead engineer Juan Conejero of PixInsight, often in rapid response to PixInsight Forum user requests.  I am grateful to them and those who built and helped shaped the tool.  AnnotateImage out-of-the-box has a lot of cool features that more users should know about and try.  I will list a couple existing features that are worth it:

- magnitude filtering on catalogs with magnitude values
- automated export of annotation details to a text file
- astronomical catalog layering and prioritization with automatic de-duplication (enabled by default) and highly configurable labels and lines
- optional label display of auxiliary catalog data, where supported, such as "Common name" or "Diameter" or "Type," etc.
- built-in catalogs, dynamic Vizier query catalogs and user-defined (in PixInsight CSV format) Custom catalogs

### Limitations
- Many of the catalogs included with PixInsight for annotation are oriented towards stars and galaxies.  There are only a few nebula catalogs included.  The essential Messier, NGC-IC and NamedStars are there on the file system, and there are precanned Vizier queries and logic to pull in data for Lynds' Bright Nebula (LBN), Lynds Dark Nebula (LDN), Barnard's dark nebula (B) and Sharpless 2 (Sh 2), a popular catalog for astrophotographers but one dated with many notable inaccuracies and miscategorized objects that have been updated and sorted since.
- All of the PixInsight astronomical catalog to date have very northern celestial hemisphere focused with no built-in support for very well known catalogs of the southern hemisphere.  Many astrophotographers are sharing data and equipment around the world in places like Atacama, Chile and Namibia in Southern Africa and Yunnan Province in China with access to the southern night sky and they are using PixInsight.
- Astrobin uses PixInsight AnnotateImage as an API and tool to automate annotations for subscribers.  The catalogs and options available through Astrobin are a subset of what is available in PixInsight, but more importantly, there are so many images annotated on Astrobin with an equatorial grid and a bunch of annotated stars or barely visible PGC galaxies in the background because they imaged some very well-known MBM or Gum or RCW or Sandqvist object that will never show up when Messier, NGC-IC, LDN, LBN, Sharpless, Melotte, Collinder, Cederblad and Barnard (to name a few) were all working solely in the northern hemisphere until technology and economics and time started bringing astrophotography to more of the globe.
- Custom catalogs seemed to be the main if not only way to reliably get updated and important catalogs into the PixInsight annotation subsystem
- Complex catalog layer configuration settings can be wiped out by misconfiguring a Custom catalog path (bug caused by late validation of configuration and persistence of invalid settings), causing frustration and lost time
- Vizier queries for the catalogs LDN, LBN, Barnard and Sharpless are not that crucial as the catalogs themselves, complete, are a few kilobytes in total, and Vizier and the network in general is not 100% reliable, and a hanging Vizier query in annotation can hang, discourage users and confuse them as to what is even happening.  So, the network depenendency ought to be reserved for very large catalogs, such as star and galaxy catalogs with millions to billions of objects, smaller catalog data ought to reside locally, and ...
- Vizier queries could be externally configurable so that new ones can be defined without always having to write a new function in JavaScript, but this it not currently implemented.
- Awareness and appreciation of scale in astronomy, astrophysics and astrophotography through annotations and specialized catalogs is something of interest to me, so I started a catalog of catalogs of what I call *Very Large Scale Astro Phenomena,* a work in progress included in this project.


## New Features

The main features added here are:

### New and Updated Astronomical Catalogs

Many added, updated astronomy, astrophysics and astrophotography catalogs for PixInsight AnnotateImage, especially those that include coverage of the southern celestial hemisphere, corrected and comprehensive catalogs of catalogs, including (listed with CDS/Vizier/SIMBAD catalog prefixes where available):

- Asterisms layer of well-known, non-constellation asterisms such as the Teapot, Winter Hexagon, Winter Triangle, Great Square, etc.
- BFS: Blitz, Fich and Stark, *Catalog of CO Radial Velocities toward Galactic H II Regions* (1982)
- Caldwell's 109 Deep Sky objects with O'Meara updates (2002)
- Ced: Cederblad, Sven *Catalog of bright diffuse Galactic nebulae* (1945)
- Col: Collinder, P.A., *On Structural Properties of Open Clusters and Their Spatial Distribution* (1931)
- [DB2002b]: Dutra and Bica's *Dust Clouds* of 2002, incorporating Barnard, LDN, MBM and more in a comprehensive catalog of dark nebula and molecular clouds with DB2002b ID and "Common name" label options
- DWB: catalog of Hα emissions in Cygnus, Dickela, Hélène R., Wendker, Heinrich and Bieritz, J.H., *The Cygnus X Region V. Catalogue and Distances of Optically Visible H II Regions* (1969)
- SNR: Green, D.'s updated *A Catalog of Galactic Supernova Remnants* (2025)
- Gum's *Southern HII Regions* (1955)
- FeSt 1: Feitzinger, J.V. and Stüwe, J.A., *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (1984) (dark nebula)
- FeSt 2: Feitzinger, J.V. and Stüwe, J.A., *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (1984) (globules)
- MWSC: Kharchenko et al, *Global Survey of Star Clusters in the Milky Way II*, (2013) containing all the known open clusters across catalogs and hemispheres with MWSC ID and "Common name" label options
- MBM: i.e., Magnani, Blitz and Mundy's *Molecular Gas at High Galactic Latitudes* (1985)
- Mandel (Steve) and Wilson (Michael)'s catalog of nine integrated flux nebulae (IFN) aka galactic cirrus, *Catalogue of Unexplored Nebulae* (2004)
- Mel: Melotte, P.J., *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* (1915) with updated coordinates
- NamedStars catalog updated with IAU name changes of existing stars (no new stars added) up to June, 2026 
- Paladini et al., *A Radio Catalog of Galactic HII Regions for Applications from Decimeter to Millimeter Wavelengths* (2003)
- PGCC: the Planck Collaboration's *Planck 2015 Results. XXVIII. The Planck Catalogue of Galactic Cold Clumps*
- RCW: Rogers, Campbell and Whiteoak's *Catalog of Halpha Emission Regions in the Southern Milky Way* (1960)
- SL: Sandqvist, A. and Lindroos, K.P.'s *Southern Dark Clouds* (1976)
- SDN: Sandqvist, A.'s follow up, *More Southern Dark Dust Clouds* (1977)
- Stirling (my own) catalog of *Very Large Scale Astro Phenomena*, a work in progress focused on **very wide field** (**currently defined as major axis >= 3°**) objects and structures sourced from well known catalogs, tradition and recent discoveries (2026)
- SFO: Sugitanixi, Fukui and Ogura, catalogs of *Bright-Rimmed Clouds* in the northern (1991) and southern (1994) hemispheres
- WISE: Anderson et al., *The WISE catalog of Galactic HII regions* (2014)

### Works in progress: Herbig Haro objects, Magakian Reflection Nebulae cross-ref, Pulsar Wind Nebulae, Wolf-Rayet Nebulae, specialized star catalogs

### Externalization of catalog registration and layers configuration

Externalization of catalog registration and layers configuration to a JSON configuration file: `catalogs-config.json`, including:

- catalog ids, name strings, file names, description strings and label fields
- catalog layer settings, currently supporting label size, line width, label and line colors per catalog layer
- all layer and catalog preferences preserved on execution and resettable to defaults via the reset button if desired
- whether the catalog layer is visible in the layers configuration screen by default
- currently a hard-coded "catalogs" subdirectory for the "system" scripts, but plans to support any file path users want to use to separate from system configs

### Codebase founded on AnnotateImage.js, AnnotationEngine.js and astrometry/AstronomicalCatalogs.js

I started with AnnotateImage v 2.3.0 which came out with PixInsight 1.9.4 and updated the code with the latest build of PixInsight and v 2.3.1 of AnnotateImage in late June, 2026.

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
