//     ____       __ _____  ____
//    / __ \     / // ___/ / __ \
//   / /_/ /__  / / \__ \ / /_/ /
//  / ____// /_/ / ___/ // _, _/   PixInsight JavaScript Runtime
// /_/     \____/ /____//_/ |_|    PJSR Version 2.0
// ----------------------------------------------------------------------------
// AstronomicalCatalogs.js - Released 2026-03-26T21:05:13Z
// ----------------------------------------------------------------------------
// This file is part of the PixInsight JavaScript Runtime (PJSR).
// PJSR is an ECMA-262-compliant framework for development of scripts on the
// PixInsight platform.
//
// Copyright (c) 2003-2026 Pleiades Astrophoto S.L. All Rights Reserved.
//
// The use of this source code is governed by the PixInsight Class Library
// License Version 2.0, which can be found in the LICENSE file included with
// this distribution, as well as at:
// https://pixinsight.com/license/PCL-License-2.0.html
// ----------------------------------------------------------------------------

#ifndef __PJSR_AstronomicalCatalogs_js
#define __PJSR_AstronomicalCatalogs_js

#include <pjsr/astrometry/AstrometricMetadata.js>

// ----------------------------------------------------------------------------

/*
 * Registry providing access to all defined catalog classes.
 */
var CatalogRegistry = class
{
   static #catalogs = [];

   static get length()
   {
      return CatalogRegistry.#catalogs.length;
   }

   static register( catalog, id )
   {
      CatalogRegistry.#catalogs.push(
         { id:                   id ?? catalog.id,
           name:                 catalog.name,
           isVizier:             VizierCatalog ? catalog instanceof VizierCatalog : false,
           evaluableConstructor: catalog.GetConstructor() } );
   }

   static findById( catalogId )
   {
      if ( typeof( catalogId ) == "string" )
         for ( let i = 0; i < CatalogRegistry.length; ++i )
            if ( CatalogRegistry.#catalogs[i].id == catalogId )
               return CatalogRegistry.#catalogs[i];
      return null;
   }

   static findByName( catalogName )
   {
      if ( typeof( catalogName ) == "string" )
      {
         catalogName = catalogName.trim();
         for ( let i = 0; i < CatalogRegistry.length; ++i )
            if ( CatalogRegistry.#catalogs[i].name == catalogName )
               return CatalogRegistry.#catalogs[i];
      }
      return null;
   }

   static find( idx )
   {
      if ( typeof( idx ) == "string" )
      {
         let catalog = CatalogRegistry.findById( idx );
         if ( catalog === null )
            catalog = CatalogRegistry.findByName( idx );
         if ( catalog !== null )
            return catalog;
      }
      else
      {
         if ( idx >= 0 && idx < CatalogRegistry.length )
            return CatalogRegistry.#catalogs[idx];
      }
      return null;
   }

   static newCatalog( idx )
   {
      let meta = CatalogRegistry.find( idx );
      if ( meta !== null )
         return eval( meta.evaluableConstructor );
      return null;
   }

  // NEW 
  static createAndRegisterCatalog(config) {
      // Dynamically create the class extending your LocalFileCatalog
      const DynamicCatalogClass = class extends LocalFileCatalog {
          constructor() {
              super(config.id, config.name, config.file);
              this.description = config.description;
              this.fields = config.fields;
          }
 
          GetConstructor() {
              // Replicate string behavior for script generation/serialization
              return "new " + config.className + "()";
          }
      };

      // Expose to PJSR's global scope so that eval("new FooCatalog()") works
      globalThis[config.className] = DynamicCatalogClass;

      // Register a new instance into CatalogRegistry
      CatalogRegistry.register(new DynamicCatalogClass());
  }

  // NEW 
  static loadCatalogsFromJSON(jsonFilePath) {
      // TODO: not sure whether to keep "catalogs" subdirectory name hard-coded but, 
      // for now, keeps the files separate from the js files dir, relative to LocalFileCatalog path logic
      const CATALOGS_SUBDIR = "catalogs"; // relative to the current js script

      if (!File.exists(jsonFilePath)) {
          console.writeln("** Error: file not found: " + jsonFilePath);
          return;
      }

      let jsonText = File.readTextFile(jsonFilePath);

      // catalogsConfig object encapsulates the parsed JSON config
      let catalogsConfig = JSON.parse(jsonText);

      for (let i = 0; i < catalogsConfig.length; ++i) {
          let config = catalogsConfig[i];

          // Create Catalog subclasses extending LocalFileCatalog dynamically
          const DynamicCatalogClass = class extends LocalFileCatalog {

              constructor() {
                  super(config.id, config.name, CATALOGS_SUBDIR + "/" + config.file);
                  this.description = config.description;
                  this.fields = config.fields;
              }

              GetConstructor() {
                  return "new " + config.className + "()";
              }
          };

          // 2. Expose to global scope
          globalThis[config.className] = DynamicCatalogClass;

          // 3. Register it using the existing static method
          CatalogRegistry.register(new DynamicCatalogClass());
      }
      console.writeln("Successfully loaded " + catalogsConfig.length + " dynamic catalogs.");
  }

   static reset()
   {
      CatalogRegistry.#catalogs = [];
   }
};

CatalogRegistry.reset();

// ----------------------------------------------------------------------------

/*
 * Structure to hold catalog record data.
 */
var CatalogRecord = class
{
   constructor( posRD, diameter, name, magnitude, axisRatio, posAngle )
   {
      // Position, where posRD.x=RA(deg) and posRD.y=Dec(deg)
      this.posRD = posRD;

      // Diameter in degrees >= 0
      this.diameter = diameter ?? 0;

      // Object's name or empty string
      this.name = name ?? '';

      // Magnitude or undefined
      if ( magnitude !== undefined )
         this.magnitude = magnitude;

      if ( (axisRatio ?? false) && (posAngle ?? false) )
      {
         // Axis ratio: major_axis/minor_axis >= 1
         this.axisRatio = axisRatio;
         // Position angle: position angle of the major axis in degrees with
         // respect to the north pole direction, measured positive eastwards.
         this.posAngle = posAngle;
      }
      else
      {
         this.axisRatio = 1;
         this.posAngle = null;
      }
   }
};

// ----------------------------------------------------------------------------

/*
 * Base class of all catalog classes.
 */
var Catalog = class extends PersistentObject
{
   constructor( id, name )
   {
      super( SETTINGS_MODULE, id/*prefix*/, []/*properties*/ );

      this.id = id;
      this.name = name;
      this.objects = null;
      this.reportObjectsInside = true;
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, this.fields[0], null, null, null];
   }

   // -------------------------------------------------------------------------
   // Auxiliary functions for calculation of astrometric, proper and
   // apparent places in spherical equatorial coordinates.
   //
   // P  Reference to a Position object.
   //
   // B  Reference to a body for position calculation. Can be an
   //    EphemerisHandle object (for solar system bodies) or a
   //    StarPosition object (for catalog stars).
   // -------------------------------------------------------------------------

   static astrometricPlace( P, B )
   {
      return P.astrometric( B ).toSpherical2Pi();
   }

   static properPlace( P, B )
   {
      return P.proper( B ).toSpherical2Pi();
   }

   static apparentPlace( P, B )
   {
      return P.apparent( B ).toSpherical2Pi();
   }

   static placeFunctionForReferenceSystem( referenceSystem )
   {
      switch ( referenceSystem.toUpperCase() )
      {
      default: // ?!
      case "ICRS":
         return Catalog.astrometricPlace;
      case "GCRS":
         return Catalog.properPlace;
      case "TRUE":
      case "MEAN":
      case "APPARENT":
      case "GAPPT":
         return Catalog.apparentPlace;
      }
   }

   static newPosition( metadata )
   {
      let P = new Position( metadata.observationTime, "UTC" );
      if ( metadata.topocentric )
         if ( metadata.obsLongitude ?? false )
            if ( metadata.obsLatitude ?? false )
               P.observer = new ObserverPosition( metadata.obsLongitude, metadata.obsLatitude, metadata.obsHeight ?? 0 );
      return P;
   }
};

Object.defineProperties( Catalog,
{
   NullMag: { value: 1000 } // signals absent or undefined magnitude data
} );

// ----------------------------------------------------------------------------

/*
 * Base class of catalogs that can filter objects by a range of magnitudes for
 * annotation.
 */
var CatalogWithMagnitudeFilters = class extends Catalog
{
   constructor( id, name )
   {
      super( id, name );
   }

   GetMagnitudeFilterControls( parent )
   {
      let magnitude_Label = new Label( parent );
      magnitude_Label.text = "Magnitude filter:";
      magnitude_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      magnitude_Label.minWidth = parent.labelWidth1;

      let filter_Combo = null;
      if ( this.filters.length > 1 )
      {
         filter_Combo = new ComboBox( parent );
         filter_Combo.editEnabled = false;
         filter_Combo.toolTip = "<p>The filter used in magnitude tests.</p>";
         filter_Combo.onItemSelected = function()
         {
            this.dialog.activeFrame.object.catalog.magnitudeFilter = filter_Combo.itemText( filter_Combo.currentItem );
            this.dialog.activeFrame.object.catalog.bounds = null;
         };
         for ( let f = 0; f < this.filters.length; ++f )
         {
            filter_Combo.addItem( this.filters[f] );
            if ( this.filters[f] == this.magnitudeFilter )
               filter_Combo.currentItem = filter_Combo.numberOfItems-1;
         }
      }

      let magnitudeMin_Edit = new Edit( parent );
      magnitudeMin_Edit.setFixedWidth( parent.editWidth );
      if ( this.magMin != Catalog.NullMag )
         magnitudeMin_Edit.text = format( "%g", this.magMin );
      magnitudeMin_Edit.toolTip = "<p>Draw only objects with magnitudes dimmer than this value.<br/>" +
         "It can be empty to disable minimum magnitude filtering.</p>";
      magnitudeMin_Edit.onTextUpdated = function( value )
      {
         if ( !value.trim().isEmpty() )
            this.dialog.activeFrame.object.catalog.magMin = parseFloat( value );
         else
            this.dialog.activeFrame.object.catalog.magMin = Catalog.NullMag;
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      let magnitudeMax_Edit = new Edit( parent );
      magnitudeMax_Edit.setFixedWidth( parent.editWidth );
      if ( this.magMax != Catalog.NullMag )
         magnitudeMax_Edit.text = format( "%g", this.magMax );
      magnitudeMax_Edit.toolTip = "<p>Draw only objects with magnitudes brighter than this value.<br/>" +
         "It can be empty to disable maximum magnitude filtering.</p>";
      magnitudeMax_Edit.onTextUpdated = function( value )
      {
         if ( !value.trim().isEmpty() )
            this.dialog.activeFrame.object.catalog.magMax = parseFloat( value );
         else
            this.dialog.activeFrame.object.catalog.magMax = Catalog.NullMag;
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      let magnitudeSeparator_Label = new Label( parent );
      magnitudeSeparator_Label.text = " - ";

      let magnitudeSizer = new HorizontalSizer;
      magnitudeSizer.scaledSpacing = 4;
      magnitudeSizer.add( magnitude_Label );
      if ( filter_Combo )
         magnitudeSizer.add( filter_Combo );
      magnitudeSizer.add( magnitudeMin_Edit );
      magnitudeSizer.add( magnitudeSeparator_Label );
      magnitudeSizer.add( magnitudeMax_Edit );
      magnitudeSizer.addStretch();
      magnitudeSizer.setAlignment( magnitudeSeparator_Label, Alignment.Center );

      return [ magnitudeSizer ];
   }
};

// ----------------------------------------------------------------------------

var NullCatalog = class extends Catalog
{
   constructor()
   {
      super( "null", "null" );
   }

   GetConstructor()
   {
      return "new NullCatalog()";
   }
};

// ----------------------------------------------------------------------------

/*
 * Geometric (ICRS) positions of the main planets.
 */
var VisiblePlanets = class extends Catalog
{
   constructor()
   {
      super( "Planets", "Planets" );

      this.description = "Visible planets (DE440, ICRS coordinates)";
      this.fields = [ "Name", "Coordinates", "Magnitude" ];
   }

   Validate()
   {
      return true;
   }

   Load( metadata )
   {
      this.objects = [];

      if ( !metadata.observationTime )
         throw new Error( "Computing planet ephemerides: missing observation time metadata." );

      let planets = ["Me", "Ve", "Ma", "Ju", "Sa", "Ur", "Ne", "Pl"];
      let objectNames = [];
      let E = EphemerisFile.fundamentalEphemerides;
      let P = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      for ( let i = 0; i < planets.length; ++i )
      {
         let H = new EphemerisHandle( E, planets[i], "SSB" );
         let q = F( P, H );
         let posRD = new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) );
         if ( metadata.insideImageBoundaries( posRD ) )
         {
            this.objects.push( new CatalogRecord( posRD, 0/*diameter*/, H.objectName, P.apparentVisualMagnitude( H ) ) );
            objectNames.push( H.objectName );
         }
      }

      if ( objectNames.length > 0 )
         console.writeln( "<end><cbr><br><b>Visible planets</b>: ", objectNames.join( ", " ) );
      else
         console.writeln( "<end><cbr><br><b>Visible planets</b>: no bodies" );
   }

   GetEditControls( parent )
   {
      return [];
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, "Name", null, null, "Magnitude"];
   }

   GetConstructor()
   {
      return "new VisiblePlanets()";
   }
};

CatalogRegistry.register( new VisiblePlanets );

// ----------------------------------------------------------------------------

/*
 * Geometric (ICRS) positions of core asteroids.
 */
var VisibleAsteroids = class extends CatalogWithMagnitudeFilters
{
   constructor()
   {
      super( "Asteroids", "Asteroids" );

      this.description = "DE430/DE440 asteroids (343 objects, ICRS coordinates)";
      this.fields = [ "Name", "Coordinates", "Magnitude" ];
      this.filters = [ "V" ];
      this.magnitudeFilter = "V";
      this.magMin = Catalog.NullMag;
      this.magMax = Catalog.NullMag;

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );
   }

   Validate()
   {
      return true;
   }

   Load( metadata )
   {
      this.objects = [];

      if ( !metadata.observationTime )
         throw new Error( "Computing asteroid ephemerides: missing observation time metadata." );

      let asteroids = EphemerisFile.asteroidEphemerides.objects;
      let objectNames = [];
      let E = EphemerisFile.asteroidEphemerides;
      let P = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      for ( let i = 0; i < asteroids.length; ++i )
      {
         let a = asteroids[i];
         let H = new EphemerisHandle( E, a.objectId, "SSB" );
         let V = P.apparentVisualMagnitude( H );
         if ( V === null
               || (this.magMax == Catalog.NullMag || V <= this.magMax)
               && (this.magMin == Catalog.NullMag || V >= this.magMin) )
         {
            let q = F( P, H );
            let posRD = new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) );
            if ( metadata.insideImageBoundaries( posRD ) )
            {
               let objectName = a.objectId + ' ' + a.objectName; // e.g. '1 Ceres'
               this.objects.push( new CatalogRecord( posRD, 0/*diameter*/, objectName, V ) );
               objectNames.push( objectName );
            }
         }
      }

      if ( objectNames.length > 0 )
         console.writeln( "<end><cbr><br><b>Visible asteroids</b>: ", objectNames.join( ", " ) );
      else
         console.writeln( "<end><cbr><br><b>Visible asteroids</b>: no bodies" );
   }

   GetEditControls( parent )
   {
      return [this.GetMagnitudeFilterControls( parent )[0]];
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, "Name", null, null, "Magnitude"];
   }

   GetConstructor()
   {
      return "new VisibleAsteroids()";
   }
};

CatalogRegistry.register( new VisibleAsteroids );

// ----------------------------------------------------------------------------

/*
 * Geometric (ICRS) positions of core Kuiper belt objects.
 */
var VisibleKBOs = class extends CatalogWithMagnitudeFilters
{
   constructor()
   {
      super( "KBOs", "Kuiper Belt Objects" );

      this.description = "DE440 Kuiper Belt Objects (KBOs) (30 objects, ICRS/J2000.0 coordinates)";
      this.fields = [ "Name", "Coordinates", "Magnitude" ];
      this.filters = ["V"];
      this.magnitudeFilter = "V";
      this.magMin = Catalog.NullMag;
      this.magMax = Catalog.NullMag;

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );
   }

   Validate()
   {
      return true;
   }

   Load( metadata )
   {
      this.objects = [];

      if ( !metadata.observationTime )
         throw new Error( "Computing KBO ephemerides: missing observation time metadata." );

      let kbos = EphemerisFile.kboEphemerides.objects;
      let objectNames = [];
      let E = EphemerisFile.kboEphemerides;
      let P = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      for ( let i = 0; i < kbos.length; ++i )
      {
         let k = kbos[i];
         let H = new EphemerisHandle( E, k.objectId, "SSB" );
         let V = P.apparentVisualMagnitude( H );
         if ( V === null
               || (this.magMax == Catalog.NullMag || V <= this.magMax)
               && (this.magMin == Catalog.NullMag || V >= this.magMin) )
         {
            let q = F( P, H );
            let posRD = new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) );
            if ( metadata.insideImageBoundaries( posRD ) )
            {
               let objectName = k.objectId + ' ' + k.objectName; // e.g. '136199 Eris'
               this.objects.push( new CatalogRecord( posRD, 0/*diameter*/, objectName, V ) );
               objectNames.push( objectName );
            }
         }
      }

      if ( objectNames.length > 0 )
         console.writeln( "<end><cbr><br><b>Visible Kuiper belt objects</b>: ", objectNames.join( ", " ) );
      else
         console.writeln( "<end><cbr><br><b>Visible Kuiper belt objects</b>: no bodies" );
   }

   GetEditControls( parent )
   {
      return [this.GetMagnitudeFilterControls( parent )[0]];
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, "Name", null, null, "Magnitude"];
   }

   GetConstructor()
   {
      return "new VisibleKBOs()";
   }
};

CatalogRegistry.register( new VisibleKBOs );

// ----------------------------------------------------------------------------

var PathEditControl = class extends Control
{
   constructor( parent, catalog, index )
   {
      super( parent );

      this.catalog = catalog;
      this.index = index;
      this.xephFilePathProperty = "xephFilePath" + this.index.toString();

      this.path_Edit = new Edit( parent );
      this.path_Edit.text = this.catalog[this.xephFilePathProperty];
      this.path_Edit.onTextUpdated = ( value ) =>
      {
         this.catalog[this.xephFilePathProperty] = value;
      };

      this.path_Button = new ToolButton( parent );
      this.path_Button.icon = parent.scaledResource( ":/icons/select-file.png" );
      this.path_Button.setScaledFixedSize( 20, 20 );
      this.path_Button.toolTip = "<p>Select the input XEPH file.</p>";
      this.path_Button.onClick = () =>
      {
         let gdd = new OpenFileDialog;
         if ( this.catalog[this.xephFilePathProperty].length > 0 )
            gdd.initialPath = this.catalog[this.xephFilePathProperty];
         gdd.caption = "Select Ephemeris File";
         gdd.filters = [["XEPH Ephemeris Files", "*.xeph"]];
         if ( gdd.execute() )
         {
            this.catalog[this.xephFilePathProperty] = gdd.filePath;
            this.path_Edit.text = gdd.filePath;
         }
      };

      this.sizer = new HorizontalSizer;
      this.sizer.spacing = 4;
      this.sizer.add( this.path_Edit, 100 );
      this.sizer.add( this.path_Button );
   }
}

var DirEditControl = class extends Control
{
   constructor( parent, catalog )
   {
      super( parent );

      this.catalog = catalog;

      this.path_Edit = new Edit( parent );
      this.path_Edit.text = this.catalog.searchDirPath;
      this.path_Edit.onTextUpdated = ( value ) =>
      {
         this.catalog.searchDirPath = value;
      };

      this.path_Button = new ToolButton( parent );
      this.path_Button.icon = parent.scaledResource( ":/icons/select-file.png" );
      this.path_Button.setScaledFixedSize( 20, 20 );
      this.path_Button.toolTip = "<p>Select directory.</p>";
      this.path_Button.onClick = () =>
      {
         let gdd = new GetDirectoryDialog;
         if ( this.catalog.searchDirPath.length > 0 )
            gdd.initialPath = this.catalog.searchDirPath;
         gdd.caption = "Select XEPH Files Directory";
         if ( gdd.execute() )
         {
            this.catalog.searchDirPath = gdd.directory;
            this.path_Edit.text = gdd.directory;
         }
      };

      this.sizer = new HorizontalSizer;
      this.sizer.spacing = 4;
      this.sizer.add( this.path_Edit, 100 );
      this.sizer.add( this.path_Button );
   }
};

var CustomXEPHFilesControls = class extends Control
{
   constructor( parent, catalog )
   {
      super( parent );

      this.catalog = catalog;

      this.individualFilesMode_RadioButton = new RadioButton( this );
      this.individualFilesMode_RadioButton.text = "Individual files";
      this.individualFilesMode_RadioButton.toolTip =
         "<p>Enable this mode to select up to three .xeph files for annotation " +
         "of solar system objects based on positional ephemerides.</p>";
      this.individualFilesMode_RadioButton.onClick = () =>
      {
         this.catalog.searchDirMode = false;
         this.updateControls();
      };

      this.directorySearchMode_RadioButton = new RadioButton( this );
      this.directorySearchMode_RadioButton.text = "Directory search";
      this.directorySearchMode_RadioButton.toolTip =
         "<p>Enable this mode to select a directory where the script will search " +
         "for .xeph files. All existing .xeph files in the specified directory " +
         "will be used to annotate solar system objects based on computed " +
         "positional ephemerides.</p>";
      this.directorySearchMode_RadioButton.onClick = () =>
      {
         this.catalog.searchDirMode = true;
         this.updateControls();
      };

      this.mode_Sizer = new HorizontalSizer;
      this.mode_Sizer.add( this.individualFilesMode_RadioButton );
      this.mode_Sizer.addSpacing( 24 );
      this.mode_Sizer.add( this.directorySearchMode_RadioButton );
      this.mode_Sizer.addStretch();

      this.pathEdit1_Control = new PathEditControl( this, catalog, 1 );
      this.pathEdit2_Control = new PathEditControl( this, catalog, 2 );
      this.pathEdit3_Control = new PathEditControl( this, catalog, 3 );

      this.dirEdit_Control = new DirEditControl( this, catalog );

      this.sizer = new VerticalSizer;
      this.sizer.spacing = 4;
      this.sizer.add( this.mode_Sizer );
      this.sizer.add( this.pathEdit1_Control );
      this.sizer.add( this.pathEdit2_Control );
      this.sizer.add( this.pathEdit3_Control );
      this.sizer.add( this.dirEdit_Control );

      this.updateControls();
   }

   updateControls()
   {
      if ( this.catalog.searchDirMode )
      {
         this.individualFilesMode_RadioButton.checked = false;
         this.directorySearchMode_RadioButton.checked = true;
         this.pathEdit1_Control.hide();
         this.pathEdit2_Control.hide();
         this.pathEdit3_Control.hide();
         this.dirEdit_Control.show();
      }
      else
      {
         this.individualFilesMode_RadioButton.checked = true;
         this.directorySearchMode_RadioButton.checked = false;
         this.pathEdit1_Control.show();
         this.pathEdit2_Control.show();
         this.pathEdit3_Control.show();
         this.dirEdit_Control.hide();
      }

      this.dialog.ensureLayoutUpdated();
      this.dialog.adjustToContents();
   }
};

/*
 * Geometric (ICRS) positions of solar system bodies using XEPH files.
 */
var CustomXEPHFiles = class extends CatalogWithMagnitudeFilters
{
   constructor()
   {
      super( "CustomXEPHFiles", "Custom XEPH Files" );

      this.description = "Custom ephemeris files (XEPH format, ICRS/J2000.0 coordinates)";
      this.fields = [ "Name", "Coordinates", "Magnitude" ];
      this.xephFilePath1 = "";
      this.xephFilePath2 = "";
      this.xephFilePath3 = "";
      this.searchDirPath = "";
      this.searchDirMode = false;
      this.filters = ["V"];
      this.magnitudeFilter = "V";
      this.magMin = Catalog.NullMag;
      this.magMax = Catalog.NullMag;

      this.properties.push( ["xephFilePath1", DataType.UTF16String] );
      this.properties.push( ["xephFilePath2", DataType.UTF16String] );
      this.properties.push( ["xephFilePath3", DataType.UTF16String] );
      this.properties.push( ["searchDirPath", DataType.UTF16String] );
      this.properties.push( ["searchDirMode", DataType.Boolean] );
      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );
   }

   Validate()
   {
      return true;
   }

   Load( metadata )
   {
      this.objects = [];

      if ( !metadata.observationTime )
         throw new Error( "Computing solar system ephemerides: missing observation time metadata." );

      let xephFiles = [];
      if ( this.searchDirMode  )
      {
         if ( this.searchDirPath.length > 0 )
         {
            xephFiles = searchDirectory( this.searchDirPath + "/*.xeph" );
            if ( xephFiles.length == 0 )
               console.writeln( "<end><cbr><br>* Custom XEPH Files: No ephemeris files were found on directory: <raw>" + this.searchDirPath + "</raw>" );
         }
         else
            console.writeln( "<end><cbr><br>* Custom XEPH Files: No search directory has been specified." );
      }
      else
      {
         if ( !this.xephFilePath1.isEmpty() )
            xephFiles.push( this.xephFilePath1 );
         if ( !this.xephFilePath2.isEmpty() )
            xephFiles.push( this.xephFilePath2 );
         if ( !this.xephFilePath3.isEmpty() )
            xephFiles.push( this.xephFilePath3 );
         if ( xephFiles.length == 0 )
            console.writeln( "<end><cbr><br>* Custom XEPH Files: No ephemeris files have been specified." );
      }

      let P = Catalog.newPosition( metadata );

      for ( let j = 0; j < xephFiles.length; ++j )
      {
         let xephFilePath = xephFiles[j];
         console.writeln( "<end><cbr><br>Searching ephemeris file: <raw>" + xephFilePath + "</raw>" );
         processEvents();

         let E = new EphemerisFile( xephFilePath );

         let jd1 = Math.calendarTimeToJD( E.startTime.toISOString() );
         let jd2 = Math.calendarTimeToJD( E.endTime.toISOString() );
         let jd = Math.calendarTimeToJD( P.TDB.toISOString() );

         if ( jd < jd1 || jd > jd2 )
         {
            console.criticalln( "<end><cbr>*** Error: Observation time out of range: <raw>" + xephFilePath + "</raw><br>" +
                                "Requested time ... " + P.TDB.toISOString() + " TDB<br>" +
                                "The ephemeris file covers the following time span:<br>" +
                                "Start time ....... " + E.startTime.toISOString() + " TDB<br>" +
                                "End time ......... " + E.endTime.toISOString() + " TDB" );
            if ( !Parameters.getBoolean( "non_interactive" ) )
               (new MessageBox( "<p>Observation time out of range.</p>" +
                                "<p>Requested time: " + P.TDB.toISOString() + " TDB</p>" +
                                "<p>The ephemeris file #" + idx.toString() + " covers the following time span:</p>" +
                                "<p>Start time: " + E.startTime.toISOString() + " TDB<br/>" +
                                "End time:   " + E.endTime.toISOString() + " TDB</p>",
                                TITLE, StdIcon.Error, StdButton.Ok )).execute();
            return;
         }

         let objectNames = [];

         if ( metadata.sourceImageWindow )
         {
            let A = E.visibleObjects( metadata.sourceImageWindow, P, this.magMax, this.magMin );
            for ( let i = 0; i < A.length; ++i )
            {
               let a = A[i];
               let objectName = a.objectId;
               if ( !objectName.isEmpty() )
                  objectName += ' ' + a.objectName; // numbered objects, e.g. '1 Ceres'
               else
                  objectName = a.objectName; // unnumbered asteroids and comets
               this.objects.push( new CatalogRecord( new Point( a.alpha, a.delta ), 0/*diameter*/, objectName, a.magnitude ) );
               objectNames.push( objectName );
            }
         }
         else
         {
            let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
            let bodies = E.objects;
            for ( let i = 0; i < bodies.length; ++i )
            {
               let b = bodies[i];
               let H = new EphemerisHandle( E, b.objectId, "SSB" );
               let V = P.apparentVisualMagnitude( H );
               if ( V === null
                  || (this.magMax == Catalog.NullMag || V <= this.magMax)
                  && (this.magMin == Catalog.NullMag || V >= this.magMin) )
               {
                  let q = F( P, H );
                  let posRD = new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) );
                  if ( metadata.insideImageBoundaries( posRD ) )
                  {
                     let objectName = b.objectId;
                     if ( !objectName.isEmpty() )
                        objectName += ' ' + b.objectName; // numbered objects, e.g. '1 Ceres'
                     else
                        objectName = b.objectName; // unnumbered asteroids and commets
                     this.objects.push( new CatalogRecord( posRD, 0/*diameter*/, objectName, V ) );
                     objectNames.push( objectName );
                  }
               }
            }
         }

         if ( objectNames.length > 0 )
            console.writeln( "<end><cbr><b>Visible bodies</b>: ", objectNames.join( ", " ) );
         else
            console.writeln( "<end><cbr>No visible bodies." );
      }
   }

   GetEditControls( parent )
   {
      return [ new CustomXEPHFilesControls( parent, this )
             , this.GetMagnitudeFilterControls( parent )[0] ];
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, "Name", null, null, "Magnitude"];
   }

   GetConstructor()
   {
      return "new CustomXEPHFiles()";
   }
};

CatalogRegistry.register( new CustomXEPHFiles );

// ----------------------------------------------------------------------------

/*
 * Catalog data stored as local CSV files.
 */
var LocalFileCatalog = class extends Catalog
{
   constructor( id, name, filename, compatibility = false )
   {
      super( id, name );

      if ( filename !== undefined )
      {
         if ( filename === null || filename.trim().isEmpty() )
            throw new Error( "LocalFileCatalog: Internal error: No catalog filename specified." );
         this.catalogPath = File.extractDrive( #__FILE__ ) + File.extractDirectory( #__FILE__ );
         if ( !this.catalogPath.endsWith( '/' ) )
            this.catalogPath += '/';
         this.catalogPath += filename.trim();
      }

      this.compatibility = compatibility;
   }

   Validate()
   {
      if ( !File.exists( this.catalogPath ) )
      {
         console.criticalln( "<end><cbr>*** Error: Unable to load local catalog file: <raw>" + this.catalogPath + "</raw>" );
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( "<p>Unable to load local catalog file:</p>" +
                             "<p>" + this.catalogPath + "</p>", TITLE, StdIcon.Error, StdButton.Ok )).execute();
         return false;
      }
      return true;
   }

   Load( metadata )
   {
      if ( typeof( this.catalogPath ) != "string" || this.catalogPath.isEmpty() )
         return false;

      if ( !metadata.observationTime )
         throw new Error( "Loading local catalog data: missing observation time metadata." );

      this.catalogLines = File.readLines( this.catalogPath, ReadTextOption.RemoveEmptyLines | ReadTextOption.TrimSpaces );
      if ( this.catalogLines.length < 2 )
         return false;

      let separator = ',';
      // Support for tab-separated old CustomCatalog text files.
      if ( this.compatibility )
         if ( this.catalogLines[0].indexOf( '\t' ) > 0 )
            separator = '\t';

      this.index = { count: 0, aux: {} };
      {
         let headers = this.catalogLines[0].split( separator );
         this.index.count = headers.length;
         for ( let i = 0; i < headers.length; ++i )
         {
            let header = headers[i].trim();
            // Header synonyms for compatibility with CustomCatalog text files.
            if ( this.compatibility )
               switch ( header.toLowerCase() )
               {
               case "name":
                  header = "id";
                  break;
               case "ra":
                  header = "alpha";
                  break;
               case "dec":
                  header = "delta";
                  break;
               case "magnitude":
                  header = "magnitude";
                  break;
               case "diameter":
                  header = "diameter";
                  break;
               }
            switch ( header )
            {
            case "id":
            case "alpha":
            case "delta":
            case "magnitude":
            case "diameter":
            case "axisRatio":
            case "posAngle":
               this.index[header] = i;
               break;
            default:
               this.index.aux[header] = i;
               break;
            }
         }
      }
      if ( this.index.id === undefined ||
           this.index.alpha === undefined ||
           this.index.delta === undefined )
         throw new Error( "Loading local catalog data: missing required header fields: " + this.catalogPath );

      let P = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      this.objects = [];
      for ( let i = 1; i < this.catalogLines.length; ++i )
      {
         let fields = this.catalogLines[i].split( separator );
         if ( fields.length < this.index.count )
            continue;
         if ( fields[this.index.alpha].trim().isEmpty() || fields[this.index.delta].trim().isEmpty() ) // ?!
            continue;

         let q = F( P, new StarPosition( parseFloat( fields[this.index.alpha] ), parseFloat( fields[this.index.delta] ) ) );
         let posRD = new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) );
         if ( metadata.insideImageBoundaries( posRD ) )
         {
            let magnitude = (this.index.magnitude !== undefined && !fields[this.index.magnitude].trim().isEmpty()) ?
                                 parseFloat( fields[this.index.magnitude] ) : undefined;
            if ( this.magMax === undefined || magnitude === undefined
              || this.magMax == Catalog.NullMag    || magnitude <= this.magMax )
            {
               let diameter = (this.index.diameter !== undefined && !fields[this.index.diameter].trim().isEmpty()) ?
                                    parseFloat( fields[this.index.diameter] )/60 : undefined;
               let axisRatio = (this.index.axisRatio !== undefined && !fields[this.index.axisRatio].trim().isEmpty()) ?
                                    parseFloat( fields[this.index.axisRatio] ) : undefined;
               let posAngle = (this.index.posAngle !== undefined && !fields[this.index.posAngle].trim().isEmpty()) ?
                                    parseFloat( fields[this.index.posAngle] ) : undefined;

               let record = new CatalogRecord( posRD, diameter, fields[this.index.id].trim(), magnitude, axisRatio, posAngle );

               // Optional standardized fields
               if ( magnitude !== undefined )
                  record["Magnitude"] = format( "%.2f", magnitude );
               if ( diameter !== undefined )
                  record["Diameter"] = format( "%.2f", diameter );

               // Additional fields
               for ( let j in this.index.aux )
               {
                  let value = fields[this.index.aux[j]].trim();
                  if ( !value.isEmpty() )
                     record[j] = value;
               }

               this.objects.push( record );
            }
         }
      }

      console.writeln( "<end><cbr><br><b>Catalog ", this.name, "</b>: ", this.objects.length, " of ", this.catalogLines.length-1, " objects" );
      return true;
   }

   GetEditControls( parent )
   {
      return [];
   }

   GetDefaultLabels()
   {
      return [null, null, null, null, "Name", null, null, "Common name"];
   }
};


// ----------------------------------------------------------------------------
// NEW
const CATALOGS_CONFIG_FILENAME = "catalogs-config.json";
let scriptFileDir = File.extractDirectory(#__FILE__); // built-in PSJR macro to get this current file's location at runtime 
let catalogsConfigJSON = scriptFileDir + "/" + CATALOGS_CONFIG_FILENAME;

if (File.exists(catalogsConfigJSON)) {
    console.writeln("Config file exists: " + catalogsConfigJSON);
} else {
    console.warningln("File not found: " + catalogsConfigJSON);
}
CatalogRegistry.loadCatalogsFromJSON(catalogsConfigJSON);

/*
 * Messier Catalog (local CSV file)
 */
var MessierCatalog = class extends LocalFileCatalog
{
   constructor()
   {
      super( "Messier", "Messier", "Messier.csv" );

      this.description = "Messier catalog (110 objects)";
      this.fields = [ "Name", "Coordinates", "Magnitude", "Diameter", "Common name", "NGC/IC", "PGC" ];
   }

   GetConstructor()
   {
      return "new MessierCatalog()";
   }
};

CatalogRegistry.register( new MessierCatalog );

// ----------------------------------------------------------------------------

/*
 * NGC-IC Catalog (local CSV file)
 */
var NGCICCatalog = class extends LocalFileCatalog
{
   constructor()
   {
      super( "NGC-IC", "NGC-IC", "NGC-IC.csv" );

      this.description = "NGC and IC catalogs (9933 objects)";
      this.fields = [ "Name", "Coordinates", "Magnitude", "Diameter", "Common name", "PGC", "PGC2", "Messier" ];
   }

   GetConstructor()
   {
      return "new NGCICCatalog()";
   }
};

CatalogRegistry.register( new NGCICCatalog );


// START ---------------------------- TEMPLATE CODE FOR NEW LOCAL FILE CATALOG LAYER

/*
 * Foo-Bar Catalog (local CSV file)
 */
/*
var FooBarCatalog = class extends LocalFileCatalog
{
   constructor()
   {
      super( "Foo-Bar", "Foo-Bar", "Foo-Bar.csv" ); // csv file path in script directory by default

      this.description = "Foo and Bar catalogs (1234 objects)";
      this.fields = [ "Name", "Coordinates", "Magnitude", "Diameter", "Common name", "PGC", "PGC2", "Messier" ]; // adjust custom fields as desired
   }

   GetConstructor()
   {
      return "new FooBarCatalog()";
   }
};

CatalogRegistry.register( new FooBarCatalog );
*/

// ---------------------------- END TEMPLATE CODE FOR NEW LOCAL FILE CATALOG LAYER

/*
 * Named Stars Catalog (local CSV file)
 */
var NamedStarsCatalog = class extends LocalFileCatalog
{
   constructor()
   {
      super( "NamedStars", "NamedStars", "NamedStars.csv" );

      this.description = "Named stars catalog (3671 objects)";
      this.fields = [ "Name", "Coordinates", "Magnitude", "Spectral type", "Common name", "HD", "HIP" ];
      this.filters = [ "V" ];
      this.magMin = Catalog.NullMag;
      this.magMax = Catalog.NullMag;

      this.properties.push( ["magMax", DataType.Double] );
   }

   GetConstructor()
   {
      return "new NamedStarsCatalog()";
   }

   GetEditControls( parent )
   {
      let magnitudeMax_Label = new Label( parent );
      magnitudeMax_Label.text = "Maximum magnitude:";
      magnitudeMax_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      magnitudeMax_Label.minWidth = parent.labelWidth1;

      let magnitudeMax_Edit = new Edit( parent );
      magnitudeMax_Edit.setFixedWidth( parent.editWidth );
      if ( this.magMax != Catalog.NullMag )
         magnitudeMax_Edit.text = format( "%.2f", this.magMax );
      magnitudeMax_Edit.toolTip = "<p>Draw only objects with magnitudes brighter than this value.<br/>" +
         "It can be empty to disable magnitude filtering.</p>";
      magnitudeMax_Edit.onTextUpdated = function( value )
      {
         if ( !value.trim().isEmpty() )
            this.dialog.activeFrame.object.catalog.magMax = parseFloat( value );
         else
            this.dialog.activeFrame.object.catalog.magMax = Catalog.NullMag;
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      let magnitudeSizer = new HorizontalSizer;
      magnitudeSizer.scaledSpacing = 4;
      magnitudeSizer.add( magnitudeMax_Label );
      magnitudeSizer.add( magnitudeMax_Edit );
      magnitudeSizer.addStretch();

      return [ magnitudeSizer ];
   }

   translateGreekLetters( name )
   {
      let result = name;
      for ( let i = 1; i <= 9; ++i )
      {
         let superindex = String.fromCharCode(
            [0x00B9, 0x00B2, 0x00B3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079][i-1] );
         let suffix = format( "%02d", i );
         result =                          result.replace(
            "alf" + suffix, '\u03b1' + superindex ).replace(
            "bet" + suffix, '\u03b2' + superindex ).replace(
            "gam" + suffix, '\u03b3' + superindex ).replace(
            "del" + suffix, '\u03b4' + superindex ).replace(
            "eps" + suffix, '\u03b5' + superindex ).replace(
            "zet" + suffix, '\u03b6' + superindex ).replace(
            "eta" + suffix, '\u03b7' + superindex ).replace(
            "tet" + suffix, '\u03b8' + superindex ).replace(
            "iot" + suffix, '\u03b9' + superindex ).replace(
            "kap" + suffix, '\u03ba' + superindex ).replace(
            "lam" + suffix, '\u03bb' + superindex ).replace(
            "mu." + suffix, '\u03bc' + superindex ).replace(
            "nu." + suffix, '\u03bd' + superindex ).replace(
            "ksi" + suffix, '\u03be' + superindex ).replace(
            "omi" + suffix, '\u03bf' + superindex ).replace(
            "pi." + suffix, '\u03c0' + superindex ).replace(
            "rho" + suffix, '\u03c1' + superindex ).replace(
            "sig" + suffix, '\u03c3' + superindex ).replace(
            "tau" + suffix, '\u03c4' + superindex ).replace(
            "ups" + suffix, '\u03c5' + superindex ).replace(
            "phi" + suffix, '\u03c6' + superindex ).replace(
            "chi" + suffix, '\u03c7' + superindex ).replace(
            "psi" + suffix, '\u03c8' + superindex ).replace(
            "ome" + suffix, '\u03c9' + superindex );
      }
      return            result.replace(
         /\balf\b/, '\u03b1' ).replace(
         /\bbet\b/, '\u03b2' ).replace(
         /\bgam\b/, '\u03b3' ).replace(
         /\bdel\b/, '\u03b4' ).replace(
         /\beps\b/, '\u03b5' ).replace(
         /\bzet\b/, '\u03b6' ).replace(
         /\beta\b/, '\u03b7' ).replace(
         /\btet\b/, '\u03b8' ).replace(
         /\bthe\b/, '\u03b8' ).replace(
         /\biot\b/, '\u03b9' ).replace(
         /\bkap\b/, '\u03ba' ).replace(
         /\blam\b/, '\u03bb' ).replace(
         /\bmu\./,  '\u03bc' ).replace(
         /\bnu\./,  '\u03bd' ).replace(
         /\bksi\b/, '\u03be' ).replace(
         /\bomi\b/, '\u03bf' ).replace(
         /\bpi\./,  '\u03c0' ).replace(
         /\brho\b/, '\u03c1' ).replace(
         /\bsig\b/, '\u03c3' ).replace(
         /\btau\b/, '\u03c4' ).replace(
         /\bups\b/, '\u03c5' ).replace(
         /\bphi\b/, '\u03c6' ).replace(
         /\bchi\b/, '\u03c7' ).replace(
         /\bkhi\b/, '\u03c7' ).replace(
         /\bpsi\b/, '\u03c8' ).replace(
         /\bome\b/, '\u03c9' );
   }
};

CatalogRegistry.register( new NamedStarsCatalog );

// ----------------------------------------------------------------------------

/*
 * Cache of Vizier service queries.
 */
var VizierCache = class
{
   queries = [];
   maxSize = 20;

   Add( center, fov, id, queryResult )
   {
      this.queries.push( {center: center, fov: fov, id: id, queryResult: queryResult} );
      if ( this.queries.length > this.maxSize )
         this.queries = this.queries.slice( 1 );
   }

   Get( center, fov, id )
   {
      for ( let i = 0; i < this.queries.length; ++i )
      {
         let q = this.queries[i];
         if ( q.id == id )
         {
            let dist = DMath.Distance( center, q.center );
            if ( dist + fov < q.fov )
            {
               this.queries.splice( i, 1 );
               this.queries.push( q );
               return q.queryResult;
            }
         }
      }
      return null;
   }

   Clear()
   {
      this.queries = [];
   }
};

var __vizier_cache__ = new VizierCache();

// ----------------------------------------------------------------------------

/*
 * Base class for all catalogs downloaded from online VizieR servers.
 */
var VizierCatalog = class extends CatalogWithMagnitudeFilters
{
   constructor( id, name )
   {
      super( id, name );

      this.position = null;
      this.catalogMagnitude = null;
      this.magMin = Catalog.NullMag;
      this.magMax = Catalog.NullMag;
      this.epoch = null;
      this.maxRecords = 200_000;
      this.searchExpansion = 1.2;
      this.maxFov = null;
   }

   Load( metadata, mirrorServer )
   {
      this.metadata = metadata;
      this.searchCenter = metadata.searchCenterCoordinates();
      this.searchRadius = metadata.SearchRadius();

      if ( this.metadata.observationTime )
      {
         this.position = Catalog.newPosition( this.metadata );
         this.placeFunction = Catalog.placeFunctionForReferenceSystem( this.metadata.referenceSystem );
         this.epoch = (this.metadata.observationTime - Math.calendarTimeToJD( 2000, 1, 1 ))/365.25 + 2000;
      }
      else
         this.epoch = null;

      let cacheid = this.GetCacheDescriptor();

      this.objects = __vizier_cache__.Get( this.searchCenter, this.searchRadius, cacheid );
      if ( this.objects !== null )
      {
         console.writeln( "<b>Catalog ", this.name, format( "</b>: Data retrieved from cache (%u objects).", this.objects.length ) );
      }
      else
      {
         /*
          * Increase the size of the query by a small factor in order to be
          * able to use it for similar images.
          */
         if ( !this.DoLoad( this.searchCenter, FMath.min( 180, this.searchRadius*this.searchExpansion ), mirrorServer ) )
         {
            this.objects = null;
            return;
         }
         let actualFOV = 0;
         for ( let i = 0; i < this.objects.length; ++i )
         {
            let dist = DMath.Distance( this.searchCenter, this.objects[i].posRD );
            if ( dist > actualFOV )
               actualFOV = dist;
         }

         __vizier_cache__.Add( this.searchCenter, actualFOV, cacheid, this.objects );
      }

      if ( this.reportObjectsInside && this.metadata.ref_I_G )
      {
         let insideObjects = 0;
         for ( let i = 0; i < this.objects.length; ++i )
            if ( this.objects[i] )
               if ( this.metadata.insideImageBoundariesFast( this.objects[i].posRD ) )
                  ++insideObjects;
         console.writeln( "<b>Catalog ", this.name, "</b>: ", insideObjects, " objects inside the image." );
      }
      else
         console.writeln( "<b>Catalog ", this.name, "</b>: ", this.objects.length, " objects." );
   }

   #removeDownloadedFile()
   {
      try
      {
         if ( typeof( this.outputFileName ) == "string" )
            if ( !this.outputFileName.isEmpty() )
               if ( File.exists( this.outputFileName ) )
                  File.remove( this.outputFileName );
      }
      catch ( x )
      {
      }
      finally
      {
         this.outputFileName = null;
      }
   }

   DoLoad( center, fov, mirrorServer )
   {
      if ( this.metadata.observationTime )
         this.epoch = (this.metadata.observationTime - Math.calendarTimeToJD( 2000, 1, 1 ))/365.25 + 2000;
      else
         this.epoch = null;

      this.objects = [];
      this.bounds = null;

      let url = this.UrlBuilder( center, fov, mirrorServer );

      this.outputFileName = File.uniqueFileName( File.systemTempDirectory, 10, "VizierQueryResult-", ".tsv" );

      console.writeln( "<end>\n<b>Downloading Vizier data</b>:" );
      console.writeln( "<raw>" + url + "</raw>" );
      let consoleAbort = console.abortEnabled;
      console.abortEnabled = true;
      console.show();

      // Send request
      let download = new FileDownload( url, this.outputFileName );
      try
      {
         download.perform();
      }
      catch ( e )
      {
         console.criticalln( "<end><cbr>*** Error: " + e.toString() );
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( e.toString(), TITLE, StdIcon.Error, StdButton.Ok )).execute();
      }

      console.abortEnabled = consoleAbort;
      //console.hide();

      if ( !download.ok )
      {
         this.#removeDownloadedFile();
         return false;
      }

      let catalogLines = File.readLines( this.outputFileName, ReadTextOption.RemoveEmptyLines );
      this.#removeDownloadedFile();
      if ( catalogLines.length < 20 )
      {
         // Vizier always returns at least 20 comment lines
         console.criticalln( "<end><cbr>*** Error: There has been an unknown error in the catalog server: too short response." );
         return false;
      }

      try
      {
         let querySize = 0;
         for ( let i = 0; i < catalogLines.length; ++i )
         {
            let line = catalogLines[i];
            if ( line.isEmpty() || line.charAt( 0 ) == "#" ) //comment
               continue;
            let tokens = line.split( "|" );
            let object = this.ParseRecord( tokens );
            if ( object
              && object.posRD.x >= 0
              && object.posRD.x <= 360
              && object.posRD.y >= -90
              && object.posRD.y <= 90 )
            {
               this.objects.push( object );
               if ( this.bounds )
                  this.bounds = this.bounds.union( object.posRD.x, object.posRD.y, object.posRD.x, object.posRD.y );
               else
                  this.bounds = new Rect( object.posRD.x, object.posRD.y, object.posRD.x, object.posRD.y );
            }
            ++querySize;
            // processEvents();
            // if ( console.abortRequested )
            //    throw new Error( "<* abort *>" );
         }

         if ( querySize > this.maxRecords - 100 )
            console.warningln( "<end><cbr>** Warning: The server has returned an incomplete query. " +
                                 "Consider reducing the value of the magnitude filter." );
      }
      catch ( e )
      {
         console.criticalln( "<end><cbr>*** Error: " + e.toString() );
         if ( !Parameters.getBoolean( "non_interactive" ) )
            new MessageBox( e.toString(), TITLE, StdIcon.Error, StdButton.Ok ).execute();
         return false;
      }

      if ( typeof( this.PostProcessObjects ) == "function" )
         this.PostProcessObjects( this.objects );

      return true;
   }

   GetCacheDescriptor()
   {
      let filter = this.magnitudeFilter ? this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) : "";
      if ( this.epoch === null )
         return format( "%ls&%ls&R=%ls", this.name, filter, this.metadata.referenceSystem );
      return format( "%ls&e=%.2f%ls&R=%ls", this.name, this.epoch, filter, this.metadata.referenceSystem );
   }

   CreateMagFilter( field, min, max )
   {
      if ( min != Catalog.NullMag && max != Catalog.NullMag )
         return "&" + field + format( "=%g..%g", min, max );
      if ( max != Catalog.NullMag )
         return "&" + field + format( "=<%g", max );
      if ( min != Catalog.NullMag )
         return "&" + field + format( "=>%g", min );
      return "";
   }

   Validate()
   {
      if ( this.catalogMagnitude !== null )
         if ( this.magMin != Catalog.NullMag && this.magMax != Catalog.NullMag )
            if ( this.magMin > this.magMax )
            {
               console.criticalln( "<end><cbr>*** Error: Invalid magnitude filter: The minimum cannot be greater than the maximum." );
               if ( !Parameters.getBoolean( "non_interactive" ) )
                  (new MessageBox( "Invalid magnitude filter: The minimum cannot be greater than the maximum.", TITLE, StdIcon.Error, StdButton.Ok )).execute();
               return false;
            }
      return true;
   }

   GetEditControls( parent )
   {
      return this.filters ? this.GetMagnitudeFilterControls( parent ) : [];
   }

   /*
    * Removes objects that are in the same position with the given tolerance.
    */
   RemoveDuplicates( objects, tolerance )
   {
      objects.sort(  function( a, b )
                     {
                        return (a.posRD.y < b.posRD.y) ? -1 : ((a.posRD.y > b.posRD.y) ? 1 : 0);
                     } );

      let duplicate = 0;
      for ( let i = 0; i < objects.length; ++i )
      {
         let a = objects[i];
         let posRD = a.posRD;
         let cosy = DMath.cos( posRD.y );
         for ( let j = i + 1; j < objects.length; )
         {
            let b = objects[j];
            let dy = FMath.abs( b.posRD.y - posRD.y );
            if ( dy > tolerance )
               break;
            let dx = FMath.abs( b.posRD.x - posRD.x )*cosy;
            if ( dx < tolerance )
            {
               if ( a.magnitude > b.magnitude )
                  objects[i] = b;
               objects.splice( j, 1 );
               ++duplicate;
            }
            else
               ++j;
         }
      }
      console.writeln( format( "<end><cbr>Removed %d duplicate objects.", duplicate ) );
   }

   static mirrors = [
      { address:"https://vizier.cds.unistra.fr/"          , name:"VizieR at CDS: Strasbourg, France" },
      { address:"http://vizier.nao.ac.jp/vizier/"         , name:"ADAC: Tokyo, Japan" },
      { address:"http://vizier.hia.nrc.ca/vizier/"        , name:"CADC: Victoria, Canada" },
      { address:"http://vizier.ast.cam.ac.uk/vizier/"     , name:"Cambridge: UK" },
      { address:"https://vizier.iucaa.in/vizier/"         , name:"IUCAA: Pune, India" },
      { address:"https://vizier.inasan.ru/vizier/"        , name:"INASAN: Moscow, Russia" },
      { address:"http://vizier.china-vo.org/vizier/"      , name:"NAOC: Beijng, China" },
      { address:"https://vizier.cfa.harvard.edu/vizier/"  , name:"CFA Harvard: Cambridge, USA" },
      { address:"http://www.ukirt.hawaii.edu/vizier/"     , name:"JAC: Hilo, Hawaii, USA" },
      { address:"http://vizier.idia.ac.za/vizier/"        , name:"IDIA: IDIA, South Africa" }
   ];
};

// ----------------------------------------------------------------------------

/*
 * Bright Star Catalog Catalog
 */
var HR_Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "BrightStars", "Bright Stars" );

      this.description = "Bright Star Catalog, 5th ed. (9110 stars. Hoffleit+ 1991)";
      this.catalogMagnitude = 7;
      this.magMin = Catalog.NullMag;
      this.magMax = 7;
      this.fields = [ "Name", "Coordinates", "HR", "HD", "DM", "SAO", "Vmag", "B-V", "U-B", "R-I", "SpType" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = ["Vmag"];
      this.magnitudeFilter = "Vmag";
   }

   GetConstructor()
   {
      return "new HR_Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=V/50/catalog&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=_RAJ,_DEJ&-out=pmRA&-out=pmDE&-out=Name&-out=HR&-out=HD&-out=DM&-out=SAO" +
         "&-out=Vmag&-out=B-V&-out=U-B&-out=R-I&-out=SpType" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 14 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[2] ) * 1000 * FMath.cos( FMath.rad( y ) ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[3] ) * 1000; // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[4].trim();
         if ( name === null || name.isEmpty() )
            name = "HR" + tokens[5].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[9] ) );
         record["HR"] = "HR"+tokens[5].trim();
         record["HD"] = "HD"+tokens[6].trim();
         record["DM"] = tokens[7].trim();
         record["SAO"] = "SAO"+tokens[8].trim();
         record["Vmag"] = tokens[9].trim();
         record["B-V"] = tokens[10].trim();
         record["U-B"] = tokens[11].trim();
         record["R-I"] = tokens[12].trim();
         record["SpType"] = tokens[13].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );

         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new HR_Catalog );

// ----------------------------------------------------------------------------

/*
 * HD Cross-Reference catalog
 */
var HDCrossRefCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "HD_CrossReference", "HD Cross-Reference" );

      this.description = "HD Cross-Reference (All-Sky Compiled Catalogue of 2.5 million stars (ASCC-2.5 V3)) (2,501,313 stars. Kharchenko+ 2009)";

      this.catalogMagnitude = 14;
      this.magMin = Catalog.NullMag;
      this.magMax = 14;
      this.fields = [ "Name", "Coordinates", "Vmag", "ASCC" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = ["Vmag"];
      this.magnitudeFilter = "Vmag";
   }

   GetConstructor()
   {
      return "new HDCrossRefCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/280B/ascc&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out.add=recno&-out=_RA.icrs,_DE.icrs&-out=pmRA&-out=pmDE&-out=Vmag&-out=HD&-out=ASCC" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 7 && parseFloat( tokens[0] ) > 0 && parseInt( tokens[5] ) < 99999 && parseInt( tokens[6] ) > 0 )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[3] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "HD" + tokens[6].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[5] ) );
         record["Vmag"] = tokens[5].trim();
         if ( tokens.length > 7 )
            record["ASCC"] = tokens[7].trim();
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new HDCrossRefCatalog );

// ----------------------------------------------------------------------------

/*
 * Hipparcos catalog
 */
var HipparcosCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "Hipparcos", "Hipparcos" );

      this.description = "Hipparcos Main catalog (118,218 stars)";

      this.catalogMagnitude = 14;

      this.fields = [ "Name", "Coordinates", "Magnitude", "BT magnitude", "VT magnitude", "B-V color", "V-I index", "Spectral type", "Parallax" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "VTmag", "BTmag" ];
      this.magnitudeFilter = "VTmag";
   }

   GetConstructor()
   {
      return "new HipparcosCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/239/hip_main&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.eq=J2000&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out.add=_RAJ,_DEJ&-out=HIP&-out=Vmag&-out=Plx&-out=pmRA&-out=pmDE&-out=BTmag&-out=VTmag&-out=B-V&-out=V-I&-out=SpType" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 12 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[5] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[6] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "HIP" + tokens[2].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[3] ) );
         record["BT magnitude"]=tokens[7].trim();
         record["VT magnitude"]=tokens[8].trim();
         record["B-V color"]=tokens[9].trim();
         record["V-I index"]=tokens[10].trim();
         record["Spectral type"]=tokens[11].trim();
         record["Parallax"]=tokens[4].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );

         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new HipparcosCatalog );

// ----------------------------------------------------------------------------

/*
 * Tycho-2 catalog
 */
var TychoCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "TYCHO-2", "TYCHO-2" );

      this.description = "Tycho-2 catalog (2,539,913 stars)";

      this.catalogMagnitude = 16;

      this.fields = [ "Name", "Coordinates", "Magnitude", "VTmag", "BTmag", "HIP", "Vmag", "Bmag", "B-V index" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "VTmag", "BTmag" ];
      this.magnitudeFilter = "VTmag";
   }

   GetConstructor()
   {
      return "new TychoCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/259/tyc2&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=TYC1&-out=TYC2&-out=TYC3&-out=RAmdeg&-out=DEmdeg&-out=pmRA&-out=pmDE&-out=VTmag&-out=BTmag&-out=HIP" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 5 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[3] );
         let y = parseFloat( tokens[4] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[5] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[6] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "TYC" + tokens[0].trim() + "-" + tokens[1].trim() + "-" + tokens[2].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[7] ) );
         record.VTmag = tokens[7];
         record.BTmag = tokens[8];
         if ( tokens[9] )
            record.HIP = "HIP" + tokens[9].trim();
         if ( !tokens[7].trim().isEmpty() && !tokens[8].trim().isEmpty() )
         {
            let VT = parseFloat( tokens[7] );
            let BT = parseFloat( tokens[8] );
            let V = VT - 0.090*(BT - VT);
            let BV = 0.850*(BT - VT);
            let B = BV + V;
            record.Vmag = format( "%.3f", V );
            record.Bmag = format( "%.3f", B );
            record["B-V index"] = format( "%.3f", BV );
         }
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );

         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new TychoCatalog );

// ----------------------------------------------------------------------------

/*
 * WDS catalog
 */
var WDSCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "WDS", "WDS" );

      this.description = "The Washington Visual Double Star Catalog (Mason+ 2001-2020) (156,557 objects)";

      this.catalogMagnitude = 14;
      this.magMin = Catalog.NullMag;
      this.magMax = 25;
      this.fields = [ "Name", "Coordinates", "Components", "PositionAngle", "Separation", "Mag1", "Mag2", "SpType" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = ["Mag1"];
      this.magnitudeFilter = "Mag1";
   }

   GetConstructor()
   {
      return "new WDSCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=B/wds/wds&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out.add=recno&-out=WDS&-out=Comp&-out=_RA.icrs,_DE.icrs&-out=pmRA1&-out=pmDE1&-out=pa2&-out=sep2&-out=mag1&-out=mag2&-out=SpType" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 12 && parseInt( tokens[0] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[3] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[4] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[5] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[6] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "WDS" + tokens[1].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[9] ) );
         record["Components"] = tokens[2].trim();
         record["PositionAngle"] = tokens[7].trim();
         record["Separation"] = tokens[8].trim();
         record["Mag1"] = tokens[9].trim();
         record["Mag2"] = tokens[10].trim();
         record["SpType"] = tokens[11].trim();
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new WDSCatalog );

// ----------------------------------------------------------------------------

/*
 * PGC catalog
 */
var PGCCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "PGC", "PGC" );

      this.description = "PGC HYPERLEDA I catalog of galaxies (Paturel+, 2003) (983,261 galaxies)";

      this.fields = [ "Name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new PGCCatalog()";
   }

   UrlBuilder(center, fov, mirrorServer)
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/237/pgc&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=PGC&-out=RAJ2000&-out=DEJ2000&-out=logD25&-out=logR25&-out=PA";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 6 && parseFloat( tokens[0] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[1] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[2] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let diameter = tokens[3].trim().isEmpty() ? undefined : FMath.pow10( parseFloat( tokens[3] ) )/60/10;
         let axisRatio = tokens[4].trim().isEmpty() ? undefined : FMath.pow10( parseFloat( tokens[4] ) );
         let posAngle = tokens[5].trim().isEmpty() ? undefined : parseFloat( tokens[5] );
         return new CatalogRecord( new Point( x, y ), diameter, "PGC" + tokens[0].trim(),
                                   undefined/*magnitude*/, axisRatio, posAngle );
      }

      return null;
   }
};

CatalogRegistry.register( new PGCCatalog );

// ----------------------------------------------------------------------------

/*
 * Million Quasars (Milliquas) catalog
 */
var MilliquasCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "Milliquas", "Milliquas" );

      this.description = "The Million Quasars (Milliquas) catalogue, version 7.2 (Flesch, 2021) (1,573,824 objects)";

      this.fields = [ "Name", "Coordinates", "Type", "Rmag", "Bmag", "Redshift" ];
   }

   GetConstructor()
   {
      return "new MilliquasCatalog()";
   }

   UrlBuilder(center, fov, mirrorServer)
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/290/catalog&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=Name&-out=RAJ2000&-out=DEJ2000&-out=Type&-out=Rmag&-out=Bmag&-out=z";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 7 && !tokens[0].isEmpty() )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[0].trim();
         if ( name.startsWith( 'J' ) ) // JHHMMSS.SS+DDMMSS.S
            if ( name[1] == '0' || name[1] == '1' || name[1] == '2' )
               if ( name[10] == '+' || name[10] == '-' )
                  name = "MQ " + name;
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name );
         record["Type"] = tokens[3].trim();
         record["Rmag"] = tokens[4].trim();
         record["Bmag"] = tokens[5].trim();
         record["Redshift"] = tokens[6].trim();
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new MilliquasCatalog );

// ----------------------------------------------------------------------------

/*
 * LBN catalog
 */
var LBNCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "LBN", "LBN" );

      this.description = "Lynds' Catalogue of Bright Nebulae (Lynds, 1965) (1125 objects)";

      this.fields = [ "Name", "Other name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new LBNCatalog()";
   }

   UrlBuilder(center, fov, mirrorServer)
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/9/catalog&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=recno&-out=Seq&-out=Diam1&-out=Name&-out=_RA.icrs&-out=_DE.icrs";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 6 && parseInt( tokens[0] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[4] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[5] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let diameter = parseFloat( tokens[2] )/60;
         let record = new CatalogRecord( new Point( x, y ), diameter, "LBN " + tokens[1].trim() );
         record["Other name"] = tokens[3].trim();
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new LBNCatalog );

// ----------------------------------------------------------------------------

/*
 * LDN catalog
 */
var LDNCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "LDN", "LDN" );

      this.description = "Lynds' Catalogue of Dark Nebulae (Lynds, 1962) (1791 objects)";

      this.fields = [ "Name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new LDNCatalog()";
   }

   UrlBuilder(center, fov, mirrorServer)
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/7A/ldn&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=recno&-out=LDN&-out=Area&-out=_RA.icrs&-out=_DE.icrs";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 5 && parseInt( tokens[0] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[3] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[4] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let diameter = FMath.sqrt( parseFloat( tokens[2] ) );
         return new CatalogRecord( new Point( x, y ), diameter, "LDN " + tokens[1].trim() );
      }

      return null;
   }
};

CatalogRegistry.register( new LDNCatalog );

// ----------------------------------------------------------------------------

/*
 * CGPN catalog
 */
var CGPNCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "CGPN", "CGPN" );

      this.description = "Catalogue of Galactic Planetary Nebulae (Kohoutek, 2001) (1759 objects)";

      this.fields = [ "Name", "Other name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new CGPNCatalog()";
   }

   UrlBuilder(center, fov, mirrorServer)
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=IV/24/table4&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=recno&-out=PK&-out=Name&-out=RAJ2000&-out=DEJ2000";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 5 && parseInt( tokens[0] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[3] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[4] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, "PK" + tokens[1].trim() );
         record["Other name"] = tokens[2].trim();
         return record;
      }

      return null;
   }

   PostProcessObjects( objects )
   {
      /*
       * Table 4 of the CGPN contains multiple entries for most objects. Remove
       * all records with duplicate names keeping only the last one, which
       * usually provides the most accurate coordinates.
       */
      let o = objects.map( (x) => x ); // deep copy
      o.sort(
         function( a, b )
         {
            return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0);
         } );
      o = o.filter(
         function( element, index, array )
         {
            return index == array.length-1 || element.name.isEmpty() || element.name != array[index+1].name;
         } );

      // Mutate the function argument array.
      objects.length = 0;
      for ( let i = 0; i < o.length; ++i )
         objects.push( o[i] );
   }
};

CatalogRegistry.register( new CGPNCatalog );

// ----------------------------------------------------------------------------

/*
 * PPMX catalog
 */
var PPMXCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "PPMX", "PPMX" );

      this.description = "PPMX catalog";

      this.catalogMagnitude = 15;
      this.magMin = Catalog.NullMag;
      this.magMax = 15;
      this.fields = [ "Name", "Coordinates", "Cmag", "Rmag", "Bmag", "Vmag", "Jmag", "Hmag", "Kmag" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = [ "Cmag", "Rmag", "Bmag", "Vmag", "Jmag", "Hmag", "Kmag" ];
      this.magnitudeFilter = "Vmag";
      this.maxFov = 60;
   }

   GetConstructor()
   {
      return "new PPMXCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/312/sample&-c=" +
         format( "%f %f", center.x, center.y ) +
         //"&-c.r=" + format( "%f",fov ) +
         "&-c.bd=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=PPMX&-out=RAJ2000&-out=DEJ2000&-out=pmRA&-out=pmDE&-out=Cmag&-out=Rmag&-out=Bmag&-out=Vmag&-out=Jmag&-out=Hmag&-out=Kmag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length>=12 && parseFloat( tokens[1] )>0 ) {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[3] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, tokens[0].trim(), parseFloat(tokens[6]) );
         record["Cmag"] = tokens[5].trim();
         record["Rmag"] = tokens[6].trim();
         record["Bmag"] = tokens[7].trim();
         record["Vmag"] = tokens[8].trim();
         record["Jmag"] = tokens[9].trim();
         record["Hmag"] = tokens[10].trim();
         record["Kmag"] = tokens[11].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new PPMXCatalog );

// ----------------------------------------------------------------------------

/*
 * PPMXL catalog
 */
var PPMXLCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "PPMXL", "PPMXL" );

      this.description = "PPMXL catalog (910,469,430 objects)";

      this.catalogMagnitude = 20;
      this.magMin = Catalog.NullMag;
      this.magMax = 15;
      this.fields = [ "Name", "Coordinates", "Jmag", "Hmag", "Kmag", "b1mag", "b2mag", "r1mag", "r2mag", "imag" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = [ "Jmag", "Hmag", "Kmag", "b1mag", "b2mag", "r1mag", "r2mag", "imag" ];
      this.magnitudeFilter = "r1mag";
      this.maxFov = 45;
   }

   GetConstructor()
   {
      return "new PPMXLCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/317&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=PPMXL&-out=RAJ2000&-out=DEJ2000&-out=pmRA&-out=pmDE" +
         "&-out=Jmag&-out=Hmag&-out=Kmag&-out=b1mag&-out=b2mag&-out=r1mag&-out=r2mag&-out=imag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 13 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[3] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, tokens[0].trim(), parseFloat( tokens[10] ) );
         record.Jmag = tokens[5].trim();
         record.Hmag = tokens[6].trim();
         record.Kmag = tokens[7].trim();
         record.b1mag = tokens[8].trim();
         record.b2mag = tokens[9].trim();
         record.r1mag = tokens[10].trim();
         record.r2mag = tokens[11].trim();
         record.imag = tokens[12].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new PPMXLCatalog );

// ----------------------------------------------------------------------------

/*
 * USNO-B1 catalog
 */
var USNOB1Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "USNO-B1", "USNO-B1" );

      this.description = "USNO-B1.0 catalog (1,045,175,762 objects)";

      this.catalogMagnitude = 20;
      this.magMax = 15;
      this.fields = [ "Name", "Coordinates", "B1mag", "B2mag", "R1mag", "R2mag", "Imag" ];

      this.properties.push( ["magMin",DataType.Double] );
      this.properties.push( ["magMax",DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "B1mag", "B2mag", "R1mag", "R2mag", "Imag" ];
      this.magnitudeFilter = "R1mag";
      this.maxFov = 45;
   }

   GetConstructor()
   {
      return "new USNOB1Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/284/out&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=USNO-B1.0&-out=RAJ2000&-out=DEJ2000&-out=pmRA&-out=pmDE" +
         "&-out=B1mag&-out=B2mag&-out=R1mag&-out=R2mag&-out=Imag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 8 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[3] ) * FMath.cos( FMath.rad( y ) ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, "USNO "+tokens[0].trim(), parseFloat( tokens[7] ) );
         record.B1mag = tokens[5].trim();
         record.B2mag = tokens[6].trim();
         record.R1mag = tokens[7].trim();
         if ( tokens.length > 8 ) record.R2mag = tokens[8].trim();
         if ( tokens.length > 9 ) record.Imag = tokens[9].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new USNOB1Catalog );

// ----------------------------------------------------------------------------

/*
 * UCAC3 catalog
 */
var UCAC3Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "UCAC3", "UCAC3" );

      this.description = "UCAC3 catalog (100,765,502 objects)";

      this.catalogMagnitude = 15;
      this.magMax = 15;
      this.fields = [ "Name", "Coordinates", "Magnitude", "f.mag", "a.mag", "Jmag", "Hmag", "Kmag", "Bmag", "R2mag", "Imag" ];

      this.properties.push( ["magMin",DataType.Double] );
      this.properties.push( ["magMax",DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = [ "f.mag", "a.mag", "Jmag", "Hmag", "Kmag", "Bmag", "R2mag", "Imag" ];
      this.magnitudeFilter = "f.mag";
      this.maxFov = 45;
   }

   GetConstructor()
   {
      return "new UCAC3Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=I/315/out&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=3UC&-out=RAJ2000&-out=DEJ2000&-out=pmRA&-out=pmDE" +
         "&-out=f.mag&-out=a.mag&-out=Jmag&-out=Hmag&-out=Kmag&-out=Bmag&-out=R2mag&-out=Imag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 6 && parseFloat( tokens[0] ) > 0)
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[3] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, "3UCAC" + tokens[0].trim(), parseFloat( tokens[5] ) );
         record["f.mag"] = tokens[5].trim();
         if ( tokens.length >  6 ) record["a.mag"] = tokens[6].trim();
         if ( tokens.length >  7 ) record.Jmag = tokens[7].trim();
         if ( tokens.length >  8 ) record.Hmag = tokens[8].trim();
         if ( tokens.length >  9 ) record.Kmag = tokens[9].trim();
         if ( tokens.length > 10 ) record.Bmag = tokens[10].trim();
         if ( tokens.length > 11 ) record.R2mag = tokens[11].trim();
         if ( tokens.length > 12 ) record.Imag = tokens[12].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new UCAC3Catalog );

// ----------------------------------------------------------------------------

/*
 * VdB catalog
 */
var VdBCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "VdB", "VdB" );

      this.description = "Catalog of Reflection Nebulae - Van den Bergh (159 nebulae)";

      this.catalogMagnitude = 10.5;

      this.fields = [ "Name", "Coordinates", "Magnitude", "DM code", "Type", "Surface bright.", "Spectral type" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = [ "Vmag" ];
      this.magnitudeFilter = "Vmag";
   }

   GetConstructor()
   {
      return "new VdBCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/21/catalog&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.eq=J2000&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=_RA&-out=_DE&-out=VdB&-out=DM&-out=Vmag&-out=SpType&-out=Type&-out=SurfBr&-out=BRadMax&-out=RRadMax" +
         this.CreateMagFilter( "Vmag", this.magMin, this.magMax );
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 10 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "VdB" + tokens[2].trim();
         let radBlue =  parseFloat( tokens[8] );
         let radRed =  parseFloat( tokens[9] );
         let radius = 0; // in arcmin
         if ( radBlue && radRed )
            radius = FMath.max( radBlue, radRed );
         else if ( radRed )
            radius = radRed;
         else if ( radBlue )
            radius = radBlue;
         let record = new CatalogRecord( new Point( x, y ), radius*2/60, name, parseFloat( tokens[4] ) );
         record["DM code"] = tokens[3].trim();
         record["Type"] = tokens[6].trim();
         record["Surface brightness"] = tokens[7].trim();
         record["Spectral type"] = tokens[5].trim();
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new VdBCatalog );

// ----------------------------------------------------------------------------

/*
 * Sharpless catalog
 */
var SharplessCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "Sharpless", "Sharpless" );

      this.description = "Catalog of HII Regions - Sharpless (313 nebulae)";

      this.fields = [ "Name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new SharplessCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/20/catalog&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.eq=J2000&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=_RAJ,_DEJ&-out=Sh2&-out=Diam";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 4 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "Sh2-" + tokens[2].trim();
         let diam =  parseFloat( tokens[3] );
         if ( !diam )
            diam = 0;
         let record = new CatalogRecord( new Point( x, y ), diam/60, name );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new SharplessCatalog );

// ----------------------------------------------------------------------------

/*
 * Barnard catalog
 */
var BarnardCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "Barnard", "Barnard" );

      this.description = "Barnard's Catalog of Dark Objects in the Sky (349 objects)";

      this.fields = [ "Name", "Coordinates" ];
   }

   GetConstructor()
   {
      return "new BarnardCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      return mirrorServer + "viz-bin/asu-tsv?-source=VII/220A/barnard&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.eq=J2000&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=_RAJ,_DEJ&-out=Barn&-out=Diam";
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 4 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = "B" + tokens[2].trim();
         let diam =  parseFloat( tokens[3] );
         if ( !diam )
            diam = 0;
         let record = new CatalogRecord( new Point( x, y ), diam/60, name );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new BarnardCatalog );

// ----------------------------------------------------------------------------

/*
 * B-V White Balance Stars from NOMAD-1
 * Hacked by Troy Piggins from the Hipparcos function above.
 */
var BVCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "NOMAD-1", "NOMAD-1 B-V WB" );

      this.description = "NOMAD-1 star catalog with B-V filtering for white balance";

      this.catalogMagnitude = 14;
      this.bvMin = 0.6;
      this.bvMax = 0.7;
      this.vrMin = 0.2;
      this.vrMax = 0.6;

      this.fields = [ "Name", "Coordinates", "Vmag", "Bmag", "Rmag", "B-V index", "V-R index" ];
      this.filters = [ "Vmag", "Bmag", "Rmag" ];
      this.magnitudeFilter = "Vmag";
      this.maxFov = 45;

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["bvMin", DataType.Double] );
      this.properties.push( ["bvMax", DataType.Double] );
      this.properties.push( ["vrMin", DataType.Double] );
      this.properties.push( ["vrMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );
   }

   GetConstructor()
   {
      return "new BVCatalog()";
   }

   GetEditControls( parent )
   {
      let controls = super.GetEditControls( parent );

      // B-V filter
      this.bv_Label = new Label( parent );
      this.bv_Label.text = "B-V filter:";
      this.bv_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      this.bv_Label.minWidth = parent.labelWidth1;

      this.bvMin_Edit = new Edit( parent );
      this.bvMin_Edit.setFixedWidth( parent.editWidth );
      if ( this.bvMin != Catalog.NullMag )
         this.bvMin_Edit.text = format( "%g", this.bvMin );
      this.bvMin_Edit.toolTip = "<p>Draw only objects with a B-V index greater than this value.<br/>" +
         "It can be empty.</p>";
      this.bvMin_Edit.onTextUpdated = function( value )
      {
         this.dialog.activeFrame.object.catalog.bvMin = value.trim().isEmpty() ? Catalog.NullMag : parseFloat( value );
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      this.bvMax_Edit = new Edit( parent );
      this.bvMax_Edit.setFixedWidth( parent.editWidth );
      if ( this.bvMax != Catalog.NullMag )
         this.bvMax_Edit.text = format( "%g", this.bvMax );
      this.bvMax_Edit.toolTip = "<p>Draw only objects with a B-V index lower than this value.<br />" +
         "It can be empty.</p>";
      this.bvMax_Edit.onTextUpdated = function( value )
      {
         this.dialog.activeFrame.object.catalog.bvMax = value.trim().isEmpty() ? Catalog.NullMag : parseFloat( value );
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      this.bvSeparator_Label = new Label( parent );
      this.bvSeparator_Label.text = " - ";

      // V-R filter
      this.vr_Label = new Label( parent );
      this.vr_Label.text = "V-R filter:";
      this.vr_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;

      this.vrMin_Edit = new Edit( parent );
      this.vrMin_Edit.setFixedWidth( parent.editWidth );
      if ( this.vrMin != Catalog.NullMag )
         this.vrMin_Edit.text = format( "%g", this.vrMin );
      this.vrMin_Edit.toolTip = "<p>Draw only objects with a V-R index greater than this value.<br/>" +
         "It can be empty.</p>";
      this.vrMin_Edit.onTextUpdated = function( value )
      {
         this.dialog.activeFrame.object.catalog.vrMin = value.trim().isEmpty() ? Catalog.NullMag : parseFloat( value );
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      this.vrMax_Edit = new Edit( parent );
      this.vrMax_Edit.setFixedWidth( parent.editWidth );
      if ( this.vrMax != Catalog.NullMag )
         this.vrMax_Edit.text = format( "%g", this.vrMax);
      this.vrMax_Edit.toolTip = "<p>Draw only objects with a V-R index lower than this value.<br />" +
         "It can be empty.</p>";
      this.vrMax_Edit.onTextUpdated = function( value )
      {
         this.dialog.activeFrame.object.catalog.vrMax = value.trim().isEmpty() ? Catalog.NullMag : parseFloat( value );
         this.dialog.activeFrame.object.catalog.bounds = null;
      };

      this.vrSeparator_Label = new Label( parent );
      this.vrSeparator_Label.text = " - ";

      let bvSizer = new HorizontalSizer;
      bvSizer.scaledSpacing = 4;
      bvSizer.add( this.bv_Label );
      bvSizer.add( this.bvMin_Edit );
      bvSizer.add( this.bvSeparator_Label );
      bvSizer.add( this.bvMax_Edit );
      bvSizer.addSpacing( 4 );
      bvSizer.add( this.vr_Label );
      bvSizer.add( this.vrMin_Edit );
      bvSizer.add( this.vrSeparator_Label );
      bvSizer.add( this.vrMax_Edit );
      bvSizer.addStretch();
      bvSizer.setAlignment( this.bvSeparator_Label, Alignment.Center );
      bvSizer.setAlignment( this.vrSeparator_Label, Alignment.Center );

      controls.push( bvSizer );
      return controls;
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=I/297&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.eq=J2000&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out.add=_RAJ,_DEJ&-out=NOMAD1&-out=Vmag&-out=Bmag&-out=Rmag&-out=pmRA&-out=pmDE&-out=R" +
         this.CreateMagFilter( this.magnitudeFilter,
                               (this.magMin == Catalog.NullMag) ? -5 : this.magMin,
                               (this.magMax == Catalog.NullMag) ? 25 : this.magMax );
      if ( this.magnitudeFilter != "Vmag" )
         url += this.CreateMagFilter( "Vmag", -5, 25 );
      if ( this.magnitudeFilter != "Bmag" )
         url += this.CreateMagFilter( "Bmag", -5, 25 );
      if ( this.magnitudeFilter != "Rmag" )
         url += this.CreateMagFilter( "Rmag", -5, 25 );

      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 8 && parseFloat( tokens[0] ) > 0 )
      {
         let recommended = tokens[8].trim();
         // Exclude problematic stars
         if ( tokens[8].trim() == "*" )
            return null;

         // Get magnitude values
         let V = parseFloat( tokens[3] ); // Returns NaN if it doesn't exist
         let B = parseFloat( tokens[4] ); // Returns NaN if it doesn't exist
         let R = parseFloat( tokens[5] ); // Returns NaN if it doesn't exist

         // Calculate B-V
         let BV = B - V;

         // Calculate V-R
         let VR = V - R;

         // Filter by B-V index
         if ( this.bvMin != Catalog.NullMag && BV < this.bvMin || this.bvMax != Catalog.NullMag && BV > this.bvMax )
            return null;

         // Filter by V-R index
         if ( this.vrMin != Catalog.NullMag && VR < this.vrMin || this.vrMax != Catalog.NullMag && VR > this.vrMax )
            return null;

         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let pmX = parseFloat( tokens[6] ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[7] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[2].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[3] ) );
         record.Vmag = tokens[3].trim();
         record.Bmag = tokens[4].trim();
         record.Rmag = tokens[5].trim();
         record["B-V index"] = format( "%.3f", BV );
         record["V-R index"] = format( "%.3f", VR );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new BVCatalog );

// ----------------------------------------------------------------------------

/*
 * Base class of SDSS catalog versions.
 */
var SDSSBase = class extends VizierCatalog
{
   constructor( catalogId, catalogName )
   {
      super( catalogId, catalogName );

      this.catalogMagnitude = 25;

      this.fields = [ "Name", "Coordinates", "Magnitude", "Class", "Redshift", "umag", "gmag", "rmag", "imag", "zmag"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );
      this.properties.push( ["classFilter", DataType.Uint16 ] );

      this.filters = [ "umag", "gmag", "rmag", "imag", "zmag" ];
      this.magnitudeFilter = "rmag";
      this.classFilter = 0;
      this.maxFov = 45;
   }

   GetEditControls( parent )
   {
      let controls = super.GetEditControls( parent );

      // Class filter
      let class_Label = new Label( parent );
      class_Label.text = "Class:";
      class_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      class_Label.minWidth = parent.labelWidth1;
      this.class_Label = class_Label;

      let class_Combo = new ComboBox( parent );
      class_Combo.editEnabled = false;
      class_Combo.toolTip = "<p>Filter the objects of the catalog by class.</p>";
      class_Combo.onItemSelected = function ()
      {
         this.dialog.activeFrame.object.catalog.classFilter = class_Combo.currentItem;
         this.dialog.activeFrame.object.catalog.bounds = null;
      };
      class_Combo.addItem( "All objects" );
      class_Combo.addItem( "Stars" );
      class_Combo.addItem( "Galaxies" );
      class_Combo.currentItem = this.classFilter;
      this.class_Combo = class_Combo;

      let classSizer = new HorizontalSizer;
      classSizer.scaledSpacing = 4;
      classSizer.add( class_Label );
      classSizer.add( class_Combo );
      classSizer.addStretch();
      this.classSizer = classSizer;

      controls.push( classSizer );
      return controls;
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=" + this.vizierSource + "&mode==1&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f",fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-oc.form=dec&-out.add=_RAJ,_DEJ" + "&-out=" + this.idField + "&-out=pmRA&-out=pmDE&-out=cl&-out=zsp" +
         "&-out=umag&-out=gmag&-out=rmag&-out=imag&-out=zmag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) ;
      if ( this.classFilter == 1 )
         url += "&cl==6";
      else if ( this.classFilter == 2 )
         url += "&cl==3";
      return url;
   }

   GetCacheDescriptor()
   {
      let cacheId = super.GetCacheDescriptor();
      if ( this.classFilter == 1 )
         cacheId += "&cl==6";
      else if ( this.classFilter == 2 )
         cacheId += "&cl==3";
      return cacheId;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 12 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null && !tokens[3].trim().isEmpty() && !tokens[4].trim().isEmpty() )
         {
            let pmX = parseFloat( tokens[3] ) * FMath.cos( FMath.rad( y ) ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ); // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, "SDSS" + tokens[2].trim(), 0 );
         record.Redshift = tokens[6].trim();
         record.Class = tokens[5].trim();
         record.umag = tokens[7].trim();
         record.gmag = tokens[8].trim();
         record.rmag = tokens[9].trim();
         record.imag = tokens[10].trim();
         record.zmag = tokens[11].trim();
         record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

// ----------------------------------------------------------------------------

/*
 * Latest version of SDSS
 */
var SDSSCatalog = class extends SDSSBase
{
   constructor()
   {
      super( "SDSS", "SDSS R9" );

      this.description = "SDSS R9 catalog (469,053,874 objects)";

      this.vizierSource = "V/139"
      this.idField = "SDSS9";
   }

   GetConstructor()
   {
      return "new SDSSCatalog()";
   }
};

CatalogRegistry.register( new SDSSCatalog );

// ----------------------------------------------------------------------------

/*
 * Release 7 of SDSS
 */
var SDSS7Catalog = class extends SDSSBase
{
   constructor()
   {
      super( "SDSS7", "SDSS R7");

      this.description = "SDSS R7 catalog (357,175,411 objects)";

      this.vizierSource = "II/294"
      this.idField = "SDSS";
   }

   GetConstructor()
   {
      return "new SDSS7Catalog()";
   }
};

CatalogRegistry.register( new SDSS7Catalog );

// ----------------------------------------------------------------------------

/*
 * GSC catalog
 */
var GSCCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "GSC", "GSC" );

      this.description = "GSC2.3 catalog (945,592,683 objects)";

      this.catalogMagnitude = 23;

      this.fields = [ "Name", "Coordinates", "Magnitude", "Class", "Fmag", "jmag", "Vmag", "Nmag", "Umag", "Bmag"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );
      this.properties.push( ["classFilter", DataType.Uint16 ] );

      this.filters = [ "Fmag", "jmag", "Vmag", "Nmag", "Umag", "Bmag" ];
      this.magnitudeFilter = "Vmag";
      this.classFilter = 0;
   }

   GetConstructor()
   {
      return "new GSCCatalog()";
   }

   GetEditControls( parent )
   {
      let controls = super.GetEditControls( parent );

      // Class filter
      let class_Label = new Label( parent );
      class_Label.text = "Class:";
      class_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      class_Label.minWidth = parent.labelWidth1;
      this.class_Label = class_Label;

      let class_Combo = new ComboBox( parent );
      class_Combo.editEnabled = false;
      class_Combo.toolTip = "<p>Filter the objects of the catalog by class.</p>";
      class_Combo.onItemSelected = function()
      {
         this.dialog.activeFrame.object.catalog.classFilter = class_Combo.currentItem;
         this.dialog.activeFrame.object.catalog.bounds = null;
      };
      class_Combo.addItem( "All objects" );
      class_Combo.addItem( "Star" );
      class_Combo.addItem( "Non-star" );
      class_Combo.currentItem = this.classFilter;
      this.class_Combo = class_Combo;

      let classSizer = new HorizontalSizer;
      classSizer.scaledSpacing = 4;
      classSizer.add( class_Label );
      classSizer.add( class_Combo );
      classSizer.addStretch();
      this.classSizer = classSizer;

      controls.push( classSizer );
      return controls;
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=I/305/out&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords ) +
         "&-out=GSC2.3&-out=RAJ2000&-out=DEJ2000&-out=Class" +
         "&-out=Fmag&-out=jmag&-out=Vmag&-out=Nmag&-out=Umag&-out=Bmag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) ;
      if ( this.classFilter == 1 )
         url += "&Class==0";
      else if ( this.classFilter == 2 )
         url += "&Class==3";
      return url;
   }

   GetCacheDescriptor()
   {
      let cacheId = super.GetCacheDescriptor();
      if ( this.classFilter == 1 )
         cacheId += "&cl==6";
      else if ( this.classFilter == 2 )
         cacheId += "&cl==3";
      return cacheId;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 9 && parseFloat( tokens[1] ) > 0 )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, tokens[0].trim(), 0 );
         record.Class = tokens[3].trim();
         record.Fmag = tokens[4].trim();
         record.jmag = tokens[5].trim();
         record.Vmag = tokens[6].trim();
         record.Nmag = tokens[7].trim();
         record.Umag = tokens[8].trim();
         if ( tokens.length > 9 )
            record.Bmag = tokens[9].trim();
         record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new GSCCatalog );

// ----------------------------------------------------------------------------

/*
 * CMC14 catalog
 */
var CMC14Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "CMC14", "CMC14" );

      this.description = "CMC14 catalog (95,858,475 stars)";

      this.catalogMagnitude = 17;

      this.fields = [ "Name", "Coordinates", "Magnitude", "Class", "r'mag", "Jmag", "Hmag", "Ksmag" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "r'mag", "Jmag", "Hmag", "Ksmag" ];
      this.magnitudeFilter = "r'mag";
      this.classFilter = 0;
   }

   GetConstructor()
   {
      return "new CMC14Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=I/304/out&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         format( "&-out.max=%d", this.maxRecords )+
         "&-out=CMC14&-out=RAJ2000&-out=DEJ2000" +
         "&-out=r'mag&-out=Jmag&-out=Hmag&-out=Ksmag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) ;
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 2 && parseFloat( tokens[1] ) > 0 )
      {
         let x = parseFloat( tokens[1] );
         let y = parseFloat( tokens[2] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, tokens[0].trim(), 0 );
         if ( tokens.length > 3 ) record["r'mag"] = tokens[3].trim();
         if ( tokens.length > 4 ) record.Jmag = tokens[4].trim();
         if ( tokens.length > 5 ) record.Hmag = tokens[5].trim();
         if ( tokens.length > 6 ) record.Ksmag = tokens[6].trim();
         record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new CMC14Catalog );

// ----------------------------------------------------------------------------

/*
 * ARP catalog
 */
var ARPCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "ARP", "ARP" );

      this.description = "ARP catalog (592 galaxies)";

      this.catalogMagnitude = 17;

      this.fields = [ "Name", "CommonName", "Coordinates", "Magnitude", "MType", "VTmag" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "VTmag" ];
      this.magnitudeFilter = "VTmag";
   }

   GetConstructor()
   {
      return "new ARPCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url=mirrorServer+"viz-bin/asu-tsv?-source=VII/192/arplist&-c=" +
         format("%f %f",center.x, center.y) +
         "&-c.r=" + format("%f",fov) +
         "&-c.u=deg&-out.form=|"+
         "&-oc.form=dec&-out.add=_RAJ,_DEJ"+
         "&-out=Arp&-out=Name&-out=VT&-out=dim1&-out=MType" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) ;
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 2 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let diameter = parseFloat( tokens[5] )/60;
         let record = new CatalogRecord( new Point( x, y ), diameter, "ARP" + tokens[2].trim() );
         record["CommonName"] = tokens[3].trim();
         record["VTmag"] = tokens[4].trim();
         record["MType"] = tokens[6].trim();
         record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new ARPCatalog );

// ----------------------------------------------------------------------------

/*
 * GCVS catalog
 */
var GCVSCatalog = class extends VizierCatalog
{
   constructor()
   {
      super( "GCVS", "GCVS" );

      this.description = "General Catalog of Variable Stars (47969 stars)";

      this.catalogMagnitude = 17;

      this.fields = [ "Name", "Coordinates", "MaxMagnitude", "MinMagnitude1", "MinMagnitude2", "Period", "VarType", "SpectralType" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "magMax" ];
      this.magnitudeFilter = "magMax";
   }

   GetConstructor()
   {
      return "new GCVSCatalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=B/gcvs/gcvs_cat&-c=" +
         format( "%f %f",center.x, center.y ) +
         "&-c.r=" + format( "%f",fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out=GCVS&-out=RAJ2000&-out=DEJ2000&-out=pmRA&-out=pmDE" +
         "&-out=VarType&-out=magMax&-out=Min1&-out=Min2&-out=Period&-out=SpType" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax ) ;
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 3 && parseFloat( tokens[1] ) > 0 )
      {
         let x = DMSangle.FromString( tokens[1] ).GetValue()*15;
         let y = DMSangle.FromString( tokens[2] ).GetValue();
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;

         if ( this.position !== null && !tokens[3].trim().isEmpty() && !tokens[4].trim().isEmpty() )
         {
            let pmX = parseFloat( tokens[3] ) * 1000 * FMath.cos( FMath.rad( y ) ); // mas/year * cos(delta)
            let pmY = parseFloat( tokens[4] ) * 1000; // mas/year
            let q = this.placeFunction( this.position, new StarPosition( x, y, pmX, pmY ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, tokens[0].trim(), parseFloat( tokens[6] ) );
         //record["Code"] = tokens[0].trim();
         record["MaxMagnitude"] = tokens[6].trim();
         record["MinMagnitude1"] = tokens[7].trim();
         record["MinMagnitude2"] = tokens[8].trim();
         record["Period"] = tokens[9].trim();
         if ( record["Period"].length )
            record["Period"] = parseFloat( record["Period"] ).toString();
         record["VarType"] = tokens[5].trim();
         record["SpectralType"] = tokens[10].trim();
         //record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new GCVSCatalog );

// ----------------------------------------------------------------------------

/*
 * Gaia DR1 catalog
 */
var GaiaDR1_Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "GaiaDR1", "Gaia DR1" );

      this.description = "Gaia Data Release 1 (Gaia collaboration, 2016, 1,142,679,769 sources)";

      this.catalogMagnitude = 20.7;
      this.magMin = Catalog.NullMag;
      this.magMax = 21;
      this.fields = [ "SourceID", "Coordinates", "<Gmag>" ];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = [ "<Gmag>"];
      this.magnitudeFilter = "<Gmag>";
   }

   GetConstructor ()
   {
      return "new GaiaDR1_Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=I/337/gaia&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=RA_ICRS,DE_ICRS&-out=pmRA&-out=pmDE&-out=Source&-out=<Gmag>" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 6 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null && !tokens[2].trim().isEmpty() && !tokens[3].trim().isEmpty() )
         {
            let pmX = parseFloat( tokens[2] );
            let pmY = parseFloat( tokens[3] );
            let q = this.placeFunction( this.position,
                                        new StarPosition( x,   // ra (deg)
                                                          y,   // dec (deg)
                                                          pmX, // pmra*cos( dec ) (mas/yr)
                                                          pmY, // pmdec (mas/yr)
                                                          0,   // parallax (as)
                                                          0,   // radial velocity
                                                          2457023.75 /* 2015.0 */ ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[4].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[5] ) );
         record["SourceID"] = name;
         record["<Gmag>"] = tokens[5].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new GaiaDR1_Catalog );

// ----------------------------------------------------------------------------

/*
 * Gaia DR2 catalog
 */
var GaiaDR2_Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "GaiaDR2", "Gaia DR2" );

      this.description = "Gaia Data Release 2 (Gaia collaboration et al., 2018, 1,692,919,135 sources)";

      this.catalogMagnitude = 21;
      this.magMin = Catalog.NullMag;
      this.magMax = 21;
      this.fields = [ "SourceID", "Coordinates", "RPmag", "Gmag", "BPmag", "Parallax", "RadialVelocity", "Radius", "Luminosity"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = ["RPmag", "Gmag", "BPmag"];
      this.magnitudeFilter = "Gmag";
   }

   GetConstructor()
   {
      return "new GaiaDR2_Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=I/345/gaia2&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=RA_ICRS,DE_ICRS&-out=pmRA&-out=pmDE&-out=Source&-out=Gmag&-out=RPmag&-out=BPmag" +
         "&-out=Plx&-out=RV&-out=Rad&-out=Lum" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 5 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null && !tokens[2].trim().isEmpty() && !tokens[3].trim().isEmpty() )
         {
            let pmX = parseFloat( tokens[2] );
            let pmY = parseFloat( tokens[3] );
            let plx = tokens[8].trim().isEmpty() ? 0 : FMath.max( 0, parseFloat( tokens[8] )/1000 );
            let q = this.placeFunction( this.position,
                                        new StarPosition( x,   // ra (deg)
                                                          y,   // dec (deg)
                                                          pmX, // pmra*cos( dec ) (mas/yr)
                                                          pmY, // pmdec (mas/yr)
                                                          plx, // parallax (as)
                                                          0,   // radial velocity
                                                          2457206.375 /* 2015.5 */ ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[4].trim();
         let record = new CatalogRecord( new Point( x, y ), 0/*diameter*/, name, parseFloat( tokens[5] ) );
         record["SourceID"] = name;
         record["Gmag"] = tokens[5].trim();
         record["RPmag"] = tokens[6].trim();
         record["BPmag"] = tokens[7].trim();
         record["Parallax"] = tokens[8].trim();
         record["RadialVelocity"] = tokens[9].trim();
         record["Radius"] = tokens[10].trim();
         record["Luminosity"] = tokens[11].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }
};

CatalogRegistry.register( new GaiaDR2_Catalog );

// ----------------------------------------------------------------------------

/*
 * Base class for Gaia catalogs implemented as local XPSD servers.
 */
var GaiaXPSDCatalogBase = class extends CatalogWithMagnitudeFilters
{
   constructor( id, name, dataRelease, catalogEpoch )
   {
      super( id, name );

      this.hasXPSDServer = true;
      this.restrictToHQStars = false;
      this.position = null;
      this.bounds = null;
      this.coordinatePrecision = 2; // for annotations
      this.catalogMagnitude = 21;
      this.magMin = Catalog.NullMag;
      this.magMax = 21;
      this.maxRecords = 20_000_000;
      this.maxFov = null;
      this.searchExpansion = 1.05;
      this.fields = ["Coordinates", "RPmag", "Gmag", "BPmag", "Parallax", "Flags"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );
      this.properties.push( ["coordinatePrecision", DataType.Uint8 ] );

      this.filters = ["RPmag", "Gmag", "BPmag"];
      this.magnitudeFilter = "Gmag";

      this.dataRelease = dataRelease;
      this.catalogEpoch = catalogEpoch;
   }

   newXPSDServer()
   {
      if ( typeof( Gaia ) == "undefined" )
         throw new Error( "The Gaia process is not available." );

      let server = new Gaia;
      server.dataRelease = this.dataRelease;
      server.magnitudeLow = (this.magMin == Catalog.NullMag) ? -1.5 : this.magMin;
      server.magnitudeHigh = this.magMax;
      server.sourceLimit = this.maxRecords;
      // Exclude:
      //    - Sources without 5-parameter astrometric solutions.
      //    - For high quality, sources with low-quality position, proper motions or parallax.
      server.exclusionFlags = GaiaFlag.NoPM;
      server.inclusionFlags = this.restrictToHQStars ? GaiaFlag.GoodAstrometry : 0;
      server.sortBy = Gaia.SortBy_G;
      server.generateTextOutput = false;
      return server;
   }

   Load( metadata )
   {
      if ( !metadata.observationTime )
         throw new Error( "Loading XPSD file data: Missing observation time metadata." );

      this.searchCenter = metadata.searchCenterCoordinates();
      this.searchRadius = metadata.SearchRadius();

      let server = this.newXPSDServer();
      server.command = "search";
      server.centerRA = this.searchCenter.x;
      server.centerDec = this.searchCenter.y;
      server.radius = FMath.min( 180, this.searchRadius * this.searchExpansion );
      server.verbosity = 1; // minimal console information

      if ( !server.executeGlobal() )
         throw new Error( "Failure to execute XPSD server search command." );

      console.writeln( "<end><cbr>Computing source positions..." );
      CoreApplication.processEvents();

      this.position = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      let t = new ElapsedTime;
      let p = new StarPosition;
      p.epoch = this.catalogEpoch;
      this.objects = [];
      for ( let S = server.sources, i = 0; i < S.length; ++i )
      {
         let s = S[i];
         p.alpha = s[Gaia.sources_ra];      // ra (deg)
         p.delta = s[Gaia.sources_dec];     // dec (deg)
         p.muAlpha = s[Gaia.sources_pmra];  // pmra*cos( dec ) (mas/yr)
         p.muDelta = s[Gaia.sources_pmdec]; // pmdec (mas/yr)
         p.parallax = FMath.max( 0, s[Gaia.sources_parx]/1000 ); // parallax (as)
         let q = F( this.position, p );
         let record = new CatalogRecord( new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) ),
                                         0/*diameter*/, ''/*name*/, s[Gaia.sources_magG]/*magG*/ );

         record["Parallax"] = format( "%.4f", s[Gaia.sources_parx] );
         record["Gmag"] = format( "%.3f", s[Gaia.sources_magG] );
         record["BPmag"] = format( "%.3f", s[Gaia.sources_magBP] );
         record["RPmag"] = format( "%.3f", s[Gaia.sources_magRP] );
         record["Flags"] = format( "%08x", s[Gaia.sources_flags] );
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         this.objects.push( record );

         if ( t.value > 0.5 )
         {
            console.write( format( "<end><clrbol>%.2f%%", i/S.length * 100 ) );
            CoreApplication.processEvents();
            if ( console.abortRequested )
               throw new Error( "<* abort *>" );
            t.reset();
         }
      }

      if ( this.reportObjectsInside && metadata.ref_I_G )
      {
         let insideObjects = 0;
         for ( let i = 0; i < this.objects.length; ++i )
            if ( this.objects[i] )
               if ( metadata.insideImageBoundariesFast( this.objects[i].posRD ) )
                  ++insideObjects;
         console.writeln( "<end><clrbol><b>Catalog ", this.name, "</b>: ", insideObjects, " objects inside the image." );
      }
      else
         console.writeln( "<end><clrbol><b>Catalog ", this.name, "</b>: ", this.objects.length, " objects." );
   }

   GetEditControls( parent )
   {
      let controls = this.GetMagnitudeFilterControls( parent );

      let precision_Label = new Label( parent );
      precision_Label.text = "Precision:";
      precision_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      precision_Label.minWidth = parent.labelWidth1;

      let precision_Combo = new ComboBox( parent );
      precision_Combo.editEnabled = false;
      precision_Combo.toolTip = "<p>Number of decimal digits to show on coordinate label.</p>";
      precision_Combo.addItem( "0 (arcseconds)" );
      precision_Combo.addItem( "1 (0.1 arcseconds)" );
      precision_Combo.addItem( "2 (0.01 arcseconds)" );
      precision_Combo.addItem( "3 (milliarcseconds)" );
      precision_Combo.currentItem = Math.range( this.coordinatePrecision, 0, 3 );
      precision_Combo.onItemSelected = function()
      {
         this.dialog.activeFrame.object.catalog.coordinatePrecision = precision_Combo.currentItem;
      };

      let precisionSizer = new HorizontalSizer;
      precisionSizer.scaledSpacing = 4;
      precisionSizer.add( precision_Label );
      precisionSizer.add( precision_Combo );
      precisionSizer.addStretch();

      controls.push( precisionSizer );
      return controls;
   }
};

// ----------------------------------------------------------------------------

/*
 * Gaia DR2 Local XPSD Server
 */
var GaiaDR2XPSDCatalog = class extends GaiaXPSDCatalogBase
{
   constructor()
   {
      super( "GaiaDR2_XPSD", "Gaia DR2 (XPSD)",
                  (typeof( Gaia ) != "undefined") ? Gaia.DataRelease_2 : 0,
                  2457206.375 /* 2015.5 */ );

      this.description = "Gaia Data Release 2 - Local XPSD Server (Gaia collaboration et al., 2018, 1,692,919,135 sources)";
   }

   GetConstructor()
   {
      return "new GaiaDR2XPSDCatalog()";
   }
};

CatalogRegistry.register( new GaiaDR2XPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * Gaia EDR3 Local XPSD Server
 */
var GaiaEDR3XPSDCatalog = class extends GaiaXPSDCatalogBase
{
   constructor()
   {
      super( "GaiaEDR3_XPSD", "Gaia EDR3 (XPSD)",
                  (typeof( Gaia ) != "undefined") ? Gaia.DataRelease_E3 : 0,
                  2457389.0 /* 2016.0 */ );

      this.description = "Gaia Early Data Release 3 - Local XPSD Server (Gaia collaboration et al., 2020, 1,806,254,432 sources)";
   }

   GetConstructor()
   {
      return "new GaiaEDR3XPSDCatalog()";
   }
};

CatalogRegistry.register( new GaiaEDR3XPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * Gaia DR3 Local XPSD Server
 */
var GaiaDR3XPSDCatalog = class extends GaiaXPSDCatalogBase
{
   constructor()
   {
      super( "GaiaDR3_XPSD", "Gaia DR3 (XPSD)",
                  (typeof( Gaia ) != "undefined") ? Gaia.DataRelease_3 : 0,
                  2457389.0 /* 2016.0 */ );

      this.description = "Gaia Data Release 3 - Local XPSD Server (Gaia collaboration et al., 2022, 1,806,254,432 sources)";
   }

   GetConstructor()
   {
      return "new GaiaDR3XPSDCatalog()";
   }
};

CatalogRegistry.register( new GaiaDR3XPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * Gaia DR3/SP Local XPSD Server
 */
var GaiaDR3SPXPSDCatalog = class extends GaiaXPSDCatalogBase
{
   constructor()
   {
      super( "GaiaDR3SP_XPSD", "Gaia DR3/SP (XPSD)",
                  (typeof( Gaia ) != "undefined") ? Gaia.DataRelease_3_SP : 0,
                  2457389.0 /* 2016.0 */ );

      this.description = "Gaia Data Release 3 / Mean BP/RP spectra - Local XPSD Server (Gaia collaboration et al., 2022, 219,197,643 sources)";
   }

   GetConstructor()
   {
      return "new GaiaDR3SPXPSDCatalog()";
   }
};

CatalogRegistry.register( new GaiaDR3SPXPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * APASS DR9 catalog
 */
var APASS_Catalog = class extends VizierCatalog
{
   constructor()
   {
      super( "APASS", "APASS" );

      this.description = "AAVSO Photometric All Sky Survey DR9 (Henden+, 2016, 62 million stars)";

      this.catalogMagnitude = 17;
      this.magMin = 10;
      this.magMax = 17;
      this.fields = ["Coordinates", "Vmag", "Bmag", "g'mag", "r'mag", "i'mag", "B-V"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String] );

      this.filters = ["Vmag", "Bmag", "g'mag", "r'mag", "i'mag"];
      this.magnitudeFilter = "Vmag";
   }

   GetConstructor()
   {
      return "new APASS_Catalog()";
   }

   UrlBuilder( center, fov, mirrorServer )
   {
      let url = mirrorServer + "viz-bin/asu-tsv?-source=II/336/apass9&-c=" +
         format( "%f %f", center.x, center.y ) +
         "&-c.r=" + format( "%f", fov ) +
         "&-c.u=deg&-out.form=|" +
         "&-out.add=_RAJ,_DEJ&-out=B-V&-out=Vmag&-out=Bmag&-out=g'mag&-out=r'mag&-out=i'mag" +
         this.CreateMagFilter( this.magnitudeFilter, this.magMin, this.magMax );
      return url;
   }

   ParseRecord( tokens )
   {
      if ( tokens.length >= 2 && parseFloat( tokens[0] ) > 0 )
      {
         let x = parseFloat( tokens[0] );
         let y = parseFloat( tokens[1] );
         if ( x < 0 || x > 360 || y < -90 || y > 90 )
            return null;
         if ( this.position !== null )
         {
            let q = this.placeFunction( this.position, new StarPosition( x, y ) );
            x = FMath.deg( q[0] );
            y = FMath.deg( q[1] );
         }
         let name = tokens[0] + "_" + tokens[1];
         let record = new CatalogRecord( new Point( x, y ), 0, name, 0 );
         if ( tokens.length > 2 )
            record["B-V"] = tokens[2].trim();
         if ( tokens.length > 3 )
            record["Vmag"] = tokens[3].trim();
         if ( tokens.length > 4 )
            record["Bmag"] = tokens[4].trim();
         if ( tokens.length > 5 )
            record["g'mag"] = tokens[5].trim();
         if ( tokens.length > 6 )
            record["r'mag"] = tokens[6].trim();
         if ( tokens.length > 7 )
            record["i'mag"] = tokens[7].trim();
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         return record;
      }

      return null;
   }

   PostProcessObjects( objects )
   {
      // The workflow of APASS DR9 can generate duplicated stars
      // Since the resolution of the cameras is 2.5"/px the tolerance
      // will be 2.5"/px
      this.RemoveDuplicates( objects, 3/3600 );
   }
};

CatalogRegistry.register( new APASS_Catalog );

// ----------------------------------------------------------------------------

/*
 * Base class for APASS catalogs implemented as local XPSD servers.
 */
var APASSXPSDCatalogBase = class extends CatalogWithMagnitudeFilters
{
   constructor( id, name, dataRelease )
   {
      super( id, name );

      this.hasXPSDServer = true;
      this.bounds = null;
      this.catalogMagnitude = 18;
      this.magMin = 7; // See https://www.aavso.org/apass 'Known Problems in DR10'
      this.magMax = 18;
      this.maxRecords = 200000;
      this.maxFov = null;
      this.searchExpansion = 1.0;
      this.fields = ["Coordinates", "Vmag", "Bmag", "g'mag", "r'mag", "i'mag", "z_smag", "Flags"];

      this.properties.push( ["magMin", DataType.Double] );
      this.properties.push( ["magMax", DataType.Double] );
      this.properties.push( ["magnitudeFilter", DataType.UTF16String ] );

      this.filters = ["Vmag", "Bmag", "g'mag", "r'mag", "i'mag", "z_smag"];
      this.magnitudeFilter = "Vmag";

      this.dataRelease = dataRelease;
   }

   newXPSDServer()
   {
      if ( typeof( APASS ) == "undefined" )
         throw new Error( "The APASS process is not available." );

      let server = new APASS;
      server.dataRelease = this.dataRelease;
      server.magnitudeLow = (this.magMin == Catalog.NullMag) ? -1.5 : this.magMin;
      server.magnitudeHigh = this.magMax;
      server.sourceLimit = this.maxRecords;
      // Exclude:
      //    - Sources without Johnson V magnitudes.
      server.exclusionFlags = APASSFlag.NoMag_V;
      server.sortBy = APASS.SortBy_V;
      server.generateTextOutput = false;
      return server;
   }

   Load( metadata )
   {
      if ( !metadata.observationTime )
         throw new Error( "Loading XPSD file data: Missing observation time metadata." );

      this.searchCenter = metadata.searchCenterCoordinates();
      this.searchRadius = metadata.SearchRadius();

      let centerRD = metadata.searchCenterCoordinates();
      let server = this.newXPSDServer();
      server.command = "search";
      server.centerRA = this.searchCenter.x;
      server.centerDec = this.searchCenter.y;
      server.radius = FMath.min( 180, this.searchRadius * this.searchExpansion );
      server.verbosity = 1; // minimal console information

      if ( !server.executeGlobal() )
         throw new Error( "Failure to execute XPSD server search command." );

      console.writeln( "<end><cbr>Computing source positions..." );
      CoreApplication.processEvents();

      this.position = Catalog.newPosition( metadata );
      let F = Catalog.placeFunctionForReferenceSystem( metadata.referenceSystem );
      this.objects = [];
      for ( let S = server.sources, i = 0; i < S.length; ++i )
      {
         let s = S[i];
         let q = F( this.position, new StarPosition( s[APASS.sources_ra], s[APASS.sources_dec] ) );
         let record = new CatalogRecord( new Point( FMath.deg( q[0] ), FMath.deg( q[1] ) ),
                                         0/*diameter*/,
                                         ''/*name*/,
                                         s[APASS.sources_mag_V]/*mag_V*/ );
         record["Vmag"] = format( "%.3f", s[APASS.sources_mag_V] );
         let flags = s[14];
         if ( !(flags & APASSFlag.NoMag_B) )
            record["Bmag"] = format( "%.3f", s[APASS.sources_mag_B] );
         if ( !(flags & APASSFlag.NoMag_g) )
            record["g'mag"] = format( "%.3f", s[APASS.sources_mag_g] );
         if ( !(flags & APASSFlag.NoMag_r) )
            record["r'mag"] = format( "%.3f", s[APASS.sources_mag_r] );
         if ( !(flags & APASSFlag.NoMag_i) )
            record["i'mag"] = format( "%.3f", s[APASS.sources_mag_i] );
         if ( !(flags & APASSFlag.NoMag_z_s) )
            record["z_smag"] = format( "%.3f", s[APASS.sources_mag_z_s] );
         record["Flags"] = format( "%08x", flags );
         if ( record[this.magnitudeFilter] )
            record.magnitude = parseFloat( record[this.magnitudeFilter] );
         this.objects.push( record );

         if ( i % 1000 == 0 )
         {
            console.write( format( "<end><clrbol>%.2f%%", i/S.length * 100 ) );
            CoreApplication.processEvents();
            if ( console.abortRequested )
               throw new Error( "<* abort *>" );
         }
      }

      if ( this.reportObjectsInside && metadata.ref_I_G )
      {
         let insideObjects = 0;
         for ( let i = 0; i < this.objects.length; ++i )
            if ( this.objects[i] )
               if ( metadata.insideImageBoundariesFast( this.objects[i].posRD ) )
                  ++insideObjects;
         console.writeln( "<b>Catalog ", this.name, "</b>: ", insideObjects, " objects inside the image." );
      }
      else
         console.writeln( "<b>Catalog ", this.name, "</b>: ", this.objects.length, " objects." );
   }

   GetEditControls( parent )
   {
      return this.GetMagnitudeFilterControls( parent );
   }
};

// ----------------------------------------------------------------------------

/*
 * APASS DR9 Local XPSD Server
 */
var APASSDR9XPSDCatalog = class extends APASSXPSDCatalogBase
{
   constructor()
   {
      super( "APASSDR9_XPSD", "APASS DR9 (XPSD)",
                  ((typeof APASS) != "undefined") ? APASS.DataRelease_9 : 0 );

      this.description = "APASS Data Release 9 - Local XPSD Server (Henden+, 2016, 62 million stars)";
   }

   GetConstructor()
   {
      return "new APASSDR9XPSDCatalog()";
   }
};

CatalogRegistry.register( new APASSDR9XPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * APASS DR10 Local XPSD Server
 */
var APASSDR10XPSDCatalog = class extends APASSXPSDCatalogBase
{
   constructor()
   {
      super( "APASSDR10_XPSD", "APASS DR10 (XPSD)",
                  ((typeof APASS) != "undefined") ? APASS.DataRelease_10 : 0 );

      this.description = "APASS Data Release 10 - Local XPSD Server (Henden+, 2018, 128 million stars)";
   }

   GetConstructor()
   {
      return "new APASSDR10XPSDCatalog()";
   }
};

CatalogRegistry.register( new APASSDR10XPSDCatalog );

// ----------------------------------------------------------------------------

/*
 * CustomCatalog: Local CSV and TSV plain text files.
 */
var CustomCatalog = class extends LocalFileCatalog
{
   constructor( catalogPath )
   {
      super( "Custom", "Custom", undefined/*filename*/, true/*compatibility*/ );

      this.description = "User-defined catalog";
      this.fields = [ "Name", "Coordinates", "Magnitude" ];

      this.catalogPath = catalogPath;
      this.properties.push( ["catalogPath", DataType.UTF16String] );
   }

   GetConstructor()
   {
      return "new CustomCatalog()";
   }

   Validate()
   {
      if ( !this.catalogPath || this.catalogPath.trim().isEmpty() )
      {
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( "CustomCatalog: no file path specified", TITLE, StdIcon.Error, StdButton.Ok )).execute();
         return false;
      }
      if ( !File.exists( this.catalogPath ) )
      {
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( "CustomCatalog: No such file exists on the local filesystem", TITLE, StdIcon.Error, StdButton.Ok )).execute();
         return false;
      }
      return true;
   }

   GetEditControls( parent )
   {
      // Catalog path
      let path_Label = new Label( parent );
      path_Label.text = "Catalog path:";
      path_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;

      let path_Edit = new Edit( parent );
      path_Edit.text = this.catalogPath ? this.catalogPath : "";
      path_Edit.onTextUpdated = function( value )
      {
         this.dialog.activeFrame.object.catalog.catalogPath = value;
      };

      let path_Button = new ToolButton( parent );
      path_Button.icon = parent.scaledResource( ":/icons/select-file.png" );
      path_Button.setScaledFixedSize( 20, 20 );
      path_Button.toolTip = "<p>Select the custom catalog file.</p>";
      path_Button.onClick = function()
      {
         let gdd = new OpenFileDialog;
         if ( this.dialog.activeFrame.object.catalog.catalogPath )
            gdd.initialPath = this.dialog.activeFrame.object.catalog.catalogPath;
         gdd.caption = "Select Custom Catalog Path";
         gdd.filters = [["CSV files", "*.csv"], ["Plain text files", "*.txt"], ["Any files", "*"]];
         if ( gdd.execute() )
         {
            // AnnotateImageExt bug fix, fileName is deprecated
            // this.dialog.activeFrame.object.catalog.catalogPath = gdd.fileName;
            this.dialog.activeFrame.object.catalog.catalogPath = gdd.filePath;
            //path_Edit.text = gdd.fileName;
            path_Edit.text = gdd.filePath;
         }
      };

      let download_Button = new ToolButton( parent );
      download_Button.icon = parent.scaledResource( ":/icons/download.png" );
      download_Button.setScaledFixedSize( 20, 20 );
      download_Button.toolTip = "<p>Download from an online VizieR catalog.</p>";
      download_Button.onClick = function()
      {
         let metadata = null;
         let server = null;
         if ( parent.engine )
         {
            if ( parent.engine.metadata )
               metadata = parent.engine.metadata;
            if ( parent.engine.vizierServer )
               server = parent.engine.vizierServer;
         }
         let dlg = new CatalogDownloaderDialog( metadata, server );
         if ( dlg.execute() )
         {
            this.dialog.activeFrame.object.catalog.catalogPath = dlg.path;
            path_Edit.text = dlg.path;
         }
      };

      let pathSizer = new HorizontalSizer;
      pathSizer.scaledSpacing = 4;
      pathSizer.add( path_Label );
      pathSizer.add( path_Edit, 100 );
      pathSizer.add( path_Button );
      pathSizer.add( download_Button );

      return [pathSizer];
   }
};

CatalogRegistry.register( new CustomCatalog );

// ----------------------------------------------------------------------------

#endif   // __PJSR_AstronomicalCatalogs_js

// ----------------------------------------------------------------------------
// EOF AstronomicalCatalogs.js - Released 2026-03-26T21:05:13Z
