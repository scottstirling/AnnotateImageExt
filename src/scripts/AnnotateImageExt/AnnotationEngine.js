// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// AnnotationEngine.js - Released 2026-03-26T21:05:57Z
// ----------------------------------------------------------------------------
//
// This file is part of AnnotateImage script version 2.3.0
//
// Copyright (c) 2013-2026 Andres del Pozo
// Copyright (c) 2019-2026 Juan Conejero (PTeam)
//
// The use of this source code is governed by the PixInsight Class Library
// License Version 2.0, which can be found in the LICENSE file included with
// this distribution, as well as at:
// https://pixinsight.com/license/PCL-License-2.0.html
// ----------------------------------------------------------------------------

var AnnotationEngine = class extends PersistentObject
{
   static OutputMode = class
   {
      static Image   = 0; // annotated image
      static Overlay = 1; // transparent overlay
      static SVG     = 2; // overlay in SVG format
   };

   constructor()
   {
      super(
         ANNOT_SETTINGS_MODULE,
         "engine",
         [
            [ "vizierServer",           DataType.UTF16String ],
            [ "removeDuplicates",       DataType.Boolean     ],
            [ "outputMode",             DataType.Uint8       ],
            [ "applySTF",               DataType.Boolean     ],
            [ "svgPath",                DataType.UTF16String ],
            [ "textScale",              DataType.Double      ],
            [ "graphicsScale",          DataType.Double      ],
            [ "smallSizeThreshold",     DataType.Double      ],
            [ "writeObjects",           DataType.Boolean     ],
            [ "optimizeLabelPlacement", DataType.Boolean     ],
            [ "dropShadow",             DataType.Boolean     ],
            [ "shadowOffset",           DataType.Uint8       ],
            [ "epoch",                  DataType.Double      ],
            [ "topocentric",            DataType.Boolean     ],
            [ "obsLongitude",           DataType.Double      ],
            [ "obsLatitude",            DataType.Double      ],
            [ "obsHeight",              DataType.Double      ],
            [ "entityInfoPath",         DataType.UTF16String ],
            [ "scalingFactor",          DataType.Double      ]
         ]
      );

      this.layers = [];
      this.vizierServer = "https://vizier.cds.unistra.fr/";
      this.removeDuplicates = true;
      this.outputMode = AnnotationEngine.OutputMode.Image;
      this.applySTF = true;
      this.svgPath = null;
      this.textScale = 2.0;
      this.graphicsScale = 1.0;
      this.smallSizeThreshold = 12;
      this.writeObjects = false;
      this.optimizeLabelPlacement = true;
      this.dropShadow = false;
      this.shadowOffset = 1;
      this.topocentric = false;
      this.entityInfoPath = null;
      this.scalingFactor = 1.0;
   }

   Init( window )
   {
      if ( !window || !window.isWindow )
      {
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( "<p>This script requires an active image.</p>", TITLE, StdIcon.Error, StdButton.Ok )).execute();
         throw new Error( "This script requires an active image." );
      }
      this.window = window;

      if ( !this.LoadParameters() )
         if ( !this.LoadSettings() )
            this.SetDefaults();

      this.metadata = new AstrometricMetadata( undefined/*module*/,
               (Parameters.isViewTarget && this.outputMode != AnnotationEngine.OutputMode.SVG) ? 1.0 : this.scalingFactor );
      this.metadata.ExtractMetadata( this.window );

      if ( this.metadata.ref_I_G === null )
      {
         if ( !Parameters.getBoolean( "non_interactive" ) )
            (new MessageBox( "<p>The active image has no valid astrometric solution:</p>" +
                             "<p>" + window.mainView.id + "</p>", TITLE, StdIcon.Error, StdButton.Ok )).execute();
         throw new Error( "The active image has no valid astrometric solution: " + window.mainView.id );
      }

      this.epoch = this.metadata.observationTime ? this.metadata.observationTime : 2451545.0;
      this.topocentric = this.metadata.topocentric && this.metadata.obsLongitude != null && this.metadata.obsLatitude != null;
      this.obsLongitude = this.topocentric ? this.metadata.obsLongitude : 0;
      this.obsLatitude = this.topocentric ? this.metadata.obsLatitude : 0;
      this.obsHeight = (this.topocentric && this.metadata.obsHeight) ? this.metadata.obsHeight : 0;

      console.writeln( "<end><cbr><br>" + "=".repeat( 98 ) );
      console.writeln( this.window.astrometricSolutionSummary().trim() );
      console.writeln( "=".repeat( 98 ) );
   }

   SetDefaults()
   {
      /*
       * Configure default layer parameters.
       */
      this.layers = [];

      let layer = new GridLayer;
      layer.visible = true;
      layer.gprops.lineColor = 0x80ffffff;
      this.layers.push( layer );

      layer = new ConstBordersLayer;
      layer.visible = false;
      layer.gprops.lineColor = 0x8000ffff;
      layer.gprops.lineWidth = 4;
      layer.gprops.showLabels = false;
      layer.gprops.labelColor = 0xff00ffff;
      layer.gprops.labelSize = 32;
      this.layers.push( layer );

      layer = new ConstLinesLayer;
      layer.visible = true;
      layer.gprops.lineColor = 0x80ff8080;
      layer.gprops.lineWidth = 4;
      layer.gprops.labelColor = 0xffff8080;
      layer.gprops.labelSize = 32;
      this.layers.push( layer );

      layer = new CatalogLayer( new NamedStarsCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xffffd700;
      layer.gprops.labelColor = 0xffffd700;
      layer.gprops.labelSize = 14;
      this.layers.push( layer );

      // START TEMPLATE FOR NEW CUSTOM CATALOG LAYER 
      /*
      layer = new CatalogLayer( new MessierCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );
      */
      // END TEMPLATE FOR NEW CUSTOM CATALOG LAYER 

      // TODO figure out how to make this dynamic based on catalogs-config.json
      layer = new CatalogLayer( new BFSCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new CaldwellCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new CederbladCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new CollinderCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new GreenCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new MBMCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new MelotteCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new MWSCCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new SandqvistCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new SandqvistLindroosCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new SFOSouthCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new SFONorthCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      // END NEW CATALOG LAYERS

      layer = new CatalogLayer( new MessierCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xff8080ff;
      layer.gprops.labelColor = 0xff8080ff;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new NGCICCatalog );
      layer.visible = true;
      layer.gprops.lineColor = 0xffff8080;
      layer.gprops.labelColor = 0xffff8080;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new TychoCatalog );
      layer.visible = false;
      layer.gprops.lineColor = 0xffffff00;
      layer.gprops.labelColor = 0xffffff00;
      layer.gprops.labelSize = 12;
      this.layers.push( layer );

      layer = new CatalogLayer( new PGCCatalog );
      layer.visible = false;
      layer.gprops.lineColor = 0xff00ffff;
      layer.gprops.labelColor = 0xff00ffff;
      layer.gprops.labelSize = 12;
      this.layers.push( layer );

      layer = new CatalogLayer( new CGPNCatalog );
      layer.visible = false;
      layer.gprops.lineColor = 0xff00ff00;
      layer.gprops.labelColor = 0xff00ff00;
      layer.gprops.labelSize = 12;
      this.layers.push( layer );

      layer = new CatalogLayer( new VisiblePlanets );
      layer.visible = false;
      layer.gprops.lineColor = 0xffff8000;
      layer.gprops.labelColor = 0xffff8000;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );

      layer = new CatalogLayer( new VisibleAsteroids );
      layer.visible = false;
      layer.gprops.lineColor = 0xffff8000;
      layer.gprops.labelColor = 0xffff8000;
      layer.gprops.labelSize = 16;
      this.layers.push( layer );
   }

   LoadSettings()
   {
      super.LoadSettings();

      let version = Settings.read( this.MakeSettingsKey( "version" ), DataType.UTF16String );
      if ( !Settings.lastReadOK || version != VERSION )
         return false;

      let layersStr = Settings.read( this.MakeSettingsKey( "layers" ), DataType.UTF16String );
      if ( !Settings.lastReadOK || !layersStr )
         return false;

      let layerIds = layersStr.split( "|" );
      this.layers = [];
      for ( let i = 0; i < layerIds.length; ++i )
      {
         let layer = LayerRegistry.newLayer( layerIds[i] );
         if ( layer !== null )
         {
            layer.SetId( i );
            layer.LoadSettings();
            this.layers.push( layer );
         }
      }

      return this.layers.length > 0;
   }

   SaveSettings()
   {
      Settings.write( this.MakeSettingsKey( "version" ), DataType.UTF16String, VERSION );

      super.SaveSettings();

      let layerIds;
      for ( let i = 0; i < this.layers.length; ++i )
      {
         this.layers[i].SetId( i );
         this.layers[i].SaveSettings();
         if ( layerIds )
            layerIds += "|" + this.layers[i].layerName;
         else
            layerIds = this.layers[i].layerName;
      }

      if ( layerIds )
         Settings.write( this.MakeSettingsKey( "layers" ), DataType.UTF16String, layerIds );
   }

   ResetSettings()
   {
      Settings.remove( ANNOT_SETTINGS_MODULE );
   }

   LoadParameters()
   {
      super.LoadParameters();

      let key = this.MakeParamsKey( "layers" );
      if ( !Parameters.has( key ) )
         return false;

      let layersStr = Parameters.getString( key );
      if ( !layersStr )
         return false;

      let layerIds = layersStr.split( "|" );
      this.layers = [];
      for ( let i = 0; i < layerIds.length; ++i )
      {
         let layer = LayerRegistry.newLayer( layerIds[i] );
         if ( layer !== null )
         {
            layer.SetId( i );
            layer.LoadParameters();
            this.layers.push( layer );
         }
      }

      return true;
   }

   SaveParameters()
   {
      super.SaveParameters();

      let layerIds;
      for ( let i = 0; i < this.layers.length; ++i )
      {
         this.layers[i].SetId( i );
         this.layers[i].SaveParameters();
         if ( layerIds )
            layerIds += "|" + this.layers[i].layerName;
         else
            layerIds = this.layers[i].layerName;
      }

      Parameters.set( this.MakeParamsKey( "layers" ), layerIds );
   }

   deleteConflictingEntities( /*BRQuadTree*/Q )
   {
      console.write( "<end><cbr>Removing conflicts: " );
      console.flush();
      let n = 0;
      for ( let i = 0, j = Q.objects.length; i < j; ++i )
      {
         let o = Q.objects[i];
         if ( o != null )
            if ( o.removable )
               if ( o.conflicts( Q ) )
               {
                  Q.remove( o );
                  ++n;
                  for ( let j = 0; j < o.linkedItems.length; ++j )
                  {
                     Q.remove( o.linkedItems[j] );
                     ++n;
                  }
               }
      }

      if ( n > 0 )
         Q.regenerate();

      console.writeln( n.toString() );
      console.flush();
   }

   static maybeWantToAbortLabelPlacementOptimization()
   {
      if ( !Parameters.getBoolean( "non_interactive" ) )
      {
         let msg = new MessageBox( "<p>The label placement optimization task is taking a long time.<p>" +
            "<p>You may prefer adjusting some layer parameters to achieve a more reasonable image annotation.</p>" +
            "<p><b>Do you really want to continue?</p></p>",
            TITLE, StdIcon.Warning, StdButton.Yes, StdButton.No );
         if ( msg.execute() != StdButton.Yes )
            throw new Error( "<* process aborted *>" );
      }
   }

   optimizeMovableEntities( /*BRQuadTree*/Q )
   {
      let T = new ElapsedTime;
      console.write( "<end><cbr>Optimizing:" );
      console.flush();
      for ( let it = 0, n0 = 0, stalled = 0;; )
      {
         let n = 0;
         for ( let i = 0, j = Q.objects.length; i < j; ++i )
         {
            let o = Q.objects[i];
            if ( o != null )
               if ( o.movable )
                  if ( o.relocate( Q ) )
                     ++n;
            if ( i % 100 == 0 )
               if ( T.value > 6 )
               {
                  AnnotationEngine.maybeWantToAbortLabelPlacementOptimization();
                  T.reset();
               }
         }

         Q.regenerate();

         console.write( ' ' + n.toString() );
         console.flush();

         if ( n == n0 )
            ++stalled;
         if ( n == 0 || stalled == 4 )
         {
            console.writeln();
            break;
         }

         if ( ++it == 20 )
         {
            console.warningln( "<end><cbr>** Warning: Too many iterations." );
            console.flush();
            break;
         }

         n0 = n;
      }
   }

   removeOverlappingEntities( /*BRQuadTree*/Q )
   {
      let overlappedItems = [];
      for ( let i = 0; i < Q.objects.length; ++i )
      {
         let o = Q.objects[i];
         if ( o != null )
            if ( o.overlap )
            {
               overlappedItems.push( o );
               Q.remove( o );
               for ( let j = 0; j < o.linkedItems.length; ++j )
                  Q.remove( o.linkedItems[j] );
            }
      }
      return overlappedItems;
   }

   processOverlappedEntities( /*Array*/overlappedItems, /*BRQuadTree*/Q )
   {
      if ( overlappedItems.length > 0 )
      {
         console.write( "<end><cbr>Processing overlaps:" );
         console.flush();

         Q.regenerate();

         /*
          * Minimize the set of overlapped entities by iterative relocation.
          */
         for ( let it = 0;; )
         {
            // Try to reinsert overlapped entities.
            let T = new ElapsedTime;
            let stillOverlapped = [];
            let n = 0;
            for ( let i = 0; i < overlappedItems.length; ++i )
            {
               let o = overlappedItems[i];
               o.relocate( Q );
               if ( o.overlap )
                  stillOverlapped.push( o );
               else
               {
                  ++n;
                  for ( let j = 0; j < o.linkedItems.length; ++j )
                     Q.insert( o.linkedItems[j] );
               }

               if ( i % 100 == 0 )
                  if ( T.value > 6 )
                  {
                     AnnotationEngine.maybeWantToAbortLabelPlacementOptimization();
                     T.reset();
                  }
            }

            // Gather entities that may become overlapped after other
            // reinsertions.
            if ( n > 0 )
            {
               T.reset();
               for ( let i = 0; i < overlappedItems.length; ++i )
               {
                  let o = overlappedItems[i];
                  if ( !o.overlap )
                  {
                     o.relocate( Q );
                     if ( o.overlap )
                     {
                        --n;
                        Q.remove( o );
                        for ( let j = 0; j < o.linkedItems.length; ++j )
                           Q.remove( o.linkedItems[j] );
                        stillOverlapped.push( o );
                     }
                  }

                  if ( i % 100 == 0 )
                     if ( T.value > 6 )
                     {
                        AnnotationEngine.maybeWantToAbortLabelPlacementOptimization();
                        T.reset();
                     }
               }
            }

            console.write( ' ' + n.toString() );
            console.flush();

            // Iterate to convergence.
            if ( n == 0 )
            {
               console.writeln();
               break;
            }

            if ( ++it == 20 )
            {
               console.warningln( "<end><cbr>** Warning: Too many iterations." );
               console.flush();
               break;
            }

            overlappedItems = stillOverlapped;
         }

         /*
          * Remove unsolved overlapped entities.
          */
         if ( overlappedItems.length > 0 )
         {
            for ( let i = 0; i < overlappedItems.length; ++i )
            {
               let o = overlappedItems[i];
               for ( let j = 0; j < o.linkedItems.length; ++j )
                  Q.remove( o.linkedItems[j] );
            }

            console.writeln( format( "<end><cbr>Overlapped entities removed: %d", overlappedItems.length ) );
            console.flush();
         }
      }
   }

   RenderGraphics( g, gs, width, height )
   {
      let bounds = this.metadata.FindImageBounds();

      let entities = null;
      if ( this.optimizeLabelPlacement )
         entities = [ new BorderEntity( width, height, "left", this.graphicsScale ),
                      new BorderEntity( width, height, "top", this.graphicsScale ),
                      new BorderEntity( width, height, "right", this.graphicsScale ),
                      new BorderEntity( width, height, "bottom", this.graphicsScale ) ];

      g.clipRect = new Rect( 0, 0, width, height );
      g.antialiasing = true;
      g.textAntialiasing = true;
      g.transparentBackground = true;

      if ( gs )
      {
         gs.clipRect = new Rect( 0, 0, width, height );
         gs.antialiasing = true;
         gs.textAntialiasing = true;
         gs.transparentBackground = true;
      }

      for ( let l = 0; l < this.layers.length; ++l )
         if ( this.layers[l].visible )
         {
            this.layers[l].Draw( g, this.metadata, bounds, this.window, this, entities );
            if ( gs )
               this.layers[l].Draw( gs, this.metadata, bounds, this.window, this, entities ? [] : null );
         }

      /*
       * Label placement optimization
       */
      if ( this.optimizeLabelPlacement )
      {
         console.writeln( "<end><cbr>Label placement optimization:" );
         console.flush();

         /*
          * Build a bucket rectangle quadtree structure for fast entity search.
          */
         let Q = new BRQuadTree( entities, 100/*bucketSize*/, 16/*epsilon*/ );

         console.write( format( "<end><cbr>Optimizing for %d entities, %d quadtree node(s), height = %d",
                                entities.length, Q.numberOfNodes(), Q.height() ) );
         console.flush();

//          this.deleteConflictingEntities( Q );

         /*
          * Optimize all movable entities with a minimum local distance
          * maximization criterion.
          */
         this.optimizeMovableEntities( Q );

         /*
          * Minimize the subset of overlapped entities by iterative relocation.
          */
         this.processOverlappedEntities( this.removeOverlappingEntities( Q ), Q );

         /*
          * Perform a final optimization with reinserted entities.
          */
         this.optimizeMovableEntities( Q );

#ifdef ANN_DEBUG_QUADTREE
         Q.traverse( ( node ) =>
                     {
                        cout( format( "\n* %d *\n", node.index.length ) );
                        for ( let i = 0; i < node.index.length; ++i )
                        {
                           let o = Q.objects[node.index[i]];
                           cout( format( "%f, %f, %f, %f\n", o.rect.x0, o.rect.y0, o.rect.x1, o.rect.y1 ) );
                        }
                     } );
#endif
         /*
          * Render all surviving entities after placement optimization.
          */
         for ( let step = 0; step < 2; ++step )
            for ( let l = 0; l < this.layers.length; ++l )
            {
               let layer = this.layers[l];
               if ( layer.visible )
                  if ( layer.drawEntities )
                  {
                     let items = [];
                     for ( let i = 0; i < Q.objects.length; ++i )
                     {
                        let o = Q.objects[i];
                        if ( o != null )
                           if ( o.layer == layer )
                              if ( (step == 0) ? o.overlappable : !o.overlappable )
                                 items.push( o );
                     }

                     if ( items.length > 0 )
                     {
                        console.writeln( format( "<end><cbr>Layer " + layer.layerName + ": %d %s%s",
                                                items.length,
                                                (step == 0) ? "" : "non-overlappable ",
                                                (items.length > 1) ? "entities" : "entity" ) );
                        console.flush();
                        layer.drawEntities( g, items, this );
                        if ( gs )
                           layer.drawEntities( gs, items, this );
                     }
                  }
            }

         /*
          * If requested, generate a plain text file with information on
          * generated exportable entities.
          *
          * The format is:
          *
          * <class>,<x0>,<y0>,<x1>,<y1>[,<text>]
          *
          * where <class> is the entity class name; <x0>,<y0>,<x1>,<y1> are
          * the entity rectangle coordinates, and <text> is the associated
          * entity text when applicable.
          *
          * Currently this is being used to export information on text labels
          * for implementation of interactive features with SVG graphics.
          */
         if ( this.entityInfoPath && !this.entityInfoPath.isEmpty() )
         {
            let text = '';
            for ( let l = 0; l < this.layers.length; ++l )
            {
               let layer = this.layers[l];
               if ( layer.visible )
                  for ( let i = 0; i < Q.objects.length; ++i )
                  {
                     let o = Q.objects[i];
                     if ( o != null )
                        if ( o.layer == layer )
                           if ( o.exportable )
                              text += o.entityInfo() + '\n';
                  }
            }
            File.writeTextFile( this.entityInfoPath, text );
         }
      }

      g.end();
      if ( gs )
         gs.end();
   }

   generateRasterRenditions()
   {
      let scaledWidth = this.metadata.scaledWidth;
      let scaledHeight = this.metadata.scaledHeight;

      let bmp;
      if ( this.outputMode == AnnotationEngine.OutputMode.Image )
      {
         if ( this.applySTF )
         {
            let image = new Image( this.window.mainView.image );
            image.applyDisplayFunction( this.window.mainView.stf );
            bmp = image.render();
            image.free();
         }
         else
            bmp = this.window.mainView.image.render();

         if ( this.metadata.scalingFactor != 1 )
            bmp = bmp.scaledTo( scaledWidth, scaledHeight );
      }
      else
      {
         bmp = new Bitmap( scaledWidth, scaledHeight );
         bmp.fill( 0x00000000 );
      }

      let bmpShadow = null;
      if ( this.dropShadow )
      {
         bmpShadow = new Bitmap( scaledWidth, scaledHeight );
         bmpShadow.fill( 0x00000000 );
      }

      let g = new Graphics( bmp );
      let gs = this.dropShadow ? new Graphics( bmpShadow ) : null;

      this.RenderGraphics( g, gs, scaledWidth, scaledHeight );

      let shadow = null;
      if ( this.dropShadow )
      {
         bmp.setAlpha( bmpShadow );

         shadow = new Image( scaledWidth, scaledHeight );
         let i = new ImageIterator( shadow );
         let b = new BitmapIterator( bmpShadow );
         for ( let y = 0; y < i.height; ++y )
            for ( let x = 0; x < i.width; ++x )
               i[y][x] = Color.alphaF( b[y][x] );

         shadow.invert();
         shadow.shiftBy( this.shadowOffset, this.shadowOffset );
         let G = Matrix.gaussianFilter( this.shadowOffset );
         shadow.convolveSeparable( G.rowVector( G.rows >> 1 ), G.rowVector( G.rows >> 1 ) );
      }

      return { bmp: bmp, shadow: shadow };
   }

   Render()
   {
      this.synchronizeMetadata();

      // Load data from catalogs
      for ( let i = 0; i < this.layers.length; ++i )
         if ( this.layers[i].visible )
            if ( this.layers[i].Load )
               this.layers[i].Load( this.metadata, this.vizierServer );

      if ( this.removeDuplicates )
         this.RemoveDuplicates();

      let targetWindow = null;

      let scaledWidth = this.metadata.scaledWidth;
      let scaledHeight = this.metadata.scaledHeight;

      if ( this.outputMode == AnnotationEngine.OutputMode.SVG )
      {
         console.writeln( "<end><cbr>Rendering SVG overlay: <raw>", this.svgPath + "</raw>" );

         let svg = new SVG( this.svgPath );
         svg.viewBox = new Rect( scaledWidth, scaledHeight );
         let g = new Graphics( svg );
         this.RenderGraphics( g, null, scaledWidth, scaledHeight );
      }
      else
      {
         console.writeln( "<end><cbr>Rendering annotation..." );

         let raster = this.generateRasterRenditions();

         if ( Parameters.isViewTarget )
         {
            // N.B. When working on a target view, the scalingFactor parameter
            // is not applied.
            this.window.mainView.beginProcess();

            if ( this.applySTF )
               this.window.mainView.image.applyDisplayFunction( this.window.mainView.stf );

            if ( this.dropShadow )
            {
               for ( let c = 0; c < this.window.mainView.image.numberOfNominalChannels; ++c )
               {
                  this.window.mainView.image.selectedChannel = c;
                  this.window.mainView.image.apply( raster.shadow, ImageOp.Mul );
               }
               this.window.mainView.image.resetSelections();
            }

            if ( this.window.mainView.image.colorSpace != ColorSpace.RGB )
               this.window.mainView.image.colorSpace = ColorSpace.RGB;

            this.window.mainView.image.blend( raster.bmp );

            this.window.mainView.endProcess();
         }
         else
         {
            let newid = this.window.mainView.fullId + "_annotated";
            console.writeln( "<end><cbr>Generating output image: ", newid );
            targetWindow = new ImageWindow( scaledWidth, scaledHeight,
                                            (this.outputMode == AnnotationEngine.OutputMode.Overlay) ? 4 : 3,
                                            this.window.bitsPerSample, this.window.isFloatSample,
                                            true/*color*/, newid );

            targetWindow.mainView.beginProcess( UndoFlag.NoSwapFile );

            if ( this.dropShadow )
            {
               let sourceImage;
               if ( this.metadata.scalingFactor != 1.0 )
               {
                  sourceImage = new Image( this.window.mainView.image );
                  sourceImage.resample( this.metadata.scalingFactor );
               }
               else
                  sourceImage = this.window.mainView.image;

               for ( let c = 0; c < 3; ++c )
               {
                  targetWindow.mainView.image.selectedChannel = c;
                  sourceImage.selectedChannel = Math.min( c, sourceImage.numberOfNominalChannels-1 );
                  targetWindow.mainView.image.apply( sourceImage );
               }
               targetWindow.mainView.image.resetSelections();
               sourceImage.resetSelections();

               if ( this.applySTF )
                  targetWindow.mainView.image.applyDisplayFunction( this.window.mainView.stf );

               for ( let c = 0; c < 3; ++c )
               {
                  targetWindow.mainView.image.selectedChannel = c;
                  targetWindow.mainView.image.apply( raster.shadow, ImageOp.Mul );
               }
               targetWindow.mainView.image.resetSelections();
            }

            targetWindow.mainView.image.blend( raster.bmp );

            if ( this.metadata.scalingFactor == 1.0 )
            {
               this.metadata.SaveKeywords( targetWindow, false/*beginProcess*/ );
               this.metadata.SaveProperties( targetWindow, "AnnotateImage " + VERSION );
               targetWindow.regenerateAstrometricSolution();
            }

            targetWindow.mainView.endProcess();
            targetWindow.show();
         }
      }

      console.writeln( "<end><cbr>Rendition completed." );

      if ( this.writeObjects )
         this.WriteObjects();

      return targetWindow;
   }

   RenderPreview()
   {
      this.synchronizeMetadata();

      // Load data from catalogs
      for ( let c = 0; c < this.layers.length; ++c )
         if ( this.layers[c].visible )
            if ( this.layers[c].Load )
               this.layers[c].Load( this.metadata, this.vizierServer );

      if ( this.removeDuplicates )
         this.RemoveDuplicates();

      console.writeln( "<end><cbr>Rendering annotation..." );

      let raster = this.generateRasterRenditions();

      if ( this.dropShadow )
         if ( this.outputMode == AnnotationEngine.OutputMode.Image )
         {
            let sourceImage;
            if ( this.metadata.scalingFactor != 1.0 )
            {
               sourceImage = new Image( this.window.mainView.image );
               sourceImage.resample( this.metadata.scalingFactor );
            }
            else
               sourceImage = this.window.mainView.image;

            let image = new Image( this.metadata.scaledWidth,
                                   this.metadata.scaledHeight,
                                   3/*numberOfChannels*/,
                                   ColorSpace.RGB,
                                   this.window.bitsPerSample,
                                   this.window.mainView.image.isInteger ? PixelSampleType.Integer : PixelSampleType.Float );
            for ( let c = 0; c < 3; ++c )
            {
               image.selectedChannel = c;
               sourceImage.selectedChannel = Math.min( c, sourceImage.numberOfNominalChannels-1 );
               image.apply( sourceImage );
            }
            image.resetSelections();
            sourceImage.resetSelections();

            if ( this.applySTF )
               image.applyDisplayFunction( this.window.mainView.stf );

            for ( let c = 0; c < 3; ++c )
            {
               image.selectedChannel = c;
               image.apply( raster.shadow, ImageOp.Mul );
            }
            image.resetSelections();

            image.blend( raster.bmp );

            raster.bmp = image.render();
         }

      console.writeln( "<end><cbr>Rendition completed." );

      return raster.bmp;
   }

   WriteObjects()
   {
      let imagePath = this.window.filePath;
      let outputPath;
      if ( imagePath && !imagePath.isEmpty() )
         outputPath = File.changeExtension( imagePath, ".objects.txt" );
      else
      {
         let sfd = new SaveFileDialog;
         sfd.caption = "Select objects file path";
         sfd.filters = [["Text files", "*.txt"]];
         sfd.initialPath = this.window.mainView.fullId + ".objects.txt";
         if ( !sfd.execute() )
            return;
         outputPath = sfd.filePath;
      }
      console.writeln( "Writing objects file: ", outputPath );

      let file = File.createFileForWriting( outputPath );
      for ( let c = 0; c < this.layers.length; ++c )
         if ( this.layers[c].visible && this.layers[c].ToFile )
            this.layers[c].ToFile( file, this.metadata );
      file.close();
   }

   RemoveDuplicates()
   {
      console.writeln( "<end><cbr><br>Removing duplicate objects:" );
      console.flush();

      let T = new ElapsedTime;
      let numDuplicates = 0;
      let checks = 0;
      let numChecks = 0;

      // Sort objects in each catalog by declination
      for ( let c = 0; c < this.layers.length; ++c )
         if ( this.layers[c].GetObjects() )
            this.layers[c].GetObjects().sort(
                  function( a, b )
                  {
                     if ( a && b )
                        return (a.posRD.y == b.posRD.y) ? 0 : ((a.posRD.y < b.posRD.y) ? -1 : 1);
                     return a ? -1 : (b ? 1 : 0);
                  } );

      // Calculate the maximum number of checks
      for ( let c = 0; c < this.layers.length - 1; ++c )
      {
         let objects1 = this.layers[c].GetObjects();
         if ( objects1 )
            for ( let c2 = c + 1; c2 < this.layers.length; ++c2 )
            {
               let objects2 = this.layers[c2].GetObjects();
               if ( objects2 )
                  numChecks += objects1.length * objects2.length;
            }
      }

      let T1 = new ElapsedTime;
      let tolerancePunctual = Math.max( this.metadata.resolution, 3/3600 );
      let toleranceExtended = Math.max( this.metadata.resolution, 10/3600 );
      for ( let c1 = 0; c1 < this.layers.length-1; ++c1 )
      {
         let objects1 = this.layers[c1].GetObjects();
         if ( !objects1 )
            continue;

         // Find a coincident object in the other layers
         for ( let c2 = c1 + 1; c2 < this.layers.length; ++c2 )
         {
            let objects2 = this.layers[c2].GetObjects();
            if ( !objects2 || this.layers[c1].layerName == this.layers[c2].layerName )
               continue;

            let j0 = 0;
            for ( let i = 0; i < objects1.length; ++i )
            {
               let obj1 = objects1[i];
               if ( !obj1 )
                  continue;
               let punctual1 = obj1.diameter <= 5/3600;
               let cosDec = Math.cos( Math.rad( obj1.posRD.y ) );
               let minDec = obj1.posRD.y - toleranceExtended;
               let maxDec = obj1.posRD.y + toleranceExtended;

               for ( let j = j0; j < objects2.length; ++j )
               {
                  let obj2 = objects2[j];
                  if ( !obj2 )
                     continue;
                  if ( obj2.posRD.y < minDec )
                  {
                     j0 = j;
                     continue;
                  }
                  if ( obj2.posRD.y > maxDec )
                     break;
                  let punctual2 = obj2.diameter <= 5/3600;
                  let effectiveTolerance = (punctual1 || punctual2) ? tolerancePunctual : toleranceExtended;
                  let dx = (obj1.posRD.x - obj2.posRD.x)*cosDec;
                  let dy = obj1.posRD.y - obj2.posRD.y;
                  let dist2 = dx*dx + dy*dy;
                  if ( dist2 < effectiveTolerance*effectiveTolerance )
                  {
                     if ( numDuplicates <= 50 )
                     {
                        console.writeln( "<end><cbr>   ", obj1.name, " = ", obj2.name,
                                         format( " (%.2f mas)", Math.sqrt( dist2 )*3600000 ) );
                        if ( numDuplicates == 50 )
                           console.writeln( "<end><cbr>... <i>too many to show.</i>" );
                     }
                     objects2[j] = null;
                     numDuplicates++;
                  }
               }

               checks += objects2.length;

               if ( T1.value > 3 )
               {
                  console.writeln( format( "<end><cbr>Found %d duplicate objects (%.2f%%)", numDuplicates, checks/numChecks*100 ) );
                  processEvents();
                  T1.reset();
               }
            }
         }
      }

      console.writeln( format( "<end><cbr>Found %d duplicate objects in ", numDuplicates ), T.text );
   }

   synchronizeMetadata()
   {
      if ( this.epoch != null )
         this.metadata.observationTime = this.epoch;
      if ( this.topocentric != null )
         this.metadata.topocentric = this.topocentric;
      if ( this.obsLongitude != null )
         this.metadata.obsLongitude = this.obsLongitude;
      if ( this.obsLatitude != null )
         this.metadata.obsLatitude = this.obsLatitude;
      if ( this.obsHeight != null )
         this.metadata.obsHeight = this.obsHeight;
   }
};

// ----------------------------------------------------------------------------
// EOF AnnotationEngine.js - Released 2026-03-26T21:05:57Z
