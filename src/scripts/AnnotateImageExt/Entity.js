// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// Entity.js - Released 2026-03-26T21:05:57Z
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

var Entity = class
{
   constructor( rect, layer )
   {
      this.entityClass  = "Entity";
      this.rect         = rect;
      this.layer        = layer;
      this.movable      = false;
      this.removable    = false;
      this.overlappable = true;
      this.exportable   = false;
      this.linkedItems  = [];
   }

   overlaps( tree, rect )
   {
      let index = tree.search( rect );
      for ( let i = 0; i < index.length; ++i )
      {
         let o = tree.objects[index[i]];
         if ( o != this )
            if ( o.rect.x1 >= rect.x0 )
               if ( o.rect.x0 <= rect.x1 )
                  if ( o.rect.y1 >= rect.y0 )
                     if ( o.rect.y0 <= rect.y1 )
                        return true;
      }
      return false;
   }

   conflicts( tree )
   {
      let n = 0;
      let index = tree.search( this.rect );
      for ( let i = 0; i < index.length; ++i )
      {
         let o = tree.objects[index[i]];
         if ( o != this )
            if ( !o.movable )
               if ( o.rect.x1 >= this.rect.x0 )
                  if ( o.rect.x0 <= this.rect.x1 )
                     if ( o.rect.y1 >= this.rect.y0 )
                        if ( o.rect.y0 <= this.rect.y1 )
                           if ( !o.overlappable || ++n == 3 )
                              return true;
      }
      return false;
   }

   entityInfo( text )
   {
      let ser = this.entityClass + format( ",%.2f,%.2f,%.2f,%.2f",
                           this.rect.x0, this.rect.y0, this.rect.x1, this.rect.y1 );
      if ( text )
         if ( !text.isEmpty() )
            ser += ',' + text;
      return ser;
   }
};

// ----------------------------------------------------------------------------

var LabelEntity = class extends Entity
{
   constructor( rect, center, dist, text, layer )
   {
      super( rect, layer );

      this.entityClass = "Label";
      this.movable     = true;
      this.exportable  = true;
      this.center      = center;
      this.dist        = dist;
      this.text        = text;
      this.marker      = null;
   }

   rectForPos( pos )
   {
//       A  2  B
//    6 +---+---+ 4
//      | F | D |
//    1 +---+---+ 0
//      | E | C |
//    7 +---+---+ 5
//       8  3  9

      const width = this.rect.x1 - this.rect.x0;
      const height = this.rect.y1 - this.rect.y0;

      let x;
      switch ( pos )
      {
      case  0:
      case  4:
      case  5:
         x = this.center.x + this.dist;
         break;
      case  1:
      case  6:
      case  7:
         x = this.center.x - width - this.dist;
         break;
      case  2:
      case  3:
         x = this.center.x - width/2;
         break;
      case  8:
      case 10:
         x = this.center.x - width/2 - this.dist;
         break;
      case  9:
      case 11:
         x = this.center.x - width/2 + this.dist;
         break;
      case 12:
      case 13:
         x = this.center.x + this.dist/2;
         break;
      case 14:
      case 15:
         x = this.center.x - width - this.dist/2;
         break;
      }

      let y;
      switch ( pos )
      {
      case  0:
      case  1:
         y = this.center.y - height/2;
         break;
      case  2:
      case 10:
      case 11:
         y = this.center.y - height - this.dist;
         break;
      case  3:
      case  8:
      case  9:
         y = this.center.y + this.dist;
         break;
      case  4:
      case  6:
         y = this.center.y - height/2 - this.dist;
         break;
      case  5:
      case  7:
         y = this.center.y - height/2 + this.dist;
         break;
      case 12:
      case 14:
         y = this.center.y + this.dist/2;
         break;
      case 13:
      case 15:
         y = this.center.y - height - this.dist/2;
         break;
      }

      return { x0: x, y0: y, x1: x + width, y1: y + height };
   }

   relocate( tree )
   {
      let rects = [];
      for ( let pos = 0; pos < 16; ++pos )
      {
         let rect = this.rectForPos( pos );
         if ( !this.overlaps( tree, rect ) )
            rects.push( rect );
      }

      if ( rects.length > 0 )
      {
         tree.remove( this );

         /*
          * ### TODO: dx and dy below define the local optimization region.
          * Calculation of these distances can be improved and maybe controlled
          * with user-definable parameters.
          */
         let dx = (this.rect.x1 - this.rect.x0)/2 + 16;
         let dy = (this.rect.y1 - this.rect.y0)/2 + 16;
         let rx = this.marker ? { x0: this.marker.rect.x0-1, y0: this.marker.rect.y0-1,
                                  x1: this.marker.rect.x1+1, y1: this.marker.rect.y1+1 } : undefined;
         let D = tree.minDist( rects[0], dx, dy, rx );
         let k = 0;
         for ( let i = 1; i < rects.length; ++i )
         {
            let d = tree.minDist( rects[i], dx, dy, rx );
            if ( d > D )
            {
               k = i;
               D = d;
            }
         }

         let rect = rects[k];
         let moved = this.rect.x0 != rect.x0 ||
                     this.rect.y0 != rect.y0 ||
                     this.rect.x1 != rect.x1 ||
                     this.rect.y1 != rect.y1;
         if ( moved )
            this.rect = rect;

         this.overlap = false;
         tree.insert( this );
         return moved;
      }

      this.overlap = this.overlaps( tree, this.rect );
      return false;
   }

   entityInfo()
   {
      let text = this.text;
      for ( let i = 1; i <= 9; ++i )
      {
         const superindex = String.fromCharCode(
            [0x00B9, 0x00B2, 0x00B3, 0x2074, 0x2075, 0x2076, 0x2077, 0x2078, 0x2079][i-1] );
         const suffix = format( "%02d", i );
         text =                              text.replace(
            '\u03b1' + superindex, "alf" + suffix ).replace(
            '\u03b2' + superindex, "bet" + suffix ).replace(
            '\u03b3' + superindex, "gam" + suffix ).replace(
            '\u03b4' + superindex, "del" + suffix ).replace(
            '\u03b5' + superindex, "eps" + suffix ).replace(
            '\u03b6' + superindex, "zet" + suffix ).replace(
            '\u03b7' + superindex, "eta" + suffix ).replace(
            '\u03b8' + superindex, "tet" + suffix ).replace(
            '\u03b9' + superindex, "iot" + suffix ).replace(
            '\u03ba' + superindex, "kap" + suffix ).replace(
            '\u03bb' + superindex, "lam" + suffix ).replace(
            '\u03bc' + superindex, "mu." + suffix ).replace(
            '\u03bd' + superindex, "nu." + suffix ).replace(
            '\u03be' + superindex, "ksi" + suffix ).replace(
            '\u03bf' + superindex, "omi" + suffix ).replace(
            '\u03c0' + superindex, "pi." + suffix ).replace(
            '\u03c1' + superindex, "rho" + suffix ).replace(
            '\u03c3' + superindex, "sig" + suffix ).replace(
            '\u03c4' + superindex, "tau" + suffix ).replace(
            '\u03c5' + superindex, "ups" + suffix ).replace(
            '\u03c6' + superindex, "phi" + suffix ).replace(
            '\u03c7' + superindex, "chi" + suffix ).replace(
            '\u03c8' + superindex, "psi" + suffix ).replace(
            '\u03c9' + superindex, "ome" + suffix );
      }
      return super.entityInfo(
                         text.replace(
            '\u03b1', "alf" ).replace(
            '\u03b2', "bet" ).replace(
            '\u03b3', "gam" ).replace(
            '\u03b4', "del" ).replace(
            '\u03b5', "eps" ).replace(
            '\u03b6', "zet" ).replace(
            '\u03b7', "eta" ).replace(
            '\u03b8', "tet" ).replace(
            '\u03b9', "iot" ).replace(
            '\u03ba', "kap" ).replace(
            '\u03bb', "lam" ).replace(
            '\u03bc', "mu." ).replace(
            '\u03bd', "nu." ).replace(
            '\u03be', "ksi" ).replace(
            '\u03bf', "omi" ).replace(
            '\u03c0', "pi." ).replace(
            '\u03c1', "rho" ).replace(
            '\u03c3', "sig" ).replace(
            '\u03c4', "tau" ).replace(
            '\u03c5', "ups" ).replace(
            '\u03c6', "phi" ).replace(
            '\u03c7', "chi" ).replace(
            '\u03c8', "psi" ).replace(
            '\u03c9', "ome" ) );
   }
};

// ----------------------------------------------------------------------------

var GridLabelEntity = class extends Entity
{
   constructor( rect, text, layer )
   {
      super( rect, layer );

      this.entityClass  = "GridLabel";
      this.overlappable = false;
      this.exportable   = true
      this.text         = text;
   }

   entityInfo()
   {
      return super.entityInfo( this.text );
   }
};

// ----------------------------------------------------------------------------

var MarkerEntity = class extends Entity
{
   constructor( rect, layer )
   {
      super( rect, layer );

      this.entityClass = "Marker";
      this.removable   = true;
   }
};

// ----------------------------------------------------------------------------

var EllipseEntity = class extends Entity
{
   constructor( rect, rotAngle, layer )
   {
      super( rect, layer );

      this.entityClass = "Ellipse";
      this.rotAngle = rotAngle; // rotation angle in degrees
   }
};

// ----------------------------------------------------------------------------

var BorderEntity = class extends Entity
{
   constructor( width, height, border, graphicsScale )
   {
      let x0;
      switch ( border )
      {
      case "left":
      case "top":
      case "bottom":
         x0 = 0;
         break;
      case "right":
         x0 = width - 2*graphicsScale;
         break;
      }

      let y0;
      switch ( border )
      {
      case "left":
      case "top":
      case "right":
         y0 = 0;
         break;
      case "bottom":
         y0 = height - 2*graphicsScale;
         break;
      }

      let x1;
      switch ( border )
      {
      case "left":
         x1 = 2*graphicsScale;
         break;
      case "top":
      case "right":
      case "bottom":
         x1 = width;
         break;
      }

      let y1;
      switch ( border )
      {
      case "left":
      case "right":
      case "bottom":
         y1 = height;
         break;
      case "top":
         y1 = 2*graphicsScale;
         break;
      }

      super( {x0: x0, y0: y0, x1: x1, y1: y1}/*rect*/, null/*layer*/ );

      this.entityClass = "Border";
   }
};

// ----------------------------------------------------------------------------
// EOF Entity.js - Released 2026-03-26T21:05:57Z
