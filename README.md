<img width="1788" height="500" alt="noirlab2521b_combined-github-banner" src="https://github.com/user-attachments/assets/6eefacea-a0e9-4137-9477-76bb3ef6a938" />

# AnnotateImageExt-ended with Features, Fixes and Catalogs
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

- Vizier queries for LDN, LBN, Barnard and Sharpless are not that crucial as the nebulae catalogs, complete, are a few kilobytes each, and Vizier (and networks in general) is not 100% reliable, and a hanging Vizier query in annotation can freeze PixInsight, discourage users and confuse them as to what is even happening.  Network dependency can be reserved for very large catalogs, such as star and galaxy catalogs with millions to billions of objects, smaller catalog data can reside locally, and ...

- Vizier queries could be externally configurable so that new ones can be defined without always having to write a new function in JavaScript, but this it not currently implemented.

- Awareness and appreciation of scale in astronomy, astrophysics and astrophotography through annotations and specialized catalogs is something of interest to me, so I started a catalog of catalogs of what I call *Very Large Scale Astro Phenomena,* a work in progress included in this project.


## New Features

The main features added here are:

### New and Updated Astronomical Catalogs

Many added, updated astronomy, astrophysics and astrophotography catalogs for PixInsight AnnotateImage, especially those that include coverage of the southern celestial hemisphere, corrected and comprehensive catalogs of catalogs, including (listed with CDS/Vizier/SIMBAD catalog prefixes where available):



| Catalog / Layer | Author(s) & Year | Object Type | Description |
| :--- | :--- | :--- | :--- |
| **Asterisms Layer** | Various | Asterisms | Well-known, non-constellation patterns (e.g., Teapot, Winter Hexagon, Winter Triangle, Great Square). |
| **BFS** | Blitz, Fich, & Stark (1982) | H II Regions | *Catalog of CO Radial Velocities toward Galactic H II Regions*. |
| **Caldwell** | O'Meara (2002 Updates) | Deep-Sky Objects | The classic list of 109 deep-sky objects with updated modern revisions. |
| **Ced** | Cederblad (1945) | Diffuse Nebulae | *Catalog of bright diffuse Galactic nebulae*. |
| **Col** | Collinder (1931) | Open Clusters | *On Structural Properties of Open Clusters and Their Spatial Distribution*. |
| **[DB2002b]** | Dutra & Bica (2002) | Dark Nebulae / Clouds | *Dust Clouds*, incorporating Barnard, LDN, MBM, and more. Features DB2002b ID and "Common name" labels. |
| **DWB** | Dickel, Wendker, & Bieritz (1969) | Hα Emissions | *The Cygnus X Region V. Catalogue and Distances of Optically Visible H II Regions*. |
| **SNR** | Green (2025) | Supernova Remnants | An updated, comprehensive edition of *A Catalog of Galactic Supernova Remnants*. |
| **Gum** | Gum (1955) | H II Regions | *Southern HII Regions*. |
| **FeSt 1** | Feitzinger & Stüwe (1984) | Dark Nebulae | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees*. |
| **FeSt 2** | Feitzinger & Stüwe (1984) | Globules | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees*. |
| **HMST / DCld** | Hartley et al. (1986) | Dark Clouds | *Catalogue of Southern Dark Clouds*. |
| **Integrated HII** | Jardine, K. (2013) | H II Nebulae | Galaxymap.org compilation cross-indexing BFS, Du, Gum, RCW, Sh2, Sivan, and unique [GMN] regions. |
| **MWSC** | Kharchenko et al. (2013) | Open Clusters | *Global Survey of Star Clusters in the Milky Way II*. Includes all known open clusters with ID/Common Name. |
| **MBM** | Magnani, Blitz, & Mundy (1985) | Molecular Gas | *Molecular Gas at High Galactic Latitudes*. |
| **Mandel-Wilson**| Mandel & Wilson (2004) | IFNs / Cirrus | *Catalogue of Unexplored Nebulae*, featuring nine integrated flux nebulae. |
| **Mel** | Melotte (1915) | Open Clusters | *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* with updated coordinates. |
| **NamedStars** | IAU (Updated to 2026) | Stars | Star catalog updated with official IAU name changes (no new stars added). |
| **Paladini** | Paladini et al. (2003) | H II Regions | *A Radio Catalog of Galactic HII Regions for Applications from Decimeter to Millimeter Wavelengths*. |
| **PGCC** | Planck Collaboration (2015) | Cold Clumps | *Planck 2015 Results. XXVIII. The Planck Catalogue of Galactic Cold Clumps*. |
| **RCW** | Rogers, Campbell, & Whiteoak (1960) | Hα Emissions | *Catalog of Halpha Emission Regions in the Southern Milky Way*. |
| **Shk** | Shakhbazian (1979) | Compact Galaxies | *The Catalog of Compact Groups of Compact Galaxies* featuring 377 distinct groups. |
| **SL** | Sandqvist & Lindroos (1976) | Dark Clouds | *Southern Dark Clouds*. |
| **SDN** | Sandqvist (1977) | Dark Dust Clouds | *More Southern Dark Dust Clouds* (Follow-up to SL). |
| **Stirling** | Stirling (2026) | Wide-Field Astro Phenomena | Very large angular scale astro phenomena (major axis $\ge$ 3°). |
| **SFO** | Sugitani, Fukui, & Ogura (1991/1994) | Bright-Rimmed Clouds| Catalogs covering northern (1991) and southern (1994) hemispheres. |
| **WISE** | Anderson et al. (2014) | H II Regions | *The WISE catalog of Galactic HII regions*. |

### Categorized Astronomical Catalogs

#### Deep-Sky & Wide-Field Collections

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **Asterisms Layer** | Various | Well-known, non-constellation patterns (e.g., Teapot, Winter Hexagon, Winter Triangle, Great Square). |
| [**Caldwell**] | O'Meara (2002 Updates) | The classic list of 109 deep-sky objects with updated modern revisions. |
| **Stirling** | Stirling (2026) | Work-in-progress focused on **very large scale astro phenomena** (major axis $\ge$ 3°). |

#### H II Regions & Hα Emissions

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| [**BFS**] | Blitz, Fich, & Stark (1982) | *Catalog of CO Radial Velocities toward Galactic H II Regions*. |
| [**DWB**] | Dickel, Wendker, & Bieritz (1969) | *The Cygnus X Region V. Catalogue and Distances of Optically Visible H II Regions*. |
| [**Gum**] | Gum (1955) | *Southern HII Regions*. |
| [**Integrated HII**](http://galaxymap.org) | Jardine (2013) | Galaxymap.org compilation cross-indexing BFS, Du, Gum, RCW, Sh2, Sivan, and unique [GMN] regions. |
| [**Paladini**] | Paladini et al. (2003) | *A Radio Catalog of Galactic HII Regions for Applications from Decimeter to Millimeter Wavelengths*. |
| [**RCW**] | Rogers, Campbell, & Whiteoak (1960) | *Catalog of Halpha Emission Regions in the Southern Milky Way*. |
| [**WISE**] | Anderson et al. (2014) | *The Wise catalog of Galactic HII regions*. |

#### Dark Nebulae, Molecular Clouds & Cold Clumps

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| [**[DB2002b]**] | Dutra & Bica (2002) | *Dust Clouds*, incorporating Barnard, LDN, MBM, and more. Features DB2002b ID and "Common name" labels. |
| [**FeSt 1**] | Feitzinger & Stüwe (1984) | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (Dark Nebulae section). |
| [**FeSt 2**] | Feitzinger & Stüwe (1984) | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (Globules section). |
| [**HMST / DCld**] | Hartley et al. (1986) | *Catalogue of Southern Dark Clouds*. |
| [**MBM**] | Magnani, Blitz, & Mundy (1985) | *Molecular Gas at High Galactic Latitudes*. |
| [**PGCC**] | Planck Collaboration (2015) | *Planck 2015 Results. XXVIII. The Planck Catalogue of Galactic Cold Clumps*. |
| [**SL**] | Sandqvist & Lindroos (1976) | *Southern Dark Clouds*. |
| [**SDN**] | Sandqvist (1977) | *More Southern Dark Dust Clouds* (Follow-up to SL). |
| [**SFO**] | Sugitani et al. (1991/1994) | *Bright-Rimmed Clouds* covering northern (1991) and [southern (1994)] hemispheres. |

#### Star Clusters & Stellar Data

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| [**Col**] | Collinder (1931) | *On Structural Properties of Open Clusters and Their Spatial Distribution*. |
| [**MWSC**] | Kharchenko et al. (2013) | *Global Survey of Star Clusters in the Milky Way II*. Includes all known open clusters with ID/Common Name. |
| [**Mel**] | Melotte (1915) | *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* with updated coordinates. |
| [**NamedStars**](https://iau.org) | IAU (Updated to 2026) | Star catalog updated with official IAU name changes (no new stars added). |

#### Diffuse Nebulae & Supernova Remnants

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| [**Ced**] | Cederblad (1945) | *Catalog of bright diffuse Galactic nebulae*. |
| [**Mandel-Wilson**] | Mandel & Wilson (2004) | *Catalogue of Unexplored Nebulae*, featuring nine integrated flux nebulae (IFNs). |
| [**SNR**] | Green (2025) | An updated, comprehensive edition of *A Catalog of Galactic Supernova Remnants*. |

#### External Galaxies

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| [**Shk**] | Shakhbazian (1979) | *The Catalog of Compact Groups of Compact Galaxies* featuring 377 distinct groups. |

Screenshot showing default core catalogs and layers as of 7/5/2026:

<img width="894" height="838" alt="AnnotateImageExt_20260705_core-defaults" src="https://github.com/user-attachments/assets/e1cddd9b-30fc-4026-a893-a37573eea1c0" />

### Externalization of catalog registration and layers configuration

Externalization of catalog registration and layers configuration to a JSON configuration file: `catalogs-config.json`, including:

- catalog ids, name strings, file names, description strings and label fields
- catalog layer settings, currently supporting label size, line width, label and line colors per catalog layer
- all layer and catalog preferences preserved on execution and resettable to defaults via the reset button if desired
- catalog layer visibility default controlled by `"visible": true` in JSON configuration
- Script subdirectory `catalogs` deployment "system" scripts, but plan to support any file path users want to use to separate from system configs

### Codebase founded on AnnotateImage.js, AnnotationEngine.js and astrometry/AstronomicalCatalogs.js

I started with AnnotateImage v 2.3.0 which came out with PixInsight 1.9.4 and updated the code with the latest build of PixInsight and v 2.3.1 of AnnotateImage in late June, 2026.

### Better error handling for Custom catalog users (see Bugs fixed below for more details) and protection for configuration changes and settings.

Settings, files and preferences isolated from out-of-the-box AnnotateImage so you can switch between them or use both without conflict.

### Issues fixed (to be backported to PixInsight PJSR project in GitLab)

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
