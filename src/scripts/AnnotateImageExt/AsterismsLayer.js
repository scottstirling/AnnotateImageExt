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
 * Base class of all graphical annotation layers.
 */
/** for reference ..
 *
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
*/

/*
 * A Layer to draw constellation lines ... hacked to draw a set of asterisms.
 */
var AsterismsLinesLayer = class extends Layer
{
   constructor()
   {
      super( "Asterism Lines", "Asterisms in and across constellation boundaries" );

      this.margin = 8;
      this.gprops.lineColor = 0x80ffffff;
      // add lineWidth setting
      this.gprops.lineWidth = 4;
      this.gprops.labelSize = 14;
      this.properties.push( [ "margin", DataType.Double ] );
   }

   GetConstructor()
   {
      return "new AsterismsLinesLayer()";
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

   /* SS: consider moving the lines and labels dataPath settings to the constructor or a setter
    */
   Draw( g, metadata, bounds, imageWnd, engine, entities )
   {
      let dataPath = File.extractDrive( #__FILE__ )
                   + File.extractDirectory( #__FILE__ )
                   + "/AsterismsLines.json";
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
                       + "/AsterismsLabels.json";
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

LayerRegistry.register( new AsterismsLinesLayer );

