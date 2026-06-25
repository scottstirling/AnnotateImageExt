// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// Layer.js - Released 2026-05-11T18:30:06Z
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

/*
 * Registry providing access to all defined layer classes.
 */
var LayerRegistry = class
{
   static #layers = [];

   static get length()
   {
      return LayerRegistry.#layers.length;
   }

   static register( layer )
   {
      LayerRegistry.#layers.push(
         { id:                   layer.layerName,
           evaluableConstructor: layer.GetConstructor() } );
   }

   static find( idx )
   {
      if ( typeof( idx ) == "string" )
      {
         for ( let i = 0; i < LayerRegistry.#layers.length; ++i )
            if ( LayerRegistry.#layers[i].id == idx )
               return LayerRegistry.#layers[i];
      }
      else
      {
         if ( idx >= 0 && idx < LayerRegistry.#layers.length )
            return LayerRegistry.#layers[idx];
      }
      return null;
   }

   static newLayer( idx )
   {
      let meta = LayerRegistry.find( idx );
      if ( meta !== null )
         return eval( meta.evaluableConstructor );
      return null;
   }

   static reset()
   {
      LayerRegistry.#layers = [];
   }
};

LayerRegistry.reset();

// ----------------------------------------------------------------------------

/*
 * Base class of all graphical annotation layers.
 */
var Layer = class extends PersistentObject
{
   constructor( name, description = "" )
   {
      super(
         ANNOT_SETTINGS_MODULE,
         name,
         [
            [ "visible", DataType.Boolean       ],
            [ "gprops",  ExtDataType.Persistent ]
         ]
      );

      this.layerName = name;
      this.layerDescription = description;

      this.visible = true;
      this.gprops = new GraphicProperties( ANNOT_SETTINGS_MODULE, this.layerName );
   }

   GetObjects()
   {
      if ( this.visible )
         if ( this.objects )
            return this.objects;
      return null;
   }

   SetId( id )
   {
      this.id = id;
      this.prefix = "ly" + id;
      this.gprops.prefix = this.prefix;
   }

   GetConstructor()
   {
      return null;
   }

   GetLayerType()
   {
      return this.GetLayerType.caller.name;
   }

   newLinePen( scale )
   {
      return new Pen( this.gprops.lineColor, this.gprops.lineWidth*scale );
   }

   newLabelPen()
   {
      return new Pen( this.gprops.labelColor );
   }

   newLabelFont( scale )
   {
      let font = new Font( this.gprops.labelFace, this.gprops.labelSize*scale, "px" );
      font.bold = this.gprops.labelBold;
      font.italic = this.gprops.labelItalic;
      return font;
   }
};

// ----------------------------------------------------------------------------

/*
 * Base class of all grid layers.
 */
var GridLayerBase = class extends Layer
{
   constructor( name, description )
   {
      super( name, description );

      this.density = 4;
      this.properties.push( [ "density", DataType.Uint16 ] );
   }

   GetEditPanel( parent )
   {
      this.gpropsControls = this.gprops.GetEditControls( parent, null );

      this.density_Label = new Label( parent );
      this.density_Label.text = "Grid density:";
      this.density_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.density_Label.minWidth = parent.labelWidth1;

      this.density_SpinBox = new SpinBox( parent );
      this.density_SpinBox.minValue = 1;
      this.density_SpinBox.maxValue = 20;
      this.density_SpinBox.value = this.density;
      this.density_SpinBox.setFixedWidth( parent.spinWidth );
      this.density_SpinBox.toolTip = "<p>Density of grid lines and labels. Higher values generate more grid elements per angular unit.</p>";
      this.density_SpinBox.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.density = value;
      };

      this.density_Sizer = new HorizontalSizer;
      this.density_Sizer.spacing = 4;
      this.density_Sizer.add( this.density_Label );
      this.density_Sizer.add( this.density_SpinBox );
      this.density_Sizer.addStretch();

      let panel = new Control( parent );
      panel.sizer = new VerticalSizer;
      panel.sizer.margin = 6;
      panel.sizer.spacing = 4;
      for ( let i = 0; i < this.gpropsControls.length; ++i )
         panel.sizer.add( this.gpropsControls[i] );
      panel.sizer.add( this.density_Sizer );
      panel.sizer.addStretch();
      panel.object = this;
      return panel;
   }

   drawEntities( g, entities, engine )
   {
      g.pen = this.newLabelPen();
      g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
      for ( let i = 0; i < entities.length; ++i )
      {
         let entity = entities[i];
         if ( entity instanceof GridLabelEntity )
            g.drawText( entity.rect.x0, entity.rect.y1, entity.text );
      }
   }

   FindAxisScale( scaleTarget )
   {
      let scaleBase = FMath.pow( 60, FMath.floor( FMath.log( scaleTarget )/FMath.log( 60 ) ) );
      let factors = [ 60, 45, 30, 20, 15, 10, 9, 6, 5, 4, 3, 2, 1.5, 1 ];

      let factor = scaleTarget/scaleBase;
      for ( let i = 0; i < factors.length; ++i )
         if ( scaleBase*factors[i] < scaleTarget )
            return scaleBase*factors[i];
      return scaleBase;
   }

   GetLabelText( val, d, m, s, sign )
   {
      let dms = DMSangle.FromAngle( val );
      let signStr = sign ? ((dms.sign < 0) ? "\u2212" : "+") : "";
      let degs = signStr + dms.deg.toString() + d;
      if ( dms.sec > 0.001 )
         return degs + dms.min.toString() + m + FMath.round( dms.sec ).toString() + s;
      if ( dms.min > 0 )
         return degs + dms.min.toString() + m;
      return degs;
   }

   static convertLines( metadata, points )
   {
      let lineList = [];
      let line = [];
      let pI = metadata.Convert_RD_I( points[0] );
      if ( pI && !metadata.CheckOscillation( points[0], pI ) )
         pI = null;
      if ( pI )
         line.push( pI );

      for ( let p = 1; p < points.length; ++p )
      {
         let p1 = points[p-1];
         let p2 = points[p];
         let dx = p2.x - p1.x;
         let dy = p2.y - p1.y;
         let steps = FMath.ceil( FMath.max( FMath.abs( dx ), FMath.abs( dy ), 1 )*5 );
         for ( let i = 1; i <= steps; ++i )
         {
            let pA = new Point( p1.x + (i - 1)*dx/steps, p1.y + (i - 1)*dy/steps );
            let pB = new Point( p1.x +       i*dx/steps, p1.y +       i*dy/steps );
            let pI = null;
            if ( metadata.projection.CheckBrokenLine( pA, pB ) )
               pI = metadata.Convert_RD_I( pB );
            if ( pI && !metadata.CheckOscillation( pB, pI ) )
               pI = null;

            if ( pI )
               line.push( pI );
            else
            {
               if ( line.length > 1 )
                  lineList.push( line );
               line = [];
            }
         }
      }
      if ( line.length > 1 )
         lineList.push( line );

      return lineList;
   }
};

// ----------------------------------------------------------------------------

/*
 * A Layer to draw the equatorial coordinate grid.
 */
var GridLayer = class extends GridLayerBase
{
   constructor()
   {
      super( "Grid", "Grid in ICRS equatorial coordinates" );

      this.gprops.lineColor = 0x80ffffff;
      this.gprops.labelSize = 12;
   }

   GetConstructor()
   {
      return "new GridLayer()";
   }

   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      // Will try to draw "density" lines in declination
      let targetScale = bounds.height/this.density;
      let cosDec = FMath.cos( FMath.rad( bounds.center.y ) );
      let scalex = this.FindAxisScale( targetScale/cosDec/15 );
      let scaley = this.FindAxisScale( targetScale );
      let orgx = FMath.floor( bounds.x0/scalex )*scalex;
      let orgy = FMath.max( -90, FMath.floor( bounds.y0/scaley )*scaley );

      if ( this.gprops.showMarkers )
      {
         g.pen = this.newLinePen( engine.graphicsScale );

         // Draw horizontal lines
         for ( let y = 0; orgy + y*scaley <= bounds.y1; ++y )
         {
            let yRD = orgy + y*scaley;
            let lines = GridLayerBase.convertLines( metadata, [new Point( orgx*15, yRD ), new Point( bounds.x1*15, yRD )] );
            for ( let i = 0; i < lines.length; ++i )
               g.drawPolyline( lines[i] );
         }

         // Draw vertical lines
         for ( let x = 0; orgx + x*scalex <= bounds.x1; ++x )
         {
            let xRD = orgx + x*scalex;
            let lines = GridLayerBase.convertLines( metadata, [new Point( xRD*15, orgy ), new Point( xRD*15, bounds.y1 )] );
            for ( let i = 0; i < lines.length; ++i )
               g.drawPolyline( lines[i] );
         }
      }

      if ( this.gprops.showLabels )
      {
         g.pen = this.newLabelPen();
         g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );

         // Draw declination labels
         for ( let y = 0; orgy + y*scaley <= bounds.y1; ++y )
         {
            let yRD = orgy + y*scaley;
            let xRD = orgx + FMath.ceil( bounds.width/3/scalex )*scalex;
            let pos = metadata.Convert_RD_I( new Point( xRD*15, yRD ) );
            if ( pos )
            {
               pos.y += g.font.height;
               let text = this.GetLabelText( yRD, '\u00B0', '\u2032', '\u2033', true );
               let rect = g.font.tightBoundingRect( text );
               let x0 = pos.x,
                   y0 = pos.y - rect.height,
                   x1 = pos.x + rect.width,
                   y1 = pos.y;
               if ( x0 >= 0 && y0 >= 0 && x1 <= metadata.width && y1 <= metadata.height )
                  if ( entities )
                     entities.push( new GridLabelEntity( { x0: x0, y0: y0, x1: x1, y1: y1 }, text, this ) );
                  else
                     g.drawText( pos, text );
            }
         }

         // Draw right ascension labels
         for ( let x = 0; orgx + x*scalex < bounds.x1; ++x )
         {
            let xRD = orgx + x*scalex;
            if ( xRD < 0 )
               xRD += 24;
            else if( xRD >= 24 )
               xRD -= 24;
            let yRD = orgy + FMath.ceil( bounds.height/3/scaley )*scaley;
            let pos = metadata.Convert_RD_I( new Point( xRD*15, yRD ) );
            if ( pos )
            {
               let text = this.GetLabelText( xRD, '\u02B0', '\u1D50', '\u02E2', false );
               let rect = g.font.tightBoundingRect( text );
               let x0 = pos.x,
                   y0 = pos.y - rect.height,
                   x1 = pos.x + rect.width,
                   y1 = pos.y;
               if ( x0 >= 0 && y0 >= 0 && x1 <= metadata.width && y1 <= metadata.height )
                  if ( entities )
                     entities.push( new GridLabelEntity( { x0: x0, y0: y0, x1: x1, y1: y1 }, text, this ) );
                  else
                     g.drawText( pos, text );
            }
         }
      }
   }
};

LayerRegistry.register( new GridLayer );

// ----------------------------------------------------------------------------

/*
 * Base class of all great circle grid layers.
 *
 * Derived classes must implement the following functions:
 *
 * void prepareForCoordinates( AstrometricMetadata )
 * Vector circleToEquatorialCoordinates( Vector rc )
 * Vector equatorialToCircleCoordinates( Vector rq )
 */
var GreatCircleGridLayerBase = class extends GridLayerBase
{
   constructor( name, description )
   {
      super( name, description );

      this.density = 8;
      this.gprops.labelSize = 12;
   }

   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      this.prepareForCoordinates( metadata );

      let circle = [[],[]];
      let rq0 = Vector.fromSpherical( FMath.rad( metadata.ra ), FMath.rad( metadata.dec ) );
      let e0 = this.equatorialToCircleCoordinates( rq0 ).toSpherical2Pi();
      for ( let l = 0; l >= -180; l -= 1 )
      {
         let re = Vector.fromSpherical( e0[0] + FMath.rad( l ), 0 );
         let rq = this.circleToEquatorialCoordinates( re );
         let sq = rq.toSpherical2Pi();
         circle[0].push( new Point( FMath.deg( sq[0] ), FMath.deg( sq[1] ) ) );
      }
      for ( let l = 0; l <= +180; l += 1 )
      {
         let re = Vector.fromSpherical( e0[0] + FMath.rad( l ), 0 );
         let rq = this.circleToEquatorialCoordinates( re );
         let sq = rq.toSpherical2Pi();
         circle[1].push( new Point( FMath.deg( sq[0] ), FMath.deg( sq[1] ) ) );
      }

      g.pen = this.newLinePen( engine.graphicsScale );
      if ( this.gprops.showLabels )
         g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );

      let count = 0;
      for ( let step = 0; step < 2; ++step )
      {
         let C = circle[step];
         let P = [];
         for ( let i = 0; i < C.length; ++i )
            if ( metadata.insideImageBoundaries( C[i] ) )
            {
               let p0 = null;
               if ( i > 0 )
               {
                  p0 = metadata.Convert_RD_I( C[i-1] );
                  if ( !p0 )
                     break;
                  P.push( p0 );
               }
               for ( let finished = false;; )
               {
                  let p = metadata.Convert_RD_I( C[i] );
                  if ( !p )
                     break;
                  if ( p0 )
                  {
                     let dx = p.x - p0.x;
                     let dy = p.y - p0.y;
                     if ( dx*dx + dy*dy > metadata.width*metadata.height/4 )
                        break;
                  }
                  P.push( p );
                  p0 = p;
                  if ( finished )
                     break;
                  if ( ++i == C.length )
                     break;
                  if ( !metadata.insideImageBoundaries( C[i] ) )
                     finished = true;
               }
               break;
            }

         if ( P.length > 1 )
         {
            g.drawPolyline( P );
            count += P.length;
         }
      }

      if ( count == 0 )
         return;

      if ( this.gprops.showMarkers )
      {
         let delta = this.FindAxisScale( bounds.height/this.density );
         for ( let l = 0; l < 360; l += delta )
         {
            let re = Vector.fromSpherical( FMath.rad( l ), 0 );
            let rq = this.circleToEquatorialCoordinates( re );
            let sq = rq.toSpherical2Pi();
            let pRD = new Point( FMath.deg( sq[0] ), FMath.deg( sq[1] ) );
            if ( metadata.insideImageBoundaries( pRD ) )
            {
               let pI = metadata.Convert_RD_I( pRD );
               if ( pI )
               {
                  let re0 = Vector.fromSpherical( FMath.rad( l - delta/2 ), 0 );
                  let rq0 = this.circleToEquatorialCoordinates( re0 );
                  let sq0 = rq0.toSpherical2Pi();
                  let re1 = Vector.fromSpherical( FMath.rad( l + delta/2 ), 0 );
                  let rq1 = this.circleToEquatorialCoordinates( re1 );
                  let sq1 = rq1.toSpherical2Pi();
                  let pI0 = metadata.Convert_RD_I( new Point( FMath.deg( sq0[0] ), FMath.deg( sq0[1] ) ) );
                  let pI1 = metadata.Convert_RD_I( new Point( FMath.deg( sq1[0] ), FMath.deg( sq1[1] ) ) );
                  if ( !pI0 )
                     pI0 = pI;
                  if ( !pI1 )
                     pI1 = pI;

                  g.pushState();
                  g.translateTransformation( pI );
                  g.rotateTransformation( FMath.atan2pi( pI0.y - pI1.y, pI1.x - pI0.x ) );
                  g.drawLine( 0, -8*engine.graphicsScale, 0, +8*engine.graphicsScale );
                  g.popState();

                  if ( this.gprops.showLabels )
                  {
                     pI.y += g.font.height;
                     let text = this.GetLabelText( l, '\u00B0', '\u2032', '\u2033', false/*sign*/ );
                     let rect = g.font.tightBoundingRect( text );
                     let x0 = pI.x + 4*engine.graphicsScale,
                         y0 = pI.y - rect.height,
                         x1 = x0 + rect.width,
                         y1 = pI.y;
                     if ( x0 >= 0 && y0 >= 0 && x1 <= metadata.width && y1 <= metadata.height )
                        if ( entities )
                           entities.push( new GridLabelEntity( { x0: x0, y0: y0, x1: x1, y1: y1 }, text, this ) );
                        else
                        {
                           g.pushState();
                           g.pen = this.newLabelPen();
                           g.drawText( x0, y1, text );
                           g.popState();
                        }
                  }
               }
            }
         }
      }
   }
};

// ----------------------------------------------------------------------------

/*
 * A Layer to draw the ecliptic great circle.
 */
var EclipticLayer = class extends GreatCircleGridLayerBase
{
   constructor()
   {
      super( "Ecliptic", "The ecliptic great circle" );

      this.gprops.lineColor = 0x80ffa500;
      this.gprops.labelColor = 0xffffa500;
   }

   GetConstructor()
   {
      return "new EclipticLayer()";
   }

   prepareForCoordinates( metadata )
   {
      /*
       * Mean J2000.0 ecliptic or 'of the date' ecliptic, depending on the
       * solution's reference coordinate system.
       */
      let epoch;
      let refSys = metadata.referenceSystem.toLowerCase();
      if ( refSys == "true" || refSys == "mean" || refSys == "apparent" || refSys == "gappt" )
         epoch = metadata.observationTime;
      else
         epoch = 2451545.0; // J2000.0
      let epsA = (new Position( epoch, "UTC" )).epsA;
      this.se = FMath.sin( epsA );
      this.ce = FMath.cos( epsA );
   }

   circleToEquatorialCoordinates( rc )
   {
      return Position.eclipticToEquatorial( rc, this.se, this.ce );
   }

   equatorialToCircleCoordinates( rq )
   {
      return Position.equatorialToEcliptic( rq, this.se, this.ce );
   }
};

LayerRegistry.register( new EclipticLayer() );

// ----------------------------------------------------------------------------

/*
 * A Layer to draw the galactic equator great circle.
 */
var GalacticEquatorLayer = class extends GreatCircleGridLayerBase
{
   constructor()
   {
      super( "Galactic Equator", "The ICRS galactic equator great circle" );

      this.gprops.lineColor = 0x8087ceeb;
      this.gprops.labelColor = 0xff87ceeb;
   }

   GetConstructor()
   {
      return "new GalacticEquatorLayer()";
   }

   prepareForCoordinates( metadata )
   {
   }

   circleToEquatorialCoordinates( rc )
   {
      return Position.galacticToICRSEquatorial( rc );
   }

   equatorialToCircleCoordinates( rq )
   {
      return Position.icrsEquatorialToGalactic( rq );
   }
};

LayerRegistry.register( new GalacticEquatorLayer );

// ----------------------------------------------------------------------------

/*
 * A Layer to draw constellation lines.
 */
var ConstLinesLayer = class extends Layer
{
   constructor()
   {
      super( "Constellation Lines", "Asterisms of the constellations" );

      this.margin = 8;
      this.gprops.lineColor = 0x80ffffff;
      this.gprops.labelSize = 12;
      this.properties.push( [ "margin", DataType.Double ] );
   }

   GetConstructor()
   {
      return "new ConstLinesLayer()";
   }

   GetEditPanel( parent )
   {
      this.gpropsControls = this.gprops.GetEditControls( parent, null );

      // Grid margin
      this.margin_Label = new Label( parent );
      this.margin_Label.text = "Line margin:";
      this.margin_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.margin_Label.minWidth = parent.labelWidth1;

      this.margin_Spin = new SpinBox( parent );
      this.margin_Spin.minValue = 0;
      this.margin_Spin.maxValue = 40;
      this.margin_Spin.value = this.margin;
      this.margin_Spin.toolTip = "<p>Separation in pixels between adjacent lines.</p>"
         + "<p>The purpose of this parameter is to avoid drawing lines over the stars "
         + "in the corners of the asterism.</p>";
      this.margin_Spin.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.margin = value;
      };

      this.marginSizer = new HorizontalSizer;
      this.marginSizer.spacing = 4;
      this.marginSizer.add( this.margin_Label );
      this.marginSizer.add( this.margin_Spin );
      this.marginSizer.addStretch();

      let panel = new Control( parent );
      panel.sizer = new VerticalSizer;
      panel.sizer.margin = 6;
      panel.sizer.spacing = 4;
      for ( let i = 0; i < this.gpropsControls.length; ++i )
         panel.sizer.add( this.gpropsControls[i] );
      panel.sizer.add( this.marginSizer );
      panel.sizer.addStretch();
      panel.object = this;
      return panel;
   }

   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      let dataPath = File.extractDrive( #__FILE__ )
                   + File.extractDirectory( #__FILE__ )
                   + "/ConstellationLines.json";
      let imgArea = new Rect( 0, 0, metadata.scaledWidth, metadata.scaledHeight );
      let data = JSON.parse( File.readTextFile( dataPath ) );

      if ( this.gprops.showMarkers )
      {
         g.pen = this.newLinePen( engine.graphicsScale );
         for ( let i = 0; i < data.length; ++i )
         {
            let pRD0 = new Point( data[i].pol[0].x*15, data[i].pol[0].y );
            let p0 = metadata.Convert_RD_I( pRD0 );
            if ( p0 && !metadata.CheckOscillation( pRD0, p0 ) )
               p0 = null;
            for ( let p = 1; p < data[i].pol.length; ++p )
            {
               let pRD = new Point( data[i].pol[p].x*15, data[i].pol[p].y );
               let p1 = metadata.Convert_RD_I( pRD );
               if ( p1 && !metadata.CheckOscillation( pRD, p1 ) )
                  p1 = null;
               if ( p0 && p1 && metadata.projection.CheckBrokenLine( pRD0, pRD ) )
                  this.PaintSegment( g, p0, p1, this.margin, this.margin, imgArea );
               p0 = p1;
               pRD0 = pRD;
            }
         }
      }

      if ( this.gprops.showLabels )
      {
         let centroids = {};
         for ( let i = 0; i < data.length; ++i )
         {
            for ( let j = 0; j < data[i].pol.length; ++j )
            {
               let pRD = new Point( data[i].pol[j].x*15, data[i].pol[j].y );
               let p = metadata.Convert_RD_I( pRD );
               if ( p && !metadata.CheckOscillation( pRD, p ) )
                  p = null;
               if ( p && FMath.abs( p.x ) < 1e6
                      && FMath.abs( p.y ) < 1e6
                      && imgArea.inflatedBy( 1000 ).includes( p ) )
               {
                  if ( !centroids[data[i].c] )
                     centroids[data[i].c] = { n: 0, pos: { x: 0, y: 0 } };
                  centroids[data[i].c].n++;
                  centroids[data[i].c].pos.x += p.x;
                  centroids[data[i].c].pos.y += p.y;
               }
            }
         }

         let labelPath = File.extractDrive( #__FILE__ )
                       + File.extractDirectory( #__FILE__ )
                       + "/ConstellationLabels.json";
         let labels = JSON.parse( File.readTextFile( labelPath ) );

         g.pen = this.newLabelPen();
         g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
         for ( let k in centroids )
         {
            let p = new Point( centroids[k].pos.x/centroids[k].n, centroids[k].pos.y/centroids[k].n );
            if ( p && imgArea.includes( p ) && centroids[k].n > 2 )
            {
               let text = labels[k.trim()];
               if ( entities )
               {
                  let rect = g.font.tightBoundingRect( text );
                  entities.push( new LabelEntity( { x0: p.x, y0: p.y-rect.height, x1: p.x+rect.width, y1: p.y },
                                                  { x: p.x, y: p.y-rect.height/2 }, 0, text, this ) );
               }
               else
                  g.drawText( p, text );
            }
         }
      }
   }

   drawEntities( g, entities, engine )
   {
      g.pen = this.newLabelPen();
      g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
      for ( let i = 0; i < entities.length; ++i )
      {
         let entity = entities[i];
         if ( entity instanceof LabelEntity )
            g.drawText( entity.rect.x0, entity.rect.y1, entity.text );
      }
   }

   PaintSegment( g, p0, p1, margin0, margin1, imgArea )
   {
      if ( p0 && p1
        && FMath.abs( p0.x ) < 1e6
        && FMath.abs( p0.y ) < 1e6
        && FMath.abs( p1.x ) < 1e6
        && FMath.abs( p1.y ) < 1e6 )
      {
         let segmentArea = new Rect( FMath.min( p0.x, p1.x ),
                                     FMath.min( p0.y, p1.y ),
                                     FMath.max( p0.x, p1.x ),
                                     FMath.max( p0.y, p1.y ) );
         if ( segmentArea.intersects( imgArea ) )
         {
            let vx = p1.x - p0.x;
            let vy = p1.y - p0.y;
            let len = FMath.sqrt( vx*vx + vy*vy );
            if ( len > margin0 + margin1 )
            {
               let pA = new Point( p0.x + vx*margin0/len, p0.y + vy*margin0/len );
               let pB = new Point( p0.x + vx*(len - margin1)/len, p0.y + vy*(len - margin1)/len );
               g.drawLine( pA, pB );
            }
         }
      }
   }
};

LayerRegistry.register( new ConstLinesLayer );

// ----------------------------------------------------------------------------ç

/*
 * A Layer to draw the constellation borders.
 */
var ConstBordersLayer = class extends Layer
{
   constructor()
   {
      super( "Constellation Borders", "Borders of the constellations" );

      this.gprops.lineColor = 0x80ffffff;
      this.gprops.labelSize = 12;
   }

   GetConstructor()
   {
      return "new ConstBordersLayer()";
   }

   GetEditPanel( parent )
   {
      this.gpropsControls = this.gprops.GetEditControls( parent, null );

      let panel = new Control( parent );
      panel.sizer = new VerticalSizer;
      panel.sizer.margin = 6;
      panel.sizer.spacing = 4;
      for ( let i = 0; i < this.gpropsControls.length; ++i )
         panel.sizer.add( this.gpropsControls[i] );
      panel.sizer.addStretch();
      panel.object = this;
      return panel;
   }

   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      let dataPath = File.extractDrive( #__FILE__ )
                   + File.extractDirectory( #__FILE__ )
                   + "/ConstellationBorders.json";
      let imgArea = new Rect( 0, 0, metadata.scaledWidth, metadata.scaledHeight );
      let data = JSON.parse( File.readTextFile( dataPath ) );

      if ( this.gprops.showMarkers )
      {
         g.pen = this.newLinePen( engine.graphicsScale );
         for ( let i = 0; i < data.length; ++i )
         {
            let lines = GridLayerBase.convertLines( metadata, data[i].pol );
            for ( let l = 0; l < lines.length; ++l )
               g.drawPolyline( lines[l] );
         }
      }

      if ( this.gprops.showLabels )
      {
         let centroids = {};
         for ( let i = 0; i < data.length; ++i )
            for ( let j = 0; j < data[i].pol.length; ++j )
            {
               let p = metadata.Convert_RD_I( data[i].pol[j] );
               if ( p && FMath.abs( p.x ) < 1e6
                      && FMath.abs( p.y ) < 1e6
                      && imgArea.inflatedBy( 1000 ).includes( p ) )
               {
                  if ( !centroids[data[i].c1] )
                     centroids[data[i].c1] = { n: 0, pos: { x: 0, y: 0 } };
                  centroids[data[i].c1].n++;
                  centroids[data[i].c1].pos.x += p.x;
                  centroids[data[i].c1].pos.y += p.y;

                  if ( !centroids[data[i].c2] )
                     centroids[data[i].c2] = { n: 0, pos: { x: 0, y: 0 } };
                  centroids[data[i].c2].n++;
                  centroids[data[i].c2].pos.x += p.x;
                  centroids[data[i].c2].pos.y += p.y;
               }
            }

         let labelPath = File.extractDrive( #__FILE__ )
                       + File.extractDirectory( #__FILE__ )
                       + "/ConstellationLabels.json";
         let labels = JSON.parse( File.readTextFile( labelPath ) );

         g.pen = this.newLabelPen();
         g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
         for ( let k in centroids )
         {
            let p = new Point( centroids[k].pos.x/centroids[k].n, centroids[k].pos.y/centroids[k].n );
            if ( p && imgArea.includes( p ) && centroids[k].n > 2 )
            {
               let text = labels[k.trim()];
               if ( entities )
               {
                  let rect = g.font.tightBoundingRect( text );
                  entities.push( new LabelEntity( { x0: p.x, y0: p.y-rect.height, x1: p.x+rect.width, y1: p.y },
                                                  { x: p.x, y: p.y-rect.height/2 }, 0, text, this ) );
               }
               else
                  g.drawText( p, text );
            }
         }
      }
   }

   drawEntities( g, entities, engine )
   {
      g.pen = this.newLabelPen();
      g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
      for ( let i = 0; i < entities.length; ++i )
      {
         let entity = entities[i];
         if ( entity instanceof LabelEntity )
            g.drawText( entity.rect.x0, entity.rect.y1, entity.text );
      }
   }
};

LayerRegistry.register( new ConstBordersLayer() );

// ----------------------------------------------------------------------------

/*
 * A Layer to draw objects acquired from a catalog.
 */
var CatalogLayer = class extends Layer
{
   static LabelStore = class extends Array
   {
      constructor()
      {
         super();
      }

      add( label )
      {
         let hash = label.hash64();
         let i = 0;
         for ( let n = this.length; n > 0; )
         {
            let h = n >>> 1;
            let m = i + h;
            if ( hash < this[m] )
               n = h;
            else
            {
               i  = m + 1;
               n -= h + 1;
            }
         }
         if ( i == this.length || i == 0 || this[i-1] != hash )
         {
            this.splice( i, 0, hash );
            return true;
         }
         return false;
      }
   };

   constructor( catalog )
   {
      super( catalog.name, catalog.description );

      this.catalog = catalog;
      this.maxObjects = -1;
      this.properties.push( ["catalog",    ExtDataType.Persistent] );
      this.properties.push( ["maxObjects", DataType.Int32] );
      this.gprops.labelFields = catalog.GetDefaultLabels();
   }

   GetConstructor()
   {
      return "new CatalogLayer(" + this.catalog.GetConstructor() + ")";
   }

   SetId( id )
   {
      this.id = id;
      this.prefix = "ly" + id;
      this.gprops.prefix = this.prefix;
      this.catalog.prefix = this.prefix;
   }

   Load( metadata, mirrorServer )
   {
      this.catalog.Load( metadata, mirrorServer );
      // N.B. this.objects stores a shallow copy of the array of objects in the
      // catalog. RemoveDuplicates() removes objects from this array.
      this.objects = this.catalog.objects ? this.catalog.objects.slice() : null;
   }

   Validate()
   {
      if ( !this.visible )
         return true;
      if ( this.catalog.Validate )
         return this.catalog.Validate();
      return true;
   }

   GetEditPanel( parent )
   {
      let panel = new Control( parent );
      panel.sizer = new VerticalSizer;
      panel.sizer.margin = 6;
      panel.sizer.spacing = 4;

      this.gpropsControls = this.gprops.GetEditControls( parent, this.catalog.fields );
      for ( let i = 0; i < this.gpropsControls.length; ++i )
         panel.sizer.add( this.gpropsControls[i] );

      this.catalogControls = this.catalog.GetEditControls( parent, this.catalog.fields );
      for ( let i = 0; i < this.catalogControls.length; ++i )
         panel.sizer.add( this.catalogControls[i] );

      panel.sizer.addStretch();
      panel.object = this;
      return panel;
   }

   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      let objects = this.GetObjects();
      if ( objects == null )
         return;
      if ( this.maxObjects >= 0 )
         if ( objects.length > this.maxObjects )
            return;

      let maglimit = 15;
      if ( this.catalog.magMax !== null && this.catalog.magMax != Catalog.NullMag )
         maglimit = this.catalog.magMax;
      else if ( this.catalog.catalogMagnitude != null )
         maglimit = this.catalog.catalogMagnitude;

      let rotation = metadata.GetRotation();
      let fieldRotation = rotation[0];
      let mirrored = rotation[1];

      let drawInfo = new Array( objects.length );
      for ( let i = 0; i < objects.length; ++i )
      {
         if ( !objects[i] )
            continue;

         // Coordinates validation
         if ( objects[i].posRD.x < 0 || objects[i].posRD.x > 360 )
            continue;
         if ( objects[i].posRD.y < -90 || objects[i].posRD.y > 90 )
            continue;

         let pI = metadata.Convert_RD_I( objects[i].posRD );
         if ( pI == null )
            continue;
         if ( g.clipping && (pI.x < g.clipRect.x0
                          || pI.y < g.clipRect.y0
                          || pI.x > g.clipRect.x1
                          || pI.y > g.clipRect.y1) )
            continue;

         drawInfo[i] = { pI: pI, size: 5*this.gprops.lineWidth*engine.graphicsScale };
      }

      let hole = 5*((engine.graphicsScale - 1)/2 + 1);

      let markerIndex = null;
      if ( this.gprops.showMarkers )
      {
         markerIndex = new Array( objects.length );
         g.pen = this.newLinePen( engine.graphicsScale );
         for ( let i = 0; i < objects.length; ++i )
         {
            markerIndex[i] = -1;
            if ( drawInfo[i] == null )
               continue;
            let pI = drawInfo[i].pI;

            let radius = metadata.scalingFactor * objects[i].diameter/2/metadata.resolution;
            if ( radius > 0 )
               if ( radius < engine.smallSizeThreshold )
                  radius += engine.smallSizeThreshold * 1.5 * FMath.log10( engine.smallSizeThreshold/radius );

            if ( radius > 5 )
            {
               let rect = { x0: pI.x - radius, y0: pI.y - radius/objects[i].axisRatio,
                            x1: pI.x + radius, y1: pI.y + radius/objects[i].axisRatio };

               let rotAngle = 0;
               if ( objects[i].posAngle !== null )
               {
                  let poleRotation;
                  let pP = metadata.Convert_RD_I( new Point( objects[i].posRD.x, (objects[i].posRD.y >= 0) ? 90 : -90 ) );
                  if ( pP !== null )
                     poleRotation = FMath.deg( FMath.atan2( pP.y - pI.y, pP.x - pI.x ) ) - 90;
                  else
                     poleRotation = fieldRotation;

                  rotAngle = (mirrored ? 270 - objects[i].posAngle : 90 + objects[i].posAngle) - poleRotation;
                  if ( rotAngle < 0 )
                     rotAngle += 360;
                  else if ( rotAngle >= 360 )
                     rotAngle -= 360;
               }

               if ( entities && radius < 8 )
               {
                  entities.push( new EllipseEntity( rect, rotAngle, this ) );
               }
               else if ( rotAngle == 0 )
               {
                  g.strokeEllipse( rect.x0, rect.y0, rect.x1, rect.y1 );
               }
               else
               {
                  g.pushState();
                  g.translateTransformation( pI.x, pI.y );
                  g.rotateTransformation( FMath.rad( rotAngle ) );
                  g.strokeEllipse( rect.x0 - pI.x, rect.y0 - pI.y,
                                   rect.x1 - pI.x, rect.y1 - pI.y );
                  g.popState();
               }
            }
            else
            {
               let size = drawInfo[i].size;
               let rect = { x0: pI.x - size - hole, y0: pI.y - size - hole,
                            x1: pI.x + size + hole, y1: pI.y + size + hole };
               if ( entities )
               {
                  markerIndex[i] = entities.length;
                  entities.push( new MarkerEntity( rect, this ) );
               }
               else
               {
                  g.drawLine( rect.x0, pI.y,    pI.x - hole, pI.y );
                  g.drawLine( rect.x1, pI.y,    pI.x + hole, pI.y );
                  g.drawLine( pI.x,    rect.y1, pI.x,        pI.y + hole );
                  g.drawLine( pI.x,    rect.y0, pI.x,        pI.y - hole );
               }
            }
         }
      }

      if ( this.gprops.showLabels )
      {
         let labelStore = new CatalogLayer.LabelStore;
         if ( entities )
         {
            let font = this.newLabelFont( engine.graphicsScale*engine.textScale );
            for ( let i = 0; i < objects.length; ++i )
               if ( drawInfo[i] )
                  for ( let l = 0; l < 8; ++l )
                     this.createLabelEntities(
                                    entities,
                                    markerIndex ? markerIndex[i] : -1,
                                    objects[i],
                                    this.gprops.labelFields[l],
                                    labelStore,
                                    l,
                                    font,
                                    drawInfo[i].size + hole,
                                    drawInfo[i].pI,
                                    engine.graphicsScale );
         }
         else
         {
            g.pen = this.newLabelPen();
            g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
            for ( let i = 0; i < objects.length; ++i )
               if ( drawInfo[i] )
                  for ( let l = 0; l < 8; ++l )
                     this.DrawLabel( g,
                                    objects[i],
                                    this.gprops.labelFields[l],
                                    labelStore,
                                    l,
                                    drawInfo[i].size + hole,
                                    drawInfo[i].pI,
                                    engine.graphicsScale );
         }
      }
   }

   createLabelEntities( entities, markerIndex, object, field, store, align, font, size, pI, graphicsScale )
   {
      if ( field == null || field.length == 0 )
         return;

      let label = null;
      if ( field == "Name" )
      {
         if ( object.name )
         {
            if ( this.catalog.translateGreekLetters )
               label = [this.catalog.translateGreekLetters( object.name )];
            else
               label = [object.name];

            if ( !store.add( label[0] ) )
               return;
         }
      }
      else if ( field == "Common name" )
      {
         if ( object[field] )
         {
            if ( this.catalog.translateGreekLetters )
               label = [this.catalog.translateGreekLetters( object[field] )];
            else
               label = [object[field]];

            if ( !store.add( label[0] ) )
               return;
         }
      }
      else if ( field == "Coordinates" )
      {
         let precision = (this.catalog.coordinatePrecision !== undefined) ? this.catalog.coordinatePrecision : 2;
         label = [DMSangle.FromAngle( object.posRD.x/15 ).ToString( true/*hours*/, precision ),
                  DMSangle.FromAngle( object.posRD.y ).ToString( false/*hours*/, precision )];
      }
      else if ( field == "Magnitude" && object.magnitude != null )
      {
         label = [format( "%.2f", object.magnitude )];
      }
      else if ( object[field] )
      {
         label = [object[field]];
         if ( !store.add( label[0] ) )
            return;
      }

      if ( label === null )
         return;

      for ( let line = 0; line < label.length; ++line )
      {
         let text = label[line].replaceAll( /\s+/g, ' ' );
         let rect = font.tightBoundingRect( text );
         let width = rect.width;
         let height = 1.3*rect.height;

         let posX;
         if ( align == 0 || align == 3 || align == 5 )   // Left
            posX = pI.x - size - width - graphicsScale;
         else if ( align == 1 || align == 6 )            // HCenter
            posX = pI.x - width/2;
         else                                            // Right
            posX = pI.x + size + graphicsScale;

         let posY = pI.y + rect.height/2;
         if ( align >= 0 && align <= 2 )                 // Top
            posY -= height + height*(label.length - line - 1);
         else if ( align == 3 || align == 4 )            // VCenter
            posY -= height*(label.length - line - 1);
         else                                            // Bottom
            posY += height + height*(label.length - line - 1);

         let entity = new LabelEntity(
               { x0: posX,              y0: posY - rect.height,
                 x1: posX + rect.width, y1: posY }, pI, size + graphicsScale, text, this );
         entities.push( entity );
         if ( markerIndex >= 0 )
         {
            entity.marker = entities[markerIndex];
            entity.linkedItems.push( entity.marker );
            entities[markerIndex].linkedItems.push( entity );
         }
      }
   }

   drawEntities( g, entities, engine )
   {
      g.pen = this.newLinePen( engine.graphicsScale );
      let hole = 5*((engine.graphicsScale - 1)/2 + 1);
      for ( let i = 0; i < entities.length; ++i )
      {
         let entity = entities[i];
         if ( entity instanceof MarkerEntity )
         {
            let cx = (entity.rect.x0 + entity.rect.x1)/2;
            let cy = (entity.rect.y0 + entity.rect.y1)/2;
            g.drawLine( entity.rect.x0, cy,           cx - hole,  cy );
            g.drawLine( entity.rect.x1, cy,           cx + hole,  cy );
            g.drawLine( cx,           entity.rect.y1, cx,         cy + hole );
            g.drawLine( cx,           entity.rect.y0, cx,         cy - hole );
         }
         else if ( entity instanceof EllipseEntity )
         {
            if ( entity.rotAngle == 0 )
            {
               g.strokeEllipse( entity.rect.x0, entity.rect.y0,
                                entity.rect.x1, entity.rect.y1 );
            }
            else
            {
               let cx = (entity.rect.x0 + entity.rect.x1)/2;
               let cy = (entity.rect.y0 + entity.rect.y1)/2;
               g.pushState();
               g.translateTransformation( cx, cy );
               g.rotateTransformation( FMath.rad( entity.rotAngle ) );
               g.strokeEllipse( entity.rect.x0 - cx, entity.rect.y0 - cy,
                                entity.rect.x1 - cx, entity.rect.y1 - cy );
               g.popState();
            }
         }
      }

      g.pen = this.newLabelPen();
      g.font = this.newLabelFont( engine.graphicsScale*engine.textScale );
      for ( let i = 0; i < entities.length; ++i )
      {
         let entity = entities[i];
         if ( entity instanceof LabelEntity )
            g.drawText( entity.rect.x0, entity.rect.y1, entity.text );
      }
   }

   DrawLabel( g, object, field, store, align, size, pI, graphicsScale )
   {
      if ( field == null || field.length == 0 )
         return;
      let label = null;
      if ( field == "Name" )
      {
         if ( object.name )
         {
            label = [object.name];
            if ( !store.add( label[0] ) )
               return;
         }
      }
      else if ( field == "Coordinates" )
      {
         let precision = (this.catalog.coordinatePrecision !== undefined) ? this.catalog.coordinatePrecision : 2;
         label = [DMSangle.FromAngle( object.posRD.x/15 ).ToString( true/*hours*/, precision ),
                  DMSangle.FromAngle( object.posRD.y ).ToString( false/*hours*/, precision )];
      }
      else if ( field == "Magnitude" && object.magnitude != null )
      {
         label = [format( "%.2f", object.magnitude )];
      }
      else if ( object[field] )
      {
         label = [object[field]];
         if ( !store.add( label[0] ) )
            return;
      }

      if ( label === null )
         return;

      for ( let line = 0; line < label.length; ++line )
      {
         let text = label[line].replaceAll( /\s+/g, ' ' );
         let rect = g.font.tightBoundingRect( text );
         let width = rect.width;
         let height = 1.3*rect.height;

         let posX;
         if ( align == 0 || align == 3 || align == 5 )   // Left
            posX = pI.x - size - width - graphicsScale;
         else if ( align == 1 || align == 6 )            // HCenter
            posX = pI.x - width/2;
         else                                            // Right
            posX = pI.x + size + graphicsScale;

         let posY = pI.y + rect.height/2;
         if ( align >= 0 && align <= 2 )                 // Top
            posY -= height + height*(label.length - line - 1);
         else if ( align == 3 || align == 4 )            // VCenter
            posY -= height*(label.length - line - 1);
         else                                            // Bottom
            posY += height + height*(label.length - line - 1);

         g.drawText( posX, posY, text );
      }
   }

   ToFile( file, metadata )
   {
      let objects = this.catalog.objects;
      if ( objects.length == 0 )
         return;

      // Write catalog header
      file.outTextLn( this.catalog.name );
      file.outTextLn( this.catalog.description );

      file.outText( "Name;RA(deg);Dec(deg);PixelX;PixelY" );
      for ( let f = 0; f < this.catalog.fields.length; ++f )
      {
         let field = this.catalog.fields[f];
         if ( field != "Name" && field != "Coordinates" )
            file.outText( ";" + field.toString() );
      }
      file.outText( "\n" );

      // Write objects data
      for ( let i = 0; i < objects.length; ++i )
      {
         if ( !objects[i] )
            continue;

         // Coordinates validation
         if ( !(objects[i].posRD.x >= 0 && objects[i].posRD.x <= 360) )
            continue;
         if ( !(objects[i].posRD.y >= -90 && objects[i].posRD.y <= 90) )
            continue;

         let pI = metadata.Convert_RD_I( objects[i].posRD );
         if ( pI == null )
            continue;
         if ( pI.x < 0 || pI.y < 0 || pI.x > metadata.scaledWidth || pI.y > metadata.scaledHeight )
            continue;

         file.outText( format( "%ls;%f;%f;%f;%f",
                               objects[i].name,
                               objects[i].posRD.x, objects[i].posRD.y,
                               pI.x, pI.y ) );
         for ( let f = 0; f < this.catalog.fields.length; ++f )
         {
            let field = this.catalog.fields[f];
            if ( field == "Magnitude" )
            {
               file.outText( ";" );
               if ( objects[i].magnitude != null )
                  file.outText( format( "%.2f", objects[i].magnitude ) );
            }
            else if ( field != "Name" && field != "Coordinates" )
            {
               file.outText( ";" );
               if ( field in objects[i] )
                  file.outText( objects[i][field].toString() );
            }
         }
         file.outText( "\n" );
      }
      file.outText( "\n" );
   }
};

for ( let i = 0; i < CatalogRegistry.length; ++i )
   LayerRegistry.register( new CatalogLayer( CatalogRegistry.newCatalog( i ) ) );

// ----------------------------------------------------------------------------

/*
 * A Layer to draw arbitrary text.
 */
var TextLayer = class extends Layer
{
   constructor()
   {
      super( "Text", "User-defined text" );

      this.positionX = 0;
      this.positionY = 100;
      this.text = "";
      this.gprops.lineColor = 0x30000000;
      this.gprops.labelColor = 0xffffffff;
      this.gprops.labelSize = 14;
      this.properties.push( [ "positionX", DataType.Double      ] );
      this.properties.push( [ "positionY", DataType.Double      ] );
      this.properties.push( [ "text",      DataType.UTF16String ] );
   }

   GetConstructor()
   {
      return "new TextLayer()";
   }

   GetEditPanel( parent )
   {
      // Font
      this.labelSize_Label = new Label( parent );
      this.labelSize_Label.text = "Font:";
      this.labelSize_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.labelSize_Label.minWidth = parent.labelWidth2;

      this.labelFace_Combo = new ComboBox( parent );
      this.labelFace_Combo.editEnabled = false;
      this.labelFace_Combo.addItem( "DejaVu Sans" );
      this.labelFace_Combo.addItem( "DejaVu Sans Mono" );
      this.labelFace_Combo.addItem( "DejaVu Serif" );
      this.labelFace_Combo.addItem( "Hack" );
      this.labelFace_Combo.addItem( "Liberation Sans" );
      this.labelFace_Combo.addItem( "Liberation Serif" );
      this.labelFace_Combo.addItem( "M+ 1c" );
      this.labelFace_Combo.addItem( "M+ 1m" );
      this.labelFace_Combo.addItem( "M+ 1p" );
      this.labelFace_Combo.addItem( "Open Sans" );
      this.labelFace_Combo.addItem( "sans-serif" );
      this.labelFace_Combo.addItem( "serif" );
      this.labelFace_Combo.addItem( "monospace" );
      this.labelFace_Combo.currentItem = FMath.range( this.labelFace_Combo.findItem( this.gprops.labelFace ),
                                                     0, this.labelFace_Combo.numberOfItems-1 );
      this.labelFace_Combo.onItemSelected = function( itemIndex )
      {
         this.dialog.activeFrame.object.gprops.labelFace = this.itemText( itemIndex ).trim();
      };

      this.labelSize_SpinBox = new SpinBox( parent );
      this.labelSize_SpinBox.minValue = 6;
      this.labelSize_SpinBox.maxValue = 72;
      this.labelSize_SpinBox.value = this.gprops.labelSize;
      this.labelSize_SpinBox.toolTip = "<p>Font size in typographic points.</p>";
      this.labelSize_SpinBox.setFixedWidth( parent.spinWidth );
      this.labelSize_SpinBox.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.gprops.labelSize = value;
      };

      this.labelBold_Check = new CheckBox( parent );
      this.labelBold_Check.checked = this.gprops.labelBold;
      this.labelBold_Check.text = "Bold";
      this.labelBold_Check.toolTip = "<p>Bold font.</p>";
      this.labelBold_Check.onCheck = function( checked )
      {
         this.dialog.activeFrame.object.gprops.labelBold = checked;
      };

      this.labelItalic_Check = new CheckBox( parent );
      this.labelItalic_Check.checked = this.gprops.labelItalic;
      this.labelItalic_Check.text = "Italic";
      this.labelItalic_Check.toolTip = "<p>Italic font.</p>";
      this.labelItalic_Check.onCheck = function( checked )
      {
         this.dialog.activeFrame.object.gprops.labelItalic = checked;
      };

      this.font_Sizer = new HorizontalSizer;
      this.font_Sizer.spacing = 4;
      this.font_Sizer.add( this.labelSize_Label );
      this.font_Sizer.add( this.labelFace_Combo );
      this.font_Sizer.add( this.labelSize_SpinBox );
      this.font_Sizer.add( this.labelBold_Check );
      this.font_Sizer.add( this.labelItalic_Check );
      this.font_Sizer.addStretch();

      // Foreground color
      this.fcolor_Label = new Label( parent );
      this.fcolor_Label.text = "Text color:";
      this.fcolor_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.fcolor_Label.minWidth = parent.labelWidth2;

      this.fcolor_ColorControl = new TransparentColorControl( parent, this.gprops.labelColor, "Text color" );
      this.fcolor_ColorControl.onColorChanged = function( color )
      {
         this.dialog.activeFrame.object.gprops.labelColor = color;
      };

      this.fcolor_Sizer = new HorizontalSizer;
      this.fcolor_Sizer.spacing = 4;
      this.fcolor_Sizer.add( this.fcolor_Label );
      this.fcolor_Sizer.add( this.fcolor_ColorControl );
      this.fcolor_Sizer.addStretch();

      // Background color
      this.bcolor_Label = new Label( parent );
      this.bcolor_Label.text = "Background:";
      this.bcolor_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.bcolor_Label.minWidth = parent.labelWidth2;

      this.bcolor_ColorControl = new TransparentColorControl( parent, this.gprops.lineColor, "Background color" );
      this.bcolor_ColorControl.onColorChanged = function( color )
      {
         this.dialog.activeFrame.object.gprops.lineColor = color;
      };

      this.bcolor_Sizer = new HorizontalSizer;
      this.bcolor_Sizer.spacing = 4;
      this.bcolor_Sizer.add( this.bcolor_Label );
      this.bcolor_Sizer.add( this.bcolor_ColorControl );
      this.bcolor_Sizer.addStretch();

      // Position
      this.position_Label = new Label( parent );
      this.position_Label.text = "Position:";
      this.position_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.position_Label.minWidth = parent.labelWidth2;

      this.positionX_Label = new Label( parent );
      this.positionX_Label.text = "X=";
      this.positionX_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;

      this.positionX_Spin = new SpinBox( parent );
      this.positionX_Spin.minValue = 0;
      this.positionX_Spin.maxValue = 100;
      this.positionX_Spin.suffix = "%";
      this.positionX_Spin.value = this.positionX;
      this.positionX_Spin.setFixedWidth( FMath.round( parent.spinWidth*1.5 ) );
      this.positionX_Spin.toolTip = "<p>Horizontal text position.</p>"
         + "<p>Specify 0% to draw the text at the left side of the image. "
         + "50% corresponds to the center of the image, and 100% to the right side.</p>";
      this.positionX_Spin.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.positionX = value;
      };

      this.positionY_Label = new Label( parent );
      this.positionY_Label.text = "  Y=";
      this.positionY_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;

      this.positionY_Spin = new SpinBox( parent );
      this.positionY_Spin.minValue = 0;
      this.positionY_Spin.maxValue = 100;
      this.positionY_Spin.value = this.positionY;
      this.positionY_Spin.suffix = "%";
      this.positionY_Spin.setFixedWidth( FMath.round( parent.spinWidth*1.5 ) );
      this.positionY_Spin.toolTip = "<p>Vertical text position.</p>"
         + "<p>Specify 0% to draw the text at the top of the image. "
         + "50% corresponds to the center of the image, and 100% to the bottom.</p>";
      this.positionY_Spin.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.positionY = value;
      };

      this.positionSizer = new HorizontalSizer;
      this.positionSizer.spacing = 4;
      this.positionSizer.add( this.position_Label );
      this.positionSizer.add( this.positionX_Label );
      this.positionSizer.add( this.positionX_Spin );
      this.positionSizer.add( this.positionY_Label );
      this.positionSizer.add( this.positionY_Spin );
      this.positionSizer.addStretch();

      this.text_Label = new Label( parent );
      this.text_Label.text = "Text:";
      this.text_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      this.text_Label.minWidth = parent.labelWidth2;
      this.textLabel_Sizer = new HorizontalSizer;
      this.textLabel_Sizer.spacing = 4;
      this.textLabel_Sizer.add( this.text_Label );
      this.textLabel_Sizer.addStretch();

      this.text_TextBox = new TextBox( parent );
      this.text_TextBox.text = this.text;
      //text_TextBox.font = text_Label.font;
      this.text_TextBox.styleSheet = "* { font-family: " + this.text_Label.font.family + "; font-size: " + this.text_Label.font.pointSize + "pt; }";
      this.text_TextBox.toolTip = "<p>User-defined text. The following variables are interpreted "
         + "and replaced with their corresponding values:</p>"
         + "<ul><li>%RA: Right Ascension of the center of the image.</li>"
         + "<li>%DEC: Declination of the center of the image.</li>"
         + "<li>%RESOLUTION: Resolution of the image in arcseconds/pixel.</li>"
         + "<li>%ROTATION: Rotation of the image in degrees.</li>"
         + "<li>%PROJECTION: Name of the projection.</li>"
         + "<li>%KEY-XXXX: Prints the value of the FITS keyword XXXX.<br/>"
         + "For example, %KEY-FOCALLEN is replaced by the value of the keyword FOCALLEN.</li></ul>";
      this.text_TextBox.onTextUpdated = function()
      {
         this.dialog.activeFrame.object.text = this.text;
      };

      this.panel = new Control( parent );
      this.panel.sizer = new VerticalSizer;
      this.panel.sizer.margin = 6;
      this.panel.sizer.spacing = 4;
      this.panel.sizer.add( this.font_Sizer );
      this.panel.sizer.add( this.fcolor_Sizer );
      this.panel.sizer.add( this.bcolor_Sizer );
      this.panel.sizer.add( this.positionSizer );
      this.panel.sizer.add( this.textLabel_Sizer );
      this.panel.sizer.add( this.text_TextBox );
      this.panel.sizer.addStretch();
      this.panel.object = this;
      return this.panel;
   }

   Draw( g, metadata, bounds, imageWnd, engine )
   {
      let finalText = this.ExpandVariables( metadata, imageWnd.keywords );

      let margin = 3;
      let imageWidth = metadata.scaledWidth - margin*2;
      let imageHeight = metadata.scaledHeight - margin*2;

      let font = this.newLabelFont( engine.graphicsScale*engine.textScale );
      g.font = font;
      g.pen = this.newLabelPen();

      let lines = finalText.trim().split( "\n" );

      // Dimensions of the text
      let lineHeight = font.ascent + font.descent;
      let height = lines.length * lineHeight;
      let orgY = (imageHeight - height)*this.positionY/100;

      // Background
      if ( Color.alpha( this.gprops.lineColor ) != 0 )
      {
         let maxWidth = 0;
         for ( let i = 0; i < lines.length; ++i )
            maxWidth = FMath.max( maxWidth, font.tightBoundingRect( lines[i] ).width );
         let left = (imageWidth - maxWidth)*this.positionX/100;
         let top = orgY;
         let brush = new Brush( this.gprops.lineColor );
         g.fillRect( left, top, left + maxWidth + margin*2, top + height + margin*2, brush );
      }

      // Draw text lines
      for ( let i = 0; i < lines.length; ++i )
      {
         let rect = font.tightBoundingRect( lines[i] );
         g.drawText( (imageWidth - rect.width)*this.positionX/100 + margin,
                     orgY + i*lineHeight + font.ascent + margin,
                     lines[i] );
      }
   }

   static #findKeyword( str, keywords )
   {
      for ( let i = 0; i < keywords.length; ++i )
         if ( str.indexOf( keywords[i].name ) == 0 )
            return i;
      return -1;
   }

   ExpandVariables( metadata, keywords )
   {
      let rotation = metadata.GetRotation();
      let expanded = this.text
         .replaceAll( "%RA", DMSangle.FromAngle( metadata.ra/15 ).ToString( true/*time*/ )
            ).replaceAll( "%DEC", DMSangle.FromAngle( metadata.dec ).ToString()
               ).replaceAll( "%RESOLUTION", format( "%.3f", metadata.resolution*3600 )
                  ).replaceAll( "%PROJECTION", metadata.projection.name
                     ).replaceAll( "%ROTATION", format( "%.2f", rotation[0] ) + (rotation[1] ? " (flipped)" : "") );

      // FITS Keyword
      for ( let pos = 0; (pos = expanded.indexOf( "%KEY-" )) >= 0; )
      {
         let keyIdx = TextLayer.#findKeyword( expanded.substr( pos+5 ), keywords );
         if ( keyIdx >= 0 )
         {
            let value = keywords[keyIdx].value.trim();
            if ( value.charAt( 0 ) == "'" )
               value = value.substr( 1 );
            if ( value.charAt( value.length-1 ) == "'" )
               value = value.substr( 0, value.length-1 );
            expanded = expanded.replace( "%KEY-" + keywords[keyIdx].name, value );
         }
         else
            ++pos;
      }

      return expanded;
   }
};

LayerRegistry.register( new TextLayer );

// ----------------------------------------------------------------------------
// EOF Layer.js - Released 2026-05-11T18:30:06Z
