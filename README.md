<img width="1024" height="554" alt="Vera Rubin Virgo wide field annotated SGA2020 crop" src="https://github.com/user-attachments/assets/5e763442-e3b4-4498-98b2-da01815e1791" />

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
| **FeSt 1** | Feitzinger & Stüwe (1984) | Dark Nebulae | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees*. |
| **FeSt 2** | Feitzinger & Stüwe (1984) | Globules | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees*. |
| **Gum** | Gum (1955) | H II Regions | *Southern HII Regions*. |
| **HMST / DCld** | Hartley et al. (1986) | Dark Clouds | *Catalogue of Southern Dark Clouds*. |
| **Integrated HII** | Jardine, K. (2013) | H II Nebulae | Galaxymap.org compilation cross-indexing BFS, Du, Gum, RCW, Sh2, Sivan, and unique [GMN] regions. |
| **Mandel-Wilson**| Mandel & Wilson (2004) | IFNs / Cirrus | *Catalogue of Unexplored Nebulae*, featuring nine integrated flux nebulae. |
| **MWSC** | Kharchenko et al. (2013) | Open Clusters | *Global Survey of Star Clusters in the Milky Way II*. Includes all known open clusters with ID/Common Name. |
| **MBM** | Magnani, Blitz, & Mundy (1985) | Molecular Gas | *Molecular Gas at High Galactic Latitudes*. |
| **Mel** | Melotte (1915) | Open Clusters | *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* with updated coordinates. |
| **NamedStars** | IAU (Updated to 2026) | Stars | Star catalog updated with official IAU name changes (no new stars added). |
| **OpenNGC** | Verga+ (2026 Updates) |  Open source version of the NGC-IC catalog compiled from contemporary and historical sources. |
| **Paladini** | Paladini et al. (2003) | H II Regions | *A Radio Catalog of Galactic HII Regions for Applications from Decimeter to Millimeter Wavelengths*. |
| **PGCC** | Planck Collaboration (2015) | Cold Clumps | *Planck 2015 Results. XXVIII. The Planck Catalogue of Galactic Cold Clumps*. |
| **RCW** | Rogers, Campbell, & Whiteoak (1960) | Hα Emissions | *Catalog of Halpha Emission Regions in the Southern Milky Way*. |
| **SDN** | Sandqvist (1977) | Dark Dust Clouds | *More Southern Dark Dust Clouds* (Follow-up to SL). |
| **SFO** | Sugitani, Fukui, & Ogura (1991/1994) | Bright-Rimmed Clouds| Catalogs covering northern (1991) and southern (1994) hemispheres. |
| **SGA2020** | Siena Galaxy Atlas 2020 (2023) | Galaxies | Nearby galaxies, derived from `PGC2003`, updated coordinates, `axisRatio`, D26 `diameter` and `posAngle` |
| **Shk** | Shakhbazian (1979) | Compact Galaxies | *The Catalog of Compact Groups of Compact Galaxies* featuring 377 distinct groups. |
| **SL** | Sandqvist & Lindroos (1976) | Dark Clouds | *Southern Dark Clouds*. |
| **SNR** | Green (2025) | Supernova Remnants | An updated, comprehensive edition of *A Catalog of Galactic Supernova Remnants*. |
| **Stirling** | Stirling (2026) | Wide-Field Astro Phenomena | Very large angular scale astro phenomena (major axis $\ge$ 3°). |
| **WISE** | Anderson et al. (2014) | H II Regions | *The WISE catalog of Galactic HII regions*. |

### Categorized Astronomical Catalogs

#### Deep-Sky & Wide-Field Collections

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **Asterisms Layer** | Various | Well-known, non-constellation patterns (e.g., Teapot, Winter Hexagon, Winter Triangle, Great Square). |
| **Caldwell** | O'Meara (2002 Updates) | The classic list of 109 deep-sky objects with updated modern revisions. |
| **OpenNGC** | Verga+ (2026 Updates) |  Open source version of the NGC-IC catalog compiled from contemporary and historical sources. |
| **Stirling** | Stirling (2026) | Work-in-progress focused on **very large scale astro phenomena** (major axis >= 3°). |

#### H II Regions & Hα Emissions

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **BFS** | Blitz, Fich, & Stark (1982) | *Catalog of CO Radial Velocities toward Galactic H II Regions*. |
| **DWB** | Dickel, Wendker, & Bieritz (1969) | *The Cygnus X Region V. Catalogue and Distances of Optically Visible H II Regions*. |
| **Gum** | Gum (1955) | *Southern HII Regions*. |
| [**Integrated HII**](http://galaxymap.org) | Jardine (2013) | Galaxymap.org compilation cross-indexing BFS, Du, Gum, RCW, Sh2, Sivan, and unique [GMN] regions. |
| **Paladini** | Paladini et al. (2003) | *A Radio Catalog of Galactic HII Regions for Applications from Decimeter to Millimeter Wavelengths*. |
| **RCW** | Rogers, Campbell, & Whiteoak (1960) | *Catalog of Halpha Emission Regions in the Southern Milky Way*. |
| **WISE** | Anderson et al. (2014) | *The Wise catalog of Galactic HII regions*. |

#### Dark Nebulae, Molecular Clouds & Cold Clumps

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **[DB2002b]** | Dutra & Bica (2002) | *Dust Clouds*, incorporating Barnard, LDN, MBM, and more. Features DB2002b ID and "Common name" labels. |
| **FeSt 1** | Feitzinger & Stüwe (1984) | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (Dark Nebulae section). |
| **FeSt 2** | Feitzinger & Stüwe (1984) | *Catalogue of dark nebulae and globules for galactic longitudes 240 to 360 degrees* (Globules section). |
| **HMST / DCld** | Hartley et al. (1986) | *Catalogue of Southern Dark Clouds*. |
| **MBM** | Magnani, Blitz, & Mundy (1985) | *Molecular Gas at High Galactic Latitudes*. |
| **PGCC** | Planck Collaboration (2015) | *Planck 2015 Results. XXVIII. The Planck Catalogue of Galactic Cold Clumps*. |
| **SDN** | Sandqvist (1977) | *More Southern Dark Dust Clouds* (Follow-up to SL). |
| **SFO** | Sugitani et al. (1991/1994) | *Bright-Rimmed Clouds* covering northern (1991) and [southern (1994)] hemispheres. |
| **SL** | Sandqvist & Lindroos (1976) | *Southern Dark Clouds*. |

#### Star Clusters & Stellar Data

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **Col** | Collinder (1931) | *On Structural Properties of Open Clusters and Their Spatial Distribution*. |
| **Mel** | Melotte (1915) | *A Catalogue of Star Clusters shown on Franklin-Adams Chart Plates* with updated coordinates. |
| **MWSC** | Kharchenko et al. (2013) | *Global Survey of Star Clusters in the Milky Way II*. Includes all known open clusters with ID/Common Name. |
| [**NamedStars**](https://iau.org) | IAU (Updated to 2026) | PixInsight's NamedStars.csv catalog updated with official IAU name changes (no new stars added) from the past decade or so. |

#### Diffuse Nebulae & Supernova Remnants

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **Ced** | Cederblad (1945) | *Catalog of bright diffuse Galactic nebulae*. |
| **Mandel-Wilson** | Mandel & Wilson (2004) | *Catalogue of Unexplored Nebulae*, featuring nine integrated flux nebulae (IFNs). |
| **SNR** | Green (2025) | An updated, comprehensive edition of *A Catalog of Galactic Supernova Remnants*. |

#### External Galaxies

| Catalog / Layer | Author(s) & Year | Description |
| :--- | :--- | :--- |
| **SGA2020** | Siena Galaxy Atlas 2020 (2023) | Nearby galaxies, derived from `PGC2003`, updated coordinates, `axisRatio`, D26 `diameter` and `posAngle`. |
| **Shk** | Shakhbazian (1979) | *The Catalog of Compact Groups of Compact Galaxies* featuring 377 distinct groups. |

Screenshot showing default core catalogs and layers as of 7/5/2026:

<img width="894" height="838" alt="AnnotateImageExt_20260705_core-defaults" src="https://github.com/user-attachments/assets/e1cddd9b-30fc-4026-a893-a37573eea1c0" />

### Externalization of catalog registration and layers configuration

Externalization of catalog registration and layers configuration to a JSON configuration file: `catalogs-config.json`, including:

  - Catalog ids, name strings, file names, description strings and label fields
  - Catalog layer settings, currently supporting label size, line width, label and line colors per catalog layer
  - All layer and catalog preferences preserved on execution and resettable to defaults via the reset button if desired
  - Catalog layer visibility default controlled by `"visible": true` in JSON configuration
  - Script subdirectory `catalogs` deployment "system" scripts, but plan to support any file path users want to use to separate from system configs
  - Catalog JavaScript class code dynamically generated from JSON configuration: *no coding necessary*.

See: [AnnotateImageExt Catalog Configuration Schema](docs/catalogs-config-json-doc.md) 

### Codebase founded on AnnotateImage.js, AnnotationEngine.js and astrometry/AstronomicalCatalogs.js

Forked from AnnotateImage v2.3.0, in PixInsight 1.9.4, and updated with changes from the latest build of PixInsight and v2.3.1 of AnnotateImage in late June, 2026.

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

#### Update outdated and obsolete Vizier Catalogs

**AnnotateImageExt** updates all of the outdated and obsolete catalogs listed below, which are Vizier-query catalog functions that ship in the PixInsight product:

  - CMC14 (2006) is behind CMC15 (2011) available as `I/327` **and** CMC-14 has a bug in the PixInsight 1.9.4 product Vizier query so it never works (always returns `Catalog CMC14: 0 objects inside the image.`):  
    - The bug is due to mismatch between the expected coordinate column names in the Vizier query URL: `-out=RAJ2000&-out=DEJ2000` should be `-out=RAICRS&-out=DEICRS`
    - Note that in CMC-15 the coordinate column names changed **again** to `-out=RA_ICRS&-out=DE_ICRS`
      - Fixed and tested CMC-14, then replaced with CMC-15 and tested **[DONE 8/22/2026]**
  - GSC 2.3 (2008) is outdated behind GSC 2.4.2 (2020) available as I/353  **[DONE 8/22/2026]**
  - Milliquas 7.2 (2021) is marked **obsolete** in Vizier, with v8 (2023) available as VII/294/catalog  **[DONE 8/22/2026]**
  - UCAC3 (2009) is **obsolete** in Vizier, with UCAC5 (2017) available as I/340 **[DONE 8/23/2026]**
    - UCAC4 updated UCAC3 with corrections and additional wavelength metrics in 2012, retaining the UCAC identifier scheme
    - UCAC5 replaced UCAC4 and UCAC3 with more accurate proper motion data derived from Gaia DR1 in 2017
    - If anyone missed or wanted UCAC4, it would be very similar to UCAC3 _coding-wise_ and the identifiers and magnitude filters
    - UCAC5 data is derived from Gaia DR1 and is a bit out of date with availability of more modern Gaia 3 (late 2020)

