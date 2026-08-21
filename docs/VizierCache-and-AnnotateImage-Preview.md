## `VizierCache` and AnnotateImage Preview

`VizierCache` is defined in `AstronomicalCatalogs.js` in the PixInsight 1.9.x product.  The function of `VizierCache` is to store remote Vizier web service query results for the same field of view and center coordinates of a given image view, in order to optimize efficiency by reducing duplicate queries to Vizier for the same data repeatedly.  The cache is useful in two use cases (at least), but they are not immediately obvious to users.

When the user path through **AnnotateImage** is to configure and add catalog layers and settings for graphics and text scale, label fonts, sizes, colors, line widths, and transparency, and then click "OK" in the _lower right_ to generate a new image, then the `VizierCache` is not useful or even used except to add to it: 1 entry to it for every Vizier query derived catalog in the selected set.  **AnnotateImage** will query Vizier once per catalog layer that depends on a Vizier query, and it will call `VizierCache.Add()` with the results.  But after clicking "OK," the settings are saved, a new image is generated and **AnnotateImage** script exits, which _wipes out the cache_.

`VizierCache` is dereferenced along with the **AnnotateImage** script GUI screen and all of its related objects every time it is closed by clicking "OK" and annotating an image or when hitting "Cancel" and closing the **AnnotateImage** interface, i.e., each `VizierCache` instance is new every time **AnnotateImage** is started from the **SCRIPT** menu. 

How to make effective use of the cache?   Two answers follow, but one primary use case, which is the **Preview** function on the _lower left_ of the **AnnotateImage** GUI.

## I. AnnotateImage, Preview and VizierCache

Every time **Preview** runs, **AnnotateImage** gets the catalog data it needs to render annotations for the image view's field of view (search) radius, center coordinates and selected catalog layers.  The **Preview** function can be run _infinitely_ between tweaks of catalog layer display settings, additions, removals and other configuration changes in the annotated output _before_ clicking the final "OK" to render a new image and exit the script.
  
Using **Preview** iteratively on the same image with different settings is the primary use case where the `VizierCache` is most relevant and useful.  **AnnotateImage** will call the `VizierCache.Get(center, fov, id)` function and get cached object data from Vizier query responses every time, except the first time a Vizier-query-based catalog is previewed, e.g., _Arp_, _Barnard_, _LBN_, _LDN_, _Sharpless_, _VdB_ are all Vizier-query catalogs (unlike _Messier_, _NGC-IC_ and _NamedStars_, which are local files in the PixInsight product).

<img width="799" height="974" alt="VizierCache-Preview-example" src="https://github.com/user-attachments/assets/5bec9e08-1498-40c8-a107-8ca43fd363d8" />

## II. Same catalog layer added more than once

A contrived, but possible scenario is one where the same catalog layer can be added multiple times to the annotation layers.  

For example, say _Sharpless_ is added twice: once as a layer used to manage the label font and color with **Show Markers** option disabled ... 

<img width="390" height="450" alt="Image" src="https://github.com/user-attachments/assets/1e64df49-3a04-4f76-be45-08549233692d" />

... and a second, duplicate to manage the markers color separately and with the **Show Labels** option disabled.  

<img width="390" height="450" alt="Image" src="https://github.com/user-attachments/assets/9bb19b01-3d84-429b-a05d-13d2c62a70df" />

The first time it is used, the first _Sharpless_ layer will query the Vizier backend, then the second layer will use the cached query populated by the first one.  This is a contrived case, but it will exercise the cache.  It is contrived because one can manage the labels and markers independently already with just one instance of the catalog layer.

<img width="4904" height="3094" alt="Image" src="https://github.com/user-attachments/assets/ab048dcd-06c2-4426-90d3-c564857c5779" />

## `Clear cache` nuance

The `Clear()` function on `VizierCache` is currently unused in the code.  If/when the "Clear cache" button is pressed on the **AnnotateImageDialog.js** GUI, any existing `VizierCache` instance reference in memory is replaced by a new instance of `VizierCache`, which has the same effect of clearing memory, essentially, without calling the `Clear()` function (which resets any existing cache reference to an empty array):
```AnnotateImageDialog.js
      this.clearCache_Button.onMousePress = function()
      {
         if ( __vizier_cache__ )
            __vizier_cache__ = new VizierCache();
         (new MessageBox( "VizieR cache cleared", TITLE, StdIcon.Information )).execute();
      };
```
A minor enhancement would be to disable the "Clear cache" button until/unless the cache is actually instantiated and contains something (length > 0).
