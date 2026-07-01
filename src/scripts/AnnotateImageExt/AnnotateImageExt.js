// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// AnnotateImage.js - Released 2026-05-11T18:30:06Z
// ----------------------------------------------------------------------------
//
// This file is part of AnnotateImage script version 2.3.1
//
// Copyright (c) 2013-2026 Andres del Pozo
// Copyright (c) 2019-2026 Juan Conejero (PTeam)
//
// The use of this source code is governed by the PixInsight Class Library
// License Version 2.0, which can be found in the LICENSE file included with
// this distribution, as well as at:
// https://pixinsight.com/license/PCL-License-2.0.html
// ----------------------------------------------------------------------------

#engine v8

#feature-id    AnnotateImageExt : Astrometry > AnnotateImageExt | Render > AnnotateImageExt
#feature-icon  @script_icons_dir/AnnotateImage.svg
#feature-info  An astrometry-based script for annotating astronomical images.<br/>\
               <br/>\
               Copyright &copy; 2012-2026 Andr&eacute;s del Pozo<br/>\
               Copyright &copy; 2019-2026, Juan Conejero (PTeam) <br/>\
               Copyright &copy; 2026, Scott Stirling

CoreApplication.ensureMinimumVersion( 1, 9, 4 );

#define VERSION "1.2"
#define TITLE "Annotate Image Ext"
#define ANNOT_SETTINGS_MODULE "AnnotateImageExt"

#ifndef USE_ANNOTATE_LIBRARY
   #define SETTINGS_MODULE "AnnotateImageExt"
#endif

#include <pjsr/astrometry/AstrometricMetadata.js>
// #include <pjsr/astrometry/AstronomicalCatalogs.js>
#include "ext/AstronomicalCatalogs.js"
#include <pjsr/astrometry/UtilityControls.js>
#include <pjsr/controls/GeodeticCoordinatesEditor.js>
#include <pjsr/controls/ImageView.js>
#include "AnnotateImageDialog.js"
#include "AnnotationEngine.js"

// TODO: how to include and extend PixInsight src/script file paths in a cross-platform and not hard-coded way?
//#include "/opt/PixInsight/src/scripts/AnnotateImage/Entity.js"
//#include "/opt/PixInsight/src/scripts/AnnotateImage/GraphicProperties.js"
//#include "/opt/PixInsight/src/scripts/AnnotateImage/Layer.js"

// unmodified files copied to codebase and included due to PixInsight non-portable paths with src/scripts (above).
// There is no way to extend code files portably in this JS without writing a custom inclusion mechanism.
#include "Entity.js"
#include "GraphicProperties.js"
#include "Layer.js"

#include "AsterismsLayer.js"

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

   engine.SaveParameters();
   engine.Render();

   ++Runtime.jsScriptResult;

   console.show();
}

main();

#endif // !USE_ANNOTATE_LIBRARY
// ----------------------------------------------------------------------------
// EOF AnnotateImage.js - Released 2026-05-11T18:30:06Z
