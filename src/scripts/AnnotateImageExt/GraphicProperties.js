// ----------------------------------------------------------------------------
// PixInsight JavaScript Runtime API - PJSR Version 2.0
// ----------------------------------------------------------------------------
// GraphicProperties.js - Released 2026-05-11T18:30:06Z
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

var GraphicProperties = class extends PersistentObject
{
   static LabelCombo = class extends ComboBox
   {
      constructor( parent, fields, labels, labelPos, width )
      {
         super( parent );

         this.labels = labels;
         this.setFixedWidth( width );
         this.editEnabled = false;
         this.addItem( "" );
         for ( let i = 0; i < fields.length; ++i )
         {
            this.addItem( fields[i] );
            if( fields[i] == labels[labelPos] )
               this.currentItem = i + 1;
         }

         this.onItemSelected = function( itemIndex )
         {
            this.labels[labelPos] = this.itemText( itemIndex );
         };
      }
   };

   constructor( module, layer )
   {
      super(
         module,
         layer,
         [
            [ "showMarkers", DataType.Boolean       ],
            [ "lineColor",   DataType.Uint32        ],
            [ "lineWidth",   DataType.Double        ],
            [ "showLabels",  DataType.Boolean       ],
            [ "labelSize",   DataType.Double        ],
            [ "labelBold",   DataType.Boolean       ],
            [ "labelItalic", DataType.Boolean       ],
            [ "labelColor",  DataType.Uint32        ],
            [ "labelFace",   DataType.UTF16String   ],
            [ "labelFields", ExtDataType.StringList ]
         ]
      );

      this.showMarkers = true;
      this.lineColor = 0xffffffff;
      this.lineWidth = 1;
      this.showLabels = true;
      this.labelFace = "DejaVu Sans";
      this.labelSize = 10;
      this.labelBold = false;
      this.labelItalic = false;
      this.labelColor = 0xffffffff;
      this.labelFields = new Array( 8 );
   }

   GetEditControls( parent, fields )
   {
      // Marker color
      let markerColor_Label = new Label( parent );
      markerColor_Label.text = "Color:";
      markerColor_Label.textAlignment = TextAlignment.Right|TextAlignment.VertCenter;
      markerColor_Label.minWidth = parent.labelWidth2;

      let marker_ColorControl = new TransparentColorControl( parent, this.lineColor, "Marker color" );
      marker_ColorControl.onColorChanged = function( color )
      {
         this.dialog.activeFrame.object.gprops.lineColor = color;
      };

      let markerColor_Sizer = new HorizontalSizer;
      markerColor_Sizer.spacing = 4;
      markerColor_Sizer.add( markerColor_Label );
      markerColor_Sizer.add( marker_ColorControl );
      markerColor_Sizer.addStretch();

      let markerWidth_Label = new Label( parent );
      markerWidth_Label.text = "Width:";
      markerWidth_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      markerWidth_Label.minWidth = parent.labelWidth2;

      let markerWidth_SpinBox = new SpinBox( parent );
      markerWidth_SpinBox.minValue = 0;
      markerWidth_SpinBox.maxValue = 20;
      markerWidth_SpinBox.value = this.lineWidth;
      markerWidth_SpinBox.setFixedWidth( parent.spinWidth );
      markerWidth_SpinBox.toolTip = "<p>Line width of markers.</p>";
      markerWidth_SpinBox.onValueUpdated = function( value )
      {
         this.dialog.activeFrame.object.gprops.lineWidth = value;
      };

      let markerWidth_Sizer = new HorizontalSizer;
      markerWidth_Sizer.spacing = 4;
      markerWidth_Sizer.add( markerWidth_Label );
      markerWidth_Sizer.add( markerWidth_SpinBox );
      markerWidth_Sizer.addStretch();

      let showMarker_Frame = new GroupBox( parent );
      showMarker_Frame.title = "Show Markers";
      showMarker_Frame.titleCheckBox = true;
      showMarker_Frame.checked = this.showMarkers;
      showMarker_Frame.onCheck = function( checked )
      {
         this.dialog.activeFrame.object.gprops.showMarkers = checked;
         this.dialog.layers_TreeBox.currentNode.setIcon( 1,
            this.dialog.scaledResource( checked ? ":/browser/enabled.png" : ":/browser/disabled.png" ) );
      };
      showMarker_Frame.sizer = new VerticalSizer;
      showMarker_Frame.sizer.margin = 6;
      showMarker_Frame.sizer.spacing = 4;
      showMarker_Frame.sizer.add( markerColor_Sizer );
      showMarker_Frame.sizer.add( markerWidth_Sizer );

      let labelSize_Label = new Label( parent );
      labelSize_Label.text = "Font:";
      labelSize_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      labelSize_Label.minWidth = parent.labelWidth2;

      this.label_FontControl = new FontControl( parent, this,
         {
            face:   this.labelFace,
            size:   this.labelSize,
            bold:   this.labelBold,
            italic: this.labelItalic
         } );
      this.label_FontControl.onChanged = function( fontDef )
      {
         this.labelFace = fontDef.face;
         this.labelSize = fontDef.size;
         this.labelBold = fontDef.bold;
         this.labelItalic = fontDef.italic;
      };

      let font_Sizer = new HorizontalSizer;
      font_Sizer.spacing = 4;
      font_Sizer.add( labelSize_Label );
      font_Sizer.add( this.label_FontControl );
      font_Sizer.addStretch();

      let labelColor_Label = new Label( parent );
      labelColor_Label.text = "Color:";
      labelColor_Label.textAlignment = TextAlignment.Right | TextAlignment.VertCenter;
      labelColor_Label.minWidth = parent.labelWidth2;

      let label_ColorControl = new TransparentColorControl( parent, this.labelColor, "Label color" );
      label_ColorControl.onColorChanged = function( color )
      {
         this.dialog.activeFrame.object.gprops.labelColor = color;
      };

      let labelColor_Sizer = new HorizontalSizer;
      labelColor_Sizer.spacing = 4;
      labelColor_Sizer.add( labelColor_Label );
      labelColor_Sizer.add( label_ColorControl );
      labelColor_Sizer.addStretch();

      let fields_Sizer;
      if ( fields )
      {
         let comboWidth = parent.font.width( "Common name " + "M".repeat( 4 ) );

         let combo0 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 0, comboWidth );
         let combo1 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 1, comboWidth );
         let combo2 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 2, comboWidth );
         let combo3 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 3, comboWidth );
         let combo4 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 4, comboWidth );
         let combo5 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 5, comboWidth );
         let combo6 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 6, comboWidth );
         let combo7 = new GraphicProperties.LabelCombo( parent, fields, this.labelFields, 7, comboWidth );

         let row1 = new HorizontalSizer;
         row1.spacing = 4;
         row1.add( combo0 );
         row1.add( combo1 );
         row1.add( combo2 );
         row1.addStretch( );

         this.spacerControl = new Control( parent );
         this.spacerControl.setFixedWidth( comboWidth );
         let row2 = new HorizontalSizer;
         row2.spacing = 4;
         row2.add( combo3 );
         row2.add( this.spacerControl );
         row2.add( combo4 );
         row2.addStretch();

         let row3 = new HorizontalSizer;
         row3.spacing = 4;
         row3.add( combo5 );
         row3.add( combo6 );
         row3.add( combo7 );
         row3.addStretch();

         let fields_Label = new Label( parent );
         fields_Label.text = "Label Text:";
         fields_Label.textAlignment = TextAlignment.Right|TextAlignment.Top;
         fields_Label.minWidth = parent.labelWidth2;

         let table_Sizer = new VerticalSizer;
         table_Sizer.spacing = 4;
         table_Sizer.add( row1 );
         table_Sizer.add( row2 );
         table_Sizer.add( row3 );

         fields_Sizer = new HorizontalSizer;
         fields_Sizer.spacing = 4;
         fields_Sizer.add( fields_Label );
         fields_Sizer.add( table_Sizer );
         fields_Sizer.addStretch();
      }

      let showLabel_Frame = new GroupBox( parent );
      showLabel_Frame.title = "Show Labels";
      showLabel_Frame.titleCheckBox = true;
      showLabel_Frame.setMinWidth( parent.font.width( 'M' )*35 );
      showLabel_Frame.checked = this.showLabels;
      showLabel_Frame.onCheck = function( checked )
      {
         this.dialog.activeFrame.object.gprops.showLabels = checked;
         this.dialog.layers_TreeBox.currentNode.setIcon( 2,
            this.dialog.scaledResource( checked ? ":/browser/enabled.png" : ":/browser/disabled.png" ) );
      };
      showLabel_Frame.sizer = new VerticalSizer;
      showLabel_Frame.sizer.margin = 6;
      showLabel_Frame.sizer.spacing = 4;
      showLabel_Frame.sizer.add( font_Sizer );
      showLabel_Frame.sizer.add( labelColor_Sizer );
      if ( fields_Sizer )
         showLabel_Frame.sizer.add( fields_Sizer );

      return [ showMarker_Frame, showLabel_Frame ];
   }
};

// ----------------------------------------------------------------------------
// EOF GraphicProperties.js - Released 2026-05-11T18:30:06Z
