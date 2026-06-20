// ----------------------------------------------------------------------------
// AnnotateImageExt.js
// ----------------------------------------------------------------------------
//
// The use of this source code is governed by the PixInsight Class Library
// License Version 2.0, which can be found in the LICENSE file included with
// this distribution, as well as at:
// https://pixinsight.com/license/PCL-License-2.0.html
// ----------------------------------------------------------------------------

#engine v8

#feature-id    AnnotateImageExt : Astrometry > AnnotateImageExt | Render > AnnotateImageExt
#feature-icon  @script_icons_dir/AnnotateImage.svg
#feature-info  A script for annotating astronomical images extended.<br/>\
               <br/>\
               Copyright &copy; 2012-2026 Andr&eacute;s del Pozo<br/>\
               Copyright &copy; 2019-2026, Juan Conejero (PTeam) \
               Copyright &copy; 2026, Scott Stirling

CoreApplication.ensureMinimumVersion( 1, 9, 4 );

#define VERSION "1.0.0"
#define TITLE "Annotate Image Ext"
#define ANNOT_SETTINGS_MODULE "AnnotateImageExt"

#ifndef USE_ANNOTATE_LIBRARY
   #define SETTINGS_MODULE "AnnotateImageExt"
#endif

#include <pjsr/astrometry/AstrometricMetadata.js>
// TODO: remove dev hack to load dev version of catalogs
// #include <pjsr/astrometry/AstronomicalCatalogs.js>
// #include "../../../include/pjsr/astrometry/AstronomicalCatalogs.js"
#include "./override/pjsr/astrometry/AstronomicalCatalogs.js"
#include <pjsr/astrometry/UtilityControls.js>
#include <pjsr/controls/GeodeticCoordinatesEditor.js>
#include <pjsr/controls/ImageView.js>

#include "AnnotateImageDialog.js"
#include "AnnotationEngine.js"
#include "Entity.js"
#include "GraphicProperties.js"
#include "Layer.js"

// ----------------------------------------------------------------------------

#ifndef USE_ANNOTATE_LIBRARY

function main()
{
   Runtime.jsScriptInformation = "AnnotateImageExt " + VERSION;
   Runtime.jsScriptResult = 0;

   if ( !Parameters.getBoolean( "non_interactive" ) )
      console.abortEnabled = true;

   let engine = new AnnotationEngine;
   if ( Parameters.isViewTarget )
      engine.Init( Parameters.targetView.window );
   else
   {
      if ( Parameters.getBoolean( "non_interactive" ) )
         engine.Init( ImageWindow.activeWindow );
      else
      {
         for ( ;; )
         {
            engine.Init( ImageWindow.activeWindow );
            let dialog = new AnnotateDialog( engine );
            if ( dialog.execute() )
               break;
            if ( !dialog.resetRequest )
               return;
            engine = new AnnotationEngine;
         }

         engine.SaveSettings();
      }
   }

   engine.Render();

   ++Runtime.jsScriptResult;

   console.show();
}

main();

#endif // !USE_ANNOTATE_LIBRARY

